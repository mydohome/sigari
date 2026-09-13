const pool = require("../db/pool");
const {
  fetchTariffePage,
  findSigariXlsLink,
  downloadXls,
  formatDataPubblicazione,
} = require("./tabaccaiSource");
const { parseSigariWorkbook } = require("./xlsxParser");

async function alreadyProcessed(url) {
  const { rows } = await pool.query(
    "SELECT 1 FROM scraped_documents WHERE url = $1",
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

async function upsertProductAndPrice(row, fonteUrl, fonteDocumento, validoDal) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const productRes = await client.query(
      `INSERT INTO products (marca, categoria, formato, pezzi_per_confezione, codice_prodotto)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (marca, categoria, formato) DO UPDATE
         SET pezzi_per_confezione = COALESCE(EXCLUDED.pezzi_per_confezione, products.pezzi_per_confezione),
             codice_prodotto = COALESCE(EXCLUDED.codice_prodotto, products.codice_prodotto)
       RETURNING id`,
      [row.marca, row.categoria, row.formato, row.pezzi_per_confezione, row.codice_prodotto]
    );
    const productId = productRes.rows[0].id;

    await client.query(
      `INSERT INTO prices (product_id, prezzo_confezione, prezzo_singolo, valido_dal, fonte_url, fonte_documento)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (product_id, valido_dal) DO UPDATE
         SET prezzo_confezione = EXCLUDED.prezzo_confezione,
             prezzo_singolo = EXCLUDED.prezzo_singolo,
             fonte_url = EXCLUDED.fonte_url,
             fonte_documento = EXCLUDED.fonte_documento`,
      [
        productId,
        row.prezzo_confezione,
        row.prezzo_singolo,
        validoDal,
        fonteUrl,
        fonteDocumento,
      ]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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
      const buffer = await downloadXls(directUrl);
      const rows = parseSigariWorkbook(buffer);

      for (const row of rows) {
        await upsertProductAndPrice(row, directUrl, `Listino Sigari FIT del ${validoDal}`, validoDal);
        prezziInseriti++;
      }

      await markProcessed(
        directUrl,
        `Listino Sigari FIT del ${validoDal}`,
        rows.length,
        rows.length > 0 ? "ok" : "parziale",
        rows.length === 0
          ? "Nessuna riga 'Sigari' riconosciuta nel file XLS: verificare la struttura del foglio."
          : null
      );

      if (rows.length === 0) {
        esito = "parziale";
        dettaglio = "File XLS scaricato ma nessuna riga valida estratta.";
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
      `Scraping completato: link trovato=${documentiTrovati === 1}, nuovo=${documentiNuovi === 1}, ${prezziInseriti} prezzi inseriti/aggiornati.`
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

module.exports = { runScrapeCycle };
