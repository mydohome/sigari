const express = require("express");
const axios = require("axios");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// Trova una tabaccheria gia' salvata (stesso nome+indirizzo) o ne crea una nuova.
// `shop` puo' essere { id } per riusarne una esistente, oppure
// { nome, indirizzo?, lat?, lon?, osm_id? } per crearla/recuperarla.
async function findOrCreateShop(client, userId, shop) {
  if (!shop) return null;
  if (shop.id) {
    const { rows } = await client.query("SELECT id FROM humidor_shops WHERE id = $1", [shop.id]);
    return rows[0]?.id ?? null;
  }

  const nome = (shop.nome || "").trim();
  if (!nome) return null;
  const indirizzo = shop.indirizzo ? shop.indirizzo.trim() : null;

  const existing = await client.query(
    `SELECT id FROM humidor_shops WHERE LOWER(nome) = LOWER($1) AND COALESCE(indirizzo, '') = COALESCE($2, '')`,
    [nome, indirizzo]
  );
  if (existing.rows.length) return existing.rows[0].id;

  const inserted = await client.query(
    `INSERT INTO humidor_shops (nome, indirizzo, lat, lon, osm_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [nome, indirizzo, shop.lat ?? null, shop.lon ?? null, shop.osm_id ?? null, userId]
  );
  return inserted.rows[0].id;
}

// GET /api/humidor/shops?q=ross - tabaccherie gia' salvate che matchano il nome
router.get("/shops", async (req, res) => {
  const term = (req.query.q || "").trim();
  try {
    const { rows } = await pool.query(
      term.length >= 2
        ? `SELECT id, nome, indirizzo FROM humidor_shops WHERE LOWER(nome) LIKE $1 ORDER BY nome ASC LIMIT 8`
        : `SELECT id, nome, indirizzo FROM humidor_shops ORDER BY nome ASC LIMIT 20`,
      term.length >= 2 ? [`%${term.toLowerCase()}%`] : []
    );
    res.json({ tabaccherie: rows });
  } catch (err) {
    console.error("Errore elenco tabaccherie:", err);
    res.status(500).json({ error: "Errore nel recupero delle tabaccherie." });
  }
});

// GET /api/humidor/shops/search-external?q=... - geocodifica via OpenStreetMap/Nominatim
router.get("/shops/search-external", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (q.length < 3) return res.json({ risultati: [] });

  try {
    const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q, format: "jsonv2", addressdetails: 1, limit: 6, countrycodes: "it" },
      headers: { "User-Agent": "SigariItaliaApp/1.0 (app personale, gestione humidor)" },
      timeout: 8000,
    });
    const risultati = (data || []).map((r) => ({
      nome: r.name || r.display_name.split(",")[0],
      indirizzo: r.display_name,
      lat: Number(r.lat),
      lon: Number(r.lon),
      osm_id: `${r.osm_type}/${r.osm_id}`,
    }));
    res.json({ risultati });
  } catch (err) {
    console.error("Errore ricerca Nominatim:", err.message);
    res.status(502).json({ error: "Servizio di ricerca indirizzi non disponibile al momento." });
  }
});

// Recupera l'id della location proposta di default ("Humidor") quando
// l'utente non ne sceglie una esplicitamente.
async function getDefaultLocationId(client) {
  const { rows } = await client.query(
    "SELECT id FROM humidor_locations WHERE nome = 'Humidor' LIMIT 1"
  );
  return rows[0]?.id ?? null;
}

// GET /api/humidor/items?all=1 - inventario dell'utente
router.get("/items", async (req, res) => {
  const includeVuoti = req.query.all === "1";
  try {
    const { rows } = await pool.query(
      `SELECT
         hi.id, hi.prezzo_acquisto, hi.data_acquisto, hi.quantita_iniziale,
         hi.quantita_rimanente, hi.note,
         p.id AS product_id, p.marca, p.categoria, p.formato,
         s.id AS shop_id, s.nome AS shop_nome, s.indirizzo AS shop_indirizzo,
         l.id AS location_id, l.nome AS location_nome, l.colore AS location_colore
       FROM humidor_items hi
       JOIN products p ON p.id = hi.product_id
       LEFT JOIN humidor_shops s ON s.id = hi.shop_id
       LEFT JOIN humidor_locations l ON l.id = hi.location_id
       WHERE hi.user_id = $1 ${includeVuoti ? "" : "AND hi.quantita_rimanente > 0"}
       ORDER BY hi.data_acquisto DESC, hi.id DESC`,
      [req.userId]
    );
    res.json({ items: rows });
  } catch (err) {
    console.error("Errore elenco humidor:", err);
    res.status(500).json({ error: "Errore nel recupero dell'humidor." });
  }
});

// GET /api/humidor/locations - location disponibili (tag per organizzare l'humidor)
router.get("/locations", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nome, colore, temperatura, temperatura_aggiornata_il
       FROM humidor_locations ORDER BY nome ASC`
    );
    res.json({ locations: rows });
  } catch (err) {
    console.error("Errore elenco location:", err);
    res.status(500).json({ error: "Errore nel recupero delle location." });
  }
});

