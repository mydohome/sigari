import React from "react";

// Piccolo grafico a barre in SVG puro, senza dipendenze esterne.
// data: [{ label, value }]
export default function BarChart({ data, height = 120, formatLabel = (l) => l }) {
  if (!data || !data.length) {
    return <p className="status-msg small">Nessun dato ancora disponibile.</p>;
  }

  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;

  return (
    <div className="bar-chart">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="bar-chart-svg">
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 20);
          const x = i * barWidth;
          return (
            <g key={i}>
              <rect
                x={x + barWidth * 0.15}
                y={height - 20 - h}
                width={barWidth * 0.7}
                height={h}
                rx="1.5"
                className="bar-rect"
              />
              <text x={x + barWidth / 2} y={height - 20 - h - 3} className="bar-value" textAnchor="middle">
                {d.value > 0 ? d.value : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="bar-chart-labels">
        {data.map((d, i) => (
          <span key={i} style={{ width: `${barWidth}%` }}>
            {formatLabel(d.label)}
          </span>
        ))}
      </div>
    </div>
  );
}
