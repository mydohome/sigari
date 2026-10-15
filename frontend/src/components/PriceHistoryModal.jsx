import React, { useEffect, useMemo, useState } from "react";
import Modal from "./Modal.jsx";
import { fetchHistory } from "../api.js";

const ANNI = 5;
const M = { top: 18, right: 18, bottom: 30, left: 62 };

function formatEuro(value) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

function formatData(date) {
  return new Intl.DateTimeFormat("it-IT").format(date);
}

function formatMeseAnno(date) {
  return new Intl.DateTimeFormat("it-IT", { month: "short", year: "numeric" }).format(date);
}

// Dal listino completo ai soli punti in cui il prezzo cambia: il grafico e'
// una scala a gradini, quindi i listini identici non aggiungono informazione.
function comprimi(history, serie) {
  const asc = [...history].reverse();
  const punti = [];
  for (const riga of asc) {
    const valore = Number(serie === "singolo" ? riga.prezzo_singolo ?? riga.prezzo_confezione : riga.prezzo_confezione);
    const data = new Date(riga.valido_dal);
    if (!punti.length || punti[punti.length - 1].valore !== valore) punti.push({ data, valore });
  }
  return punti;
}

function scalaY(min, max) {
  const margine = (max - min) * 0.15 || max * 0.05 || 1;
  return [Math.max(0, min - margine), max + margine];
}

