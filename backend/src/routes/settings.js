const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const BACKUP_DIR = path.join(__dirname, "..", "..", "downloads", "backups");
const FILENAME_RE = /^humidor-backup-[0-9T:.-]+\.json$/;

// Solo le tabelle "personali" dell'humidor: NON include products/prices/
// scraped_documents/scrape_runs, che sono il catalogo prezzi scaricato da
// tabaccai.it e sempre ricostruibile da li'. Ordine = ordine di inserimento
// corretto rispetto ai vincoli di chiave esterna; il ripristino cancella le
// tabelle in ordine inverso.
const TABELLE_HUMIDOR = [
  "users",
  "humidor_shops",
  "humidor_locations",
  "humidor_items",
  "humidor_fumate",
  "humidor_reviews",
  "favorites",
  "wishlist_items",
];

async function creaBackup() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  const tables = {};
  for (const nome of TABELLE_HUMIDOR) {
    const { rows } = await pool.query(`SELECT * FROM ${nome}`);
    tables[nome] = rows;
  }

  const timestamp = new Date().toISOString().replace(/[^0-9T]/g, "").slice(0, 15);
  const filename = `humidor-backup-${timestamp}.json`;
  const contenuto = { created_at: new Date().toISOString(), tables };
  await fs.writeFile(path.join(BACKUP_DIR, filename), JSON.stringify(contenuto, null, 2));
  return filename;
}

// GET /api/settings/backups - elenco backup disponibili
router.get("/backups", async (_req, res) => {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const files = await fs.readdir(BACKUP_DIR);
    const backups = await Promise.all(
      files
        .filter((f) => FILENAME_RE.test(f))
        .map(async (filename) => {
          const stat = await fs.stat(path.join(BACKUP_DIR, filename));
          return { filename, dimensione: stat.size, creato_il: stat.mtime };
        })
    );
    backups.sort((a, b) => new Date(b.creato_il) - new Date(a.creato_il));
    res.json({ backups });
  } catch (err) {
    console.error("Errore elenco backup:", err);
    res.status(500).json({ error: "Errore nel recupero dei backup." });
  }
});

// POST /api/settings/backups - crea subito un nuovo backup
router.post("/backups", async (_req, res) => {
  try {
    const filename = await creaBackup();
    res.status(201).json({ filename });
  } catch (err) {
    console.error("Errore creazione backup:", err);
    res.status(500).json({ error: "Errore nella creazione del backup." });
  }
});

// GET /api/settings/backups/:filename - scarica il file di backup
router.get("/backups/:filename", async (req, res) => {
  if (!FILENAME_RE.test(req.params.filename)) {
    return res.status(400).json({ error: "Nome file non valido." });
  }
  const filePath = path.join(BACKUP_DIR, req.params.filename);
  try {
    await fs.access(filePath);
    res.download(filePath);
  } catch {
    res.status(404).json({ error: "Backup non trovato." });
  }
});

// DELETE /api/settings/backups/:filename
router.delete("/backups/:filename", async (req, res) => {
  if (!FILENAME_RE.test(req.params.filename)) {
    return res.status(400).json({ error: "Nome file non valido." });
  }
  try {
    await fs.unlink(path.join(BACKUP_DIR, req.params.filename));
    res.json({ message: "Backup eliminato." });
  } catch {
    res.status(404).json({ error: "Backup non trovato." });
  }
});

// POST /api/settings/backups/:filename/restore - ripristina un backup precedente.
// Crea prima in automatico un backup "di sicurezza" dello stato attuale, cosi'
// il ripristino stesso resta annullabile.
router.post("/backups/:filename/restore", async (req, res) => {
  if (!FILENAME_RE.test(req.params.filename)) {
    return res.status(400).json({ error: "Nome file non valido." });
  }
  const filePath = path.join(BACKUP_DIR, req.params.filename);

  let dati;
  try {
    dati = JSON.parse(await fs.readFile(filePath, "utf-8"));
  } catch {
    return res.status(404).json({ error: "Backup non trovato o illeggibile." });
  }
  if (!dati.tables || typeof dati.tables !== "object") {
    return res.status(400).json({ error: "File di backup non valido." });
  }

  let backupSicurezza;
  try {
    backupSicurezza = await creaBackup();
  } catch (err) {
    console.error("Errore backup di sicurezza pre-ripristino:", err);
    return res.status(500).json({ error: "Impossibile creare il backup di sicurezza: ripristino annullato." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const nome of [...TABELLE_HUMIDOR].reverse()) {
      await client.query(`DELETE FROM ${nome}`);
    }

    for (const nome of TABELLE_HUMIDOR) {
      const righe = dati.tables[nome] || [];
      for (const riga of righe) {
        const colonne = Object.keys(riga);
        if (!colonne.length) continue;
        const placeholder = colonne.map((_, i) => `$${i + 1}`).join(", ");
        await client.query(
          `INSERT INTO ${nome} (${colonne.join(", ")}) VALUES (${placeholder})`,
          colonne.map((c) => riga[c])
        );
      }
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${nome}', 'id'), COALESCE((SELECT MAX(id) FROM ${nome}), 1))`
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Ripristino completato.", backup_di_sicurezza: backupSicurezza });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Errore ripristino backup:", err);
    res.status(500).json({
      error: "Ripristino fallito, nessuna modifica applicata.",
      backup_di_sicurezza: backupSicurezza,
    });
  } finally {
    client.release();
  }
});

// GET /api/settings/version - commit corrente (build) vs ultimo su GitHub
router.get("/version", async (_req, res) => {
  const current = process.env.GIT_COMMIT || "dev";
  let latest = null;
  let errore = null;

  try {
    const { data } = await axios.get(
      "https://api.github.com/repos/mydohome/sigari/commits/main",
      { headers: { Accept: "application/vnd.github+json" }, timeout: 6000 }
    );
    latest = {
      sha: data.sha.slice(0, 7),
      messaggio: data.commit?.message?.split("\n")[0] || "",
      data: data.commit?.author?.date || null,
    };
  } catch (err) {
    errore = "Impossibile contattare GitHub per verificare l'ultima versione.";
  }

  res.json({
    corrente: current,
    ultimo: latest,
    aggiornato: latest ? latest.sha.startsWith(current) || current.startsWith(latest.sha) : null,
    errore,
  });
});

module.exports = router;
