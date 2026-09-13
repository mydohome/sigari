const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/wishlist - elenco con quantita', prezzo di linea e totale complessivo
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         w.quantita,
         w.created_at AS aggiunto_il,
         p.id AS product_id,
         p.marca,
         p.categoria,
         p.formato,
         p.pezzi_per_confezione,
         latest.prezzo_confezione,
         latest.prezzo_singolo,
         latest.valido_dal,
         (latest.prezzo_confezione * w.quantita) AS prezzo_totale_riga
       FROM wishlist_items w
       JOIN products p ON p.id = w.product_id
       JOIN LATERAL (
         SELECT prezzo_confezione, prezzo_singolo, valido_dal
         FROM prices pr
         WHERE pr.product_id = p.id
         ORDER BY pr.valido_dal DESC
         LIMIT 1
       ) latest ON true
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.userId]
    );

    const totaleComplessivo = rows.reduce(
      (sum, r) => sum + parseFloat(r.prezzo_totale_riga || 0),
      0
    );

    res.json({
      articoli: rows,
      totale_complessivo: +totaleComplessivo.toFixed(2),
    });
  } catch (err) {
    console.error("Errore elenco wishlist:", err);
    res.status(500).json({ error: "Errore nel recupero della wishlist." });
  }
});

// POST /api/wishlist { product_id, quantita? } - aggiunge o aggiorna la quantita'
router.post("/", async (req, res) => {
  const { product_id, quantita } = req.body || {};
  if (!product_id) return res.status(400).json({ error: "product_id richiesto." });

  const qty = Math.max(1, parseInt(quantita, 10) || 1);

  try {
    await pool.query(
      `INSERT INTO wishlist_items (user_id, product_id, quantita)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id) DO UPDATE SET quantita = EXCLUDED.quantita`,
      [req.userId, product_id, qty]
    );
    res.status(201).json({ message: "Aggiunto alla wishlist." });
  } catch (err) {
    console.error("Errore aggiunta wishlist:", err);
    res.status(500).json({ error: "Errore nell'aggiunta alla wishlist." });
  }
});

// PATCH /api/wishlist/:productId { quantita }
router.patch("/:productId", async (req, res) => {
  const qty = Math.max(1, parseInt(req.body?.quantita, 10) || 1);
  try {
    const result = await pool.query(
      `UPDATE wishlist_items SET quantita = $1 WHERE user_id = $2 AND product_id = $3 RETURNING id`,
      [qty, req.userId, req.params.productId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Articolo non trovato nella wishlist." });
    res.json({ message: "Quantità aggiornata." });
  } catch (err) {
    console.error("Errore aggiornamento quantita:", err);
    res.status(500).json({ error: "Errore nell'aggiornamento della quantità." });
  }
});

// DELETE /api/wishlist/:productId
router.delete("/:productId", async (req, res) => {
  try {
    await pool.query("DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2", [
      req.userId,
      req.params.productId,
    ]);
    res.json({ message: "Rimosso dalla wishlist." });
  } catch (err) {
    console.error("Errore rimozione wishlist:", err);
    res.status(500).json({ error: "Errore nella rimozione dalla wishlist." });
  }
});

module.exports = router;
