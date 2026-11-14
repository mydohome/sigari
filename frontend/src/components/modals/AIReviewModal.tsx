import React, { useState, useEffect } from "react";
import { Product } from "../../types/cigar";
import { X, Sparkles, ExternalLink, RefreshCw } from "lucide-react";
import { fetchRecensioneAI, generaRecensioneAI, type RecensioneAI } from "../../lib/api";

interface AIReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

// La sintesi si genera solo su richiesta (ogni generazione e' una chiamata a pagamento all'AI):
// all'apertura si mostra quella gia' salvata, se esiste.
export const AIReviewModal: React.FC<AIReviewModalProps> = ({ isOpen, onClose, product }) => {
  const [caricamento, setCaricamento] = useState(false);
  const [generazione, setGenerazione] = useState(false);
  const [recensione, setRecensione] = useState<RecensioneAI | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    setRecensione(null);
    setErrore(null);
    if (!isOpen || !product) return undefined;
    let annullato = false;
    setCaricamento(true);
    fetchRecensioneAI(product.id)
      .then((r) => {
        if (!annullato) setRecensione(r);
      })
      .catch((err) => {
        if (!annullato) setErrore(err instanceof Error ? err.message : "Errore nel caricamento della recensione.");
      })
      .finally(() => {
        if (!annullato) setCaricamento(false);
      });
    return () => {
      annullato = true;
    };
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const genera = async () => {
    setGenerazione(true);
    setErrore(null);
    try {
      setRecensione(await generaRecensioneAI(product.id));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Generazione non riuscita.");
    } finally {
      setGenerazione(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#181311] border border-[#382b24] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#291f1a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#c99757]" />
            <div>
              <h2 className="text-base font-bold text-[#faf3ea]">Sintesi Recensioni & Club del Fumo</h2>
              <span className="text-xs text-[#8c7e75] block">
                {product.marca} ({product.provenienza})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="p-1.5 text-[#8c7e75] hover:text-[#f5ebd9] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {caricamento || generazione ? (
            <div className="text-center py-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-[#c99757] animate-spin mx-auto" />
              <p className="text-xs text-[#a3948b]">
                {generazione
                  ? "Consultazione dei forum e dei portali di fumo lento italiani in corso (può richiedere un minuto)..."
                  : "Caricamento..."}
              </p>
            </div>
          ) : recensione ? (
            <>
              <div className="p-4 bg-[#120e0d] rounded-xl border border-[#241c18] space-y-2">
                <span className="text-[11px] font-semibold text-[#c99757] uppercase tracking-wider block">
                  Consenso degli Appassionati:
                </span>
                <p className="text-xs text-[#e8decb] leading-relaxed whitespace-pre-line">{recensione.testo}</p>
                <p className="text-[10px] text-[#7d6f66]">
                  Generata il {new Intl.DateTimeFormat("it-IT").format(new Date(recensione.generato_il))}
                </p>
              </div>

              {/* Sources */}
              {recensione.fonti && recensione.fonti.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#a3948b] block">Fonti & Comunità Italiane Consultate:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {recensione.fonti.map((fonte, idx) => (
                      <a
                        key={idx}
                        href={fonte.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="p-2.5 rounded-lg bg-[#120e0d] border border-[#241c18] hover:border-[#c99757] transition-colors flex items-center justify-between gap-2 text-xs text-[#a3948b] hover:text-[#f5ebd9]"
                      >
                        <span className="truncate">{fonte.titolo || fonte.url}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#c99757] shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-[#7d6f66] italic py-4">
              Nessuna sintesi generata per questo sigaro. Puoi crearla ora: l'AI riassume le opinioni trovate sui
              portali italiani del fumo lento.
            </p>
          )}

          {errore && (
            <p role="alert" className="text-xs text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-lg px-3 py-2">
              {errore}
            </p>
          )}
        </div>

        <div className="p-4 border-t border-[#291f1a] flex items-center justify-between gap-2">
          <button
            onClick={genera}
            disabled={caricamento || generazione}
            className="px-4 py-2 text-xs font-medium text-[#f5ebd9] bg-[#281f1a] hover:bg-[#342721] border border-[#443328] rounded-xl transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#c99757]" />
            {recensione ? "Rigenera sintesi" : "Genera sintesi"}
          </button>
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
