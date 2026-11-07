import React, { useEffect, useRef, useState } from "react";
import { fetchHumidorShops, searchExternalShops } from "../api.js";

// Campo per scegliere/creare una tabaccheria.
// value: stringa mostrata nell'input; onSelect(shop) quando l'utente sceglie un
// suggerimento (locale o trovato su OpenStreetMap); onFreeText(testo) quando
// digita senza selezionare nulla (verrà creata una tabaccheria solo col nome).
export default function ShopPicker({ value, onChange }) {
  const [locali, setLocali] = useState([]);
  const [esterni, setEsterni] = useState([]);
  const [cercandoEsterni, setCercandoEsterni] = useState(false);
  const [aperto, setAperto] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setEsterni([]);
    if (!value || value.trim().length < 2) {
      setLocali([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await fetchHumidorShops(value.trim());
        setLocali(data.tabaccherie || []);
      } catch {
        setLocali([]);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAperto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function cercaOnline() {
    if (!value || value.trim().length < 3) return;
    setCercandoEsterni(true);
    try {
      const data = await searchExternalShops(value.trim());
      setEsterni(data.risultati || []);
    } catch {
      setEsterni([]);
    } finally {
      setCercandoEsterni(false);
    }
  }

  function scegli(shop) {
    onChange(shop);
    setAperto(false);
  }

  return (
    <div className="search-input-wrapper shop-picker" ref={containerRef}>
      <input
        type="text"
        placeholder="Tabaccheria (nome o indirizzo)"
        value={value}
        onChange={(e) => onChange({ nome: e.target.value })}
        onFocus={() => setAperto(true)}
        autoComplete="off"
      />
      {aperto && (locali.length > 0 || esterni.length > 0 || value?.trim().length >= 3) && (
        <ul className="autocomplete-list shop-suggestions">
          {locali.map((s) => (
            <li key={`local-${s.id}`} onMouseDown={() => scegli({ id: s.id, nome: s.nome, indirizzo: s.indirizzo })}>
              <strong>{s.nome}</strong>
              {s.indirizzo && <span className="shop-address"> — {s.indirizzo}</span>}
            </li>
          ))}
          {esterni.map((s) => (
            <li key={`ext-${s.osm_id}`} onMouseDown={() => scegli(s)}>
              <strong>{s.nome}</strong>
              <span className="shop-address"> — {s.indirizzo}</span>
            </li>
          ))}
          {value?.trim().length >= 3 && (
            <li className="shop-search-external" onMouseDown={cercaOnline}>
              {cercandoEsterni ? "Ricerca in corso..." : "🔍 Cerca indirizzo su OpenStreetMap"}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
