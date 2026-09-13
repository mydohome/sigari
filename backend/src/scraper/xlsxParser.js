const XLSX = require("xlsx");

// Esempio di valore nella colonna "Tipo di confezione": "Confezione da 20 pezzi"
const PACK_SIZE_REGEX = /(\d{1,3})\s*pezzi/i;

/**
 * Interpreta il foglio XLS dei sigari. Colonne attese (posizionali, come pubblicate da FIT):
 *   0: Categoria
 *   1: Codice prodotto (ADM)
 *   2: Denominazione commerciale (= marca/prodotto)
 *   3: Prezzo per Kg convenzionale (€)
 *   4: Prezzo per confezione (€)
 *   5: Tipo di confezione (es. "Confezione da 20 pezzi")
 *
 * Le prime righe del foglio sono note informative e intestazioni, non dati: le scartiamo
 * verificando che "categoria" sia esattamente "Sigari" e che il prezzo sia un numero.
 */
function parseSigariWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const results = [];

  for (const row of rows) {
    const [categoria, codice, denominazione, prezzoKg, prezzoConfezione, tipoConfezione] = row;

    if (String(categoria || "").trim().toLowerCase() !== "sigari") continue;

    const prezzo = typeof prezzoConfezione === "number" ? prezzoConfezione : parseFloat(prezzoConfezione);
    if (Number.isNaN(prezzo)) continue;

    const marca = String(denominazione || "").trim();
    if (!marca) continue;

    const packMatch = String(tipoConfezione || "").match(PACK_SIZE_REGEX);
    const pezzi = packMatch ? parseInt(packMatch[1], 10) : null;
    const prezzoSingolo = pezzi ? +(prezzo / pezzi).toFixed(4) : null;

    results.push({
      marca,
      categoria: "Sigari",
      formato: String(tipoConfezione || "").trim() || null,
      pezzi_per_confezione: pezzi,
      prezzo_confezione: prezzo,
      prezzo_singolo: prezzoSingolo,
      codice_prodotto: codice !== undefined && codice !== "" ? String(codice).trim() : null,
    });
  }

  return results;
}

module.exports = { parseSigariWorkbook };