// POST /api/humidor/locations { nome, colore }
router.post("/locations", async (req, res) => {
  const nome = (req.body?.nome || "").trim();
  const colore = (req.body?.colore || "").trim();
  if (!nome) return res.status(400).json({ error: "Il nome della location è richiesto." });
  try {
    const { rows } = await pool.query(
      "INSERT INTO humidor_locations (nome, colore) VALUES ($1, COALESCE(NULLIF($2, ''), '#8b5e34')) RETURNING id, nome, colore",
      [nome, colore]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Esiste già una location con questo nome." });
    }
    console.error("Errore creazione location:", err);
    res.status(500).json({ error: "Errore nella creazione della location." });
  }
});

// PATCH /api/humidor/locations/:id { nome?, colore? }
router.patch("/locations/:id", async (req, res) => {
  const nome = req.body?.nome !== undefined ? req.body.nome.trim() : null;
  const colore = req.body?.colore !== undefined ? req.body.colore.trim() : null;
  try {
    const { rows } = await pool.query(
      `UPDATE humidor_locations SET
         nome = COALESCE(NULLIF($1, ''), nome),
         colore = COALESCE(NULLIF($2, ''), colore)
       WHERE id = $3 RETURNING id, nome, colore`,
      [nome, colore, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Location non trovata." });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Esiste già una location con questo nome." });
    }
    console.error("Errore aggiornamento location:", err);
    res.status(500).json({ error: "Errore nell'aggiornamento della location." });
  }
});

// DELETE /api/humidor/locations/:id
router.delete("/locations/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM humidor_locations WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Location non trovata." });
    res.json({ message: "Location eliminata." });
  } catch (err) {
    console.error("Errore eliminazione location:", err);
    res.status(500).json({ error: "Errore nell'eliminazione della location." });
  }
});

