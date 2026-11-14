import React, { useState, useEffect } from "react";
import { Product, HumidorLocation, HumidorShop } from "../../types/cigar";
import { X, Box } from "lucide-react";
import type { NuovoLotto } from "../../lib/api";
import { ProductPicker } from "../ProductPicker";
import { formatEuro } from "../ui";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: HumidorLocation[];
  shops: HumidorShop[];
  preSelectedProduct?: Product | null;
  preSelectedQuantity?: number;
  onSubmit: (data: NuovoLotto) => Promise<boolean>;
}

const oggi = () => new Date().toISOString().split("T")[0];
const aiCentesimi = (n: number) => Math.round(n * 100) / 100;

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  onClose,
  locations,
  shops,
  preSelectedProduct,
  preSelectedQuantity,
  onSubmit,
}) => {
  const [prodotto, setProdotto] = useState<Product | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | "">("");
  const [shopNome, setShopNome] = useState("");
  const [prezzoAcquisto, setPrezzoAcquisto] = useState<number>(0);
  const [dataAcquisto, setDataAcquisto] = useState(oggi());
  const [quantita, setQuantita] = useState<number>(5);
  const [note, setNote] = useState("");
  const [inCorso, setInCorso] = useState(false);

  // Ogni apertura riparte da un modulo pulito (con il sigaro scelto, se arriva da un'altra schermata)
  useEffect(() => {
    if (!isOpen) return;
    setProdotto(preSelectedProduct ?? null);
    setPrezzoAcquisto(aiCentesimi(preSelectedProduct?.prezzo_singolo ?? 0));
    // Come sul server, se non scelta altrimenti la destinazione e' la location "Humidor"
    setSelectedLocationId((locations.find((l) => l.nome === "Humidor") ?? locations[0])?.id ?? "");
    setShopNome("");
    setDataAcquisto(oggi());
    setQuantita(preSelectedQuantity ?? 5);
    setNote("");
    setInCorso(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, preSelectedProduct, preSelectedQuantity]);

  if (!isOpen) return null;

  const scegliProdotto = (p: Product | null) => {
    setProdotto(p);
    if (p) setPrezzoAcquisto(aiCentesimi(p.prezzo_singolo));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodotto) return;
    const nomeShop = shopNome.trim();
    const esistente = shops.find((s) => s.nome.toLowerCase() === nomeShop.toLowerCase());
    setInCorso(true);
    const ok = await onSubmit({
      product_id: prodotto.id,
      location_id: selectedLocationId === "" ? null : selectedLocationId,
      shop: nomeShop ? (esistente ? { id: esistente.id } : { nome: nomeShop }) : undefined,
      prezzo_acquisto: Number(prezzoAcquisto),
      data_acquisto: dataAcquisto,
      quantita: Number(quantita),
      note: note.trim() || undefined,
    });
    setInCorso(false);
    if (ok) onClose();
  };

  const differenza = prodotto ? prezzoAcquisto - prodotto.prezzo_singolo : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#181311] border border-[#382b24] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#291f1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-[#c99757]" />
            <h2 className="text-base font-bold text-[#faf3ea]">Aggiungi Sigari all'Humidor</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="p-1.5 text-[#8c7e75] hover:text-[#f5ebd9] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Cigar picker */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Sigaro da Catalogo Ufficiale FIT
            </label>
            <ProductPicker value={prodotto} onChange={scegliProdotto} />
          </div>

          {/* Location Destination */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">Destinazione / Humidor</label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] focus:outline-none focus:border-[#c99757]"
            >
              <option value="">Nessuna (assegna dopo)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.nome}
                  {loc.umidita != null && loc.temperatura != null
                    ? ` (${loc.umidita}% UR, ${loc.temperatura}°C)`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity and Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1">Quantità Acquistata</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={quantita}
                onChange={(e) => setQuantita(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1">Prezzo Pagato a Sigaro (€)</label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={prezzoAcquisto}
                onChange={(e) => setPrezzoAcquisto(Number(e.target.value))}
                className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] font-mono"
              />
            </div>
          </div>

          {/* Purchase Total helper */}
          <div className="p-3 bg-[#120e0d] rounded-xl border border-[#241c18] space-y-1.5 text-xs text-[#8c7e75]">
            <div className="flex items-center justify-between">
              <span>Spesa totale investimento:</span>
              <strong className="text-sm font-mono text-[#d9aa6b]">{formatEuro(quantita * prezzoAcquisto)}</strong>
            </div>
            {prodotto && (
              <div className="flex items-center justify-between">
                <span>Prezzo ufficiale FIT oggi:</span>
                <span className="font-mono text-[#e8decb]">
                  {formatEuro(prodotto.prezzo_singolo)}
                  {Math.abs(differenza) >= 0.005 && (
                    <span className={`ml-2 ${differenza > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      ({differenza > 0 ? "+" : ""}
                      {differenza.toFixed(2)})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Shop / Tabaccheria */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Tabaccheria o Rivendita (Opzionale)
            </label>
            <input
              type="text"
              list="shop-suggestions"
              value={shopNome}
              onChange={(e) => setShopNome(e.target.value)}
              placeholder="Es. Tabaccheria del Corso, Habanos Specialist..."
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] placeholder-[#6e6057]"
            />
            <datalist id="shop-suggestions">
              {shops.map((s) => (
                <option key={s.id} value={s.nome} />
              ))}
            </datalist>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Data di Acquisto / Ingresso in Humidor
            </label>
            <input
              type="date"
              required
              value={dataAcquisto}
              onChange={(e) => setDataAcquisto(e.target.value)}
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Note di Conservazione (Box code, data di inscatolamento, ecc.)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Es. Scatola sigillata timbro ABR 26, conservati a 69% UR..."
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl p-3 text-xs text-[#f5ebd9] placeholder-[#6e6057] focus:outline-none focus:border-[#c99757]"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#291f1a]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-[#a3948b] hover:text-[#f5ebd9]">
              Annulla
            </button>
            <button
              type="submit"
              disabled={!prodotto || inCorso}
              className="px-5 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-xl shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {inCorso ? "Salvataggio..." : "Aggiungi all'Humidor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
