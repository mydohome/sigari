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

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/prices", pricesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/auth", authRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/reviews", reviewsRouter);

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

  app.listen(PORT, () => {
    console.log(`API in ascolto sulla porta ${PORT}`);
    startScheduler();
  });
}

start();
