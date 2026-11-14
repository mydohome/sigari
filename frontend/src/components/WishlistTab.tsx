import React, { useState } from "react";
import { WishlistItem, Favorite, Product } from "../types/cigar";
import { ShoppingBag, Heart, Plus, Trash2, ArrowRight, Tag, Box } from "lucide-react";

interface WishlistTabProps {
  wishlist: WishlistItem[];
  favorites: Favorite[];
  onUpdateWishlistQty: (productId: number, qty: number) => void;
  onRemoveFromWishlist: (productId: number) => void;
  onRemoveFromFavorites: (productId: number) => void;
  onTransferToHumidor: (product: Product, qty: number) => void;
  onUpdateFavoriteTag: (productId: number, tag: string) => void;
}

export const WishlistTab: React.FC<WishlistTabProps> = ({
  wishlist,
  favorites,
  onUpdateWishlistQty,
  onRemoveFromWishlist,
  onRemoveFromFavorites,
  onTransferToHumidor,
  onUpdateFavoriteTag,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"wishlist" | "preferiti">("wishlist");
  const [editingTagProductId, setEditingTagProductId] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState("");

  const formatEuro = (val: number) => {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(val);
  };

  // La quantita' in wishlist conta le confezioni: il totale usa il prezzo della confezione
  const spesaTotale = wishlist.reduce((acc, item) => acc + (item.product?.prezzo_confezione || 0) * item.quantita, 0);
  const pezziTotali = wishlist.reduce((acc, item) => acc + (item.product?.pezzi_per_confezione || 1) * item.quantita, 0);

  const startEditTag = (fav: Favorite) => {
    setEditingTagProductId(fav.product_id);
    setTagInput(fav.tag || "");
  };

  const saveTag = (productId: number) => {
    onUpdateFavoriteTag(productId, tagInput.trim());
    setEditingTagProductId(null);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#faf3ea]">
            Wishlist & Preferiti
          </h1>
          <p className="text-xs sm:text-sm text-[#8c7e75] mt-0.5">
            Pianifica i prossimi acquisti in tabaccheria e organizza i sigari preferiti per occasione
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-1 p-1 bg-[#181311] border border-[#2e231e] rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab("wishlist")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeSubTab === "wishlist"
                ? "bg-[#281f1a] text-[#c99757] border border-[#443328] shadow-sm font-semibold"
                : "text-[#8c7e75] hover:text-[#f5ebd9]"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Wishlist ({wishlist.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("preferiti")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeSubTab === "preferiti"
                ? "bg-[#281f1a] text-[#c99757] border border-[#443328] shadow-sm font-semibold"
                : "text-[#8c7e75] hover:text-[#f5ebd9]"
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Preferiti ({favorites.length})</span>
          </button>
        </div>
      </div>

      {activeSubTab === "wishlist" ? (
        <div className="space-y-4">
          {/* Total Budget Card */}
          <div className="p-5 rounded-2xl bg-[#181311] border border-[#2e231e] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <span className="text-xs text-[#8c7e75]">Spesa Totale Stimata per il Rifornimento</span>
              <div className="text-2xl sm:text-3xl font-bold text-[#d9aa6b] font-mono tabular-nums mt-0.5">
                {formatEuro(spesaTotale)}
              </div>
              <span className="text-xs text-[#a3948b] mt-0.5 block">
                Calcolato in base ai listini ufficiali FIT in vigore
              </span>
            </div>
            <div className="text-xs text-[#8c7e75] bg-[#130f0d] p-3 rounded-xl border border-[#241c18]">
              <span>Totale previsto: </span>
              <strong className="text-[#f5ebd9] font-mono">
                {wishlist.reduce((s, i) => s + i.quantita, 0)} confezioni · {pezziTotali} pezzi
              </strong>
            </div>
          </div>

          {/* Wishlist Items List */}
          {wishlist.length === 0 ? (
            <div className="text-center py-16 bg-[#16110f] rounded-2xl border border-dashed border-[#342720] p-6">
              <ShoppingBag className="w-12 h-12 text-[#6e5c52] mx-auto mb-3" />
              <h3 className="text-base font-semibold text-[#f5ebd9]">La wishlist è vuota</h3>
              <p className="text-xs text-[#8c7e75] mt-1 max-w-sm mx-auto">
                Esplora la sezione Prezzi FIT per salvare i sigari che desideri acquistare prossimamente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {wishlist.map((item) => {
                const prod = item.product;
                const packPrice = prod?.prezzo_confezione || 0;
                const totalRow = packPrice * item.quantita;

                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#181311] border border-[#2e231e] hover:border-[#443328] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-[#8c7e75]">
                        <span className="text-[#c99757] font-medium">{prod?.provenienza}</span>
                        <span aria-hidden="true">·</span>
                        <span>{prod?.vitola ?? prod?.formato ?? "Formato Standard"}</span>
                      </div>
                      <h3 className="text-base font-bold text-[#faf3ea] mt-0.5">
                        {prod?.marca || "Sigaro"}
                      </h3>
                      <div className="text-xs text-[#a3948b] mt-1 flex items-center gap-2">
                        <span>Prezzo confezione FIT:</span>
                        <span className="font-mono tabular-nums text-[#f5ebd9]">
                          {formatEuro(packPrice)}
                          {prod?.pezzi_per_confezione ? ` (${prod.pezzi_per_confezione} pz)` : ""}
                        </span>
                      </div>
                    </div>

                    {/* Stepper & Total */}
                    <div className="flex items-center justify-between sm:justify-end gap-5">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-[#130f0d] border border-[#2f241f] rounded-lg p-1">
                          <button
                            onClick={() => onUpdateWishlistQty(item.product_id, Math.max(1, item.quantita - 1))}
                            aria-label="Diminuisci quantità"
                            className="w-6 h-6 flex items-center justify-center text-xs text-[#a3948b] hover:text-[#f5ebd9] rounded hover:bg-[#251c18]"
                          >
                            -
                          </button>
                          <span className="px-2 font-mono font-bold text-sm text-[#f5ebd9] tabular-nums">
                            {item.quantita}
                          </span>
                          <button
                            onClick={() => onUpdateWishlistQty(item.product_id, item.quantita + 1)}
                            aria-label="Aumenta quantità"
                            className="w-6 h-6 flex items-center justify-center text-xs text-[#a3948b] hover:text-[#f5ebd9] rounded hover:bg-[#251c18]"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-xs text-[#8c7e75]">conf.</span>
                      </div>

                      <div className="text-right min-w-[90px]">
                        <span className="text-[10px] text-[#7d6f66] block">Totale riga</span>
                        <span className="text-base font-bold text-[#d9aa6b] font-mono tabular-nums">
                          {formatEuro(totalRow)}
                        </span>
                      </div>

                      {/* Transfer to Humidor action */}
                      {prod && (
                        <button
                          onClick={() => onTransferToHumidor(prod, item.quantita)}
                          className="px-3 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] hover:from-[#e0b477] hover:to-[#be8746] rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95"
                          title="Hai comprato questi sigari? Trasferiscili nell'humidor"
                        >
                          <Box className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Acquistato</span>
                        </button>
                      )}

                      <button
                        onClick={() => onRemoveFromWishlist(item.product_id)}
                        className="p-2 text-[#7d6f66] hover:text-rose-400 bg-[#140f0e] hover:bg-[#201714] border border-[#2a1f1b] rounded-xl transition-colors"
                        title="Rimuovi dalla wishlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Favorites Tab */
        <div className="space-y-3">
          {favorites.length === 0 ? (
            <div className="text-center py-16 bg-[#16110f] rounded-2xl border border-dashed border-[#342720] p-6">
              <Heart className="w-12 h-12 text-[#6e5c52] mx-auto mb-3" />
              <h3 className="text-base font-semibold text-[#f5ebd9]">Nessun preferito salvato</h3>
              <p className="text-xs text-[#8c7e75] mt-1 max-w-sm mx-auto">
                Aggiungi i tuoi sigari del cuore dalla sezione Prezzi FIT con l'icona a forma di cuore.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favorites.map((fav) => {
                const prod = fav.product;
                return (
                  <div
                    key={fav.id}
                    className="p-5 rounded-2xl bg-[#181311] border border-[#2e231e] hover:border-[#443328] transition-all flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[11px] text-[#c99757] font-medium">{prod?.provenienza}</span>
                          <h3 className="text-base font-bold text-[#faf3ea] mt-0.5">
                            {prod?.marca || "Sigaro"}
                          </h3>
                          {(prod?.vitola || prod?.formato) && (
                            <p className="text-xs text-[#8c7e75] mt-0.5">{prod.vitola ?? prod.formato}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-base font-mono font-bold text-[#f5ebd9]">
                            {prod ? formatEuro(prod.prezzo_singolo) : "—"}
                          </span>
                          <span className="text-[10px] text-[#7d6f66] block">a sigaro</span>
                        </div>
                      </div>

                      {/* Custom Tag */}
                      <div className="mt-3">
                        {editingTagProductId === fav.product_id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              placeholder="Es. Da riprovare, Compleanni..."
                              className="bg-[#130f0d] border border-[#2f241f] rounded-lg px-2.5 py-1 text-xs text-[#f5ebd9] flex-1 focus:outline-none focus:border-[#c99757]"
                            />
                            <button
                              onClick={() => saveTag(fav.product_id)}
                              className="text-xs text-[#14100e] bg-[#c99757] font-semibold px-2.5 py-1 rounded-lg"
                            >
                              Salva
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditTag(fav)}
                            className="flex items-center gap-1.5 text-xs text-[#a3948b] hover:text-[#c99757] bg-[#140f0d] px-2.5 py-1 rounded-lg border border-[#261d18]"
                            title="Modifica tag personalizzato"
                          >
                            <Tag className="w-3 h-3 text-[#c99757]" />
                            <span>Tag: {fav.tag || "Nessun tag (clicca per impostare)"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 mt-4 border-t border-[#261d19] flex items-center justify-between">
                      {prod && (
                        <button
                          onClick={() => onTransferToHumidor(prod, 1)}
                          className="text-xs text-[#c99757] hover:text-[#d9aa6b] flex items-center gap-1 font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Aggiungi a Humidor</span>
                        </button>
                      )}
                      <button
                        onClick={() => onRemoveFromFavorites(fav.product_id)}
                        className="text-xs text-[#7d6f66] hover:text-rose-400 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Rimuovi</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
