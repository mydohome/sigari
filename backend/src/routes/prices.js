const express = require("express");
const pool = require("../db/pool");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/prices/autocomplete?q=coh
router.get("/autocomplete", async (req, res) => {
  const { q = "" } = req.query;
  const term = q.trim();
  if (term.length < 2) return res.json({ suggerimenti: [] });

  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT marca
       FROM products
       WHERE LOWER(marca) LIKE $1
       ORDER BY marca ASC
       LIMIT 8`,
      [`${term.toLowerCase()}%`]
    );
    res.json({ suggerimenti: rows.map((r) => r.marca) });
  } catch (err) {
    console.error("Errore autocompletamento:", err);
    res.status(500).json({ error: "Errore nell'autocompletamento." });
  }
});

// GET /api/prices/search?q=marlboro&categoria=Sigarette&marca=Cohiba&provenienza=Cuba&page=1&pageSize=20
router.get("/search", optionalAuth, async (req, res) => {
  const { q = "", categoria = "", marca = "", provenienza = "", page = "1", pageSize = "20" } = req.query;

  const limit = Math.min(parseInt(pageSize, 10) || 20, 100);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

  const conditions = [];
  const params = [];

  if (q.trim()) {
    params.push(`%${q.trim().toLowerCase()}%`);
    conditions.push(`LOWER(p.marca) LIKE $${params.length}`);
  }
  if (marca.trim()) {
    params.push(marca.trim());
    conditions.push(`p.marca = $${params.length}`);
  }
  if (categoria.trim()) {
    params.push(categoria.trim());
    conditions.push(`p.categoria = $${params.length}`);
  }
  if (provenienza.trim()) {
    params.push(provenienza.trim());
    conditions.push(`p.provenienza = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const sql = `
    SELECT
      p.id AS product_id,
      p.marca,
      p.categoria,
      p.formato,
      p.provenienza,
      p.pezzi_per_confezione,
      latest.prezzo_confezione,
      latest.prezzo_singolo,
      latest.valido_dal,
      latest.fonte_url
    FROM products p
    JOIN LATERAL (
      SELECT prezzo_confezione, prezzo_singolo, valido_dal, fonte_url
      FROM prices pr
      WHERE pr.product_id = p.id
      ORDER BY pr.valido_dal DESC
      LIMIT 1
    ) latest ON true
    ${whereClause}
    ORDER BY p.marca ASC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  try {
    const { rows } = await pool.query(sql, params);

    let preferitiIds = new Set();
    let wishlistIds = new Set();

    if (req.userId && rows.length > 0) {
      const productIds = rows.map((r) => r.product_id);
      const [fav, wish] = await Promise.all([
        pool.query(
          "SELECT product_id FROM favorites WHERE user_id = $1 AND product_id = ANY($2::int[])",
          [req.userId, productIds]
        ),
        pool.query(
          "SELECT product_id FROM wishlist_items WHERE user_id = $1 AND product_id = ANY($2::int[])",
          [req.userId, productIds]
        ),
      ]);
      preferitiIds = new Set(fav.rows.map((r) => r.product_id));
      wishlistIds = new Set(wish.rows.map((r) => r.product_id));
    }

    const results = rows.map((r) => ({
      ...r,
      preferito: preferitiIds.has(r.product_id),
      in_wishlist: wishlistIds.has(r.product_id),
    }));

    res.json({ results, page: Number(page), pageSize: limit });
  } catch (err) {
    console.error("Errore ricerca prezzi:", err);
    res.status(500).json({ error: "Errore durante la ricerca." });
  }
});

// GET /api/prices/:productId/history
router.get("/:productId/history", async (req, res) => {
  const { productId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT prezzo_confezione, prezzo_singolo, valido_dal, fonte_url, fonte_documento
       FROM prices
       WHERE product_id = $1
       ORDER BY valido_dal DESC`,
      [productId]
    );
    res.json({ history: rows });
  } catch (err) {
    console.error("Errore storico prezzi:", err);
    res.status(500).json({ error: "Errore nel recupero dello storico." });
  }
});

// GET /api/prices/categorie
router.get("/meta/categorie", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT categoria FROM products ORDER BY categoria ASC`
    );
    res.json({ categorie: rows.map((r) => r.categoria) });
  } catch (err) {
    console.error("Errore recupero categorie:", err);
    res.status(500).json({ error: "Errore nel recupero delle categorie." });
  }
});

// GET /api/prices/meta/marche
router.get("/meta/marche", async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT DISTINCT marca FROM products ORDER BY marca ASC`);
    res.json({ marche: rows.map((r) => r.marca) });
  } catch (err) {
    console.error("Errore recupero marche:", err);
    res.status(500).json({ error: "Errore nel recupero delle marche." });
  }
});

// GET /api/prices/meta/provenienze
router.get("/meta/provenienze", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT provenienza FROM products WHERE provenienza IS NOT NULL ORDER BY provenienza ASC`
    );
    res.json({ provenienze: rows.map((r) => r.provenienza) });
  } catch (err) {
    console.error("Errore recupero provenienze:", err);
    res.status(500).json({ error: "Errore nel recupero delle provenienze." });
  }
});

module.exports = router;
