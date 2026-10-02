function minutiDaOra(ora) {
  const [h, m] = ora.split(":");
  return Number(h) * 60 + Number(m);
}

// Durata in minuti di una fumata, o null se mancano gli orari o sono incoerenti.
export function durataMinuti(fumata) {
  if (!fumata.ora_inizio || !fumata.ora_fine) return null;
  const diff = minutiDaOra(fumata.ora_fine) - minutiDaOra(fumata.ora_inizio);
  return diff >= 0 ? diff : null;
}

export function formatDurata(minuti) {
  if (minuti === null || minuti === undefined) return "—";
  const m = Math.round(minuti);
  if (m < 60) return `${m} min`;
  const ore = Math.floor(m / 60);
  const resto = m % 60;
  return resto ? `${ore}h ${resto}min` : `${ore}h`;
}
