import React, { useEffect, useRef, useState } from "react";
import { searchPrices } from "../api.js";

// Campo per scegliere un sigaro esistente nel catalogo (marca + formato).
// onSelect riceve l'intera riga prodotto (product_id, marca, formato, ...).
export default function ProductPicker({ onSelect, selected }) {
  const [testo, setTesto] = useState(selected ? `${selected.marca} — ${selected.formato || ""}` : "");
  const [risultati, setRisultati] = useState([]);
  const [aperto, setAperto] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!testo || testo.trim().length < 2) {
      setRisultati([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchPrices({ q: testo.trim(), pageSize: 8 });
        setRisultati(data.results || []);
      } catch {
        setRisultati([]);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [testo]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setAperto(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function scegli(row) {
    setTesto(`${row.marca} — ${row.formato || ""}`);
    setAperto(false);
    onSelect(row);
  }

  return (
    <div className="search-input-wrapper" ref={containerRef}>
      <input
        type="text"
        placeholder="Cerca il sigaro (es. Cohiba Robusto)"
        value={testo}
        onChange={(e) => {
          setTesto(e.target.value);
          setAperto(true);
          if (selected) onSelect(null);
        }}
        onFocus={() => setAperto(true)}
        autoComplete="off"
        required
      />
      {aperto && risultati.length > 0 && (
        <ul className="autocomplete-list">
          {risultati.map((r) => (
            <li key={r.product_id} onMouseDown={() => scegli(r)}>
              <strong>{r.marca}</strong> — {r.formato || r.categoria}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
