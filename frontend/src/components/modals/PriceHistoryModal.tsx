import React, { useEffect, useMemo, useState } from "react";
import { Product, PriceHistoryPoint } from "../../types/cigar";
import { X, History, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { formatEuro } from "../ui";

interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  history: PriceHistoryPoint[]; // dal piu' vecchio al piu' recente, uno per listino
  loading?: boolean;
}

type Serie = "singolo" | "confezione";

interface Punto {
  data: Date;
  valore: number;
  singolo: number;
  confezione: number;
  fonte: string;
}

const M = { top: 18, right: 18, bottom: 30, left: 62 };

const formatData = (d: Date) => new Intl.DateTimeFormat("it-IT").format(d);
const formatMeseAnno = (d: Date) => new Intl.DateTimeFormat("it-IT", { month: "short", year: "numeric" }).format(d);

// Dal listino completo ai soli punti in cui il prezzo cambia: il grafico e' una scala a
// gradini, quindi i listini identici non aggiungono informazione.
function comprimi(history: PriceHistoryPoint[], serie: Serie): Punto[] {
  const punti: Punto[] = [];
  for (const riga of history) {
    const valore = serie === "singolo" ? riga.prezzo_singolo : riga.prezzo_confezione;
    if (!punti.length || punti[punti.length - 1].valore !== valore) {
      punti.push({
        data: new Date(riga.valido_dal),
        valore,
        singolo: riga.prezzo_singolo,
        confezione: riga.prezzo_confezione,
        fonte: riga.fonte_documento,
      });
    }
  }
  return punti;
}

function scalaY(min: number, max: number): [number, number] {
  const margine = (max - min) * 0.15 || max * 0.05 || 1;
  return [Math.max(0, min - margine), max + margine];
}

