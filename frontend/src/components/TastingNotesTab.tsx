import React, { useEffect, useState } from "react";
import { Product, TastingReview } from "../types/cigar";
import { Sparkles, Star, Plus, Wine, Edit3 } from "lucide-react";
import { ProductPicker } from "./ProductPicker";

interface TastingNotesTabProps {
  reviews: Record<number, TastingReview>;
  // Sigaro per cui aprire subito l'editor (arrivando dall'humidor)
  initialProduct?: Product | null;
  onInitialProductHandled?: () => void;
  onSaveReview: (productId: number, data: Record<string, unknown>) => Promise<boolean>;
  onOpenAIReview: (product: Product) => void;
}

const COMMON_AROMAS = [
  "Cedro",
  "Cuoio",
  "Cacao amaro",
  "Chicco di caffè",
  "Pepe nero",
  "Terra bagnata",
  "Frutta secca",
  "Fieno ed erbe",
  "Vaniglia",
  "Legna affumicata",
  "Miele selvatico",
  "Spezie dolci",
];

const FORZE = ["Leggera", "Medio-leggera", "Media", "Medio-forte", "Forte"];
const COMBUSTIONI = ["Perfetta", "Buona", "Irregolare"];
const TIRAGGI = ["Ottimale", "Aperto", "Serrato"];

// Prodotto minimo per aprire la sintesi AI a partire da una scheda salvata
function prodottoDaScheda(r: TastingReview): Product {
  return {
    id: r.product_id,
    marca: r.marca ?? "Sigaro",
    categoria: "Sigari",
    formato: r.formato ?? null,
    pezzi_per_confezione: null,
    prezzo_confezione: 0,
    prezzo_singolo: 0,
    codice_prodotto: null,
    provenienza: r.provenienza ?? "Altro",
    ultimo_aggiornamento: "",
  };
}

const selectClass =
  "w-full bg-[#130f0d] border border-[#2f241f] rounded-lg px-2.5 py-1.5 text-xs text-[#f5ebd9] focus:outline-none focus:border-[#c99757]";

