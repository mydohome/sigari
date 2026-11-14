import React, { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cercaProdotti } from "../lib/api";
import type { Product } from "../types/cigar";
import { formatEuro, inputClass } from "./ui";

interface ProductPickerProps {
  value: Product | null;
  onChange: (product: Product | null) => void;
  placeholder?: string;
}

// Ricerca nel listino ufficiale con suggerimenti: il catalogo ha migliaia di prodotti,
// quindi non si carica tutto in un menu a tendina.
export const ProductPicker: React.FC<ProductPickerProps> = ({
  value,
  onChange,
  placeholder = "Cerca per marca o nome (es. Cohiba, Toscano...)",
}) => {
  const [query, setQuery] = useState("");
  const [risultati, setRisultati] = useState<Product[]>([]);
  const [caricamento, setCaricamento] = useState(false);
  const [aperto, setAperto] = useState(false);
  const contenitore = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const termine = query.trim();
    if (termine.length < 2) {
      setRisultati([]);
      return undefined;
    }
    let annullato = false;
    const attesa = window.setTimeout(async () => {
      setCaricamento(true);
      try {
        const r = await cercaProdotti({ q: termine, pageSize: 8 });
        if (!annullato) setRisultati(r.prodotti);
      } catch {
        if (!annullato) setRisultati([]);
      } finally {
        if (!annullato) setCaricamento(false);
      }
    }, 250);
    return () => {
      annullato = true;
      window.clearTimeout(attesa);
    };
  }, [query]);

  useEffect(() => {
    const fuori = (e: MouseEvent) => {
      if (!contenitore.current?.contains(e.target as Node)) setAperto(false);
    };
    document.addEventListener("mousedown", fuori);
    return () => document.removeEventListener("mousedown", fuori);
  }, []);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 bg-[#120e0d] border border-[#2f241f] rounded-xl px-3 py-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[#f5ebd9] truncate">{value.marca}</div>
          <div className="text-[11px] text-[#8c7e75] truncate">
            {value.formato ?? value.categoria} · {value.provenienza} · {formatEuro(value.prezzo_singolo)} a sigaro
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Cambia sigaro"
          className="p-1 text-[#8c7e75] hover:text-[#f5ebd9] shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={contenitore}>
      <Search className="w-3.5 h-3.5 text-[#7d6f66] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setAperto(true);
        }}
        onFocus={() => setAperto(true)}
        placeholder={placeholder}
        className={`${inputClass} pl-9`}
        autoComplete="off"
      />
      {aperto && query.trim().length >= 2 && (
        <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-[#1a1412] border border-[#382b24] rounded-xl shadow-2xl divide-y divide-[#261d19]">
          {caricamento && risultati.length === 0 && (
            <li className="px-3 py-2 text-xs text-[#8c7e75]">Ricerca in corso...</li>
          )}
          {!caricamento && risultati.length === 0 && (
            <li className="px-3 py-2 text-xs text-[#8c7e75]">Nessun sigaro trovato.</li>
          )}
          {risultati.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(p);
                  setQuery("");
                  setAperto(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#241b17] transition-colors"
              >
                <div className="text-xs font-medium text-[#f5ebd9]">{p.marca}</div>
                <div className="text-[11px] text-[#8c7e75]">
                  {p.formato ?? p.categoria} · {p.provenienza} · {formatEuro(p.prezzo_singolo)} a sigaro
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
