import React, { useState, useEffect } from "react";
import { HumidorItem, HumidorLocation, HumidorShop } from "../../types/cigar";
import { X, Edit3, Box, Calendar, MapPin, Euro, Check } from "lucide-react";

interface EditHumidorItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: HumidorItem | null;
  locations: HumidorLocation[];
  shops: HumidorShop[];
  onSubmit: (id: number, data: Record<string, unknown>) => Promise<boolean>;
}

export const EditHumidorItemModal: React.FC<EditHumidorItemModalProps> = ({
  isOpen,
  onClose,
  item,
  locations,
  shops,
  onSubmit,
}) => {
  const [prezzoAcquisto, setPrezzoAcquisto] = useState<number>(0);
  const [quantitaIniziale, setQuantitaIniziale] = useState<number>(1);
  const [quantitaRimanente, setQuantitaRimanente] = useState<number>(1);
  const [dataAcquisto, setDataAcquisto] = useState<string>("");
  const [locationId, setLocationId] = useState<number | null>(null);
  const [shopNome, setShopNome] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    if (item) {
      setInCorso(false);
      setPrezzoAcquisto(item.prezzo_acquisto);
      setQuantitaIniziale(item.quantita_iniziale);
      setQuantitaRimanente(item.quantita_rimanente);
      setDataAcquisto(item.data_acquisto || new Date().toISOString().split("T")[0]);
      setLocationId(item.location_id || null);
      setShopNome(item.shop_nome || "");
      setNote(item.note || "");
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeShop = shopNome.trim();
    const esistente = shops.find((s) => s.nome.toLowerCase() === nomeShop.toLowerCase());
    setInCorso(true);
    const ok = await onSubmit(item.id, {
      prezzo_acquisto: Number(prezzoAcquisto),
      quantita_iniziale: Number(quantitaIniziale),
      quantita_rimanente: Number(quantitaRimanente),
      data_acquisto: dataAcquisto,
      location_id: locationId ? Number(locationId) : undefined,
      shop: nomeShop ? (esistente ? { id: esistente.id } : { nome: nomeShop }) : undefined,
      note: note.trim() || undefined,
    });
    setInCorso(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#181311] border border-[#382b24] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#291f1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-[#c99757]" />
            <div>
              <h2 className="text-base font-bold text-[#faf3ea]">
                Modifica Sigaro in Humidor
              </h2>
              <span className="text-xs text-[#8c7e75] block">
                {item.product?.marca || "Sigaro"} · {item.product?.provenienza}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8c7e75] hover:text-[#f5ebd9] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Prezzo d'acquisto (risolve l'esigenza di correzione errore prezzo) */}
          <div className="p-3.5 rounded-xl bg-[#130f0d] border border-[#2f241f] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#c99757] flex items-center gap-1.5">
                <Euro className="w-4 h-4" />
                <span>Prezzo Pagato a Sigaro (€)</span>
              </label>
              {item.product && (
                <span className="text-[11px] text-[#8c7e75]">
                  Listino FIT attuale: <strong className="text-[#f5ebd9] font-mono">{item.product.prezzo_singolo.toFixed(2)} €</strong>
                </span>
              )}
            </div>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={prezzoAcquisto}
              onChange={(e) => setPrezzoAcquisto(Number(e.target.value))}
              className="w-full bg-[#1c1512] border border-[#3d2e25] rounded-lg px-3 py-2 text-sm text-[#f5ebd9] font-mono font-bold focus:outline-none focus:border-[#c99757]"
            />
            <span className="text-[10px] text-[#7d6f66] block">
              Se hai inserito per sbaglio il prezzo dell'intera scatola o un importo errato, correggilo qui.
            </span>
          </div>

          {/* Quantità Rimanente e Iniziale */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1">
                Quantità Rimanente in Humidor
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                required
                value={quantitaRimanente}
                onChange={(e) => setQuantitaRimanente(Math.max(0, Number(e.target.value)))}
                className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] font-mono font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#8c7e75] block mb-1">
                Quantità Iniziale Acquistata
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                required
                value={quantitaIniziale}
                onChange={(e) => setQuantitaIniziale(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] font-mono font-semibold"
              />
            </div>
          </div>

          {/* Location / Contenitore */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Contenitore / Location
            </label>
            <select
              value={locationId || ""}
              onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] focus:outline-none focus:border-[#c99757]"
            >
              <option value="">Non assegnata</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.nome}
                  {loc.umidita != null && loc.temperatura != null ? ` (${loc.umidita}% UR, ${loc.temperatura}°C)` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Tabaccheria */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Tabaccheria o Luogo d'Acquisto
            </label>
            <input
              type="text"
              list="edit-shop-suggestions"
              value={shopNome}
              onChange={(e) => setShopNome(e.target.value)}
              placeholder="Es. Tabaccheria del Corso, Habanos Specialist..."
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9] placeholder-[#6e6057]"
            />
            <datalist id="edit-shop-suggestions">
              {shops.map((s) => (
                <option key={s.id} value={s.nome} />
              ))}
            </datalist>
          </div>

          {/* Data di Acquisto */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Data di Acquisto / Ingresso
            </label>
            <input
              type="date"
              value={dataAcquisto}
              onChange={(e) => setDataAcquisto(e.target.value)}
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#f5ebd9]"
            />
          </div>

          {/* Note personali */}
          <div>
            <label className="text-xs font-medium text-[#8c7e75] block mb-1">
              Note Personali (Box code, condizioni di affinamento, ecc.)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Note di affinamento o provenienza..."
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl p-3 text-xs text-[#f5ebd9] placeholder-[#6e6057] focus:outline-none focus:border-[#c99757]"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#291f1a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[#a3948b] hover:text-[#f5ebd9]"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={inCorso}
              className="px-5 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] rounded-xl shadow-md active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{inCorso ? "Salvataggio..." : "Salva Modifiche"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