// POST /api/humidor/items - registra un acquisto (e ne verifica il prezzo)
router.post("/items", async (req, res) => {
  const { product_id, prezzo_acquisto, data_acquisto, quantita = 1, shop, note, location_id } = req.body || {};
  if (!product_id || !prezzo_acquisto || !data_acquisto) {
    return res
      .status(400)
      .json({ error: "product_id, prezzo_acquisto e data_acquisto sono richiesti." });
  }

  const client = await pool.connect();
  let newId;
  try {
    await client.query("BEGIN");
    const shopId = await findOrCreateShop(client, req.userId, shop);
    const locationId = location_id || (await getDefaultLocationId(client));
    const inserted = await client.query(
      `INSERT INTO humidor_items
         (user_id, product_id, shop_id, location_id, prezzo_acquisto, data_acquisto, quantita_iniziale, quantita_rimanente, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8) RETURNING id`,
      [req.userId, product_id, shopId, locationId, prezzo_acquisto, data_acquisto, quantita, note || null]
    );
    newId = inserted.rows[0].id;
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Errore inserimento acquisto humidor:", err);
    return res.status(500).json({ error: "Errore nell'inserimento dell'acquisto." });
  } finally {
    client.release();
  }

  let confrontoPrezzo = null;
  try {
    const { rows } = await pool.query(
      `SELECT prezzo_singolo, valido_dal FROM prices WHERE product_id = $1 ORDER BY valido_dal DESC LIMIT 1`,
      [product_id]
    );
    if (rows.length && rows[0].prezzo_singolo) {
      const ufficiale = Number(rows[0].prezzo_singolo);
      const pagato = Number(prezzo_acquisto);
      confrontoPrezzo = {
        prezzo_ufficiale: ufficiale,
        aggiornato_al: rows[0].valido_dal,
        differenza: Number((pagato - ufficiale).toFixed(4)),
        percentuale: Number((((pagato - ufficiale) / ufficiale) * 100).toFixed(1)),
      };
    }
  } catch (err) {
    console.error("Errore confronto prezzo:", err);
  }

  res.status(201).json({ id: newId, confronto_prezzo: confrontoPrezzo });
});

// PATCH /api/humidor/items/bulk-location { item_ids: [...], location_id } - assegna
// una location a piu' lotti in una volta (es. quelli senza location nel riepilogo
// humidor), senza doverli modificare uno per uno. Va registrata PRIMA di
// "/items/:id" perche' altrimenti quella rotta la intercetterebbe (":id" = "bulk-location").
router.patch("/items/bulk-location", async (req, res) => {
  const { item_ids, location_id } = req.body || {};
  if (!Array.isArray(item_ids) || !item_ids.length || !location_id) {
    return res.status(400).json({ error: "item_ids e location_id sono richiesti." });
  }
  try {
    const result = await pool.query(
      `UPDATE humidor_items SET location_id = $1 WHERE id = ANY($2::int[]) AND user_id = $3`,
      [location_id, item_ids, req.userId]
    );
    res.json({ message: "Location assegnata.", aggiornati: result.rowCount });
  } catch (err) {
    console.error("Errore assegnazione location multipla:", err);
    res.status(500).json({ error: "Errore nell'assegnazione della location." });
  }
});

// PATCH /api/humidor/items/:id - modifica prezzo/data/tabaccheria/note
router.patch("/items/:id", async (req, res) => {
  const { prezzo_acquisto, data_acquisto, note, shop, location_id } = req.body || {};
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const owned = await client.query(
      "SELECT id FROM humidor_items WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    if (!owned.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Acquisto non trovato." });
    }

    const shopId = shop !== undefined ? await findOrCreateShop(client, req.userId, shop) : undefined;

    await client.query(
      `UPDATE humidor_items SET
         prezzo_acquisto = COALESCE($1, prezzo_acquisto),
         data_acquisto = COALESCE($2, data_acquisto),
         note = COALESCE($3, note),
         shop_id = COALESCE($4, shop_id),
         location_id = COALESCE($5, location_id)
       WHERE id = $6`,
      [prezzo_acquisto ?? null, data_acquisto ?? null, note ?? null, shopId ?? null, location_id ?? null, req.params.id]
    );
    await client.query("COMMIT");
    res.json({ message: "Acquisto aggiornato." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Errore aggiornamento acquisto:", err);
    res.status(500).json({ error: "Errore nell'aggiornamento dell'acquisto." });
  } finally {
    client.release();
  }
});

// DELETE /api/humidor/items/:id
router.delete("/items/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM humidor_items WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Acquisto non trovato." });
    res.json({ message: "Acquisto rimosso dall'humidor." });
  } catch (err) {
    console.error("Errore rimozione acquisto:", err);
    res.status(500).json({ error: "Errore nella rimozione dell'acquisto." });
  }
});

