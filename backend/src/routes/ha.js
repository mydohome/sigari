const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// Autenticazione dedicata a Home Assistant: una semplice API key via header
// (come ADMIN_TOKEN per l'import CSV), non il JWT utente. Pensata per
// funzionare anche se questa app finisse esposta in una DMZ separata dalla
// rete dove gira HA: e' sempre HA a chiamare questi endpoint (mai il
// contrario), quindi non serve alcuna regola di firewall dalla DMZ verso la
// LAN interna.
function requireApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (!process.env.HA_API_KEY || key !== process.env.HA_API_KEY) {
    return res.status(401).json({ error: "API key mancante o non valida." });
  }
  next();
}

// GET /api/ha/stats - riepilogo humidor per un sensore REST di Home Assistant.
// App a proprietario singolo: i dati non sono filtrati per utente.
router.get("/stats", requireApiKey, async (_req, res) => {
  try {
    const totali = await pool.query(
      `SELECT
         COALESCE(SUM(quantita_rimanente), 0) AS totale_sigari,
         COALESCE(SUM(prezzo_acquisto * quantita_rimanente), 0) AS valore_humidor
       FROM humidor_items`
    );
    const perLocation = await pool.query(
      `SELECT l.nome, COALESCE(SUM(hi.quantita_rimanente), 0) AS totale
       FROM humidor_locations l
       LEFT JOIN humidor_items hi ON hi.location_id = l.id AND hi.quantita_rimanente > 0
       GROUP BY l.id, l.nome
       ORDER BY l.nome`
    );
    res.json({
      totale_sigari: Number(totali.rows[0].totale_sigari),
      valore_humidor: Number(totali.rows[0].valore_humidor),
      per_location: perLocation.rows.map((r) => ({ nome: r.nome, totale: Number(r.totale) })),
    });
  } catch (err) {
    console.error("Errore statistiche HA:", err);
    res.status(500).json({ error: "Errore nel recupero delle statistiche." });
  }
});

// Aggiorna una singola colonna "lettura sensore" (temperatura o umidita') di
// una location, insieme al relativo timestamp. `colonna` non arriva mai dal
// body della richiesta (e' passata dai due route handler qui sotto), quindi
// l'interpolazione nella query non e' un rischio di SQL injection.
async function aggiornaLettura(res, { location, valore, colonna, etichetta }) {
  if (!location || valore === undefined || valore === null) {
    return res.status(400).json({ error: `location e ${etichetta} sono richiesti.` });
  }
  const numero = Number(valore);
  if (Number.isNaN(numero)) {
    return res.status(400).json({ error: `${etichetta} non valida.` });
  }
  try {
    const result = await pool.query(
      `UPDATE humidor_locations SET ${colonna} = $1, ${colonna}_aggiornata_il = now()
       WHERE LOWER(nome) = LOWER($2) RETURNING id, nome`,
      [numero, location]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: `Location "${location}" non trovata.` });
    }
    res.json({ message: `${etichetta} aggiornata.`, location: result.rows[0].nome });
  } catch (err) {
    console.error(`Errore aggiornamento ${etichetta} location:`, err);
    res.status(500).json({ error: `Errore nell'aggiornamento di ${etichetta}.` });
  }
}

// POST /api/ha/location-temp { location, temperatura } - riceve da
// un'automazione Home Assistant la temperatura rilevata per una location
// (es. "Humidor"), da chiamare ogni volta che il sensore aggiorna.
router.post("/location-temp", requireApiKey, (req, res) => {
  const { location, temperatura } = req.body || {};
  return aggiornaLettura(res, { location, valore: temperatura, colonna: "temperatura", etichetta: "temperatura" });
});

// POST /api/ha/location-humidity { location, umidita } - come sopra, per
// l'umidita' rilevata da un secondo sensore Home Assistant.
router.post("/location-humidity", requireApiKey, (req, res) => {
  const { location, umidita } = req.body || {};
  return aggiornaLettura(res, { location, valore: umidita, colonna: "umidita", etichetta: "umidità" });
});

module.exports = router;