export const TastingNotesTab: React.FC<TastingNotesTabProps> = ({
  reviews,
  initialProduct,
  onInitialProductHandled,
  onSaveReview,
  onOpenAIReview,
}) => {
  const [editing, setEditing] = useState(false);
  const [prodotto, setProdotto] = useState<Product | null>(null);
  const [stelle, setStelle] = useState<number | null>(null);
  const [descrizione, setDescrizione] = useState("");
  const [selectedAromas, setSelectedAromas] = useState<string[]>([]);
  const [forza, setForza] = useState("");
  const [combustione, setCombustione] = useState("");
  const [tiraggio, setTiraggio] = useState("");
  const [abbinamento, setAbbinamento] = useState("");
  const [inCorso, setInCorso] = useState(false);

  const reviewsList = Object.values(reviews);

  // Carica nel modulo la scheda esistente del sigaro scelto, oppure lo svuota
  const caricaScheda = (p: Product | null) => {
    setProdotto(p);
    const esistente = p ? reviews[p.id] : undefined;
    setStelle(esistente?.stelle ?? null);
    setDescrizione(esistente?.descrizione ?? "");
    setSelectedAromas(esistente?.aromi ?? []);
    setForza(esistente?.forza ?? "");
    setCombustione(esistente?.combustione ?? "");
    setTiraggio(esistente?.tiraggio ?? "");
    setAbbinamento(esistente?.abbinamento_consigliato ?? "");
  };

  const apri = (p: Product | null) => {
    caricaScheda(p);
    setEditing(true);
  };

  useEffect(() => {
    if (initialProduct) {
      apri(initialProduct);
      onInitialProductHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProduct]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodotto) return;
    setInCorso(true);
    const ok = await onSaveReview(prodotto.id, {
      stelle,
      descrizione: descrizione.trim() || null,
      aromi: selectedAromas,
      forza: forza || null,
      combustione: combustione || null,
      tiraggio: tiraggio || null,
      abbinamento_consigliato: abbinamento.trim() || null,
    });
    setInCorso(false);
    if (ok) setEditing(false);
  };

  const toggleAroma = (aroma: string) => {
    setSelectedAromas((correnti) =>
      correnti.includes(aroma) ? correnti.filter((a) => a !== aroma) : [...correnti, aroma]
    );
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#faf3ea]">Note di Degustazione</h1>
          <p className="text-xs sm:text-sm text-[#8c7e75] mt-0.5">
            Archivio sensoriale personale: ruota degli aromi, tiraggio, forza e abbinamenti
          </p>
        </div>
        <button
          onClick={() => apri(null)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] hover:from-[#e0b477] hover:to-[#be8746] rounded-xl transition-all shadow-md shadow-[#b37d3e]/20 active:scale-95"
        >
          <Plus className="w-4 h-4 text-[#14100e] stroke-[2.5]" />
          <span>Nuova Nota di Degustazione</span>
        </button>
      </div>

      {/* Editor Card if open */}
      {editing && (
        <div className="p-6 rounded-2xl bg-[#1b1411] border border-[#c99757]/50 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#2e231e]">
            <h2 className="text-base font-bold text-[#faf3ea]">Compila Scheda Sensoriale</h2>
            <button onClick={() => setEditing(false)} className="text-xs text-[#a3948b] hover:text-[#f5ebd9]">
              Chiudi
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1">Seleziona Sigaro</label>
              <ProductPicker value={prodotto} onChange={caricaScheda} />
              {prodotto && reviews[prodotto.id] && (
                <p className="text-[11px] text-[#c99757] mt-1.5">
                  Esiste già una scheda per questo sigaro: salvando la aggiorni.
                </p>
              )}
            </div>

            {/* Star Rating */}
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1">Valutazione Generale</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setStelle(stelle === star ? null : star)}
                    aria-label={`${star} stelle`}
                    className="p-1 text-xl transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        stelle !== null && star <= stelle ? "text-[#c99757] fill-[#c99757]" : "text-[#4d382d]"
                      }`}
                    />
                  </button>
                ))}
                <span className="font-mono text-sm font-bold text-[#c99757] ml-2">
                  {stelle !== null ? `${stelle}.0 / 5.0` : "nessuna"}
                </span>
              </div>
            </div>

            {/* Aromas Wheel Selector */}
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1.5">
                Sentori & Aromi Riscontrati (clicca per selezionare)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_AROMAS.map((aroma) => {
                  const isSel = selectedAromas.includes(aroma);
                  return (
                    <button
                      key={aroma}
                      type="button"
                      onClick={() => toggleAroma(aroma)}
                      aria-pressed={isSel}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                        isSel
                          ? "bg-[#c99757] text-[#14100e] font-semibold shadow-sm"
                          : "bg-[#140f0e] text-[#a3948b] hover:text-[#f5ebd9] border border-[#2b201a]"
                      }`}
                    >
                      {aroma}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mechanical Properties: Forza, Combustione, Tiraggio */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[#8c7e75] block mb-1">Forza</label>
                <select value={forza} onChange={(e) => setForza(e.target.value)} className={selectClass}>
                  <option value="">Non indicata</option>
                  {FORZE.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#8c7e75] block mb-1">Combustione</label>
                <select value={combustione} onChange={(e) => setCombustione(e.target.value)} className={selectClass}>
                  <option value="">Non indicata</option>
                  {COMBUSTIONI.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#8c7e75] block mb-1">Tiraggio</label>
                <select value={tiraggio} onChange={(e) => setTiraggio(e.target.value)} className={selectClass}>
                  <option value="">Non indicato</option>
                  {TIRAGGI.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pairing */}
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1">
                Abbinamento consigliato (es. Rum 12 anni, Grappa, Espresso, Cioccolato fondente)
              </label>
              <input
                type="text"
                maxLength={200}
                value={abbinamento}
                onChange={(e) => setAbbinamento(e.target.value)}
                placeholder="Es. Ron Zacapa 23 Anni o Caffè espresso tostato scuro"
                className="w-full bg-[#130f0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] placeholder-[#6e6057]"
              />
            </div>

            {/* Description / Notes */}
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1">
                Note di Degustazione ed Evoluzione nei tre terzi
              </label>
              <textarea
                value={descrizione}
                maxLength={2000}
                onChange={(e) => setDescrizione(e.target.value)}
                rows={4}
                placeholder="Descrivi l'apertura, il corpo al secondo terzo, la pienezza e il finale..."
                className="w-full bg-[#130f0d] border border-[#2f241f] rounded-xl p-3 text-xs text-[#f5ebd9] placeholder-[#6e6057] focus:outline-none focus:border-[#c99757]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-xs text-[#a3948b] hover:text-[#f5ebd9]"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={!prodotto || inCorso}
                className="px-5 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-xl shadow-md disabled:opacity-50 disabled:pointer-events-none"
              >
                {inCorso ? "Salvataggio..." : "Salva Scheda Degustazione"}
              </button>
            </div>
          </form>
        </div>
      )}

      {reviewsList.length === 0 && !editing && (
        <div className="text-center py-16 bg-[#16110f] rounded-2xl border border-dashed border-[#342720] p-6">
          <Sparkles className="w-12 h-12 text-[#6e5c52] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#f5ebd9]">Nessuna scheda di degustazione</h3>
          <p className="text-xs text-[#8c7e75] mt-1 max-w-sm mx-auto">
            Annota aromi, forza e abbinamenti dei sigari che fumi: le schede restano qui, una per sigaro.
          </p>
        </div>
      )}

      {/* Reviews List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviewsList.map((rev) => (
          <div
            key={rev.product_id}
            className="p-5 rounded-2xl bg-[#181311] border border-[#2e231e] hover:border-[#443328] transition-all flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] text-[#c99757] font-medium">{rev.provenienza ?? "Sigaro"}</span>
                  <h3 className="text-base font-bold text-[#faf3ea] mt-0.5">{rev.marca ?? "Sigaro"}</h3>
                  {rev.formato && <p className="text-xs text-[#8c7e75]">{rev.formato}</p>}
                </div>
                {rev.stelle && (
                  <div className="flex items-center gap-1 bg-[#241a15] px-2.5 py-1 rounded-lg border border-[#382a22] shrink-0">
                    <span className="text-xs font-mono font-bold text-[#c99757]">{rev.stelle}.0</span>
                    <div className="flex text-[#c99757] text-xs">
                      {"★".repeat(rev.stelle)}
                      {"☆".repeat(5 - rev.stelle)}
                    </div>
                  </div>
                )}
              </div>

              {/* Technical Properties */}
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-[#a3948b]">
                {rev.forza && (
                  <span className="px-2 py-0.5 rounded bg-[#130f0d] border border-[#261d18]">
                    Forza: <strong className="text-[#f5ebd9]">{rev.forza}</strong>
                  </span>
                )}
                {rev.combustione && (
                  <span className="px-2 py-0.5 rounded bg-[#130f0d] border border-[#261d18]">
                    Combustione: <strong className="text-[#f5ebd9]">{rev.combustione}</strong>
                  </span>
                )}
                {rev.tiraggio && (
                  <span className="px-2 py-0.5 rounded bg-[#130f0d] border border-[#261d18]">
                    Tiraggio: <strong className="text-[#f5ebd9]">{rev.tiraggio}</strong>
                  </span>
                )}
              </div>

              {/* Aromas */}
              {rev.aromi && rev.aromi.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {rev.aromi.map((a) => (
                    <span
                      key={a}
                      className="text-[11px] font-medium text-[#d9aa6b] bg-[#261d18] px-2 py-0.5 rounded-md border border-[#382a22]"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {rev.descrizione && (
                <p className="text-xs text-[#c4b5a8] mt-3 leading-relaxed bg-[#130f0d] p-3 rounded-xl border border-[#221a16] italic">
                  "{rev.descrizione}"
                </p>
              )}

              {/* Pairing */}
              {rev.abbinamento_consigliato && (
                <div className="flex items-center gap-2 text-xs text-[#d9aa6b] mt-3">
                  <Wine className="w-3.5 h-3.5 text-[#c99757]" />
                  <span>Abbinamento: {rev.abbinamento_consigliato}</span>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="pt-3 mt-4 border-t border-[#261d19] flex items-center justify-between">
              <button
                onClick={() => apri(prodottoDaScheda(rev))}
                className="text-xs text-[#c99757] hover:text-[#d9aa6b] flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifica scheda</span>
              </button>

              <button
                onClick={() => onOpenAIReview(prodottoDaScheda(rev))}
                className="text-xs text-[#a3948b] hover:text-[#f5ebd9] flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#c99757]" />
                <span>Sintesi Community AI</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