// GET /api/humidor/fumate?limit=30 - storico fumate
router.get("/fumate", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 200);
  try {
    const { rows } = await pool.query(
      `SELECT f.id, f.quantita, f.data_fumata, f.created_at,
              p.id AS product_id, p.marca, p.categoria, p.formato
       FROM humidor_fumate f
       JOIN products p ON p.id = f.product_id
       WHERE f.user_id = $1
       ORDER BY f.data_fumata DESC, f.id DESC
       LIMIT $2`,
      [req.userId, limit]
    );
    res.json({ fumate: rows });
  } catch (err) {
    console.error("Errore storico fumate:", err);
    res.status(500).json({ error: "Errore nel recupero dello storico fumate." });
  }
});

// POST /api/humidor/fumate { humidor_item_id, quantita?, data_fumata? }
router.post("/fumate", async (req, res) => {
  const { humidor_item_id, quantita = 1, data_fumata } = req.body || {};
  if (!humidor_item_id) return res.status(400).json({ error: "humidor_item_id richiesto." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT id, product_id, quantita_rimanente FROM humidor_items
       WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [humidor_item_id, req.userId]
    );
    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Sigaro non trovato nel tuo humidor." });
    }
    const item = rows[0];
    if (item.quantita_rimanente < quantita) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Quantità non disponibile nell'humidor." });
    }

    await client.query(
      "UPDATE humidor_items SET quantita_rimanente = quantita_rimanente - $1 WHERE id = $2",
      [quantita, humidor_item_id]
    );
    const inserted = await client.query(
      `INSERT INTO humidor_fumate (user_id, humidor_item_id, product_id, quantita, data_fumata)
       VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE)) RETURNING id`,
      [req.userId, humidor_item_id, item.product_id, quantita, data_fumata || null]
    );
    await client.query("COMMIT");
    res.status(201).json({ id: inserted.rows[0].id });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Errore registrazione fumata:", err);
    res.status(500).json({ error: "Errore nella registrazione della fumata." });
  } finally {
    client.release();
  }
});

// DELETE /api/humidor/fumate/:id - annulla una fumata e ripristina la quantita'
router.delete("/fumate/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT humidor_item_id, quantita FROM humidor_fumate WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Fumata non trovata." });
    }
    const { humidor_item_id, quantita } = rows[0];
    await client.query("DELETE FROM humidor_fumate WHERE id = $1", [req.params.id]);
    await client.query(
      "UPDATE humidor_items SET quantita_rimanente = quantita_rimanente + $1 WHERE id = $2",
      [quantita, humidor_item_id]
    );
    await client.query("COMMIT");
    res.json({ message: "Fumata annullata." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Errore annullamento fumata:", err);
    res.status(500).json({ error: "Errore nell'annullamento della fumata." });
  } finally {
    client.release();
  }
});

// GET /api/humidor/reviews/:productId
router.get("/reviews/:productId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT stelle, descrizione, updated_at FROM humidor_reviews WHERE user_id = $1 AND product_id = $2",
      [req.userId, req.params.productId]
    );
    res.json({ review: rows[0] || null });
  } catch (err) {
    console.error("Errore recupero recensione humidor:", err);
    res.status(500).json({ error: "Errore nel recupero della recensione." });
  }
});

// PUT /api/humidor/reviews/:productId { stelle?, descrizione? }
router.put("/reviews/:productId", async (req, res) => {
  const { stelle, descrizione } = req.body || {};
  if (stelle !== null && stelle !== undefined && (stelle < 1 || stelle > 5)) {
    return res.status(400).json({ error: "Le stelle devono essere tra 1 e 5." });
  }
  try {
    await pool.query(
      `INSERT INTO humidor_reviews (user_id, product_id, stelle, descrizione, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET stelle = EXCLUDED.stelle, descrizione = EXCLUDED.descrizione, updated_at = now()`,
      [req.userId, req.params.productId, stelle ?? null, descrizione ?? null]
    );
    res.json({ message: "Recensione salvata." });
  } catch (err) {
    console.error("Errore salvataggio recensione humidor:", err);
    res.status(500).json({ error: "Errore nel salvataggio della recensione." });
  }
});

