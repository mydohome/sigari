import React, { useState, useEffect } from "react";
import { Product, HumidorItem, Fumata } from "../../types/cigar";
import { X, Flame, Clock, Star } from "lucide-react";
import { ProductPicker } from "../ProductPicker";

interface FumataModalProps {
  isOpen: boolean;
  onClose: () => void;
  humidorItems: HumidorItem[];
  preSelectedItem?: HumidorItem | null;
  editingFumata?: Fumata | null;
  onUpdate?: (id: number, data: Record<string, unknown>) => Promise<boolean>;
  onSubmit: (data: Record<string, unknown>) => Promise<boolean>;
}

const oggi = () => new Date().toISOString().split("T")[0];

// Stessa regola del server: se la fine precede l'inizio la fumata e' passata oltre la mezzanotte,
// ma solo fino a 6 ore (oltre e' quasi certamente un errore di digitazione).
function durataMinuti(inizio: string, fine: string): number | null {
  if (!inizio || !fine) return null;
  const [h1, m1] = inizio.split(":").map(Number);
  const [h2, m2] = fine.split(":").map(Number);
  let durata = h2 * 60 + m2 - (h1 * 60 + m1);
  if (durata < 0) durata += 24 * 60;
  return durata <= 360 ? durata : null;
}

const CATALOGO = "catalog";

