const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

// GET /api/auth/registration-open - la registrazione e' consentita solo finche'
// non esiste ancora nessun utente (app ad uso personale/familiare).
router.get("/registration-open", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS totale FROM users");
    res.json({ open: rows[0].totale === 0 });
  } catch (err) {
    console.error("Errore verifica registrazione aperta:", err);
    res.status(500).json({ error: "Errore nella verifica dello stato di registrazione." });
  }
});

router.post("/register", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: "Indirizzo email non valido." });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "La password deve avere almeno 8 caratteri." });
  }

  try {
    const totaleUtenti = await pool.query("SELECT COUNT(*)::int AS totale FROM users");
    if (totaleUtenti.rows[0].totale > 0) {
      return res.status(403).json({ error: "La registrazione non è più disponibile." });
    }

    const existing = await pool.query("SELECT 1 FROM users WHERE email = $1", [
      email.toLowerCase().trim(),
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Esiste già un account con questa email." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email.toLowerCase().trim(), passwordHash]
    );

    const user = result.rows[0];
    const token = signToken(user.id);
    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error("Errore registrazione:", err);
    res.status(500).json({ error: "Errore durante la registrazione." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email e password sono richieste." });
  }

  try {
    const result = await pool.query("SELECT id, email, password_hash FROM users WHERE email = $1", [
      email.toLowerCase().trim(),
    ]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Credenziali non valide." });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Credenziali non valide." });
    }

    const token = signToken(user.id);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error("Errore login:", err);
    res.status(500).json({ error: "Errore durante il login." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, email FROM users WHERE id = $1", [req.userId]);
    if (!result.rows[0]) return res.status(404).json({ error: "Utente non trovato." });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Errore profilo:", err);
    res.status(500).json({ error: "Errore nel recupero del profilo." });
  }
});

module.exports = router;
