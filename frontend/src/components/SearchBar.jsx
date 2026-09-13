import React, { useState, useRef, useEffect } from "react";
import { fetchAutocomplete } from "../api.js";

export default function SearchBar({
  q,
  setQ,
  categoria,
  setCategoria,
  categorie,
  marca,
  setMarca,
  marche,
  onSearch,
}) {
  const [suggerimenti, setSuggerimenti] = useState([]);
  const [mostraSuggerimenti, setMostraSuggerimenti] = useState(false);
  const [evidenziato, setEvidenziato] = useState(-1);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setEvidenziato(-1);

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

  function scegliSuggerimento(m) {
    setQ(m);
    setMostraSuggerimenti(false);
    setEvidenziato(-1);
    onSearch(m);
  }

  function handleKeyDown(e) {
    if (!mostraSuggerimenti || suggerimenti.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setEvidenziato((i) => (i + 1) % suggerimenti.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setEvidenziato((i) => (i <= 0 ? suggerimenti.length - 1 : i - 1));
    } else if (e.key === "Enter" && evidenziato >= 0) {
      e.preventDefault();
      scegliSuggerimento(suggerimenti[evidenziato]);
    } else if (e.key === "Escape") {
      setMostraSuggerimenti(false);
    }
  }

  function evidenziaTesto(testo) {
    const termine = q.trim();
    if (!termine) return testo;
    const idx = testo.toLowerCase().indexOf(termine.toLowerCase());
    if (idx === -1) return testo;
    return (
      <>
        {testo.slice(0, idx)}
        <strong>{testo.slice(idx, idx + termine.length)}</strong>
        {testo.slice(idx + termine.length)}
      </>
    );
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
        <span className="search-icon" aria-hidden="true">
          ⌕
        </span>
        <input
          type="text"
          placeholder="Cerca per marca (es. Cohiba, Toscano...)"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setMostraSuggerimenti(true);
          }}
          onFocus={() => setMostraSuggerimenti(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {mostraSuggerimenti && suggerimenti.length > 0 && (
          <ul className="autocomplete-list">
            {suggerimenti.map((s, i) => (
              <li
                key={s}
                className={i === evidenziato ? "evidenziato" : ""}
                onMouseEnter={() => setEvidenziato(i)}
                onMouseDown={() => scegliSuggerimento(s)}
              >
                {evidenziaTesto(s)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <select
        value={marca}
        onChange={(e) => setMarca(e.target.value)}
        aria-label="Filtra per marca"
      >
        <option value="">Tutte le marche</option>
        {marche.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <select
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        aria-label="Filtra per categoria"
      >
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
