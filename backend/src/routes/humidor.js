const express = require("express");
const axios = require("axios");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { sqlDurataMinuti } = require("../db/durata");

const router = express.Router();

// Sotto questa soglia di fumate cronometrate la durata media non e' significativa
const MIN_CAMPIONI_DURATA = 5;
router.use(requireAuth);

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const ORA_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

// Intero facoltativo nell'intervallo [min, max]: ""/null/undefined = nessun valore.
function interoOpz(valore, min, max) {
  if (valore === undefined || valore === null || valore === "") return { ok: true, value: null };
  const n = Number(valore);
  return Number.isInteger(n) && n >= min && n <= max ? { ok: true, value: n } : { ok: false };
}

function testoOpz(valore, max = 500) {
  if (valore === undefined || valore === null) return null;
  const testo = String(valore).trim();
  return testo ? testo.slice(0, max) : null;
}

function dataValida(valore) {
  if (!DATA_RE.test(valore)) return false;
  const d = new Date(`${valore}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valore;
}

const SQL_DURATA_MINUTI = `(${sqlDurataMinuti("f.")})::int`;

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

// GET /api/humidor/items?all=1 - inventario dell'utente, con il prezzo di listino
// attuale del prodotto (per confrontarlo con quanto e' stato pagato).
router.get("/items", async (req, res) => {
  const includeVuoti = req.query.all === "1";
  try {
    const { rows } = await pool.query(
      `SELECT
         hi.id, hi.prezzo_acquisto, hi.data_acquisto, hi.quantita_iniziale,
         hi.quantita_rimanente, hi.note, hi.created_at,
         p.id AS product_id, p.marca, p.categoria, p.formato, p.provenienza, p.pezzi_per_confezione,
         latest.prezzo_confezione, latest.prezzo_singolo, latest.valido_dal AS listino_dal,
         s.id AS shop_id, s.nome AS shop_nome, s.indirizzo AS shop_indirizzo,
         l.id AS location_id, l.nome AS location_nome, l.colore AS location_colore
       FROM humidor_items hi
       JOIN products p ON p.id = hi.product_id
       LEFT JOIN LATERAL (
         SELECT prezzo_confezione, prezzo_singolo, valido_dal
         FROM prices pr
         WHERE pr.product_id = p.id
         ORDER BY pr.valido_dal DESC
         LIMIT 1
       ) latest ON true
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
      `SELECT id, nome, colore, temperatura, temperatura_aggiornata_il, umidita, umidita_aggiornata_il
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
  if (!product_id || prezzo_acquisto === undefined || prezzo_acquisto === null || !data_acquisto) {
    return res
      .status(400)
      .json({ error: "product_id, prezzo_acquisto e data_acquisto sono richiesti." });
  }
  const prezzo = Number(prezzo_acquisto);
  if (!Number.isFinite(prezzo) || prezzo <= 0 || prezzo > 100000) {
    return res.status(400).json({ error: "Il prezzo di acquisto deve essere un importo maggiore di zero." });
  }
  const qta = interoOpz(quantita, 1, 1000);
  if (!qta.ok || qta.value === null) {
    return res.status(400).json({ error: "La quantità deve essere un numero intero da 1 a 1000." });
  }
  if (!dataValida(String(data_acquisto))) {
    return res.status(400).json({ error: "Data di acquisto non valida (formato AAAA-MM-GG)." });
  }

  const client = await pool.connect();
  let newId;
  try {
    await client.query("BEGIN");
    const prodotto = await client.query("SELECT 1 FROM products WHERE id = $1", [product_id]);
    if (!prodotto.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Prodotto non trovato nel listino." });
    }
    const shopId = await findOrCreateShop(client, req.userId, shop);
    const locationId = location_id || (await getDefaultLocationId(client));
    const inserted = await client.query(
      `INSERT INTO humidor_items
         (user_id, product_id, shop_id, location_id, prezzo_acquisto, data_acquisto, quantita_iniziale, quantita_rimanente, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8) RETURNING id`,
      [req.userId, product_id, shopId, locationId, prezzo, data_acquisto, qta.value, testoOpz(note, 1000)]
    );
    newId = inserted.rows[0].id;
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23503") {
      return res.status(400).json({ error: "Location o tabaccheria non valida." });
    }
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

// PATCH /api/humidor/items/:id - modifica prezzo/data/tabaccheria/note/location e quantita'.
//  - quantita_iniziale: se cambia, la giacenza si riallinea della stessa differenza (e il cambio
//    e' rifiutato se i sigari gia' fumati superano la nuova quantita')
//  - quantita_rimanente: correzione diretta della giacenza (da 0 alla quantita' acquistata)
router.patch("/items/:id", async (req, res) => {
  const body = req.body || {};
  const { prezzo_acquisto, data_acquisto, note, shop, location_id } = body;

  let prezzo = null;
  if (prezzo_acquisto !== undefined && prezzo_acquisto !== null) {
    prezzo = Number(prezzo_acquisto);
    if (!Number.isFinite(prezzo) || prezzo <= 0 || prezzo > 100000) {
      return res.status(400).json({ error: "Il prezzo di acquisto deve essere un importo maggiore di zero." });
    }
  }
  if (data_acquisto && !dataValida(String(data_acquisto))) {
    return res.status(400).json({ error: "Data di acquisto non valida (formato AAAA-MM-GG)." });
  }
  const iniziale = interoOpz(body.quantita_iniziale, 1, 1000);
  const rimanente = interoOpz(body.quantita_rimanente, 0, 1000);
  if (!iniziale.ok) return res.status(400).json({ error: "La quantità acquistata deve essere da 1 a 1000." });
  if (!rimanente.ok) return res.status(400).json({ error: "La giacenza deve essere un numero intero da 0 a 1000." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const owned = await client.query(
      "SELECT quantita_iniziale, quantita_rimanente FROM humidor_items WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [req.params.id, req.userId]
    );
    if (!owned.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Acquisto non trovato." });
    }

    let nuovaIniziale = owned.rows[0].quantita_iniziale;
    let nuovaRimanente = owned.rows[0].quantita_rimanente;
    if (iniziale.value !== null) {
      nuovaRimanente += iniziale.value - nuovaIniziale;
      nuovaIniziale = iniziale.value;
    }
    if (rimanente.value !== null) nuovaRimanente = rimanente.value;
    if (nuovaRimanente < 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Hai già fumato più sigari di quelli indicati come acquistati." });
    }
    if (nuovaRimanente > nuovaIniziale) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "La giacenza non può superare la quantità acquistata." });
    }

    const shopId = shop !== undefined ? await findOrCreateShop(client, req.userId, shop) : undefined;

    await client.query(
      `UPDATE humidor_items SET
         prezzo_acquisto = COALESCE($1, prezzo_acquisto),
         data_acquisto = COALESCE($2, data_acquisto),
         note = COALESCE($3, note),
         shop_id = COALESCE($4, shop_id),
         location_id = COALESCE($5, location_id),
         quantita_iniziale = $6,
         quantita_rimanente = $7
       WHERE id = $8`,
      [
        prezzo,
        data_acquisto ?? null,
        note === undefined || note === null ? null : testoOpz(note, 1000) ?? "",
        shopId ?? null,
        location_id ?? null,
        nuovaIniziale,
        nuovaRimanente,
        req.params.id,
      ]
    );
    await client.query("COMMIT");
    res.json({ message: "Acquisto aggiornato." });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23503") {
      return res.status(400).json({ error: "Location o tabaccheria non valida." });
    }
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
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 500);
  try {
    const { rows } = await pool.query(
      `SELECT f.id, f.humidor_item_id, f.quantita, f.data_fumata, f.created_at,
              f.ora_inizio, f.ora_fine, f.riaccensioni, f.stelle, f.note, f.abbinamento,
              ${SQL_DURATA_MINUTI} AS durata_minuti,
              p.id AS product_id, p.marca, p.categoria, p.formato, p.provenienza
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

// GET /api/humidor/fumate/stats/:productId - durata media fumata per uno specifico sigaro
router.get("/fumate/stats/:productId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) AS fumate_totali,
         COUNT(durata) AS fumate_con_durata,
         AVG(durata) AS durata_media_minuti,
         AVG(riaccensioni) FILTER (WHERE riaccensioni IS NOT NULL) AS riaccensioni_medie
       FROM (SELECT riaccensioni, ${sqlDurataMinuti()} AS durata
             FROM humidor_fumate WHERE user_id = $1 AND product_id = $2) t`,
      [req.userId, req.params.productId]
    );
    const r = rows[0];
    const fumateConDurata = Number(r.fumate_con_durata);
    res.json({
      fumate_totali: Number(r.fumate_totali),
      fumate_con_durata: fumateConDurata,
      durata_media_minuti:
        fumateConDurata >= MIN_CAMPIONI_DURATA && r.durata_media_minuti != null
          ? Number(Number(r.durata_media_minuti).toFixed(1))
          : null,
      riaccensioni_medie: r.riaccensioni_medie != null ? Number(Number(r.riaccensioni_medie).toFixed(1)) : null,
    });
  } catch (err) {
    console.error("Errore statistiche fumata prodotto:", err);
    res.status(500).json({ error: "Errore nel calcolo delle statistiche del sigaro." });
  }
});

// Valida e normalizza i campi di una fumata. `parziale` = PATCH: validano solo le
// chiavi presenti. Ritorna { errore } oppure { campi } con i valori pronti per il DB.
function leggiCampiFumata(body, parziale) {
  const campi = {};
  const ha = (chiave) => !parziale || Object.prototype.hasOwnProperty.call(body, chiave);

  if (ha("quantita")) {
    const q = interoOpz(body.quantita ?? 1, 1, 100);
    if (!q.ok || q.value === null) return { errore: "La quantità deve essere un numero intero da 1 a 100." };
    campi.quantita = q.value;
  }
  if (ha("data_fumata") && body.data_fumata) {
    if (!dataValida(body.data_fumata)) return { errore: "Data della fumata non valida (formato AAAA-MM-GG)." };
    campi.data_fumata = body.data_fumata;
  }
  for (const chiave of ["ora_inizio", "ora_fine"]) {
    if (!ha(chiave)) continue;
    const valore = body[chiave] || null;
    if (valore !== null && !ORA_RE.test(valore)) return { errore: "Orario non valido (formato HH:MM)." };
    campi[chiave] = valore;
  }
  if (ha("riaccensioni")) {
    const r = interoOpz(body.riaccensioni, 0, 99);
    if (!r.ok) return { errore: "Le riaccensioni devono essere un numero intero da 0 a 99." };
    campi.riaccensioni = r.value;
  }
  if (ha("stelle")) {
    const st = interoOpz(body.stelle, 1, 5);
    if (!st.ok) return { errore: "Le stelle devono essere un numero intero da 1 a 5." };
    campi.stelle = st.value;
  }
  if (ha("note")) campi.note = testoOpz(body.note, 1000);
  if (ha("abbinamento")) campi.abbinamento = testoOpz(body.abbinamento, 200);
  return { campi };
}

// POST /api/humidor/fumate { humidor_item_id | product_id, quantita?, data_fumata?, ora_inizio?,
//                            ora_fine?, riaccensioni?, stelle?, note?, abbinamento? }
// Con humidor_item_id la fumata scala la giacenza del lotto; con il solo product_id registra
// un sigaro non presente in humidor (fumato altrove) senza toccare le scorte.
router.post("/fumate", async (req, res) => {
  const body = req.body || {};
  if (!body.humidor_item_id && !body.product_id) {
    return res.status(400).json({ error: "Indica il sigaro fumato (humidor_item_id o product_id)." });
  }

  const { errore, campi } = leggiCampiFumata(body, false);
  if (errore) return res.status(400).json({ error: errore });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let lottoId = null;
    let productId;
    if (body.humidor_item_id) {
      const { rows } = await client.query(
        `SELECT id, product_id, quantita_rimanente FROM humidor_items
         WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [body.humidor_item_id, req.userId]
      );
      if (!rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Sigaro non trovato nel tuo humidor." });
      }
      if (rows[0].quantita_rimanente < campi.quantita) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Quantità non disponibile nell'humidor." });
      }
      await client.query(
        "UPDATE humidor_items SET quantita_rimanente = quantita_rimanente - $1 WHERE id = $2",
        [campi.quantita, rows[0].id]
      );
      lottoId = rows[0].id;
      productId = rows[0].product_id;
    } else {
      const prodotto = await client.query("SELECT id FROM products WHERE id = $1", [body.product_id]);
      if (!prodotto.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Prodotto non trovato nel listino." });
      }
      productId = prodotto.rows[0].id;
    }

    const inserted = await client.query(
      `INSERT INTO humidor_fumate
         (user_id, humidor_item_id, product_id, quantita, data_fumata, ora_inizio, ora_fine,
          riaccensioni, stelle, note, abbinamento)
       VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        req.userId,
        lottoId,
        productId,
        campi.quantita,
        campi.data_fumata ?? null,
        campi.ora_inizio ?? null,
        campi.ora_fine ?? null,
        campi.riaccensioni ?? null,
        campi.stelle ?? null,
        campi.note ?? null,
        campi.abbinamento ?? null,
      ]
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

// PATCH /api/humidor/fumate/:id - modifica solo i campi presenti nel corpo. Se cambia la
// quantita', la giacenza del lotto viene riallineata (e il cambio e' rifiutato se non basta).
router.patch("/fumate/:id", async (req, res) => {
  const { errore, campi } = leggiCampiFumata(req.body || {}, true);
  if (errore) return res.status(400).json({ error: errore });
  if (!Object.keys(campi).length) return res.status(400).json({ error: "Nessun campo da modificare." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT humidor_item_id, quantita FROM humidor_fumate WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [req.params.id, req.userId]
    );
    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Fumata non trovata." });
    }

    if (campi.quantita !== undefined && campi.quantita !== rows[0].quantita && rows[0].humidor_item_id) {
      const delta = campi.quantita - rows[0].quantita;
      const aggiornato = await client.query(
        `UPDATE humidor_items SET quantita_rimanente = quantita_rimanente - $1
         WHERE id = $2 AND user_id = $3 AND quantita_rimanente - $1 >= 0 RETURNING id`,
        [delta, rows[0].humidor_item_id, req.userId]
      );
      if (!aggiornato.rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Quantità non disponibile nell'humidor." });
      }
    }

    const chiavi = Object.keys(campi);
    const assegnazioni = chiavi.map((chiave, i) => `${chiave} = $${i + 1}`).join(", ");
    await client.query(
      `UPDATE humidor_fumate SET ${assegnazioni} WHERE id = $${chiavi.length + 1} AND user_id = $${chiavi.length + 2}`,
      [...chiavi.map((chiave) => campi[chiave]), req.params.id, req.userId]
    );
    await client.query("COMMIT");
    res.json({ message: "Fumata aggiornata." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Errore modifica fumata:", err);
    res.status(500).json({ error: "Errore nella modifica della fumata." });
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
    // Fumata di un sigaro fuori humidor, o lotto nel frattempo eliminato: niente da ripristinare
    if (humidor_item_id) {
      await client.query(
        `UPDATE humidor_items
         SET quantita_rimanente = LEAST(quantita_iniziale, quantita_rimanente + $1)
         WHERE id = $2 AND user_id = $3`,
        [quantita, humidor_item_id, req.userId]
      );
    }
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

// --- Schede di degustazione (una per utente e prodotto) ---

const FORZE = ["Leggera", "Medio-leggera", "Media", "Medio-forte", "Forte"];
const COMBUSTIONI = ["Perfetta", "Buona", "Irregolare"];
const TIRAGGI = ["Ottimale", "Aperto", "Serrato"];

const SQL_SCHEDA = `r.product_id, r.stelle, r.descrizione, r.aromi, r.forza, r.combustione, r.tiraggio,
       r.abbinamento_consigliato, r.updated_at`;

// GET /api/humidor/reviews - tutte le schede dell'utente, con i dati del prodotto
router.get("/reviews", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${SQL_SCHEDA}, p.marca, p.categoria, p.formato, p.provenienza
       FROM humidor_reviews r
       JOIN products p ON p.id = r.product_id
       WHERE r.user_id = $1
       ORDER BY r.updated_at DESC`,
      [req.userId]
    );
    res.json({ reviews: rows });
  } catch (err) {
    console.error("Errore elenco schede di degustazione:", err);
    res.status(500).json({ error: "Errore nel recupero delle schede di degustazione." });
  }
});

