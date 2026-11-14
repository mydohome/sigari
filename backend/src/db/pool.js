const { Pool, types } = require("pg");

// OID 1082 = colonne di tipo DATE. Per default "pg" le converte in oggetti
// Date JS a mezzanotte nel fuso orario del processo, che poi in JSON.stringify
// diventano UTC e "perdono" un giorno per i fusi orari positivi (es. Europe/Rome).
// Le lasciamo come semplice stringa "YYYY-MM-DD", che e' anche il formato
// atteso da <input type="date"> lato frontend.
types.setTypeParser(1082, (val) => val);

// OID 1700 = NUMERIC (prezzi, importi, temperature). Per default "pg" li restituisce come
// stringhe ("12.50") per non perdere precisione, ma qui sono tutti importi con poche cifre
// decimali: come numeri JSON evitano conversioni sparse nel frontend.
types.setTypeParser(1700, (val) => parseFloat(val));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Errore inatteso sul pool Postgres", err);
});

module.exports = pool;
