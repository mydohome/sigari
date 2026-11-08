const express = require("express");
const XLSX = require("xlsx");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const FMT_DATA = "dd/mm/yyyy";
const FMT_EURO = '#,##0.00 "€"';

// "YYYY-MM-DD" (le colonne DATE arrivano come stringa, vedi db/pool.js) -> Date UTC,
// cosi' Excel la riconosce come vera data e non come testo.
function toDate(str) {
  if (!str) return null;
  const [y, m, d] = String(str).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function minutiDaOra(ora) {
  const [h, m] = String(ora).split(":");
  return Number(h) * 60 + Number(m);
}

function durataMinuti(inizio, fine) {
  if (!inizio || !fine) return null;
  const diff = minutiDaOra(fine) - minutiDaOra(inizio);
  return diff >= 0 ? diff : null;
}

const hhmm = (ora) => (ora ? String(ora).slice(0, 5) : null);

// Costruisce un foglio da intestazioni + righe, applicando larghezze colonna,
// formati (per indice di colonna) e filtro automatico sulle righe di dati.
function creaFoglio(intestazioni, righe, { formati = {}, larghezze = [], totali = null } = {}) {
  const dati = [intestazioni, ...righe];
  if (totali) dati.push([], totali);
  const ws = XLSX.utils.aoa_to_sheet(dati, { cellDates: true });

  ws["!cols"] = intestazioni.map((h, i) => ({ wch: larghezze[i] || Math.max(h.length + 2, 12) }));

  for (let r = 1; r <= righe.length; r++) {
    for (const [col, fmt] of Object.entries(formati)) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: Number(col) })];
      if (cell) cell.z = fmt;
    }
  }
  if (totali) {
    const rt = righe.length + 2;
    for (const [col, fmt] of Object.entries(formati)) {
      const cell = ws[XLSX.utils.encode_cell({ r: rt, c: Number(col) })];
      if (cell && cell.t === "n") cell.z = fmt;
    }
  }
  if (righe.length) {
    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({ r: 0, c: 0 }, { r: righe.length, c: intestazioni.length - 1 }),
    };
  }
  return ws;
}

async function foglioSigari(userId) {
  const { rows } = await pool.query(
    `SELECT hi.data_acquisto, hi.prezzo_acquisto, hi.quantita_iniziale, hi.quantita_rimanente, hi.note,
            p.marca, p.categoria, p.formato, p.provenienza,
            s.nome AS shop_nome, s.indirizzo AS shop_indirizzo,
            l.nome AS location_nome
     FROM humidor_items hi
     JOIN products p ON p.id = hi.product_id
     LEFT JOIN humidor_shops s ON s.id = hi.shop_id
     LEFT JOIN humidor_locations l ON l.id = hi.location_id
     WHERE hi.user_id = $1 AND hi.quantita_rimanente > 0
     ORDER BY p.marca ASC, hi.data_acquisto DESC, hi.id DESC`,
    [userId]
  );

  const intestazioni = [
    "Marca", "Categoria", "Formato", "Provenienza", "Location", "Tabaccheria",
    "Indirizzo tabaccheria", "Data acquisto", "Prezzo unitario", "Qtà acquistata",
    "Qtà posseduta", "Valore posseduto", "Note",
  ];
  let totQta = 0;
  let totValore = 0;
  const righe = rows.map((r) => {
    const prezzo = Number(r.prezzo_acquisto);
    const valore = Number((prezzo * r.quantita_rimanente).toFixed(2));
    totQta += r.quantita_rimanente;
    totValore += valore;
    return [
      r.marca, r.categoria, r.formato, r.provenienza, r.location_nome, r.shop_nome,
      r.shop_indirizzo, toDate(r.data_acquisto), prezzo, r.quantita_iniziale,
      r.quantita_rimanente, valore, r.note,
    ];
  });

  return creaFoglio(intestazioni, righe, {
    formati: { 7: FMT_DATA, 8: FMT_EURO, 11: FMT_EURO },
    larghezze: [24, 14, 22, 14, 14, 24, 32, 14, 14, 14, 14, 16, 30],
    totali: ["TOTALE", null, null, null, null, null, null, null, null, null, totQta, Number(totValore.toFixed(2))],
  });
}

async function foglioFumate(userId) {
  const { rows } = await pool.query(
    `SELECT f.data_fumata, f.quantita, f.ora_inizio, f.ora_fine, f.riaccensioni,
            p.marca, p.categoria, p.formato, p.provenienza,
            l.nome AS location_nome, s.nome AS shop_nome, hi.prezzo_acquisto,
            r.stelle, r.descrizione
     FROM humidor_fumate f
     JOIN products p ON p.id = f.product_id
     LEFT JOIN humidor_items hi ON hi.id = f.humidor_item_id
     LEFT JOIN humidor_locations l ON l.id = hi.location_id
     LEFT JOIN humidor_shops s ON s.id = hi.shop_id
     LEFT JOIN humidor_reviews r ON r.user_id = f.user_id AND r.product_id = f.product_id
     WHERE f.user_id = $1
     ORDER BY f.data_fumata DESC, f.id DESC`,
    [userId]
  );

  const intestazioni = [
    "Data", "Marca", "Categoria", "Formato", "Provenienza", "Quantità", "Ora inizio",
    "Ora fine", "Durata (min)", "Riaccensioni", "Location", "Tabaccheria",
    "Prezzo unitario", "Voto (stelle)", "Recensione",
  ];
  let totQta = 0;
  const righe = rows.map((r) => {
    totQta += r.quantita;
    return [
      toDate(r.data_fumata), r.marca, r.categoria, r.formato, r.provenienza, r.quantita,
      hhmm(r.ora_inizio), hhmm(r.ora_fine), durataMinuti(r.ora_inizio, r.ora_fine),
      r.riaccensioni, r.location_nome, r.shop_nome,
      r.prezzo_acquisto != null ? Number(r.prezzo_acquisto) : null,
      r.stelle, r.descrizione,
    ];
  });

  return creaFoglio(intestazioni, righe, {
    formati: { 0: FMT_DATA, 12: FMT_EURO },
    larghezze: [13, 24, 14, 22, 14, 10, 11, 10, 13, 13, 14, 24, 15, 13, 40],
    totali: ["TOTALE", null, null, null, null, totQta],
  });
}

// GET /api/export/xlsx?tipo=tutto|sigari|fumate
//  - sigari: sigari attualmente posseduti (lotti con quantita > 0)
//  - fumate: storico completo delle fumate
//  - tutto: entrambi, in due fogli dello stesso file
router.get("/xlsx", async (req, res) => {
  const tipo = req.query.tipo || "tutto";
  if (!["tutto", "sigari", "fumate"].includes(tipo)) {
    return res.status(400).json({ error: "Parametro 'tipo' non valido (tutto, sigari, fumate)." });
  }

  try {
    const wb = XLSX.utils.book_new();
    if (tipo === "tutto" || tipo === "sigari") {
      XLSX.utils.book_append_sheet(wb, await foglioSigari(req.userId), "Sigari posseduti");
    }
    if (tipo === "tutto" || tipo === "fumate") {
      XLSX.utils.book_append_sheet(wb, await foglioFumate(req.userId), "Fumate");
    }

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellDates: true });
    const nomi = { tutto: "humidor", sigari: "sigari-posseduti", fumate: "fumate" };
    const filename = `${nomi[tipo]}-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("Errore export Excel:", err);
    res.status(500).json({ error: "Errore nella generazione del file Excel." });
  }
});

module.exports = router;
