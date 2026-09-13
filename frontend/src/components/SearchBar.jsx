import React, { useState, useRef, useEffect } from "react";
import { fetchAutocomplete } from "../api.js";

export default function SearchBar({ q, setQ, categoria, setCategoria, categorie, onSearch }) {
  const [suggerimenti, setSuggerimenti] = useState([]);
  const [mostraSuggerimenti, setMostraSuggerimenti] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.trim().length < 2) {
      setSuggerimenti([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await fetchAutocomplete(q.trim());
        setSuggerimenti(data.suggerimenti || []);
      } catch {
        setSuggerimenti([]);
      }
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [q]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setMostraSuggerimenti(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function scegliSuggerimento(marca) {
    setQ(marca);
    setMostraSuggerimenti(false);
    onSearch(marca);
  }

  return (
    <form
      className="search-bar"
      onSubmit={(e) => {
        e.preventDefault();
        setMostraSuggerimenti(false);
        onSearch();
      }}
    >
      <div className="search-input-wrapper" ref={containerRef}>
        <input
          type="text"
          placeholder="Cerca per marca (es. Cohiba, Toscano...)"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setMostraSuggerimenti(true);
          }}
          onFocus={() => setMostraSuggerimenti(true)}
          autoComplete="off"
        />
        {mostraSuggerimenti && suggerimenti.length > 0 && (
          <ul className="autocomplete-list">
            {suggerimenti.map((s) => (
              <li key={s} onMouseDown={() => scegliSuggerimento(s)}>
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
        <option value="">Tutte le categorie</option>
        {categorie.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <button type="submit">Cerca</button>
    </form>
  );
}
