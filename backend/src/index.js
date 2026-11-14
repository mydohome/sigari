const express = require("express");
const cors = require("cors");
const { migrate } = require("./db/migrate");
const { startScheduler } = require("./scraper/scheduler");
const pricesRouter = require("./routes/prices");
const adminRouter = require("./routes/admin");
const authRouter = require("./routes/auth");
const favoritesRouter = require("./routes/favorites");
const wishlistRouter = require("./routes/wishlist");
const reviewsRouter = require("./routes/reviews");
const humidorRouter = require("./routes/humidor");
const settingsRouter = require("./routes/settings");
const haRouter = require("./routes/ha");
const exportRouter = require("./routes/export");
const pool = require("./db/pool");
const { verificaSegreti } = require("./middleware/secrets");

verificaSegreti();

const app = express();
app.disable("x-powered-by");
// Dietro nginx (un solo passaggio) l'IP del client arriva in X-Forwarded-For: serve ai limiti di richieste
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));
// L'interfaccia e' servita dallo stesso dominio (nginx fa da proxy): il CORS serve solo se si
// elencano esplicitamente altre origini in CORS_ORIGIN (separate da virgola).
const originiCors = (process.env.CORS_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: originiCors.length ? originiCors : false }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/prices", pricesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/auth", authRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/humidor", humidorRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/ha", haRouter);
app.use("/api/export", exportRouter);

// Rotte API sconosciute e errori (es. JSON malformato) rispondono in JSON, senza esporre stack trace
app.use("/api", (_req, res) => res.status(404).json({ error: "Risorsa non trovata." }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Corpo della richiesta non valido." });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Richiesta troppo grande." });
  console.error("Errore non gestito:", err);
  res.status(500).json({ error: "Errore interno del server." });
});

const PORT = process.env.PORT || 4000;

async function start() {
  // Ritenta la migrazione finche' il DB non e' pronto (utile all'avvio con docker-compose)
  let ready = false;
  for (let i = 0; i < 15 && !ready; i++) {
    try {
      await migrate();
      ready = true;
    } catch (err) {
      console.log(`DB non ancora pronto (tentativo ${i + 1}/15): ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (!ready) {
    console.error("Impossibile completare la migrazione del database. Arresto.");
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`API in ascolto sulla porta ${PORT}`);
    startScheduler();
  });

  // `docker stop` invia SIGTERM: si chiude con ordine, finendo le richieste in corso
  const chiudi = (segnale) => {
    console.log(`${segnale} ricevuto: arresto in corso...`);
    server.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", () => chiudi("SIGTERM"));
  process.on("SIGINT", () => chiudi("SIGINT"));
}

start();
