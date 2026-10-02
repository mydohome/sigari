import React from "react";

const ALTEZZA_MAX = 136; // px del sigaro piu' alto
const ALTEZZA_MIN = 22; // abbastanza per cenere + brace
const ALTEZZA_MIN_FASCIA = 70; // sotto questa altezza la fascia dorata non entra

// Grafico a barre in cui ogni barra e' un sigaro in piedi: cenere in cima,
// brace che sfarfalla e un filo di fumo. Solo HTML/CSS, nessuna dipendenza.
// data: [{ label, value }]
// formatLabel: etichetta principale; formatSub(label, indice, data): seconda riga
// facoltativa (es. il mese solo quando cambia); unitLabel: testo del tooltip.
export default function BarChart({
  data,
  formatLabel = (l) => l,
  formatSub = () => "",
  unitLabel = formatLabel,
  unit = "fumate",
}) {
  if (!data || !data.length) {
    return <p className="status-msg small">Nessun dato ancora disponibile.</p>;
  }

  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="cigar-chart">
      <div className="cigar-chart-bars">
        {data.map((d, i) => {
          if (d.value === 0) {
            return (
              <div
                key={i}
                className="cigar-col"
                style={{ "--h": "4px", "--i": i }}
                title={`${unitLabel(d.label)}: 0 ${unit}`}
              >
                <div className="cigar-bar cigar-bar-vuoto" />
              </div>
            );
          }
          const h = Math.max(ALTEZZA_MIN, Math.round((d.value / max) * ALTEZZA_MAX));
          return (
            <div
              key={i}
              className="cigar-col"
              style={{ "--h": `${h}px`, "--i": i }}
              title={`${unitLabel(d.label)}: ${d.value} ${unit}`}
            >
              <div className="cigar-bar">
                <i className="cigar-smoke cigar-smoke-1" />
                <i className="cigar-smoke cigar-smoke-2" />
                <i className="cigar-ash" />
                <i className="cigar-ember" />
                {h >= ALTEZZA_MIN_FASCIA && <i className="cigar-band" />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="cigar-chart-labels">
        {data.map((d, i) => (
          <span key={i} className={d.value === 0 ? "cigar-label-vuoto" : undefined}>
            <strong>{d.value}</strong>
            <em>{formatLabel(d.label)}</em>
            <small>{formatSub(d.label, i, data) || "\u00a0"}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
