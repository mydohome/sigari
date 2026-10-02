import React, { useMemo } from "react";
import { durataMinuti, formatDurata } from "../durata.js";

const MAX_RIGHE = 8;

function formatGiornoMese(dateStr) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit" }).format(new Date(dateStr));
}

function Fiamma() {
  return (
    <svg className="burn-flame" viewBox="0 0 12 16" width="9" height="12" aria-hidden="true">
      <path d="M6 0c.6 3.2-3.4 4.6-3.4 8.4A3.4 3.4 0 0 0 6 11.8a3.4 3.4 0 0 0 3.4-3.4C9.4 6.8 8.4 6 8.4 4.4 10.6 5.6 12 7.6 12 10a6 6 0 0 1-12 0C0 5 5 4.4 6 0z" />
    </svg>
  );
}

// Un sigaro orizzontale che si consuma: la cenere (a sinistra) cresce fino a
// `minuti` su una scala di `scala` minuti, con la brace sul fronte di
// consumo e un filo di fumo. Il lato destro e' la parte ancora da fumare.
export function BurnCigar({ minuti, scala, index = 0 }) {
  const pct = Math.min(100, (minuti / scala) * 100);
  return (
    <div className="burn-track" style={{ "--p": `${pct}%`, "--i": index }}>
      <i className="burn-ash" />
      <span className="burn-ember">
        <i className="burn-glow" />
        <i className="burn-smoke burn-smoke-1" />
        <i className="burn-smoke burn-smoke-2" />
      </span>
    </div>
  );
}

export function scalaMinuti(...valori) {
  const max = Math.max(0, ...valori.filter((v) => v !== null && v !== undefined));
  return Math.max(60, Math.ceil((max * 1.15) / 15) * 15);
}

export default function DurataFumate({ fumate, stats }) {
  const sessioni = useMemo(
    () =>
      fumate
        .map((f) => ({ ...f, minuti: durataMinuti(f) }))
        .filter((f) => f.minuti !== null)
        .slice(0, MAX_RIGHE),
    [fumate]
  );

  if (!sessioni.length) return null;

  const media = stats?.durata_media_minuti ?? null;
  const conDurata = stats?.fumate_con_durata ?? sessioni.length;
  const minCampioni = stats?.min_campioni_durata ?? 5;
  const mancanti = Math.max(0, minCampioni - conDurata);

  const durate = sessioni.map((s) => s.minuti);
  const scala = scalaMinuti(...durate, media);
  const piuLunga = Math.max(...durate);
  const piuBreve = Math.min(...durate);
  const conRiaccensioni = sessioni.filter((s) => s.riaccensioni !== null && s.riaccensioni !== undefined);
  const riaccensioniMedie = conRiaccensioni.length
    ? conRiaccensioni.reduce((somma, s) => somma + s.riaccensioni, 0) / conRiaccensioni.length
    : null;

  return (
    <section className="burn-panel">
      <div className="burn-hero">
        <div className="burn-hero-main">
          {media !== null ? (
            <>
              <span className="burn-hero-value">{formatDurata(media)}</span>
              <span className="burn-hero-label">durata media · {conDurata} fumate cronometrate</span>
            </>
          ) : (
            <>
              <span className="burn-hero-value burn-hero-value-muted">—</span>
              <span className="burn-hero-label">
                durata media: ancora {mancanti} {mancanti === 1 ? "fumata cronometrata" : "fumate cronometrate"}
              </span>
            </>
          )}
        </div>
        <ul className="burn-chips">
          <li>
            <span>Più lunga</span>
            <strong>{formatDurata(piuLunga)}</strong>
          </li>
          <li>
            <span>Più breve</span>
            <strong>{formatDurata(piuBreve)}</strong>
          </li>
          {riaccensioniMedie !== null && (
            <li>
              <span>Riaccensioni</span>
              <strong>{riaccensioniMedie.toFixed(1)} in media</strong>
            </li>
          )}
        </ul>
      </div>

      <h3 className="burn-title">Le ultime fumate, consumate fino all'ultimo minuto</h3>

      <div className="burn-rows">
        {media !== null && (
          <div className="burn-avg-line" style={{ left: `${Math.min(100, (media / scala) * 100)}%` }}>
            <span>media</span>
          </div>
        )}
        {sessioni.map((s, i) => (
          <div className="burn-row" key={s.id}>
            <BurnCigar minuti={s.minuti} scala={scala} index={i} />
            <div className="burn-meta">
              <span className="burn-name">
                {formatGiornoMese(s.data_fumata)} · {s.marca}
                {s.formato ? ` ${s.formato}` : ""}
              </span>
              <span className="burn-time">
                {s.riaccensioni > 0 && (
                  <span className="burn-relights" title={`${s.riaccensioni} riaccensioni`}>
                    {Array.from({ length: Math.min(s.riaccensioni, 4) }, (_, k) => (
                      <Fiamma key={k} />
                    ))}
                    {s.riaccensioni > 4 && <small>×{s.riaccensioni}</small>}
                  </span>
                )}
                <strong>{formatDurata(s.minuti)}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
