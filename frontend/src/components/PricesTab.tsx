import React, { useEffect, useRef, useState } from "react";
import { Product } from "../types/cigar";
import { Search, Filter, History, Plus, Heart, ShoppingBag, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { cercaProdotti, type OrdinamentoPrezzi } from "../lib/api";
import { formatEuro } from "./ui";

interface PricesTabProps {
  // Cambia quando l'utente modifica preferiti, wishlist o humidor: rilegge i risultati visibili
  refreshKey: number;
  onOpenHistoryModal: (product: Product) => void;
  onOpenPurchaseModalWithProduct: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
  onAddToWishlist: (product: Product) => void;
  onOpenAIReview: (product: Product) => void;
}

const PER_PAGINA = 24;
const MAX_RISULTATI = 480; // il server restituisce al massimo 500 righe per richiesta
const ORIGINI = ["Cuba", "Italia", "Extra-Cuba"];

export const PricesTab: React.FC<PricesTabProps> = ({
  refreshKey,
  onOpenHistoryModal,
  onOpenPurchaseModalWithProduct,
  onToggleFavorite,
  onAddToWishlist,
  onOpenAIReview,
}) => {
  const [search, setSearch] = useState("");
  const [ricerca, setRicerca] = useState(""); // testo applicato, dopo la pausa di digitazione
  const [selectedProvenienza, setSelectedProvenienza] = useState<string>("all");
  const [selectedSort, setSelectedSort] = useState<OrdinamentoPrezzi>("marca");
  const [soloVariati, setSoloVariati] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [prodotti, setProdotti] = useState<Product[]>([]);
  const [totale, setTotale] = useState(0);
  const [pagine, setPagine] = useState(1);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const richiesta = useRef(0);

  useEffect(() => {
    const attesa = window.setTimeout(() => setRicerca(search.trim()), 300);
    return () => window.clearTimeout(attesa);
  }, [search]);

  // Cambiando un filtro si riparte dalla prima pagina
  useEffect(() => {
    setPagine(1);
  }, [ricerca, selectedProvenienza, selectedSort, soloVariati]);

  useEffect(() => {
    const questa = ++richiesta.current;
    setCaricamento(true);
    // Le pagine gia' mostrate si rileggono in blocco, cosi' un preferito aggiunto non le fa sparire
    cercaProdotti({
      q: ricerca,
      provenienza: selectedProvenienza === "all" ? undefined : selectedProvenienza,
      sort: selectedSort,
      variati: soloVariati,
      page: 1,
      pageSize: PER_PAGINA * pagine,
    })
      .then((r) => {
        if (questa !== richiesta.current) return;
        setProdotti(r.prodotti);
        setTotale(r.totale);
        setErrore(null);
      })
      .catch((err) => {
        if (questa === richiesta.current) setErrore(err instanceof Error ? err.message : "Ricerca non riuscita.");
      })
      .finally(() => {
        if (questa === richiesta.current) setCaricamento(false);
      });
  }, [ricerca, selectedProvenienza, selectedSort, soloVariati, pagine, refreshKey]);

  const filtriAttivi = selectedProvenienza !== "all" || soloVariati;

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#faf3ea]">
          Listini Ufficiali Sigari FIT / ADM
        </h1>
        <p className="text-xs sm:text-sm text-[#8c7e75] mt-0.5">
          Tariffe di monopolio per il mercato italiano con monitoraggio storico dei prezzi e delle variazioni
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-[#181311] border border-[#2e231e] space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7d6f66] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca sigaro (es. Cohiba, Montecristo, Toscano, Robusto, codice ADM)..."
              className="w-full bg-[#120e0d] border border-[#2f241f] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#f5ebd9] placeholder-[#6e6057] focus:outline-none focus:border-[#c99757]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              className={`px-3 py-2 text-xs font-medium rounded-xl border flex items-center gap-1.5 transition-colors ${
                showFilters || filtriAttivi
                  ? "bg-[#281e19] text-[#c99757] border-[#4b372b]"
                  : "bg-[#140f0e] text-[#a3948b] border-[#2f241f] hover:text-[#f5ebd9]"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtri</span>
              {filtriAttivi && <span className="w-1.5 h-1.5 rounded-full bg-[#c99757]" />}
            </button>

            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value as OrdinamentoPrezzi)}
              aria-label="Ordinamento"
              className="bg-[#140f0e] border border-[#2f241f] rounded-xl px-3 py-2 text-xs text-[#c4b5a8] focus:outline-none focus:border-[#c99757]"
            >
              <option value="marca">Ordina: Nome Marca (A-Z)</option>
              <option value="prezzo_asc">Prezzo: dal più economico</option>
              <option value="prezzo_desc">Prezzo: dal più pregiato</option>
              <option value="variazione">Maggior Variazione (180gg)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills / Segmented Controls */}
        {showFilters && (
          <div className="pt-2 border-t border-[#261d19] flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[#7d6f66] mr-1">Origine:</span>
            {["all", ...ORIGINI].map((prov) => (
              <button
                key={prov}
                onClick={() => setSelectedProvenienza(prov)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors font-medium ${
                  selectedProvenienza === prov
                    ? "bg-[#2c2019] text-[#c99757] border border-[#4d382b]"
                    : "bg-[#140f0e] text-[#8c7e75] hover:text-[#f5ebd9] border border-[#231b17]"
                }`}
              >
                {prov === "all" ? "Tutte le origini" : prov}
              </button>
            ))}
            <span className="hidden sm:block w-px h-4 bg-[#2f241f] mx-1" aria-hidden="true" />
            <button
              onClick={() => setSoloVariati(!soloVariati)}
              aria-pressed={soloVariati}
              className={`px-3 py-1 text-xs rounded-lg transition-colors font-medium ${
                soloVariati
                  ? "bg-[#2c2019] text-[#c99757] border border-[#4d382b]"
                  : "bg-[#140f0e] text-[#8c7e75] hover:text-[#f5ebd9] border border-[#231b17]"
              }`}
            >
              Solo prezzi variati (180gg)
            </button>
          </div>
        )}
      </div>

      {errore && (
        <p role="alert" className="text-xs text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-xl px-4 py-3">
          {errore}
        </p>
      )}

      {!errore && !caricamento && prodotti.length === 0 && (
        <div className="text-center py-16 bg-[#16110f] rounded-2xl border border-dashed border-[#342720] p-6">
          <Search className="w-10 h-10 text-[#6e5c52] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#f5ebd9]">Nessun sigaro trovato</h3>
          <p className="text-xs text-[#8c7e75] mt-1">Prova a cambiare la ricerca o a togliere qualche filtro.</p>
        </div>
      )}

      {/* Catalog Results Grid */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${
          caricamento && prodotti.length > 0 ? "opacity-60" : ""
        }`}
      >
        {prodotti.map((product) => {
          const var180 = product.variazione_180gg || 0;
          return (
            <div
              key={product.id}
              className="p-5 rounded-2xl bg-[#181311] border border-[#2e231e] hover:border-[#443328] transition-all flex flex-col justify-between group shadow-sm"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#8c7e75]">
                    <span className="text-[#c99757] font-medium">{product.provenienza}</span>
                    {product.codice_prodotto && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">ADM #{product.codice_prodotto}</span>
                      </>
                    )}
                  </div>

                  {/* Variation indicator (180 days) */}
                  {Math.abs(var180) >= 0.005 ? (
                    <button
                      onClick={() => onOpenHistoryModal(product)}
                      className={`flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full ${
                        var180 > 0
                          ? "bg-rose-950/60 text-rose-300 border border-rose-800/50"
                          : "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50"
                      }`}
                      title="Variazione prezzo ultimi 180 giorni: clicca per lo storico"
                    >
                      {var180 > 0 ? (
                        <TrendingUp className="w-3 h-3 text-rose-400" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-emerald-400" />
                      )}
                      <span>{var180 > 0 ? `+${var180.toFixed(2)}` : var180.toFixed(2)}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-[#6b5d54] font-mono">Invariato</span>
                  )}
                </div>

                {/* Title & Format */}
                <h3 className="text-base font-bold text-[#faf3ea] mt-1.5 group-hover:text-[#c99757] transition-colors">
                  {product.marca}
                </h3>
                {(product.vitola || product.formato) && (
                  <p className="text-xs text-[#a3948b] mt-0.5">{product.vitola ?? product.formato}</p>
                )}

                {product.descrizione_breve && (
                  <p className="text-xs text-[#8c7e75] mt-2 line-clamp-2 leading-relaxed">
                    {product.descrizione_breve}
                  </p>
                )}

                {/* Pricing Box */}
                <div className="my-3.5 p-3 rounded-xl bg-[#130f0d] border border-[#231a16] flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-[#7d6f66] block">Prezzo Unitario</span>
                    <span className="text-lg font-bold text-[#f5ebd9] font-mono tabular-nums">
                      {formatEuro(product.prezzo_singolo)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#7d6f66] block">Per Confezione</span>
                    <span className="text-xs font-mono text-[#c4b5a8] tabular-nums">
                      {formatEuro(product.prezzo_confezione)}
                      {product.pezzi_per_confezione ? ` (${product.pezzi_per_confezione} pz)` : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-[#241c18] flex items-center justify-between gap-1.5">
                <button
                  onClick={() => onOpenHistoryModal(product)}
                  className="p-2 text-[#a3948b] hover:text-[#f5ebd9] bg-[#140f0e] hover:bg-[#201814] border border-[#2c201a] rounded-lg transition-colors flex items-center gap-1 text-xs"
                  title="Visualizza Storico Prezzi (fino a 5 anni)"
                >
                  <History className="w-3.5 h-3.5 text-[#c99757]" />
                  <span className="hidden sm:inline">Storico</span>
                </button>

                <button
                  onClick={() => onOpenAIReview(product)}
                  className="p-2 text-[#a3948b] hover:text-[#c99757] bg-[#140f0e] hover:bg-[#201814] border border-[#2c201a] rounded-lg transition-colors flex items-center gap-1 text-xs"
                  title="Sintesi Opinioni & Recensioni AI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#c99757]" />
                  <span className="hidden sm:inline">Recensioni</span>
                </button>

                <button
                  onClick={() => onToggleFavorite(product)}
                  aria-pressed={product.is_preferito}
                  className={`p-2 rounded-lg border transition-colors ${
                    product.is_preferito
                      ? "bg-[#2d211a] text-[#c99757] border-[#4b372b]"
                      : "bg-[#140f0e] text-[#8c7e75] hover:text-[#f5ebd9] border-[#2c201a]"
                  }`}
                  title="Aggiungi / Rimuovi dai Preferiti"
                >
                  <Heart className={`w-3.5 h-3.5 ${product.is_preferito ? "fill-[#c99757]" : ""}`} />
                </button>

                <button
                  onClick={() => onAddToWishlist(product)}
                  disabled={product.in_wishlist}
                  className={`p-2 rounded-lg border transition-colors ${
                    product.in_wishlist
                      ? "bg-[#2d211a] text-[#c99757] border-[#4b372b]"
                      : "bg-[#140f0e] text-[#8c7e75] hover:text-[#f5ebd9] border-[#2c201a]"
                  }`}
                  title={product.in_wishlist ? "Già nella Wishlist" : "Aggiungi alla Wishlist"}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onOpenPurchaseModalWithProduct(product)}
                  className="px-2.5 py-2 text-xs font-semibold text-[#14100e] bg-gradient-to-r from-[#d9aa6b] to-[#b37d3e] hover:from-[#e0b477] hover:to-[#be8746] rounded-lg transition-colors shadow-sm flex items-center gap-1 active:scale-95"
                  title="Aggiungi all'humidor"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Humidor</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {caricamento && prodotti.length === 0 && !errore && (
        <p className="text-center text-xs text-[#8c7e75] py-8">Caricamento listino...</p>
      )}

      {prodotti.length > 0 && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-[#8c7e75]">
            Mostrati <strong className="text-[#f5ebd9] font-mono">{prodotti.length}</strong> di{" "}
            <strong className="text-[#f5ebd9] font-mono">{totale}</strong> sigari
          </p>
          {prodotti.length < totale && prodotti.length >= MAX_RISULTATI && (
            <p className="text-xs text-[#8c7e75]">Restringi la ricerca o i filtri per vedere gli altri sigari.</p>
          )}
          {prodotti.length < totale && prodotti.length < MAX_RISULTATI && (
            <button
              onClick={() => setPagine((n) => n + 1)}
              disabled={caricamento}
              className="px-5 py-2 text-xs font-medium text-[#f5ebd9] bg-[#281f1a] hover:bg-[#342721] border border-[#443328] rounded-xl transition-colors disabled:opacity-50"
            >
              {caricamento ? "Caricamento..." : "Mostra altri"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
