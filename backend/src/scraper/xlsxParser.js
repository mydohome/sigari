const XLSX = require("xlsx");

// Esempio di valore nella colonna "Tipo di confezione": "Confezione da 20 pezzi"
const PACK_SIZE_REGEX = /(\d{1,3})\s*pezzi/i;

// Colonne di default (posizionali), come nei listini FIT piu' comuni.
const COLONNE_DEFAULT = { categoria: 0, codice: 1, denominazione: 2, prezzoConfezione: 4, tipo: 5 };

// Alcuni listini hanno una colonna vuota in piu' davanti (o altre variazioni):
// se troviamo la riga d'intestazione usiamo le posizioni reali, altrimenti il default.
function trovaColonne(rows) {
  for (const row of rows) {
    const celle = row.map((c) => String(c).trim().toLowerCase());
    const categoria = celle.indexOf("categoria");
    const denominazione = celle.findIndex((c) => c.startsWith("denominazione"));
    if (categoria === -1 || denominazione === -1) continue;
    const colonne = {
      categoria,
      codice: celle.findIndex((c) => c.startsWith("codice")),
      denominazione,
      prezzoConfezione: celle.findIndex((c) => c.startsWith("prezzo per conf")),
      tipo: celle.findIndex((c) => c.startsWith("tipo")),
    };
    if (Object.values(colonne).every((i) => i !== -1)) return colonne;
  }
  return COLONNE_DEFAULT;
}

// Accetta numeri veri o testo in formato italiano ("2.400,00", "240,00").
function parseNumero(valore) {
  if (typeof valore === "number") return valore;
  const testo = String(valore ?? "").trim();
  if (!testo) return NaN;
  return parseFloat(testo.includes(",") ? testo.replace(/\./g, "").replace(",", ".") : testo);
}

/**
 * Interpreta il foglio XLS dei sigari. Colonne (individuate dall'intestazione, con
 * fallback posizionale): Categoria, Codice prodotto (ADM), Denominazione commerciale
 * (= marca/prodotto), Prezzo per Kg convenzionale (€), Prezzo per confezione (€),
 * Tipo di confezione (es. "Confezione da 20 pezzi").
 *
 * Le prime righe del foglio sono note informative e intestazioni, non dati: le scartiamo
 * verificando che "categoria" sia esattamente "Sigari" e che il prezzo sia un numero.
 */
function parseSigariWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const col = trovaColonne(rows);

  const results = [];

  for (const row of rows) {
    const categoria = row[col.categoria];
    const codice = row[col.codice];
    const denominazione = row[col.denominazione];
    const prezzoConfezione = row[col.prezzoConfezione];
    const tipoConfezione = row[col.tipo];

    if (String(categoria || "").trim().toLowerCase() !== "sigari") continue;

    const prezzo = parseNumero(prezzoConfezione);
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