export const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({
  isOpen,
  onClose,
  product,
  history,
  loading = false,
}) => {
  const haSingolo = Boolean(product && (product.pezzi_per_confezione ?? 0) > 1);
  const [serie, setSerie] = useState<Serie>("singolo");
  const [hover, setHover] = useState<{ t: number; p: Punto } | null>(null);

  // Il grafico si disegna alla larghezza reale del contenitore, cosi' il testo degli assi
  // resta leggibile anche su telefono (un viewBox fisso lo rimpicciolirebbe).
  const [contenitore, setContenitore] = useState<HTMLDivElement | null>(null);
  const [W, setW] = useState(640);
  const H = W < 420 ? 220 : 260;
  useEffect(() => {
    if (!contenitore) return undefined;
    const osservatore = new ResizeObserver(([voce]) => setW(Math.max(280, Math.round(voce.contentRect.width))));
    osservatore.observe(contenitore);
    return () => osservatore.disconnect();
  }, [contenitore]);

  useEffect(() => {
    setSerie(haSingolo ? "singolo" : "confezione");
    setHover(null);
  }, [product, haSingolo]);

  const punti = useMemo(() => comprimi(history, serie), [history, serie]);

  if (!isOpen || !product) return null;

  const titolo = `${product.marca}${product.formato ? ` — ${product.formato}` : ""}`;
  const var180 = product.variazione_180gg || 0;

  let grafico: React.ReactNode;
  if (loading) {
    grafico = <p className="text-xs text-[#8c7e75] text-center py-10">Caricamento storico...</p>;
  } else if (!punti.length) {
    grafico = <p className="text-xs text-[#8c7e75] text-center py-10">Nessun dato di prezzo disponibile.</p>;
  } else {
    const t0 = punti[0].data.getTime();
    const t1 = Math.max(Date.now(), punti[punti.length - 1].data.getTime());
    const span = Math.max(t1 - t0, 1);
    const valori = punti.map((p) => p.valore);
    const [yMin, yMax] = scalaY(Math.min(...valori), Math.max(...valori));

    const x = (t: number) => M.left + ((t - t0) / span) * (W - M.left - M.right);
    const y = (v: number) => M.top + (1 - (v - yMin) / (yMax - yMin)) * (H - M.top - M.bottom);
    const base = H - M.bottom;
    const ultimo = punti[punti.length - 1];

    let linea = `M ${x(punti[0].data.getTime())} ${y(punti[0].valore)}`;
    for (let i = 1; i < punti.length; i++) {
      linea += ` H ${x(punti[i].data.getTime())} V ${y(punti[i].valore)}`;
    }
    linea += ` H ${x(t1)}`;
    const area = `${linea} V ${base} H ${x(t0)} Z`;

    const griglia = Array.from({ length: 4 }, (_, i) => yMin + ((yMax - yMin) * (i + 0.5)) / 4);
    const anni: { a: number; t: number }[] = [];
    for (let a = new Date(t0).getFullYear() + 1; a <= new Date(t1).getFullYear(); a++) {
      const t = new Date(a, 0, 1).getTime();
      if (t > t0 && t < t1) anni.push({ a, t });
    }

    const valoreAl = (t: number) => {
      let corrente = punti[0];
      for (const p of punti) if (p.data.getTime() <= t) corrente = p;
      return corrente;
    };

    const muovi = (e: React.PointerEvent<SVGSVGElement>) => {
      const box = e.currentTarget.getBoundingClientRect();
      const px = ((e.clientX - box.left) / box.width) * W;
      const t = t0 + ((Math.min(Math.max(px, M.left), W - M.right) - M.left) / (W - M.left - M.right)) * span;
      setHover({ t, p: valoreAl(t) });
    };

    grafico = (
      <div className="relative" ref={setContenitore}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Storico del prezzo di ${titolo}`}
          className="block w-full h-auto touch-pan-y overflow-visible"
          onPointerMove={muovi}
          onPointerDown={muovi}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="storico-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c99757" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#c99757" stopOpacity="0" />
            </linearGradient>
          </defs>

          {griglia.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke="#241b17" strokeDasharray="3 3" />
              <text x={M.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#8c7e75" fontFamily="monospace">
                {formatEuro(v)}
              </text>
            </g>
          ))}

          <line x1={M.left} x2={W - M.right} y1={base} y2={base} stroke="#3a2c24" />
          <text x={M.left} y={H - 9} textAnchor="start" fontSize="11" fill="#8c7e75">
            {punti[0].data.getFullYear()}
          </text>
          {anni
            .filter(({ t }) => x(t) - x(t0) > 44)
            .map(({ a, t }) => (
              <g key={a}>
                <line x1={x(t)} x2={x(t)} y1={base} y2={base + 4} stroke="#3a2c24" />
                <text x={x(t)} y={H - 9} textAnchor="middle" fontSize="11" fill="#8c7e75">
                  {a}
                </text>
              </g>
            ))}
          <text x={W - M.right} y={H - 9} textAnchor="end" fontSize="11" fill="#8c7e75">
            oggi
          </text>

          <path d={area} fill="url(#storico-area)" />
          <path d={linea} fill="none" stroke="#c99757" strokeWidth="2.5" strokeLinejoin="round" />

          {punti.slice(1).map((p) => (
            <circle
              key={p.data.getTime()}
              cx={x(p.data.getTime())}
              cy={y(p.valore)}
              r="3.5"
              fill="#140f0e"
              stroke="#c99757"
              strokeWidth="2"
            />
          ))}
          <circle cx={x(t1)} cy={y(ultimo.valore)} r="4.5" fill="#f5ebd9" stroke="#c99757" strokeWidth="2" />

          {hover && (
            <g pointerEvents="none">
              <line x1={x(hover.t)} x2={x(hover.t)} y1={M.top} y2={base} stroke="#6b5a4e" strokeDasharray="3 3" />
              <circle cx={x(hover.t)} cy={y(hover.p.valore)} r="5" fill="#d9aa6b" stroke="#120e0d" strokeWidth="2" />
            </g>
          )}
        </svg>

        {hover && (
          <div
            className="absolute z-10 flex flex-col px-2.5 py-1.5 -translate-x-1/2 bg-[#120e0d] border border-[#c99757] rounded-lg whitespace-nowrap pointer-events-none text-[11px] text-[#c4b5a8]"
            style={{
              left: `${(x(hover.t) / W) * 100}%`,
              top: `${(y(hover.p.valore) / H) * 100}%`,
              transform: "translate(-50%, calc(-100% - 12px))",
            }}
          >
            <strong className="text-sm text-[#d9aa6b] font-mono">{formatEuro(hover.p.valore)}</strong>
            <span>
              dal {formatData(hover.p.data)}
              {hover.p.data.getTime() === t0 ? " (primo listino)" : ""}
            </span>
          </div>
        )}
      </div>
    );
  }

  const primo = punti[0];
  const ultimo = punti[punti.length - 1];
  const variazioneTotale = primo && ultimo ? ultimo.valore - primo.valore : 0;
  const percentuale = primo && primo.valore ? (variazioneTotale / primo.valore) * 100 : 0;
  const cambi = Math.max(punti.length - 1, 0);
  const righeTabella = [...punti].reverse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#181311] border border-[#382b24] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#291f1a] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <History className="w-5 h-5 text-[#c99757] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#faf3ea]">Storico Prezzi Ufficiali FIT</h2>
              <span className="text-xs text-[#8c7e75] block truncate">
                {titolo}
                {product.codice_prodotto ? ` · Codice ADM #${product.codice_prodotto}` : ""}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="p-1.5 text-[#8c7e75] hover:text-[#f5ebd9] rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Current vs Initial */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-[#120e0d] rounded-xl border border-[#241c18] text-xs">
            <div>
              <span className="text-[#8c7e75] block">Prezzo Ufficiale Oggi</span>
              <span className="text-xl font-bold font-mono text-[#f5ebd9] tabular-nums">
                {formatEuro(product.prezzo_singolo)}
              </span>
            </div>
            <div>
              <span className="text-[#8c7e75] block">Variazione (180gg)</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {var180 > 0 ? (
                  <TrendingUp className="w-4 h-4 text-rose-400" />
                ) : var180 < 0 ? (
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                ) : null}
                <span
                  className={`text-base font-mono font-bold ${
                    var180 > 0 ? "text-rose-400" : var180 < 0 ? "text-emerald-400" : "text-[#a3948b]"
                  }`}
                >
                  {Math.abs(var180) < 0.005 ? "Invariato" : `${var180 > 0 ? "+" : ""}${var180.toFixed(2)} €`}
                </span>
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[#8c7e75] block">{primo ? `Da ${formatMeseAnno(primo.data)}` : "Dall'inizio"}</span>
              <span
                className={`text-base font-mono font-bold ${
                  variazioneTotale > 0 ? "text-rose-400" : variazioneTotale < 0 ? "text-emerald-400" : "text-[#a3948b]"
                }`}
              >
                {variazioneTotale === 0
                  ? "invariato"
                  : `${variazioneTotale > 0 ? "+" : ""}${percentuale.toFixed(1).replace(".", ",")}%`}
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="p-4 bg-[#120e0d] rounded-xl border border-[#241c18]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold text-[#8c7e75] uppercase tracking-wider">
                Andamento Storico (fino a 5 anni)
              </span>
              {haSingolo && (
                <div className="inline-flex p-0.5 bg-[#181210] rounded-lg border border-[#2a201b]" role="group" aria-label="Prezzo mostrato">
                  {(["singolo", "confezione"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSerie(s)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                        serie === s ? "bg-[#2d211a] text-[#c99757]" : "text-[#8c7e75] hover:text-[#f5ebd9]"
                      }`}
                    >
                      {s === "singolo" ? "Singolo" : "Confezione"}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {grafico}
          </div>

          {/* Table of tariff changes */}
          {!loading && righeTabella.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#a3948b] block">
                Variazioni di Listino ({cambi}):
              </span>
              <div className="divide-y divide-[#241c18] border border-[#241c18] rounded-xl overflow-hidden bg-[#120e0d]">
                {righeTabella.map((h, i) => {
                  const precedente = righeTabella[i + 1];
                  const delta = precedente ? h.valore - precedente.valore : 0;
                  return (
                    <div key={h.data.getTime()} className="p-3 text-xs flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-mono text-[#f5ebd9] font-medium block">{formatData(h.data)}</span>
                        <span className="text-[10px] text-[#7d6f66] flex items-center gap-1 mt-0.5">
                          <FileText className="w-3 h-3 text-[#c99757] shrink-0" />
                          <span className="truncate">{precedente ? h.fonte || "Listino FIT" : "Primo listino disponibile"}</span>
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono tabular-nums text-sm font-bold text-[#c99757]">
                          {formatEuro(h.singolo)} / pz
                        </span>
                        <span className="text-[10px] text-[#8c7e75] block font-mono">
                          Conf: {formatEuro(h.confezione)}
                          {precedente && (
                            <span className={`ml-1.5 ${delta > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                              ({delta > 0 ? "+" : ""}
                              {delta.toFixed(2)})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#6b5d54]">
                Dati dai listini ufficiali FIT/ADM, disponibili online dal gennaio 2023: lo storico si allunga a ogni
                nuovo listino.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#291f1a] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-xl"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