// GET /api/humidor/reviews/:productId
router.get("/reviews/:productId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${SQL_SCHEDA} FROM humidor_reviews r WHERE r.user_id = $1 AND r.product_id = $2`,
      [req.userId, req.params.productId]
    );
    res.json({ review: rows[0] || null });
  } catch (err) {
    console.error("Errore recupero recensione humidor:", err);
    res.status(500).json({ error: "Errore nel recupero della recensione." });
  }
});

// PUT /api/humidor/reviews/:productId { stelle?, descrizione?, aromi?, forza?, combustione?,
//                                       tiraggio?, abbinamento_consigliato? }
// Aggiorna solo i campi presenti nel corpo: gli altri restano come sono.
router.put("/reviews/:productId", async (req, res) => {
  const body = req.body || {};
  const ha = (chiave) => Object.prototype.hasOwnProperty.call(body, chiave);
  const campi = {};

  if (ha("stelle")) {
    const st = interoOpz(body.stelle, 1, 5);
    if (!st.ok) return res.status(400).json({ error: "Le stelle devono essere tra 1 e 5." });
    campi.stelle = st.value;
  }
  if (ha("descrizione")) campi.descrizione = testoOpz(body.descrizione, 2000);
  if (ha("aromi")) {
    if (!Array.isArray(body.aromi) || body.aromi.length > 12) {
      return res.status(400).json({ error: "Gli aromi devono essere un elenco di al massimo 12 voci." });
    }
    campi.aromi = [...new Set(body.aromi.map((a) => testoOpz(a, 30)).filter(Boolean))];
  }
  for (const [chiave, ammessi, etichetta] of [
    ["forza", FORZE, "forza"],
    ["combustione", COMBUSTIONI, "combustione"],
    ["tiraggio", TIRAGGI, "tiraggio"],
  ]) {
    if (!ha(chiave)) continue;
    const valore = body[chiave] || null;
    if (valore !== null && !ammessi.includes(valore)) {
      return res.status(400).json({ error: `Valore non valido per ${etichetta}.` });
    }
    campi[chiave] = valore;
  }
  if (ha("abbinamento_consigliato")) campi.abbinamento_consigliato = testoOpz(body.abbinamento_consigliato, 200);

  try {
    const chiavi = Object.keys(campi);
    const colonne = ["user_id", "product_id", ...chiavi, "updated_at"].join(", ");
    const segnaposto = ["$1", "$2", ...chiavi.map((_, i) => `$${i + 3}`), "now()"].join(", ");
    const aggiorna = [...chiavi.map((chiave) => `${chiave} = EXCLUDED.${chiave}`), "updated_at = now()"].join(", ");
    await pool.query(
      `INSERT INTO humidor_reviews (${colonne}) VALUES (${segnaposto})
       ON CONFLICT (user_id, product_id) DO UPDATE SET ${aggiorna}`,
      [req.userId, req.params.productId, ...chiavi.map((chiave) => campi[chiave])]
    );
    res.json({ message: "Recensione salvata." });
  } catch (err) {
    console.error("Errore salvataggio recensione humidor:", err);
    res.status(500).json({ error: "Errore nel salvataggio della recensione." });
  }
});

