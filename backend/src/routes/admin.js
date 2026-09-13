const express = require("express");
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const pool = require("../db/pool");
const { runScrapeCycle } = require("../scraper");
const { classificaProvenienza } = require("../data/provenienze");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function requireAdmin(req, res, next) {
  const token = req.header("x-admin-token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "Token amministrativo mancante o non valido." });
  }
  next();
}

// GET /api/admin/status - ultimi cicli di scraping e documenti elaborati
router.get("/status", requireAdmin, async (_req, res) => {
  try {
    const runs = await pool.query(
      `SELECT * FROM scrape_runs ORDER BY iniziato_il DESC LIMIT 10`
    );
    const docs = await pool.query(
      `SELECT * FROM scraped_documents ORDER BY elaborato_il DESC LIMIT 20`
    );
    res.json({ ultimi_cicli: runs.rows, ultimi_documenti: docs.rows });
  } catch (err) {
    console.error("Errore stato admin:", err);
    res.status(500).json({ error: "Errore nel recupero dello stato." });
  }
});

// POST /api/admin/scrape-now - forza un ciclo di scraping immediato
router.post("/scrape-now", requireAdmin, async (_req, res) => {
  try {
    // Non attendiamo il completamento nella risposta HTTP: puo' richiedere tempo.
    runScrapeCycle().catch((err) =>
      console.error("Scraping manuale fallito:", err.message)
    );
    res.json({ message: "Ciclo di scraping avviato in background. Controlla /api/admin/status." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/import-csv
 * Fallback manuale finche' il parser automatico dei PDF non e' sufficientemente affidabile.
 * CSV atteso con intestazioni:
 * marca,categoria,formato,pezzi_per_confezione,prezzo_confezione,valido_dal,fonte_url
 */
router.post("/import-csv", requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nessun file CSV caricato (campo 'file')." });

  try {
    const records = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    let inseriti = 0;
    for (const rec of records) {
      const marca = rec.marca?.trim();
      const categoria = rec.categoria?.trim();
      const formato = rec.formato?.trim() || null;
      const pezzi = rec.pezzi_per_confezione ? parseInt(rec.pezzi_per_confezione, 10) : null;
      const prezzoConfezione = parseFloat(String(rec.prezzo_confezione).replace(",", "."));
      const validoDal = rec.valido_dal?.trim() || new Date().toISOString().slice(0, 10);
      const fonteUrl = rec.fonte_url?.trim() || "import-manuale-csv";
      const codiceProdotto = rec.codice_prodotto?.trim() || null;

      if (!marca || !categoria || Number.isNaN(prezzoConfezione)) continue;

      const prezzoSingolo = pezzi ? +(prezzoConfezione / pezzi).toFixed(4) : null;

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const productRes = await client.query(
          `INSERT INTO products (marca, categoria, formato, pezzi_per_confezione, codice_prodotto, provenienza)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (marca, categoria, formato) DO UPDATE
             SET pezzi_per_confezione = COALESCE(EXCLUDED.pezzi_per_confezione, products.pezzi_per_confezione),
                 codice_prodotto = COALESCE(EXCLUDED.codice_prodotto, products.codice_prodotto)
           RETURNING id`,
          [marca, categoria, formato, pezzi, codiceProdotto, classificaProvenienza(marca)]
        );
        const productId = productRes.rows[0].id;

        await client.query(
          `INSERT INTO prices (product_id, prezzo_confezione, prezzo_singolo, valido_dal, fonte_url, fonte_documento)
           VALUES ($1, $2, $3, $4, $5, 'import-manuale-csv')
           ON CONFLICT (product_id, valido_dal) DO UPDATE
             SET prezzo_confezione = EXCLUDED.prezzo_confezione,
                 prezzo_singolo = EXCLUDED.prezzo_singolo,
                 fonte_url = EXCLUDED.fonte_url`,
          [productId, prezzoConfezione, prezzoSingolo, validoDal, fonteUrl]
        );
        await client.query("COMMIT");
        inseriti++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("Errore import riga CSV:", rec, err.message);
      } finally {
        client.release();
      }
    }

    res.json({ message: `Import completato: ${inseriti} righe inserite/aggiornate su ${records.length}.` });
  } catch (err) {
    console.error("Errore import CSV:", err);
    res.status(500).json({ error: "Errore nella lettura del CSV." });
  }
});

// PATCH /api/admin/products/:id/provenienza { provenienza } - correzione manuale
// per i casi in cui la classificazione automatica per marca sbaglia.
router.patch("/products/:id/provenienza", requireAdmin, async (req, res) => {
  const { provenienza } = req.body || {};
  if (!provenienza || !provenienza.trim()) {
    return res.status(400).json({ error: "provenienza richiesta." });
  }
  try {
    const result = await pool.query(
      "UPDATE products SET provenienza = $1 WHERE id = $2 RETURNING id",
      [provenienza.trim(), req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Prodotto non trovato." });
    res.json({ message: "Provenienza aggiornata." });
  } catch (err) {
    console.error("Errore aggiornamento provenienza:", err);
    res.status(500).json({ error: "Errore nell'aggiornamento della provenienza." });
  }
});

module.exports = router;
