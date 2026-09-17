import React, { useEffect, useState, useCallback } from "react";
import SearchBar from "./components/SearchBar.jsx";
import ResultsTable from "./components/ResultsTable.jsx";
import AuthBar from "./components/AuthBar.jsx";
import FavoritesTab from "./components/FavoritesTab.jsx";
import WishlistTab from "./components/WishlistTab.jsx";
import HumidorTab from "./components/HumidorTab.jsx";
import HumidorDashboard from "./components/HumidorDashboard.jsx";
import GlobalActions from "./components/GlobalActions.jsx";
import SettingsTab from "./components/SettingsTab.jsx";
import WikiTab from "./components/WikiTab.jsx";
import Logo from "./components/Logo.jsx";
import { IconSearch, IconStar, IconGenieLamp, IconHumidor, IconBook, IconSettings } from "./components/icons/Icons.jsx";
import { searchPrices, fetchCategorie, fetchMarche, fetchProvenienze } from "./api.js";
import { getStoredUser, clearSession } from "./auth.js";

const TABS = [
  { id: "ricerca", label: "Ricerca", Icon: IconSearch },
  { id: "preferiti", label: "Preferiti", Icon: IconStar },
  { id: "wishlist", label: "Wishlist", Icon: IconGenieLamp },
  { id: "humidor", label: "Humidor", Icon: IconHumidor },
  { id: "guida", label: "Guida", Icon: IconBook },
  { id: "impostazioni", label: "Impostazioni", Icon: IconSettings },
];

export default function App() {
  const [tab, setTab] = useState("ricerca");
  const [user, setUser] = useState(getStoredUser());

  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [categorie, setCategorie] = useState([]);
  const [marca, setMarca] = useState("");
  const [marche, setMarche] = useState([]);
  const [provenienza, setProvenienza] = useState("");
  const [provenienze, setProvenienze] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loginHint, setLoginHint] = useState(false);
  const [humidorRefresh, setHumidorRefresh] = useState(0);

  useEffect(() => {
    fetchCategorie()
      .then((data) => setCategorie(data.categorie))
      .catch(() => setCategorie([]));
    fetchMarche()
      .then((data) => setMarche(data.marche))
      .catch(() => setMarche([]));
    fetchProvenienze()
      .then((data) => setProvenienze(data.provenienze))
      .catch(() => setProvenienze([]));
  }, []);

  const runSearch = useCallback(
    async (overrideQ) => {
      setLoading(true);
      setError(null);
      setSearched(true);
      try {
        const data = await searchPrices({ q: overrideQ ?? q, categoria, marca, provenienza });
        setResults(data.results);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [q, categoria, marca, provenienza]
  );

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
              <h1>Sigari Track</h1>
              <p className="subtitle">Il tuo humidor, le tue fumate, i prezzi sempre aggiornati.</p>
            </div>
          </div>
          <AuthBar user={user} onAuthChange={setUser} onLogout={handleLogout} />
        </div>
      </header>

      <nav className="tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            <Icon size={22} filled={id === "preferiti" && tab === id} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="app-content">
        {loginHint && <p className="hint-msg">Devi accedere o registrarti per usare questa funzione.</p>}

        {tab === "ricerca" && (
          <>
            {user && (
              <HumidorDashboard
                refreshToken={humidorRefresh}
                onOpenInventory={() => setTab("humidor")}
              />
            )}
            <SearchBar
              q={q}
              setQ={setQ}
              categoria={categoria}
              setCategoria={setCategoria}
              categorie={categorie}
              marca={marca}
              setMarca={setMarca}
              marche={marche}
              provenienza={provenienza}
              setProvenienza={setProvenienza}
              provenienze={provenienze}
              onSearch={runSearch}
            />
            {error && <p className="error-msg">{error}</p>}
            {searched ? (
              <ResultsTable
                results={results}
                loading={loading}
                user={user}
                onRequireLogin={handleRequireLogin}
                onChanged={() => {
                  runSearch();
                  setHumidorRefresh((v) => v + 1);
                }}
              />
            ) : (
              <p className="status-msg">Cerca una marca o scegli un filtro per vedere i prezzi.</p>
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

        {tab === "humidor" &&
          (user ? (
            <HumidorTab refreshToken={humidorRefresh} />
          ) : (
            <p className="status-msg">Accedi per gestire il tuo humidor.</p>
          ))}

        {tab === "guida" && <WikiTab />}

        {tab === "impostazioni" &&
          (user ? (
            <SettingsTab />
          ) : (
            <p className="status-msg">Accedi per vedere le impostazioni.</p>
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

      {user && <GlobalActions onHumidorChange={() => setHumidorRefresh((v) => v + 1)} />}
    </div>
  );
}