export default function PriceHistoryModal({ prodotto, onClose }) {
  const haSingolo = prodotto.pezzi_per_confezione > 1 && prodotto.prezzo_singolo;
  const [serie, setSerie] = useState(haSingolo ? "singolo" : "confezione");
  const [history, setHistory] = useState(null);
  const [errore, setErrore] = useState(null);
  const [hover, setHover] = useState(null);

  // Il grafico si disegna alla larghezza reale del contenitore, cosi' il testo
  // degli assi resta leggibile anche su telefono (un viewBox fisso lo rimpicciolirebbe).
  const [contenitore, setContenitore] = useState(null);
  const [W, setW] = useState(640);
  const H = W < 420 ? 220 : 260;
  useEffect(() => {
    if (!contenitore) return undefined;
    const osservatore = new ResizeObserver(([voce]) => setW(Math.max(280, Math.round(voce.contentRect.width))));
    osservatore.observe(contenitore);
    return () => osservatore.disconnect();
  }, [contenitore]);

  useEffect(() => {
    fetchHistory(prodotto.product_id, ANNI)
      .then((data) => setHistory(data.history))
      .catch((err) => setErrore(err.message));
  }, [prodotto.product_id]);

  const punti = useMemo(() => (history ? comprimi(history, serie) : []), [history, serie]);

  const titolo = `${prodotto.marca}${prodotto.formato ? ` — ${prodotto.formato}` : ""}`;

  let corpo;
  if (errore) {
    corpo = <p className="error-msg">{errore}</p>;
  } else if (!history) {
    corpo = <p className="status-msg">Caricamento storico...</p>;
  } else if (!punti.length) {
    corpo = <p className="status-msg">Nessun dato di prezzo disponibile per questo prodotto.</p>;
  } else {
    const oggi = new Date();
    const t0 = punti[0].data.getTime();
    const t1 = Math.max(oggi.getTime(), punti[punti.length - 1].data.getTime());
    const span = Math.max(t1 - t0, 1);
    const valori = punti.map((p) => p.valore);
    const [yMin, yMax] = scalaY(Math.min(...valori), Math.max(...valori));

    const x = (t) => M.left + ((t - t0) / span) * (W - M.left - M.right);
    const y = (v) => M.top + (1 - (v - yMin) / (yMax - yMin)) * (H - M.top - M.bottom);
    const base = H - M.bottom;

    let linea = `M ${x(punti[0].data.getTime())} ${y(punti[0].valore)}`;
    for (let i = 1; i < punti.length; i++) {
      linea += ` H ${x(punti[i].data.getTime())} V ${y(punti[i].valore)}`;
    }
    linea += ` H ${x(t1)}`;
    const area = `${linea} V ${base} H ${x(t0)} Z`;

    const griglia = Array.from({ length: 4 }, (_, i) => yMin + ((yMax - yMin) * (i + 0.5)) / 4);
    const anni = [];
    for (let a = new Date(t0).getFullYear() + 1; a <= new Date(t1).getFullYear(); a++) {
      const t = new Date(a, 0, 1).getTime();
      if (t > t0 && t < t1) anni.push({ a, t });
    }

    const primo = punti[0];
    const ultimo = punti[punti.length - 1];
    const variazione = ultimo.valore - primo.valore;
    const percentuale = primo.valore ? (variazione / primo.valore) * 100 : 0;
    const cambi = punti.length - 1;
    const classeVar = variazione > 0 ? "su" : variazione < 0 ? "giu" : "";

    function valoreAl(t) {
      let corrente = punti[0];
      for (const p of punti) if (p.data.getTime() <= t) corrente = p;
      return corrente;
    }

    function muovi(e) {
      const box = e.currentTarget.getBoundingClientRect();
      const px = ((e.clientX - box.left) / box.width) * W;
      const t = t0 + ((Math.min(Math.max(px, M.left), W - M.right) - M.left) / (W - M.left - M.right)) * span;
      const p = valoreAl(t);
      setHover({ t, p });
    }

    corpo = (
      <>
        <div className="price-summary">
          <div>
            <span className="price-summary-label">Prezzo attuale</span>
            <strong className="price-summary-value">{formatEuro(ultimo.valore)}</strong>
          </div>
          <div>
            <span className="price-summary-label">Da {formatMeseAnno(primo.data)}</span>
            <strong className={`price-summary-value price-delta ${classeVar}`}>
              {variazione === 0
                ? "invariato"
                : `${variazione > 0 ? "▲ +" : "▼ "}${percentuale.toFixed(1).replace(".", ",")}%`}
            </strong>
          </div>
          <div>
            <span className="price-summary-label">Variazioni</span>
            <strong className="price-summary-value">{cambi}</strong>
          </div>
        </div>

        {haSingolo && (
          <div className="price-serie-toggle" role="group" aria-label="Prezzo mostrato">
            <button type="button" className={serie === "singolo" ? "active" : ""} onClick={() => setSerie("singolo")}>
              Singolo sigaro
            </button>
            <button
              type="button"
              className={serie === "confezione" ? "active" : ""}
              onClick={() => setSerie("confezione")}
            >
              Confezione
            </button>
          </div>
        )}

        <div className="price-chart" ref={setContenitore}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Storico del prezzo di ${titolo}`}
            onPointerMove={muovi}
            onPointerDown={muovi}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id="price-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--oro)" stopOpacity="0.38" />
                <stop offset="100%" stopColor="var(--oro)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {griglia.map((v) => (
              <g key={v}>
                <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className="price-grid" />
                <text x={M.left - 8} y={y(v) + 4} textAnchor="end" className="price-axis">
                  {formatEuro(v)}
                </text>
              </g>
            ))}

            <line x1={M.left} x2={W - M.right} y1={base} y2={base} className="price-axis-line" />
            <text x={M.left} y={H - 9} textAnchor="start" className="price-axis">
              {primo.data.getFullYear()}
            </text>
            {anni.filter(({ t }) => x(t) - x(t0) > 44).map(({ a, t }) => (
              <g key={a}>
                <line x1={x(t)} x2={x(t)} y1={base} y2={base + 4} className="price-axis-line" />
                <text x={x(t)} y={H - 9} textAnchor="middle" className="price-axis">
                  {a}
                </text>
              </g>
            ))}
            <text x={W - M.right} y={H - 9} textAnchor="end" className="price-axis">
              oggi
            </text>

            <path d={area} fill="url(#price-area)" />
            <path d={linea} className="price-line" />

            {punti.slice(1).map((p) => (
              <circle key={p.data.getTime()} cx={x(p.data.getTime())} cy={y(p.valore)} r="3" className="price-dot" />
            ))}

            <circle cx={x(t1)} cy={y(ultimo.valore)} r="9" className="price-now-glow" />
            <circle cx={x(t1)} cy={y(ultimo.valore)} r="4" className="price-now" />

            {hover && (
              <g pointerEvents="none">
                <line x1={x(hover.t)} x2={x(hover.t)} y1={M.top} y2={base} className="price-hover-line" />
                <circle cx={x(hover.t)} cy={y(hover.p.valore)} r="4.5" className="price-hover-dot" />
              </g>
            )}
          </svg>

          {hover && (
            <div
              className="price-tooltip"
              style={{
                left: `${(x(hover.t) / W) * 100}%`,
                top: `${(y(hover.p.valore) / H) * 100}%`,
              }}
            >
              <strong>{formatEuro(hover.p.valore)}</strong>
              <span>
                dal {formatData(hover.p.data)}
                {hover.p.data.getTime() === t0 ? " (primo listino)" : ""}
              </span>
            </div>
          )}
        </div>

        <p className="status-msg small price-note">
          {cambi === 0
            ? "Nessuna variazione di prezzo registrata nel periodo."
            : `${cambi} ${cambi === 1 ? "variazione" : "variazioni"} dal ${formatData(primo.data)}.`}{" "}
          Dati dai listini ufficiali FIT/ADM, disponibili online dal gennaio 2023: lo storico si allunga a ogni
          nuovo listino.
        </p>
      </>
    );
  }

  return (
    <Modal title={titolo} onClose={onClose} wide>
      {corpo}
    </Modal>
  );
}
