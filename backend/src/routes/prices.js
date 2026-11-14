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

// Prezzo di riferimento per la variazione a 180 giorni: quello in vigore 180 giorni fa o,
// per i prodotti piu' recenti, il primo prezzo noto.
const LATERAL_PREZZO_BASE = `
  LEFT JOIN LATERAL (
    SELECT pr.prezzo_singolo
    FROM prices pr
    WHERE pr.product_id = p.id
    ORDER BY (pr.valido_dal <= CURRENT_DATE - 180) DESC,
             CASE WHEN pr.valido_dal <= CURRENT_DATE - 180 THEN pr.valido_dal END DESC NULLS LAST,
             pr.valido_dal ASC
    LIMIT 1
  ) base ON true`;

// Ordinamento nella query interna (che sceglie la pagina) e in quella esterna (che la rimette in ordine)
const ORDINAMENTI = {
  marca: { interno: "p.marca ASC, p.id ASC", esterno: "page.marca ASC, page.product_id ASC" },
  prezzo_asc: {
    interno: "latest.prezzo_singolo ASC NULLS LAST, p.marca ASC, p.id ASC",
    esterno: "page.prezzo_singolo ASC NULLS LAST, page.marca ASC, page.product_id ASC",
  },
  prezzo_desc: {
    interno: "latest.prezzo_singolo DESC NULLS LAST, p.marca ASC, p.id ASC",
    esterno: "page.prezzo_singolo DESC NULLS LAST, page.marca ASC, page.product_id ASC",
  },
  variazione: {
    interno: "variazione_180gg DESC NULLS LAST, p.marca ASC, p.id ASC",
    esterno: "page.variazione_180gg DESC NULLS LAST, page.marca ASC, page.product_id ASC",
  },
};

// Nei pattern LIKE i caratteri \ % _ digitati dall'utente valgono come testo, non come jolly
function escapeLike(testo) {
  return testo.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// GET /api/prices/search?q=cohiba&marca=Cohiba&provenienza=Cuba&sort=prezzo_desc&variati=1&page=1&pageSize=24
//   sort: marca (default) | prezzo_asc | prezzo_desc | variazione
//   variati=1: solo i prodotti il cui prezzo e' cambiato negli ultimi 180 giorni
router.get("/search", optionalAuth, async (req, res) => {
  const { q = "", categoria = "", marca = "", provenienza = "", page = "1", pageSize = "20" } = req.query;
  const ordine = ORDINAMENTI[req.query.sort] || ORDINAMENTI.marca;
  const soloVariati = req.query.variati === "1";

  const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 500);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

  // Solo i prodotti presenti nell'ultimo listino: con lo storico in archivio ci
  // sono anche prodotti usciti dalla tariffa, che non vanno proposti come attuali.
  const conditions = ["latest.valido_dal = (SELECT MAX(valido_dal) FROM prices)"];
  const params = [];

  if (q.trim()) {
    params.push(`%${escapeLike(q.trim().toLowerCase())}%`);
    const idx = params.length;
    conditions.push(
      `(LOWER(p.marca) LIKE $${idx} OR LOWER(COALESCE(p.formato, '')) LIKE $${idx} OR LOWER(COALESCE(p.codice_prodotto, '')) LIKE $${idx})`
    );
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

  if (soloVariati) {
    conditions.push("base.prezzo_singolo IS NOT NULL AND latest.prezzo_singolo IS DISTINCT FROM base.prezzo_singolo");
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  // L'ultimo cambio di prezzo e' calcolato solo sulla pagina di risultati, non su tutto il listino.
  const sql = `
    SELECT page.*, variazione.variazione_il, variazione.prezzo_precedente
    FROM (
      SELECT
        p.id AS product_id,
        p.marca,
        p.categoria,
        p.formato,
        p.provenienza,
        p.pezzi_per_confezione,
        p.codice_prodotto,
        latest.prezzo_confezione,
        latest.prezzo_singolo,
        latest.valido_dal,
        latest.fonte_url,
        CASE WHEN base.prezzo_singolo IS NOT NULL AND latest.prezzo_singolo IS NOT NULL
             THEN latest.prezzo_singolo - base.prezzo_singolo END AS variazione_180gg
      FROM products p
      JOIN LATERAL (
        SELECT prezzo_confezione, prezzo_singolo, valido_dal, fonte_url
        FROM prices pr
        WHERE pr.product_id = p.id
        ORDER BY pr.valido_dal DESC
        LIMIT 1
      ) latest ON true
      ${LATERAL_PREZZO_BASE}
      ${whereClause}
      ORDER BY ${ordine.interno}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    ) page
    LEFT JOIN LATERAL (
      SELECT storico.valido_dal AS variazione_il, storico.precedente AS prezzo_precedente
      FROM (
        SELECT valido_dal, prezzo_confezione,
               LEAD(prezzo_confezione) OVER (ORDER BY valido_dal DESC) AS precedente
        FROM prices pr
        WHERE pr.product_id = page.product_id
      ) storico
      WHERE storico.precedente IS NOT NULL AND storico.precedente <> storico.prezzo_confezione
      ORDER BY storico.valido_dal DESC
      LIMIT 1
    ) variazione ON true
    ORDER BY ${ordine.esterno};
  `;

  const countSql = `
    SELECT COUNT(*)::int AS totale
    FROM products p
    JOIN LATERAL (
      SELECT prezzo_singolo, valido_dal FROM prices pr WHERE pr.product_id = p.id ORDER BY pr.valido_dal DESC LIMIT 1
    ) latest ON true
    ${soloVariati ? LATERAL_PREZZO_BASE : ""}
    ${whereClause}`;

  try {
    const [{ rows }, conteggio] = await Promise.all([
      pool.query(sql, params),
      pool.query(countSql, params.slice(0, params.length - 2)),
    ]);

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

    res.json({ results, totale: conteggio.rows[0].totale, page: Number(page), pageSize: limit });
  } catch (err) {
    console.error("Errore ricerca prezzi:", err);
    res.status(500).json({ error: "Errore durante la ricerca." });
  }
});

// GET /api/prices/:productId/history?anni=5
// Storico dei prezzi dal piu' recente al piu' vecchio, limitato agli ultimi
// `anni` anni (default 5): i listini FIT disponibili partono dal gennaio 2023.
router.get("/:productId/history", async (req, res) => {
  const { productId } = req.params;
  const anni = Math.min(Math.max(parseInt(req.query.anni, 10) || 5, 1), 10);
  try {
    const { rows } = await pool.query(
      `SELECT prezzo_confezione, prezzo_singolo, valido_dal, fonte_url, fonte_documento
       FROM prices
       WHERE product_id = $1 AND valido_dal >= (CURRENT_DATE - make_interval(years => $2::int))
       ORDER BY valido_dal DESC`,
      [productId, anni]
    );
    res.json({ history: rows });
  } catch (err) {
    console.error("Errore storico prezzi:", err);
    res.status(500).json({ error: "Errore nel recupero dello storico." });
  }
});

module.exports = router;
