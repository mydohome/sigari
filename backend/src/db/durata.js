// Durata in minuti di una fumata, calcolata dagli orari di inizio e fine.
// Se l'ora di fine precede quella di inizio la fumata e' passata oltre la mezzanotte, ma solo
// fino a 6 ore: oltre quasi certamente e' un errore di digitazione e la durata resta sconosciuta.
// `alias` e' il prefisso della tabella nella query (es. "f.").
function sqlDurataMinuti(alias = "") {
  const inizio = `${alias}ora_inizio`;
  const fine = `${alias}ora_fine`;
  const diff = `EXTRACT(EPOCH FROM (${fine} - ${inizio})) / 60`;
  return `CASE WHEN ${inizio} IS NOT NULL AND ${fine} IS NOT NULL THEN
      CASE WHEN ${fine} >= ${inizio} THEN ${diff}
           WHEN ${diff} + 1440 <= 360 THEN ${diff} + 1440 END
    END`;
}

module.exports = { sqlDurataMinuti };
