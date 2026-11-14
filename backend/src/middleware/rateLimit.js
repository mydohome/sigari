// Limite di richieste in memoria (nessuna dipendenza): sufficiente per un'istanza singola.
// `chiave(req)` decide a chi si applica il limite (es. IP o email); `max` richieste per finestra.
function creaLimite({ finestraMs, max, chiave, messaggio }) {
  const contatori = new Map();

  // Pulizia periodica dei contatori scaduti, senza tenere vivo il processo
  setInterval(() => {
    const adesso = Date.now();
    for (const [k, c] of contatori) if (c.scade <= adesso) contatori.delete(k);
  }, finestraMs).unref();

  return (req, res, next) => {
    const k = chiave(req);
    if (!k) return next();
    const adesso = Date.now();
    let c = contatori.get(k);
    if (!c || c.scade <= adesso) {
      c = { conteggio: 0, scade: adesso + finestraMs };
      contatori.set(k, c);
    }
    c.conteggio += 1;
    if (c.conteggio > max) {
      res.set("Retry-After", String(Math.ceil((c.scade - adesso) / 1000)));
      return res.status(429).json({ error: messaggio });
    }
    next();
  };
}

module.exports = { creaLimite };
