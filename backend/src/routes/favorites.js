const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/favorites - elenco preferiti dell'utente, con prezzo corrente
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         f.tag,
         f.created_at AS aggiunto_il,
         p.id AS product_id,
         p.marca,
         p.categoria,
         p.formato,
         p.pezzi_per_confezione,
         latest.prezzo_confezione,
         latest.prezzo_singolo,
         latest.valido_dal
       FROM favorites f
       JOIN products p ON p.id = f.product_id
       JOIN LATERAL (
         SELECT prezzo_confezione, prezzo_singolo, valido_dal
         FROM prices pr
         WHERE pr.product_id = p.id
         ORDER BY pr.valido_dal DESC
         LIMIT 1
       ) latest ON true
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [req.userId]
    );
    res.json({ preferiti: rows });
  } catch (err) {
    console.error("Errore elenco preferiti:", err);
    res.status(500).json({ error: "Errore nel recupero dei preferiti." });
  }
});

// POST /api/favorites { product_id, tag? } - aggiunge o aggiorna un preferito
router.post("/", async (req, res) => {
  const { product_id, tag } = req.body || {};
  if (!product_id) return res.status(400).json({ error: "product_id richiesto." });

  try {
    await pool.query(
      `INSERT INTO favorites (user_id, product_id, tag)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id) DO UPDATE SET tag = EXCLUDED.tag`,
      [req.userId, product_id, tag || null]
    );
    res.status(201).json({ message: "Aggiunto ai preferiti." });
  } catch (err) {
    console.error("Errore aggiunta preferito:", err);
    res.status(500).json({ error: "Errore nell'aggiunta ai preferiti." });
  }
});

// PATCH /api/favorites/:productId { tag } - aggiorna solo il tag
router.patch("/:productId", async (req, res) => {
  const { tag } = req.body || {};
  try {
    const result = await pool.query(
      `UPDATE favorites SET tag = $1 WHERE user_id = $2 AND product_id = $3 RETURNING id`,
      [tag || null, req.userId, req.params.productId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Preferito non trovato." });
    res.json({ message: "Tag aggiornato." });
  } catch (err) {
    console.error("Errore aggiornamento tag:", err);
    res.status(500).json({ error: "Errore nell'aggiornamento del tag." });
  }
});

// DELETE /api/favorites/:productId
router.delete("/:productId", async (req, res) => {
  try {
    await pool.query("DELETE FROM favorites WHERE user_id = $1 AND product_id = $2", [
      req.userId,
      req.params.productId,
    ]);
    res.json({ message: "Rimosso dai preferiti." });
  } catch (err) {
    console.error("Errore rimozione preferito:", err);
    res.status(500).json({ error: "Errore nella rimozione dai preferiti." });
  }
});

module.exports = router;
