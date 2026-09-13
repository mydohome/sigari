import React, { useEffect, useState, useCallback } from "react";
import SearchBar from "./components/SearchBar.jsx";
import ResultsTable from "./components/ResultsTable.jsx";
import AuthBar from "./components/AuthBar.jsx";
import FavoritesTab from "./components/FavoritesTab.jsx";
import WishlistTab from "./components/WishlistTab.jsx";
import Logo from "./components/Logo.jsx";
import { searchPrices, fetchCategorie, fetchMarche } from "./api.js";
import { getStoredUser, clearSession } from "./auth.js";

export default function App() {
  const [tab, setTab] = useState("ricerca"); // "ricerca" | "preferiti" | "wishlist"
  const [user, setUser] = useState(getStoredUser());

  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [categorie, setCategorie] = useState([]);
  const [marca, setMarca] = useState("");
  const [marche, setMarche] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loginHint, setLoginHint] = useState(false);

  useEffect(() => {
    fetchCategorie()
      .then((data) => setCategorie(data.categorie))
      .catch(() => setCategorie([]));
    fetchMarche()
      .then((data) => setMarche(data.marche))
      .catch(() => setMarche([]));
  }, []);

  const runSearch = useCallback(
    async (overrideQ) => {
      setLoading(true);
      setError(null);
      setSearched(true);
      try {
        const data = await searchPrices({ q: overrideQ ?? q, categoria, marca });
        setResults(data.results);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [q, categoria, marca]
  );

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogout() {
    clearSession();
    setUser(null);
  }

  function handleRequireLogin() {
    setLoginHint(true);
    setTimeout(() => setLoginHint(false), 4000);
  }

  return (
    <div className="app">
      <header>
        <div className="header-top">
          <div className="brand">
            <Logo />
            <div>
              <h1>Prezzi Sigari in Italia</h1>
              <p className="subtitle">
                Dati aggiornati automaticamente ogni settimana, basati sulle tariffe ufficiali ADM.
              </p>
            </div>
          </div>
          <AuthBar user={user} onAuthChange={setUser} onLogout={handleLogout} />
        </div>

        <nav className="tabs">
          <button className={tab === "ricerca" ? "active" : ""} onClick={() => setTab("ricerca")}>
            Ricerca
          </button>
          <button className={tab === "preferiti" ? "active" : ""} onClick={() => setTab("preferiti")}>
            Preferiti
          </button>
          <button className={tab === "wishlist" ? "active" : ""} onClick={() => setTab("wishlist")}>
            Wishlist
          </button>
        </nav>
      </header>

      {loginHint && (
        <p className="hint-msg">Devi accedere o registrarti per usare questa funzione.</p>
      )}

      {tab === "ricerca" && (
        <>
          <SearchBar
            q={q}
            setQ={setQ}
            categoria={categoria}
            setCategoria={setCategoria}
            categorie={categorie}
            marca={marca}
            setMarca={setMarca}
            marche={marche}
            onSearch={runSearch}
          />
          {error && <p className="error-msg">{error}</p>}
          {searched && (
            <ResultsTable
              results={results}
              loading={loading}
              user={user}
              onRequireLogin={handleRequireLogin}
              onChanged={runSearch}
            />
          )}
        </>
      )}

      {tab === "preferiti" &&
        (user ? (
          <FavoritesTab />
        ) : (
          <p className="status-msg">Accedi per vedere e gestire i tuoi preferiti.</p>
        ))}

      {tab === "wishlist" &&
        (user ? (
          <WishlistTab />
        ) : (
          <p className="status-msg">Accedi per vedere e gestire la tua wishlist.</p>
        ))}

      <footer>
        <p>
          Fonte dati: listino Sigari della Federazione Italiana Tabaccai, conforme alle tariffe{" "}
          <a
            href="https://www.adm.gov.it/portale/monopoli/tabacchi/prezzi/prezzi_pubblico"
            target="_blank"
            rel="noreferrer"
          >
            dell'Agenzia delle Dogane e dei Monopoli
          </a>
        </p>
      </footer>
    </div>
  );
}
