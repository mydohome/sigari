const { Pool, types } = require("pg");

// OID 1082 = colonne di tipo DATE. Per default "pg" le converte in oggetti
// Date JS a mezzanotte nel fuso orario del processo, che poi in JSON.stringify
// diventano UTC e "perdono" un giorno per i fusi orari positivi (es. Europe/Rome).
// Le lasciamo come semplice stringa "YYYY-MM-DD", che e' anche il formato
// atteso da <input type="date"> lato frontend.
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("Errore inatteso sul pool Postgres", err);
});

module.exports = pool;
