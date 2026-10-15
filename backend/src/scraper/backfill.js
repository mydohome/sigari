// Recupera lo storico dei listini sigari FIT (online dal gennaio 2023 circa).
// Uso: node src/scraper/backfill.js [--da YYYY-MM-DD]
// Idempotente: i listini gia' in archivio vengono saltati, quindi si puo'
// rilanciare senza rischi. In produzione:
//   docker compose exec backend node src/scraper/backfill.js
const pool = require("../db/pool");
const { recuperaListiniMancanti } = require("./index");

const DA_DEFAULT = "2023-01-01";

async function main() {
  const i = process.argv.indexOf("--da");
  const da = i !== -1 ? process.argv[i + 1] : DA_DEFAULT;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(da || "")) {
    console.error("Uso: node src/scraper/backfill.js [--da YYYY-MM-DD]");
    process.exit(1);
  }

  const oggi = new Date().toISOString().slice(0, 10);
  console.log(`Cerco i listini sigari pubblicati dal ${da} al ${oggi} (puo' richiedere qualche minuto)...`);

  const r = await recuperaListiniMancanti({ da, a: oggi });
  console.log(
    `Fatto: ${r.trovati} listini trovati online, ${r.nuovi} elaborati ora, ${r.prezzi} prezzi salvati` +
      (r.errori ? `, ${r.errori} con errori (rilancia il comando per riprovare)` : ".")
  );
  await pool.end();
  process.exit(r.errori ? 1 : 0);
}

main().catch((err) => {
  console.error("Backfill fallito:", err.message);
  process.exit(1);
});