export const FumataModal: React.FC<FumataModalProps> = ({
  isOpen,
  onClose,
  humidorItems,
  preSelectedItem,
  editingFumata,
  onUpdate,
  onSubmit,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<number | typeof CATALOGO | "">("");
  const [prodottoCatalogo, setProdottoCatalogo] = useState<Product | null>(null);
  const [quantita, setQuantita] = useState<number>(1);
  const [dataFumata, setDataFumata] = useState<string>(oggi());
  const [oraInizio, setOraInizio] = useState<string>("");
  const [oraFine, setOraFine] = useState<string>("");
  const [riaccensioni, setRiaccensioni] = useState<number>(0);
  const [stelle, setStelle] = useState<number | null>(null);
  const [note, setNote] = useState<string>("");
  const [abbinamento, setAbbinamento] = useState<string>("");
  const [inCorso, setInCorso] = useState(false);

  // Ogni apertura riparte da un modulo pulito (o dai dati della fumata da modificare)
  useEffect(() => {
    if (!isOpen) return;
    setInCorso(false);
    setProdottoCatalogo(null);
    if (editingFumata) {
      setSelectedItemId(editingFumata.humidor_item_id ?? CATALOGO);
      setQuantita(editingFumata.quantita);
      setDataFumata(editingFumata.data_fumata || oggi());
      setOraInizio(editingFumata.ora_inizio ?? "");
      setOraFine(editingFumata.ora_fine ?? "");
      setRiaccensioni(editingFumata.riaccensioni ?? 0);
      setStelle(editingFumata.stelle ?? null);
      setNote(editingFumata.note ?? "");
      setAbbinamento(editingFumata.abbinamento ?? "");
      return;
    }
    setSelectedItemId(preSelectedItem?.id ?? humidorItems[0]?.id ?? CATALOGO);
    setQuantita(1);
    setDataFumata(oggi());
    setOraInizio("");
    setOraFine("");
    setRiaccensioni(0);
    setStelle(null);
    setNote("");
    setAbbinamento("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingFumata, preSelectedItem]);

  if (!isOpen) return null;

  const lotto = typeof selectedItemId === "number" ? humidorItems.find((i) => i.id === selectedItemId) : undefined;
  const dalCatalogo = selectedItemId === CATALOGO;
  const maxQuantita = lotto ? lotto.quantita_rimanente + (editingFumata ? editingFumata.quantita : 0) : 100;
  const durata = durataMinuti(oraInizio, oraFine);
  const orariIncoerenti = Boolean(oraInizio && oraFine && durata === null);
  const puoSalvare = Boolean(editingFumata) || Boolean(lotto) || (dalCatalogo && prodottoCatalogo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const comuni = {
      quantita,
      data_fumata: dataFumata,
      ora_inizio: oraInizio || null,
      ora_fine: oraFine || null,
      riaccensioni,
      stelle,
      note: note.trim() || null,
      abbinamento: abbinamento.trim() || null,
    };
    setInCorso(true);
    let ok: boolean;
    if (editingFumata && onUpdate) {
      ok = await onUpdate(editingFumata.id, comuni);
    } else {
      ok = await onSubmit({
        ...comuni,
        ...(lotto ? { humidor_item_id: lotto.id } : { product_id: prodottoCatalogo?.id }),
      });
    }
    setInCorso(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#181311] border border-[#382b24] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#291f1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#c99757]" />
            <h2 className="text-base font-bold text-[#faf3ea]">
              {editingFumata ? "Modifica Fumata" : "Registra Nuova Fumata"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="p-1.5 text-[#8c7e75] hover:text-[#f5ebd9] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Cigar source selector */}
          {editingFumata ? (
            <div className="p-3 rounded-xl bg-[#120e0d] border border-[#241c18]">
              <span className="text-[11px] text-[#7d6f66] block">Sigaro</span>
              <span className="text-sm font-semibold text-[#f5ebd9]">{editingFumata.product?.marca}</span>
              {editingFumata.product?.formato && (
                <span className="text-xs text-[#8c7e75] block">{editingFumata.product.formato}</span>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-[#8c7e75] block mb-1">Origine del Sigaro</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedItemId(v === CATALOGO ? CATALOGO : Number(v));
                    setQuantita(1);
                  }}
                  className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] focus:outline-none focus:border-[#c99757]"
                >
                  {humidorItems.length > 0 && (
                    <optgroup label="Dal tuo Humidor (decrementa scorta)">
                      {humidorItems.map((itm) => (
                        <option key={itm.id} value={itm.id}>
                          {itm.product?.marca}
                          {itm.product?.formato ? ` — ${itm.product.formato}` : ""} ({itm.location_nome ?? "senza location"},{" "}
                          {itm.quantita_rimanente} rimasti)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <option value={CATALOGO}>Altro sigaro dal listino FIT (non in humidor)...</option>
                </select>
              </div>

              {dalCatalogo && (
                <div>
                  <label className="text-xs font-medium text-[#8c7e75] block mb-1">Seleziona Sigaro dal Listino</label>
                  <ProductPicker value={prodottoCatalogo} onChange={setProdottoCatalogo} />
                </div>
              )}
            </>
          )}

          {/* Date and Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[#8c7e75] block mb-1">Data Fumata</label>
              <input
                type="date"
                required
                value={dataFumata}
                onChange={(e) => setDataFumata(e.target.value)}
                className="w-full bg-[#120e0d] border border-[#2f241f] rounded-lg px-2.5 py-1.5 text-xs text-[#f5ebd9]"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#8c7e75] block mb-1">Ora Inizio (facoltativa)</label>
              <input
                type="time"
                value={oraInizio}
                onChange={(e) => setOraInizio(e.target.value)}
                className="w-full bg-[#120e0d] border border-[#2f241f] rounded-lg px-2.5 py-1.5 text-xs text-[#f5ebd9]"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#8c7e75] block mb-1">Ora Fine (facoltativa)</label>
              <input
                type="time"
                value={oraFine}
                onChange={(e) => setOraFine(e.target.value)}
                className="w-full bg-[#120e0d] border border-[#2f241f] rounded-lg px-2.5 py-1.5 text-xs text-[#f5ebd9]"
              />
            </div>
          </div>

          {/* Duration preview, Quantity & Relights */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#120e0d] border border-[#241c18] text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#c99757]" />
              {orariIncoerenti ? (
                <span className="text-amber-400">Orari non coerenti: la durata non verrà calcolata</span>
              ) : durata !== null ? (
                <span>
                  Durata: <strong className="text-[#f5ebd9] font-mono">{durata} minuti</strong>
                </span>
              ) : (
                <span className="text-[#8c7e75]">Indica inizio e fine per calcolare la durata</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[#8c7e75]">Quantità:</span>
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuantita(Math.max(1, quantita - 1))}
                    aria-label="Diminuisci quantità"
                    className="w-6 h-6 rounded bg-[#201713] text-[#f5ebd9] flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-[#f5ebd9]">{quantita}</span>
                  <button
                    type="button"
                    onClick={() => setQuantita(Math.min(maxQuantita, quantita + 1))}
                    disabled={quantita >= maxQuantita}
                    aria-label="Aumenta quantità"
                    className="w-6 h-6 rounded bg-[#201713] text-[#f5ebd9] flex items-center justify-center disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#8c7e75]">Riaccensioni:</span>
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRiaccensioni(Math.max(0, riaccensioni - 1))}
                    aria-label="Diminuisci riaccensioni"
                    className="w-6 h-6 rounded bg-[#201713] text-[#f5ebd9] flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-[#f5ebd9]">{riaccensioni}</span>
                  <button
                    type="button"
                    onClick={() => setRiaccensioni(Math.min(99, riaccensioni + 1))}
                    aria-label="Aumenta riaccensioni"
                    className="w-6 h-6 rounded bg-[#201713] text-[#f5ebd9] flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Valutazione Sessione (facoltativa)
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStelle(stelle === s ? null : s)}
                  aria-label={`${s} stelle`}
                  className="p-1 focus:outline-none"
                >
                  <Star
                    className={`w-6 h-6 ${stelle !== null && s <= stelle ? "text-[#c99757] fill-[#c99757]" : "text-[#4d382d]"}`}
                  />
                </button>
              ))}
              <span className="font-mono text-xs font-bold text-[#c99757] ml-2">
                {stelle !== null ? `${stelle}.0 stelle` : "nessuna"}
              </span>
            </div>
          </div>

          {/* Pairing */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">Abbinamento (Bevanda / Distillato)</label>
            <input
              type="text"
              maxLength={200}
              value={abbinamento}
              onChange={(e) => setAbbinamento(e.target.value)}
              placeholder="Es. Ron Diplomático Reserva Exclusiva, Espresso amaro, Single Malt"
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] placeholder-[#6e6057]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">Note di Fumata & Commento</label>
            <textarea
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Sensazioni organolettiche, tiraggio, cenere, piacevolezza complessiva..."
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl p-3 text-xs text-[#f5ebd9] placeholder-[#6e6057] focus:outline-none focus:border-[#c99757]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#291f1a]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-[#a3948b] hover:text-[#f5ebd9]">
              Annulla
            </button>
            <button
              type="submit"
              disabled={!puoSalvare || inCorso}
              className="px-5 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-xl shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {inCorso ? "Salvataggio..." : editingFumata ? "Salva Modifiche" : "Registra nel Diario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
