const crypto = require("crypto");

// Confronto a tempo costante: evita di far dedurre un token dalla durata della risposta.
function stessoSegreto(fornito, atteso) {
  if (typeof fornito !== "string" || typeof atteso !== "string" || !atteso) return false;
  const a = crypto.createHash("sha256").update(fornito).digest();
  const b = crypto.createHash("sha256").update(atteso).digest();
  return crypto.timingSafeEqual(a, b);
}

// All'avvio: senza un JWT_SECRET vero chiunque potrebbe firmarsi un token valido.
// "changeme" e' il valore di ripiego del docker-compose quando la variabile manca nel .env.
function verificaSegreti() {
  const jwt = process.env.JWT_SECRET;
  if (!jwt || jwt === "changeme") {
    console.error(
      "JWT_SECRET mancante o di esempio: impostalo nel file .env (es. con `openssl rand -hex 32`) e riavvia."
    );
    process.exit(1);
  }
  if (jwt.length < 32) {
    console.warn("ATTENZIONE: JWT_SECRET e' corto (meno di 32 caratteri). Usa `openssl rand -hex 32`.");
  }
  if (!process.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN === "changeme") {
    console.warn("ATTENZIONE: ADMIN_TOKEN non impostato o di esempio: gli endpoint /api/admin sono esposti con un token noto.");
  }
}

module.exports = { stessoSegreto, verificaSegreti };
