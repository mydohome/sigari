import React from "react";
import { Fumata, HumidorStats } from "../types/cigar";
import { Flame, Clock, Calendar, Undo2, Wine, Edit3 } from "lucide-react";

interface FumateTabProps {
  fumate: Fumata[];
  stats: HumidorStats | null;
  onOpenFumataModal: () => void;
  onOpenEditFumata: (fumata: Fumata) => void;
  onDeleteFumata: (id: number) => void;
}

export const FumateTab: React.FC<FumateTabProps> = ({
  fumate,
  stats,
  onOpenFumataModal,
  onOpenEditFumata,
  onDeleteFumata,
}) => {
  const formatDurata = (minuti?: number | null) => {
    if (!minuti) return "—";
    if (minuti < 60) return `${minuti} min`;
    const h = Math.floor(minuti / 60);
    const m = minuti % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // I totali vengono dal server (su tutte le fumate); la lista sotto mostra le piu' recenti
  const totaleFumate = stats?.fumate_totali ?? fumate.reduce((s, f) => s + f.quantita, 0);
  const durataMedia = stats?.durata_media_minuti ? Math.round(stats.durata_media_minuti) : null;
  const fumateConDurata = stats?.fumate_con_durata ?? fumate.filter((f) => f.durata_minuti).length;

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#faf3ea]">
            Diario delle Fumate
          </h1>
          <p className="text-xs sm:text-sm text-[#8c7e75] mt-0.5">
            Registro cronologico delle degustazioni con durata, combustione e abbinamenti
          </p>
        </div>
        <button
          onClick={onOpenFumataModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] hover:from-[#e0b477] hover:to-[#be8746] rounded-xl transition-all shadow-md shadow-[#b37d3e]/20 active:scale-95"
        >
          <Flame className="w-4 h-4 text-[#14100e]" />
          <span>Registra Fumata</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-[#181311] rounded-2xl border border-[#2e231e]">
        <div>
          <span className="text-[11px] text-[#7d6f66] block">Sessioni Totali</span>
          <span className="text-xl sm:text-2xl font-bold text-[#f5ebd9] font-mono tabular-nums">
            {totaleFumate}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-[#7d6f66] block">Durata Media</span>
          <span className="text-xl sm:text-2xl font-bold text-[#d9aa6b] font-mono tabular-nums">
            {durataMedia ? formatDurata(durataMedia) : "—"}
          </span>
          {!durataMedia && (
            <span className="text-[10px] text-[#6b5d54] block">
              serve una media su {stats?.min_campioni_durata ?? 5} sessioni cronometrate
            </span>
          )}
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[11px] text-[#7d6f66] block">Sessioni Monitorate</span>
          <span className="text-xl sm:text-2xl font-bold text-[#c4b5a8] font-mono tabular-nums">
            {fumateConDurata} cronometrate
          </span>
        </div>
      </div>

      {/* Smokes List */}
      {fumate.length === 0 ? (
        <div className="text-center py-16 bg-[#16110f] rounded-2xl border border-dashed border-[#342720] p-6">
          <Flame className="w-12 h-12 text-[#6e5c52] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#f5ebd9]">Nessuna fumata registrata</h3>
          <p className="text-xs text-[#8c7e75] mt-1 max-w-sm mx-auto">
            Accendi il tuo primo sigaro e registralo per tracciare orari di inizio/fine, tiraggio e abbinamento.
          </p>
          <button
            onClick={onOpenFumataModal}
            className="mt-4 px-4 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-lg shadow-sm"
          >
            Registra Prima Fumata
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {fumate.map((f) => {
            const dateStr = new Intl.DateTimeFormat("it-IT", {
              weekday: "short",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date(f.data_fumata));

            return (
              <div
                key={f.id}
                className="p-5 rounded-2xl bg-[#181311] border border-[#2e231e] hover:border-[#443328] transition-all shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#8c7e75]">
                      <span className="flex items-center gap-1 text-[#c99757] font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{dateStr}</span>
                      </span>
                      {f.ora_inizio && f.ora_fine && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-1 font-mono text-[#a3948b]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{f.ora_inizio} - {f.ora_fine}</span>
                          </span>
                        </>
                      )}
                      {f.durata_minuti && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-semibold text-[#f5ebd9] bg-[#261d19] px-2 py-0.5 rounded">
                            {formatDurata(f.durata_minuti)}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-[#faf3ea] mt-1.5">
                      {f.product?.marca || "Sigaro"}
                    </h3>
                    {(f.product?.vitola || f.product?.formato) && (
                      <p className="text-xs text-[#8c7e75] mt-0.5">{f.product.vitola ?? f.product.formato}</p>
                    )}

                    {/* Smoke details: relights, pairing, notes */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                      {f.riaccensioni != null && (
                        <div className="px-2.5 py-1 rounded-lg bg-[#140f0e] border border-[#251d18] text-[#a3948b]">
                          <span>Riaccensioni: </span>
                          <strong className="text-[#f5ebd9] font-mono">{f.riaccensioni}</strong>
                        </div>
                      )}
                      {f.abbinamento && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#140f0e] border border-[#251d18] text-[#d9aa6b]">
                          <Wine className="w-3.5 h-3.5 text-[#c99757]" />
                          <span>{f.abbinamento}</span>
                        </div>
                      )}
                    </div>

                    {f.note && (
                      <p className="text-xs text-[#c4b5a8] mt-3 bg-[#130f0d] p-3 rounded-xl border border-[#221a16] leading-relaxed italic">
                        "{f.note}"
                      </p>
                    )}
                  </div>

                  {/* Rating & Actions on the right */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#261d19]">
                    {f.stelle && (
                      <div className="flex items-center gap-1 bg-[#231a15] px-3 py-1.5 rounded-lg border border-[#382b23]">
                        <span className="text-sm font-mono font-bold text-[#c99757]">{f.stelle}.0</span>
                        <div className="flex text-[#c99757] text-xs">
                          {"★".repeat(f.stelle)}
                          {"☆".repeat(5 - f.stelle)}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenEditFumata(f)}
                        className="text-xs text-[#a3948b] hover:text-[#c99757] flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-[#201714] border border-[#2f241f]"
                        title="Modifica dettagli fumata (orario, note, stelle, abbinamento)"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Modifica</span>
                      </button>

                      <button
                        onClick={() => onDeleteFumata(f.id)}
                        className="text-xs text-[#7d6f66] hover:text-rose-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-[#201714]"
                        title="Annulla registrazione e ripristina la scorta in humidor"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Annulla</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
