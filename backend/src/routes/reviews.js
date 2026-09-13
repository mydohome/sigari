const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { generateReview, getAllowedDomains } = require("../reviews/anthropicClient");

const router = express.Router();

// GET /api/reviews/sources - fonti attualmente configurate (pubblico, solo informativo)
router.get("/sources", (_req, res) => {
  res.json({ fonti_consentite: getAllowedDomains() });
});

// GET /api/reviews/:productId - recensione salvata, se esiste
router.get("/:productId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT testo, fonti, generato_il, modello FROM reviews WHERE product_id = $1`,
      [req.params.productId]
    );
    res.json({ recensione: rows[0] || null });
  } catch (err) {
    console.error("Errore lettura recensione:", err);
    res.status(500).json({ error: "Errore nel recupero della recensione." });
  }
});

// POST /api/reviews/:productId/generate - genera (o rigenera) la recensione. Richiede login.
router.post("/:productId/generate", requireAuth, async (req, res) => {
  try {
    const productRes = await pool.query(
      `SELECT marca, categoria, formato FROM products WHERE id = $1`,
      [req.params.productId]
    );
    const product = productRes.rows[0];
    if (!product) return res.status(404).json({ error: "Prodotto non trovato." });

    const { testo, fonti, modello } = await generateReview(product);

    if (!testo) {
      return res.status(502).json({ error: "Nessun testo generato dal modello. Riprova." });
    }

    const result = await pool.query(
      `INSERT INTO reviews (product_id, testo, fonti, generato_il, modello)
       VALUES ($1, $2, $3, now(), $4)
       ON CONFLICT (product_id) DO UPDATE
         SET testo = EXCLUDED.testo, fonti = EXCLUDED.fonti,
             generato_il = now(), modello = EXCLUDED.modello
       RETURNING testo, fonti, generato_il, modello`,
      [req.params.productId, testo, JSON.stringify(fonti), modello]
    );

    res.json({ recensione: result.rows[0] });
  } catch (err) {
    console.error("Errore generazione recensione:", err.response?.data || err.message);
    res.status(500).json({
      error:
        "Errore nella generazione della recensione. Verifica che ANTHROPIC_API_KEY sia configurata correttamente.",
    });
  }
});

module.exports = router;
