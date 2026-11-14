import React, { useState } from "react";
import { HumidorStats, Fumata } from "../types/cigar";
import { Box, TrendingUp, Clock, Flame, ArrowUpRight, Plus } from "lucide-react";
import heroImg from "../assets/images/cigar_lounge_hero.jpg";
import { formatDurata } from "./ui";

interface DashboardTabProps {
  stats: HumidorStats | null;
  fumate: Fumata[];
  onOpenFumataModal: () => void;
  onOpenPurchaseModal: () => void;
  onNavigateToHumidor: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  stats,
  fumate,
  onOpenFumataModal,
  onOpenPurchaseModal,
  onNavigateToHumidor,
}) => {
  const [chartMode, setChartMode] = useState<"settimana" | "mese">("settimana");

  const formatEuro = (val?: number) => {
    if (val === undefined || val === null) return "€ 0,00";
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(val);
  };

  const activeSeries = chartMode === "settimana" ? stats?.serieSettimanale || [] : stats?.serieMensile || [];
  const maxVal = Math.max(...activeSeries.map((s) => s.totale), 1);

  // Plusvalore teorico: prezzo di listino di oggi meno quanto pagato (calcolato dal server)
  const plusvalore = stats?.plusvalore_listino ?? 0;

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Hero Showcase with Atmospheric Cigar Lounge Background */}
      <div className="relative overflow-hidden rounded-2xl border border-[#382b24] shadow-xl bg-[#181210]">
        <div className="relative h-48 sm:h-56 lg:h-64 w-full overflow-hidden">
          <img
            src={heroImg}
            alt="Club Humidor Interno"
            className="w-full h-full object-cover object-center filter brightness-[0.72] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#140f0e] via-[#140f0e]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#140f0e] via-[#140f0e]/40 to-transparent" />

          {/* Content inside hero */}
          <div className="absolute inset-0 p-5 sm:p-7 flex flex-col justify-end">
            <div className="flex items-center gap-2 text-xs font-medium text-[#c99757] tracking-wider uppercase">
              <span>Club Privato del Fumo Lento</span>
              <span aria-hidden="true">·</span>
              <span>Listini FIT / ADM Sincronizzati</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#faf3ea] tracking-tight mt-1 text-balance">
              Collezione, Trend di Consumo & Note di Degustazione
            </h1>
            <p className="text-xs sm:text-sm text-[#c4b5a8] mt-1.5 max-w-2xl line-clamp-2">
              Monitora l'invecchiamento dei sigari nei tuoi humidor, analizza le abitudini di consumo settimanali e tieni traccia delle variazioni ufficiali dei prezzi dei monopoli di stato.
            </p>
          </div>
        </div>

        {/* Quick Strip Below Hero */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#2e231e] bg-[#1a1412] border-t border-[#2e231e]">
          <div className="p-3.5 sm:p-4">
            <span className="text-xs text-[#8c7e75] block">Giacenza Totale</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-bold text-[#f5ebd9] font-mono tabular-nums">
                {stats?.totale_in_humidor ?? 0}
              </span>
              <span className="text-xs text-[#b88a57]">sigari</span>
            </div>
          </div>
          <div className="p-3.5 sm:p-4">
            <span className="text-xs text-[#8c7e75] block">Valore Stimato</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-bold text-[#d9aa6b] font-mono tabular-nums">
                {formatEuro(stats?.valore_in_humidor)}
              </span>
            </div>
          </div>
          <div className="p-3.5 sm:p-4">
            <span className="text-xs text-[#8c7e75] block">Plusvalore Listini</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${plusvalore >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {plusvalore >= 0 ? `+${formatEuro(plusvalore)}` : formatEuro(plusvalore)}
              </span>
            </div>
          </div>
          <div className="p-3.5 sm:p-4">
            <span className="text-xs text-[#8c7e75] block">Fumate Registrate</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-bold text-[#f5ebd9] font-mono tabular-nums">
                {stats?.fumate_totali ?? 0}
              </span>
              <span className="text-xs text-[#8c7e75]">sessioni</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={onNavigateToHumidor}
          className="text-left p-4 sm:p-5 rounded-xl bg-[#1a1412] border border-[#2f241f] hover:border-[#4d382d] transition-all group shadow-sm"
        >
          <div className="flex items-center justify-between text-[#8c7e75] mb-2">
            <span className="text-xs font-medium">In Humidor</span>
            <Box className="w-4 h-4 text-[#c99757] group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#f5ebd9] font-mono tabular-nums">
            {stats?.totale_in_humidor ?? 0}
          </div>
          <div className="text-xs text-[#a3948b] mt-1 flex items-center justify-between">
            <span>Investito: {formatEuro(stats?.valore_investito)}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#c99757]" />
          </div>
        </button>

        <div className="p-4 sm:p-5 rounded-xl bg-[#1a1412] border border-[#2f241f] shadow-sm">
          <div className="flex items-center justify-between text-[#8c7e75] mb-2">
            <span className="text-xs font-medium">Media Consumo</span>
            <TrendingUp className="w-4 h-4 text-[#c99757]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#f5ebd9] font-mono tabular-nums">
            {stats?.media_settimanale ?? 0}
          </div>
          <div className="text-xs text-[#a3948b] mt-1">
            <span>sigari a settimana · {stats?.media_mensile ?? 0}/mese</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-[#1a1412] border border-[#2f241f] shadow-sm">
          <div className="flex items-center justify-between text-[#8c7e75] mb-2">
            <span className="text-xs font-medium">Durata Media</span>
            <Clock className="w-4 h-4 text-[#c99757]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#f5ebd9] font-mono tabular-nums">
            {stats?.durata_media_minuti ? formatDurata(stats.durata_media_minuti) : "—"}
          </div>
          <div className="text-xs text-[#a3948b] mt-1">
            {stats?.durata_media_minuti ? (
              <span>{stats.fumate_con_durata} sessioni cronometrate</span>
            ) : (
              <span>
                {stats?.fumate_con_durata ?? 0} su {stats?.min_campioni_durata ?? 5} sessioni cronometrate per la media
              </span>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-[#1a1412] border border-[#2f241f] shadow-sm">
          <div className="flex items-center justify-between text-[#8c7e75] mb-2">
            <span className="text-xs font-medium">Azioni Rapide</span>
            <Flame className="w-4 h-4 text-[#c99757]" />
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <button
              onClick={onOpenFumataModal}
              className="w-full text-xs font-medium text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] hover:from-[#e0b477] hover:to-[#be8746] py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors font-semibold"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Registra Fumata</span>
            </button>
            <button
              onClick={onOpenPurchaseModal}
              className="w-full text-xs font-medium text-[#f5ebd9] bg-[#281f1a] hover:bg-[#342721] border border-[#443328] py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#c99757]" />
              <span>Nuovo Acquisto</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Consumption Trend Chart */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-[#181311] border border-[#2e231e] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#f5ebd9]">Trend di Consumo</h2>
              <p className="text-xs text-[#8c7e75] mt-0.5">
                Monitoraggio volumetrico delle fumate nel corso del tempo
              </p>
            </div>
            {/* Filter Toggle Buttons */}
            <div className="flex items-center gap-1 p-1 bg-[#120e0d] rounded-lg border border-[#2a201b] self-start sm:self-auto">
              <button
                onClick={() => setChartMode("settimana")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartMode === "settimana"
                    ? "bg-[#2d211a] text-[#c99757] shadow-sm"
                    : "text-[#8c7e75] hover:text-[#f5ebd9]"
                }`}
              >
                Settimane (12)
              </button>
              <button
                onClick={() => setChartMode("mese")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartMode === "mese"
                    ? "bg-[#2d211a] text-[#c99757] shadow-sm"
                    : "text-[#8c7e75] hover:text-[#f5ebd9]"
                }`}
              >
                Mesi (12)
              </button>
            </div>
          </div>

          {/* SVG Bar Chart with Hover States */}
          <div className="h-48 sm:h-56 flex items-end gap-1 sm:gap-3 pt-6 pb-8 border-b border-[#2a201b]">
            {activeSeries.map((s, idx) => {
              const heightPercent = Math.max(Math.round((s.totale / maxVal) * 100), 4);
              const label =
                chartMode === "settimana"
                  ? new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(new Date(s.periodo))
                  : new Intl.DateTimeFormat("it-IT", { month: "short" }).format(new Date(s.periodo));

              return (
                <div key={idx} className="flex-1 min-w-0 flex flex-col items-center h-full justify-end group relative">
                  <div className="text-[11px] font-mono tabular-nums text-[#c99757] opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-semibold">
                    {s.totale}
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      s.totale > 0
                        ? "bg-gradient-to-t from-[#8b5e34] to-[#d9aa6b] group-hover:from-[#9c6a3c] group-hover:to-[#f0c286]"
                        : "bg-[#251d19]"
                    }`}
                  />
                  {/* L'etichetta non incide sulla larghezza della colonna; su telefono compare a giorni alterni */}
                  <div
                    className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-[#7d6f66] group-hover:text-[#f5ebd9] whitespace-nowrap transition-colors ${
                      idx % 2 === 1 ? "hidden sm:block" : ""
                    }`}
                  >
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-[#8c7e75] mt-3">
            <span>Periodi precedenti</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#d9aa6b] inline-block" />
              <span>Fumate effettuate</span>
            </span>
            <span>Oggi</span>
          </div>
        </div>

        {/* Right 1 Col: Top Brands & Provenance Breakdown */}
        <div className="space-y-6">
          {/* Top Brands Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#181311] border border-[#2e231e] shadow-sm">
            <h2 className="text-base font-semibold text-[#f5ebd9] mb-1">Marche più Fumate</h2>
            <p className="text-xs text-[#8c7e75] mb-4">Classifica preferenze personali</p>

            {stats?.topMarche && stats.topMarche.length > 0 ? (
              <div className="space-y-3">
                {stats.topMarche.map((item, i) => {
                  const maxBrand = stats.topMarche[0].totale || 1;
                  const pct = Math.round((item.totale / maxBrand) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[#e8decb] font-medium truncate max-w-[170px]">{item.marca}</span>
                        <span className="text-[#c99757] font-mono tabular-nums font-semibold">{item.totale} fumate</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#251d19] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#8b5e34] to-[#c99757]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#7d6f66] italic">Nessuna fumata registrata finora.</p>
            )}
          </div>

          {/* Provenance Distribution Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#181311] border border-[#2e231e] shadow-sm">
            <h2 className="text-base font-semibold text-[#f5ebd9] mb-1">Origine Collezione</h2>
            <p className="text-xs text-[#8c7e75] mb-4">Ripartizione geografica humidor</p>

            <div className="space-y-2.5">
              {stats?.distribuzioneProvenienza.map((prov, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[#140f0e] border border-[#261d19]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        prov.provenienza === "Cuba"
                          ? "bg-rose-500"
                          : prov.provenienza === "Italia"
                          ? "bg-emerald-500"
                          : prov.provenienza === "Extra-Cuba"
                          ? "bg-amber-500"
                          : "bg-slate-500"
                      }`}
                    />
                    <span className="text-xs font-medium text-[#e8decb]">{prov.provenienza}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono tabular-nums font-bold text-[#f5ebd9]">{prov.totale} pz</span>
                    <span className="text-[10px] text-[#8c7e75] block">{formatEuro(prov.valore)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Smokes Feed with Burn Visualizer */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#181311] border border-[#2e231e] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[#f5ebd9]">Ultime Fumate</h2>
            <p className="text-xs text-[#8c7e75] mt-0.5">Sessioni di degustazione recenti e note di accensione</p>
          </div>
          <button
            onClick={onOpenFumataModal}
            className="text-xs font-medium text-[#c99757] hover:text-[#d9aa6b] flex items-center gap-1 transition-colors"
          >
            <span>Nuova sessione</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-[#261d19]">
          {fumate.slice(0, 5).map((f) => {
            const dateFormatted = new Intl.DateTimeFormat("it-IT", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(new Date(f.data_fumata));

            return (
              <div key={f.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#271d18] border border-[#403026] flex items-center justify-center shrink-0 mt-0.5">
                    <Flame className="w-4 h-4 text-[#c99757]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#f5ebd9]">
                      {f.product?.marca || "Sigaro"}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#8c7e75] mt-0.5">
                      <span>{dateFormatted}</span>
                      {f.durata_minuti && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-[#c4b5a8]">{f.durata_minuti} min</span>
                        </>
                      )}
                      {Boolean(f.riaccensioni && f.riaccensioni > 0) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#a3948b]">{f.riaccensioni} riaccensioni</span>
                        </>
                      )}
                      {f.abbinamento && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#d9aa6b] italic">{f.abbinamento}</span>
                        </>
                      )}
                    </div>
                    {f.note && (
                      <p className="text-xs text-[#a3948b] mt-1.5 italic bg-[#140f0e] px-2.5 py-1 rounded border border-[#221a16] line-clamp-2">
                        "{f.note}"
                      </p>
                    )}
                  </div>
                </div>

                {f.stelle && (
                  <div className="flex items-center gap-1 self-start sm:self-center shrink-0 bg-[#211915] px-2.5 py-1 rounded-md border border-[#342720]">
                    <span className="text-xs font-mono font-bold text-[#c99757]">{f.stelle}.0</span>
                    <div className="flex text-[#c99757] text-xs">
                      {"★".repeat(f.stelle)}
                      {"☆".repeat(5 - f.stelle)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
