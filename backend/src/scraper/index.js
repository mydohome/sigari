const pool = require("../db/pool");
const {
  fetchTariffePage,
  findSigariXlsLink,
  downloadXls,
  urlListinoSigari,
  listinoEsiste,
  formatDataPubblicazione,
} = require("./tabaccaiSource");
const { parseSigariWorkbook } = require("./xlsxParser");
const { classificaProvenienza } = require("../data/provenienze");

async function alreadyProcessed(url) {
  const { rows } = await pool.query(
    "SELECT 1 FROM scraped_documents WHERE url = $1 AND esito = 'ok'",
    [url]
  );
  return rows.length > 0;
}

async function markProcessed(url, titolo, righe, esito, dettaglio) {
  await pool.query(
    `INSERT INTO scraped_documents (url, titolo, righe_estratte, esito, dettaglio)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (url) DO UPDATE
       SET righe_estratte = EXCLUDED.righe_estratte,
           esito = EXCLUDED.esito,
           dettaglio = EXCLUDED.dettaglio,
           elaborato_il = now()`,
    [url, titolo, righe, esito, dettaglio]
  );
}

// Salva un intero listino in una sola transazione (tutto o niente), con
// inserimenti a blocchi: un listino ha ~3000 righe e un backfill ne elabora
// decine, quindi una query per riga sarebbe troppo lenta.
async function salvaListino(rows, fonteUrl, fonteDocumento, validoDal) {
  const perChiave = new Map();
  for (const row of rows) {
    perChiave.set(`${row.marca}|${row.categoria}|${row.formato ?? ""}`, row);
  }
  const righe = [...perChiave.values()];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const prodotti = await client.query(
      `INSERT INTO products (marca, categoria, formato, pezzi_per_confezione, codice_prodotto, provenienza)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::int[], $5::text[], $6::text[])
       ON CONFLICT (marca, categoria, formato) DO UPDATE
         SET pezzi_per_confezione = COALESCE(EXCLUDED.pezzi_per_confezione, products.pezzi_per_confezione),
             codice_prodotto = COALESCE(EXCLUDED.codice_prodotto, products.codice_prodotto)
       RETURNING id, marca, categoria, formato`,
      [
        righe.map((r) => r.marca),
        righe.map((r) => r.categoria),
        righe.map((r) => r.formato),
        righe.map((r) => r.pezzi_per_confezione),
        righe.map((r) => r.codice_prodotto),
        righe.map((r) => classificaProvenienza(r.marca)),
      ]
    );

    const idPerChiave = new Map(
      prodotti.rows.map((p) => [`${p.marca}|${p.categoria}|${p.formato ?? ""}`, p.id])
    );
    const conId = righe.filter((r) => idPerChiave.has(`${r.marca}|${r.categoria}|${r.formato ?? ""}`));

    await client.query(
      `INSERT INTO prices (product_id, prezzo_confezione, prezzo_singolo, valido_dal, fonte_url, fonte_documento)
       SELECT t.product_id, t.prezzo_confezione, t.prezzo_singolo, $4::date, $5, $6
       FROM unnest($1::int[], $2::numeric[], $3::numeric[]) AS t(product_id, prezzo_confezione, prezzo_singolo)
       ON CONFLICT (product_id, valido_dal) DO UPDATE
         SET prezzo_confezione = EXCLUDED.prezzo_confezione,
             prezzo_singolo = EXCLUDED.prezzo_singolo,
             fonte_url = EXCLUDED.fonte_url,
             fonte_documento = EXCLUDED.fonte_documento`,
      [
        conId.map((r) => idPerChiave.get(`${r.marca}|${r.categoria}|${r.formato ?? ""}`)),
        conId.map((r) => r.prezzo_confezione),
        conId.map((r) => r.prezzo_singolo),
        validoDal,
        fonteUrl,
        fonteDocumento,
      ]
    );

    await client.query("COMMIT");
    return conId.length;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Scarica, interpreta e salva un listino, segnandolo come elaborato.
// Ritorna il numero di prezzi salvati.
async function processaListino(directUrl, dataPubblicazione) {
  const validoDal = formatDataPubblicazione(dataPubblicazione);
  const titolo = `Listino Sigari FIT del ${validoDal}`;

  const buffer = await downloadXls(directUrl);
  const rows = parseSigariWorkbook(buffer);
  const salvati = rows.length > 0 ? await salvaListino(rows, directUrl, titolo, validoDal) : 0;

  await markProcessed(
    directUrl,
    titolo,
    rows.length,
    rows.length > 0 ? "ok" : "parziale",
    rows.length === 0
      ? "Nessuna riga 'Sigari' riconosciuta nel file XLS: verificare la struttura del foglio."
      : null
  );
  return salvati;
}

function yyyymmdd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

// Giorni (YYYYMMDD) da `da` ad `a` inclusi; `da` e `a` sono date "YYYY-MM-DD".
function giorniTra(da, a) {
  const giorni = [];
  const fine = new Date(`${a}T00:00:00Z`);
  for (let d = new Date(`${da}T00:00:00Z`); d <= fine; d.setUTCDate(d.getUTCDate() + 1)) {
    giorni.push(yyyymmdd(d));
  }
  return giorni;
}

const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// FIT pubblica un listino in un giorno qualsiasi (circa 1-2 al mese) e lascia
// online anche i vecchi, in una cartella con la data nel percorso. La pagina
// "Tariffe" mostra pero' solo l'ultimo: con uno scraping settimanale un
// listino intermedio andrebbe perso, e i listini precedenti all'avvio dell'app
// non sarebbero mai recuperati. Qui proviamo ogni giorno tra `da` e `a` e
// elaboriamo, in ordine cronologico, quelli che esistono e non abbiamo ancora.
async function recuperaListiniMancanti({ da, a, concorrenza = 4, log = console.log }) {
  const giorni = giorniTra(da, a);
  const esistenti = [];
  let indice = 0;

  async function lavoratore() {
    while (indice < giorni.length) {
      const giorno = giorni[indice++];
      const url = urlListinoSigari(giorno);
      try {
        if (await listinoEsiste(url)) esistenti.push({ giorno, url });
      } catch (err) {
        log(`Controllo listino ${giorno} fallito (${err.message}): lo riprovo al prossimo ciclo.`);
      }
      await pausa(50);
    }
  }
  await Promise.all(Array.from({ length: concorrenza }, lavoratore));
  esistenti.sort((x, y) => x.giorno.localeCompare(y.giorno));

  const riepilogo = { trovati: esistenti.length, nuovi: 0, prezzi: 0, errori: 0 };
  for (const { giorno, url } of esistenti) {
    if (await alreadyProcessed(url)) continue;
    try {
      const salvati = await processaListino(url, giorno);
      riepilogo.nuovi++;
      riepilogo.prezzi += salvati;
      log(`Listino del ${formatDataPubblicazione(giorno)}: ${salvati} prezzi salvati.`);
    } catch (err) {
      riepilogo.errori++;
      log(`Listino del ${formatDataPubblicazione(giorno)} non elaborato: ${err.message}`);
    }
  }
  return riepilogo;
}

async function runScrapeCycle() {
  const runRes = await pool.query(
    "INSERT INTO scrape_runs (iniziato_il) VALUES (now()) RETURNING id"
  );
  const runId = runRes.rows[0].id;

  let documentiTrovati = 0;
  let documentiNuovi = 0;
  let prezziInseriti = 0;
  let esito = "ok";
  let dettaglio = null;

  try {
    // Ultimo listino gia' in archivio, prima di elaborare quello corrente:
    // da li' in poi cerchiamo gli eventuali listini intermedi saltati.
    const { rows: ultima } = await pool.query("SELECT MAX(valido_dal)::text AS data FROM prices");
    const ultimaData = ultima[0].data;

    const paginaHtml = await fetchTariffePage();
    const link = findSigariXlsLink(paginaHtml);

    if (!link) {
      throw new Error(
        "Impossibile trovare il link al file XLS dei sigari sulla pagina tariffe di tabaccai.it. " +
          "La struttura della pagina potrebbe essere cambiata: verificare manualmente " +
          "https://www.tabaccai.it/index.php/servizi/tariffe"
      );
    }

    documentiTrovati = 1;
    const { directUrl, dataPubblicazione } = link;
    const validoDal = formatDataPubblicazione(dataPubblicazione);

    const giaElaborato = await alreadyProcessed(directUrl);
    if (giaElaborato) {
      console.log(`Listino sigari del ${validoDal} già elaborato in precedenza (${directUrl}). Nessun nuovo dato.`);
    } else {
      documentiNuovi = 1;
      prezziInseriti += await processaListino(directUrl, dataPubblicazione);

      if (prezziInseriti === 0) {
        esito = "parziale";
        dettaglio = "File XLS scaricato ma nessuna riga valida estratta.";
      }
    }

    if (ultimaData) {
      const oggi = new Date().toISOString().slice(0, 10);
      const recupero = await recuperaListiniMancanti({ da: ultimaData, a: oggi });
      documentiTrovati = Math.max(documentiTrovati, recupero.trovati);
      documentiNuovi += recupero.nuovi;
      prezziInseriti += recupero.prezzi;
      if (recupero.errori > 0 && esito === "ok") {
        esito = "parziale";
        dettaglio = `${recupero.errori} listini intermedi non elaborati: vedi i log del backend.`;
      }
    }

    await pool.query(
      `UPDATE scrape_runs
       SET concluso_il = now(), documenti_trovati = $1, documenti_nuovi = $2,
           prezzi_inseriti = $3, esito = $4, dettaglio = $5
       WHERE id = $6`,
      [documentiTrovati, documentiNuovi, prezziInseriti, esito, dettaglio, runId]
    );

    console.log(
      `Scraping completato: link trovato=${documentiTrovati >= 1}, ${documentiNuovi} listini nuovi, ${prezziInseriti} prezzi inseriti/aggiornati.`
    );
  } catch (err) {
    await pool.query(
      `UPDATE scrape_runs SET concluso_il = now(), esito = 'errore', dettaglio = $1 WHERE id = $2`,
      [err.message, runId]
    );
    console.error("Ciclo di scraping fallito:", err.message);
    throw err;
  }
}

module.exports = { runScrapeCycle, recuperaListiniMancanti };