// Sostituisce le slot mancanti con zero: il grafico mostra anche le settimane/mesi senza fumate.
const SQL_SERIE = (unita, passi) => `
  SELECT to_char(s.periodo, 'YYYY-MM-DD') AS periodo, COALESCE(SUM(f.quantita), 0)::int AS totale
  FROM generate_series(
         date_trunc('${unita}', CURRENT_DATE) - interval '${passi} ${unita}s',
         date_trunc('${unita}', CURRENT_DATE),
         interval '1 ${unita}') AS s(periodo)
  LEFT JOIN humidor_fumate f
    ON f.user_id = $1 AND date_trunc('${unita}', f.data_fumata) = s.periodo
  GROUP BY s.periodo ORDER BY s.periodo`;

const PROVENIENZE = ["Cuba", "Italia", "Extra-Cuba", "Altro"];

// GET /api/humidor/stats - riepilogo e serie temporali per i grafici
router.get("/stats", async (req, res) => {
  try {
    const [totali, settimanale, mensile, marche, fumate, durata, provenienze, locations] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(hi.quantita_rimanente), 0) AS totale_in_humidor,
           COALESCE(SUM(hi.prezzo_acquisto * hi.quantita_rimanente), 0) AS valore_in_humidor,
           COALESCE(SUM(hi.prezzo_acquisto * hi.quantita_iniziale), 0) AS valore_investito,
           COALESCE(SUM(latest.prezzo_singolo * hi.quantita_rimanente), 0) AS valore_listino_in_humidor,
           COALESCE(SUM((latest.prezzo_singolo - hi.prezzo_acquisto) * hi.quantita_rimanente), 0) AS plusvalore_listino
         FROM humidor_items hi
         LEFT JOIN LATERAL (
           SELECT prezzo_singolo FROM prices pr
           WHERE pr.product_id = hi.product_id ORDER BY pr.valido_dal DESC LIMIT 1
         ) latest ON true
         WHERE hi.user_id = $1`,
        [req.userId]
      ),
      pool.query(SQL_SERIE("week", 11), [req.userId]),
      pool.query(SQL_SERIE("month", 11), [req.userId]),
      pool.query(
        `SELECT p.marca, SUM(f.quantita)::int AS totale
         FROM humidor_fumate f JOIN products p ON p.id = f.product_id
         WHERE f.user_id = $1
         GROUP BY p.marca ORDER BY totale DESC, p.marca ASC LIMIT 5`,
        [req.userId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(quantita), 0)::int AS totale,
                to_char(date_trunc('week', MIN(data_fumata)), 'YYYY-MM-DD') AS prima_settimana,
                to_char(date_trunc('month', MIN(data_fumata)), 'YYYY-MM-DD') AS primo_mese
         FROM humidor_fumate WHERE user_id = $1`,
        [req.userId]
      ),
      pool.query(
        `SELECT COUNT(durata) AS fumate_con_durata, AVG(durata) AS durata_media_minuti
         FROM (SELECT ${sqlDurataMinuti()} AS durata FROM humidor_fumate WHERE user_id = $1) t`,
        [req.userId]
      ),
      pool.query(
        `SELECT COALESCE(p.provenienza, 'Altro') AS provenienza,
                SUM(hi.quantita_rimanente)::int AS totale,
                SUM(hi.prezzo_acquisto * hi.quantita_rimanente) AS valore
         FROM humidor_items hi JOIN products p ON p.id = hi.product_id
         WHERE hi.user_id = $1 AND hi.quantita_rimanente > 0
         GROUP BY 1`,
        [req.userId]
      ),
      pool.query(
        `SELECT l.id, l.nome AS location, l.colore,
                COALESCE(SUM(hi.quantita_rimanente), 0)::int AS totale,
                COALESCE(SUM(hi.prezzo_acquisto * hi.quantita_rimanente), 0) AS valore
         FROM humidor_locations l
         LEFT JOIN humidor_items hi ON hi.location_id = l.id AND hi.user_id = $1
         GROUP BY l.id ORDER BY l.nome`,
        [req.userId]
      ),
    ]);

    const serieSettimanale = settimanale.rows;
    const serieMensile = mensile.rows;
    const totaleFumate = fumate.rows[0].totale;

    // Media sulle slot del grafico a partire dal periodo della prima fumata (al massimo 12):
    // per chi ha appena cominciato non si divide per periodi in cui non fumava ancora.
    const mediaDa = (serie, primoPeriodo) => {
      if (!primoPeriodo) return 0;
      const usate = serie.filter((r) => r.periodo >= primoPeriodo);
      const considerate = usate.length ? usate : serie.slice(-1);
      return considerate.reduce((somma, r) => somma + r.totale, 0) / considerate.length;
    };
    const mediaSettimanale = mediaDa(serieSettimanale, fumate.rows[0].prima_settimana);
    const mediaMensile = mediaDa(serieMensile, fumate.rows[0].primo_mese);

    // La media diventa significativa solo con un minimo di campioni: sotto
    // soglia la nascondiamo invece di mostrare un numero fuorviante.
    const fumateConDurata = Number(durata.rows[0].fumate_con_durata);
    const durataMediaMinuti =
      fumateConDurata >= MIN_CAMPIONI_DURATA && durata.rows[0].durata_media_minuti != null
        ? Number(Number(durata.rows[0].durata_media_minuti).toFixed(1))
        : null;

    const distribuzioneProvenienza = PROVENIENZE.map((nome) => {
      const riga = provenienze.rows.find((r) => r.provenienza === nome);
      return { provenienza: nome, totale: riga ? riga.totale : 0, valore: riga ? Number(Number(riga.valore).toFixed(2)) : 0 };
    });

    const arrotonda = (valore) => Number(Number(valore).toFixed(2));
    const topMarche = marche.rows.map((r) => ({ marca: r.marca, totale: r.totale }));

    res.json({
      totale_in_humidor: Number(totali.rows[0].totale_in_humidor),
      valore_in_humidor: arrotonda(totali.rows[0].valore_in_humidor),
      valore_investito: arrotonda(totali.rows[0].valore_investito),
      valore_listino_in_humidor: arrotonda(totali.rows[0].valore_listino_in_humidor),
      plusvalore_listino: arrotonda(totali.rows[0].plusvalore_listino),
      fumate_totali: totaleFumate,
      media_settimanale: Number(mediaSettimanale.toFixed(1)),
      media_mensile: Number(mediaMensile.toFixed(1)),
      media_annuale: Number((mediaMensile * 12).toFixed(1)),
      durata_media_minuti: durataMediaMinuti,
      fumate_con_durata: fumateConDurata,
      min_campioni_durata: MIN_CAMPIONI_DURATA,
      serieSettimanale,
      serieMensile,
      topMarche,
      distribuzioneProvenienza,
      distribuzioneLocation: locations.rows.map((r) => ({
        location: r.location,
        colore: r.colore,
        totale: r.totale,
        valore: arrotonda(r.valore),
      })),
    });
  } catch (err) {
    console.error("Errore statistiche humidor:", err);
    res.status(500).json({ error: "Errore nel calcolo delle statistiche." });
  }
});

module.exports = router;
