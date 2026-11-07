const cron = require("node-cron");
const { runScrapeCycle } = require("./index");

function startScheduler() {
  const expression = process.env.SCRAPE_CRON || "0 3 * * 1"; // default: ogni lunedi alle 3:00

  if (!cron.validate(expression)) {
    console.error(`Espressione cron non valida: "${expression}". Scheduler non avviato.`);
    return;
  }

  console.log(`Scheduler avviato: aggiornamento automatico con cron "${expression}".`);

  cron.schedule(expression, async () => {
    console.log("Avvio ciclo di scraping pianificato...");
    try {
      await runScrapeCycle();
    } catch (err) {
      console.error("Ciclo di scraping pianificato fallito:", err.message);
    }
  });

  if (process.env.SCRAPE_ON_BOOT === "true") {
    console.log("SCRAPE_ON_BOOT attivo: eseguo subito un primo ciclo di scraping...");
    runScrapeCycle().catch((err) =>
      console.error("Scraping iniziale fallito:", err.message)
    );
  }
}

module.exports = { startScheduler };
