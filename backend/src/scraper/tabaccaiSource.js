const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Fonte dati: Federazione Italiana Tabaccai (FIT) - www.tabaccai.it
 *
 * FIT ripubblica in formato XLS/PDF, suddivisi per categoria di prodotto, i listini
 * ufficiali ADM ("I prezzi sono conformi alle tariffe pubblicate sul sito internet
 * dell'Agenzia delle Dogane e dei Monopoli"). Il file XLS dei "Sigari" è già filtrato
 * per categoria e strutturato in colonne pulite (categoria, codice, denominazione,
 * prezzo al kg, prezzo per confezione, tipo di confezione) — molto più semplice e
 * affidabile da interpretare rispetto ai PDF di determina pubblicati direttamente da ADM.
 *
 * La pagina cambia il nome/percorso del file ad ogni variazione di tariffa, incorporando
 * la data nel nome (es. /images/XLS/20260911/sigari_20260911.xls), quindi ad ogni ciclo
 * di scraping rileggiamo la pagina indice per trovare il link corrente.
 */

const TARIFFE_PAGE = "https://www.tabaccai.it/index.php/servizi/tariffe";
const USER_AGENT =
  "Mozilla/5.0 (compatible; TabacchiPrezziBot/1.0; +https://example.local/bot-info)";

async function fetchTariffePage() {
  const res = await axios.get(TARIFFE_PAGE, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "it-IT,it;q=0.9" },
    timeout: 20000,
  });
  return res.data;
}

/**
 * Cerca nella pagina "Tariffe" il link diretto al file XLS della categoria "Sigari".
 * I link nella pagina puntano a un wrapper (/index.php/download?url=...) che fa un
 * redirect JS: estraiamo il percorso reale dal parametro "url" e costruiamo l'URL
 * statico diretto, molto più affidabile da scaricare via HTTP.
 *
 * Ritorna { directUrl, dataPubblicazione } oppure null se non trovato.
 */
function findSigariXlsLink(html) {
  const $ = cheerio.load(html);
  let found = null;

  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    // Esempio di href: https://www.tabaccai.it/index.php/download?url=/images/XLS/20260911/sigari_20260911.xls
    const match = href.match(/url=([^"&]*\/XLS\/(\d{8})\/sigari_\2\.xls)/i);
    if (match) {
      const relativePath = decodeURIComponent(match[1]);
      found = {
        directUrl: `https://www.tabaccai.it${relativePath}`,
        dataPubblicazione: match[2], // formato YYYYMMDD
      };
    }
  });

  return found;
}

async function downloadXls(url) {
  const res = await axios.get(url, {
    headers: { "User-Agent": USER_AGENT },
    responseType: "arraybuffer",
    timeout: 30000,
  });
  return Buffer.from(res.data);
}

function formatDataPubblicazione(yyyymmdd) {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

module.exports = {
  TARIFFE_PAGE,
  fetchTariffePage,
  findSigariXlsLink,
  downloadXls,
  formatDataPubblicazione,
};