// GET /api/humidor/stats - riepilogo e serie temporali per i grafici
router.get("/stats", async (req, res) => {
  try {
    const [totali, settimanale, mensile, marche] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(quantita_rimanente), 0) AS totale_in_humidor,
           COALESCE(SUM(prezzo_acquisto * quantita_rimanente), 0) AS valore_in_humidor,
           COALESCE(SUM(prezzo_acquisto * quantita_iniziale), 0) AS valore_investito
         FROM humidor_items WHERE user_id = $1`,
        [req.userId]
      ),
      pool.query(
        `SELECT date_trunc('week', data_fumata)::date AS periodo, SUM(quantita) AS totale
         FROM humidor_fumate WHERE user_id = $1
         GROUP BY 1 ORDER BY 1 DESC LIMIT 12`,
        [req.userId]
      ),
      pool.query(
        `SELECT date_trunc('month', data_fumata)::date AS periodo, SUM(quantita) AS totale
         FROM humidor_fumate WHERE user_id = $1
         GROUP BY 1 ORDER BY 1 DESC LIMIT 12`,
        [req.userId]
      ),
      pool.query(
        `SELECT p.marca, SUM(f.quantita) AS totale
         FROM humidor_fumate f JOIN products p ON p.id = f.product_id
         WHERE f.user_id = $1
         GROUP BY p.marca ORDER BY totale DESC LIMIT 5`,
        [req.userId]
      ),
    ]);

    const serieSettimanale = settimanale.rows.reverse();
    const serieMensile = mensile.rows.reverse();

    const primaFumata = await pool.query(
      "SELECT MIN(data_fumata) AS prima FROM humidor_fumate WHERE user_id = $1",
      [req.userId]
    );
    const fumateTotali = await pool.query(
      "SELECT COALESCE(SUM(quantita), 0) AS totale FROM humidor_fumate WHERE user_id = $1",
      [req.userId]
    );

    const totaleFumate = Number(fumateTotali.rows[0].totale);
    const primaData = primaFumata.rows[0].prima;
    const anniTrascorsi = primaData
      ? Math.max((Date.now() - new Date(primaData).getTime()) / (1000 * 60 * 60 * 24 * 365), 1 / 12)
      : 1;

    const mediaSettimanale = serieSettimanale.length
      ? serieSettimanale.reduce((s, r) => s + Number(r.totale), 0) / serieSettimanale.length
      : 0;
    const mediaMensile = serieMensile.length
      ? serieMensile.reduce((s, r) => s + Number(r.totale), 0) / serieMensile.length
      : 0;
    const mediaAnnuale = totaleFumate / anniTrascorsi;

    res.json({
      totale_in_humidor: Number(totali.rows[0].totale_in_humidor),
      valore_in_humidor: Number(totali.rows[0].valore_in_humidor),
      valore_investito: Number(totali.rows[0].valore_investito),
      fumate_totali: totaleFumate,
      media_settimanale: Number(mediaSettimanale.toFixed(2)),
      media_mensile: Number(mediaMensile.toFixed(2)),
      media_annuale: Number(mediaAnnuale.toFixed(2)),
      serie_settimanale: serieSettimanale.map((r) => ({ periodo: r.periodo, totale: Number(r.totale) })),
      serie_mensile: serieMensile.map((r) => ({ periodo: r.periodo, totale: Number(r.totale) })),
      top_marche: marche.rows.map((r) => ({ marca: r.marca, totale: Number(r.totale) })),
    });
  } catch (err) {
    console.error("Errore statistiche humidor:", err);
    res.status(500).json({ error: "Errore nel calcolo delle statistiche." });
  }
});

module.exports = router;
