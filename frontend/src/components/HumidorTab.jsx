import React, { useEffect, useMemo, useState } from "react";
import {
  fetchHumidorItems,
  deleteHumidorItem,
  fetchFumate,
  undoFumata,
  fetchHumidorStats,
  fetchLocations,
  bulkAssignLocation,
} from "../api.js";
import BarChart from "./BarChart.jsx";
import HumidorReviewEditor from "./HumidorReviewEditor.jsx";
import PurchaseModal from "./PurchaseModal.jsx";

function formatEuro(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

function formatData(dateStr) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("it-IT").format(new Date(dateStr));
}

const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

function LocationBadge({ nome, colore }) {
  if (!nome) return <span className="status-msg small">—</span>;
  return (
    <span className="location-badge" style={{ "--location-colore": colore || "#8b5e34" }}>
      {nome}
    </span>
  );
}

// Un gruppo di prodotti che condividono la stessa location, mostrato come
// card con intestazione colorata. Nel gruppo "Non assegnati" (senza
// location) ogni riga ha una checkbox per la multi-selezione, cosi' si puo'
// assegnare una location a piu' sigari insieme invece di modificarli uno
// per uno.
function LocationGroupSection({
  gruppo,
  onOpenProdotto,
  selezionabile,
  selezionati,
  onToggleSelezione,
}) {
  const isNonAssegnati = gruppo.location_id === null;
  return (
    <div className={`location-group ${isNonAssegnati ? "location-group-none" : ""}`}>
      <div
        className="location-group-header"
        style={isNonAssegnati ? undefined : { "--location-colore": gruppo.location_colore }}
      >
        {!isNonAssegnati && <span className="location-dot" />}
        <span className="location-group-title">{gruppo.location_nome || "Non assegnati"}</span>
        <span className="location-group-count">{gruppo.totale}</span>
      </div>
      <ul className="humidor-slim-list humidor-slim-list-modern">
        {gruppo.prodotti.map((p) => {
          const key = `${gruppo.location_id ?? "none"}:${p.product_id}`;
          return (
            <li key={key}>
              {selezionabile && (
                <input
                  type="checkbox"
                  className="humidor-slim-checkbox"
                  checked={selezionati.has(key)}
                  onChange={() => onToggleSelezione(key, p)}
                />
              )}
              <button type="button" onClick={() => onOpenProdotto(p.product_id)}>
                <span className="humidor-slim-desc">
                  {p.marca}
                  {p.formato ? ` — ${p.formato}` : ""}
                </span>
                <span className="humidor-slim-qty">× {p.totale}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProductDetailPage({ prodotto, onBack, onChanged }) {
  const [itemInModifica, setItemInModifica] = useState(null);

  return (
    <div className="product-detail-page">
      <button type="button" className="link-button back-link" onClick={onBack}>
        ← Torna all'humidor
      </button>
      <h2>
        {prodotto.marca}
        {prodotto.formato ? ` — ${prodotto.formato}` : ""}
      </h2>

      <HumidorReviewEditor productId={prodotto.product_id} />

      <table className="results-table product-lots-table">
        <thead>
          <tr>
            <th>Rimasti</th>
            <th>Location</th>
            <th>Prezzo pagato</th>
            <th>Acquistato il</th>
            <th>Tabaccheria</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {prodotto.lotti.map((it) => (
            <tr key={it.id}>
              <td>
                {it.quantita_rimanente} / {it.quantita_iniziale}
              </td>
              <td>
                <LocationBadge nome={it.location_nome} colore={it.location_colore} />
              </td>
              <td className="prezzo-cell">{formatEuro(it.prezzo_acquisto)}</td>
              <td>{formatData(it.data_acquisto)}</td>
              <td>{it.shop_nome || "—"}</td>
              <td className="actions-cell">
                <button className="link-button" onClick={() => setItemInModifica(it)}>
                  Modifica
                </button>
                <button
                  className="link-button"
                  onClick={async () => {
                    await deleteHumidorItem(it.id);
                    onChanged();
                  }}
                >
                  Elimina
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {itemInModifica && (
        <PurchaseModal
          item={itemInModifica}
          onClose={() => setItemInModifica(null)}
          onSaved={onChanged}
        />
      )}
    </div>
  );
}

// Vista dettagliata "libreria": tutti i lotti di tutti i sigari in un'unica
// tabella piatta e modificabile, invece che raggruppati per sigaro come nella
// vista slim/per-prodotto.
function LibraryPage({ items, onBack, onChanged }) {
  const [itemInModifica, setItemInModifica] = useState(null);

  return (
    <div className="product-detail-page">
      <button type="button" className="link-button back-link" onClick={onBack}>
        ← Torna all'humidor
      </button>
      <h2>Libreria sigari</h2>

      {items.length === 0 ? (
        <p className="status-msg">Il tuo humidor è vuoto.</p>
      ) : (
        <table className="results-table product-lots-table">
          <thead>
            <tr>
              <th>Sigaro</th>
              <th>Rimasti</th>
              <th>Location</th>
              <th>Prezzo pagato</th>
              <th>Acquistato il</th>
              <th>Tabaccheria</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="marca-cell">
                  {it.marca}
                  {it.formato ? ` — ${it.formato}` : ""}
                </td>
                <td>
                  {it.quantita_rimanente} / {it.quantita_iniziale}
                </td>
                <td>
                  <LocationBadge nome={it.location_nome} colore={it.location_colore} />
                </td>
                <td className="prezzo-cell">{formatEuro(it.prezzo_acquisto)}</td>
                <td>{formatData(it.data_acquisto)}</td>
                <td>{it.shop_nome || "—"}</td>
                <td className="actions-cell">
                  <button className="link-button" onClick={() => setItemInModifica(it)}>
                    Modifica
                  </button>
                  <button
                    className="link-button"
                    onClick={async () => {
                      await deleteHumidorItem(it.id);
                      onChanged();
                    }}
                  >
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {itemInModifica && (
        <PurchaseModal
          item={itemInModifica}
          onClose={() => setItemInModifica(null)}
          onSaved={onChanged}
        />
      )}
    </div>
  );
}

export default function HumidorTab({ refreshToken }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [fumate, setFumate] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prodottoAperto, setProdottoAperto] = useState(null); // product_id
  const [libreriaAperta, setLibreriaAperta] = useState(false);
  const [selezionati, setSelezionati] = useState(new Map()); // key -> { lottiIds: [...] }
  const [locationScelta, setLocationScelta] = useState("");
  const [assegnando, setAssegnando] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [i, f, s, l] = await Promise.all([
        fetchHumidorItems(),
        fetchFumate(15),
        fetchHumidorStats(),
        fetchLocations(),
      ]);
      setItems(i.items || []);
      setFumate(f.fumate || []);
      setStats(s);
      setLocations(l.locations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  // Vista "piatta": un sigaro = una riga, sommando i lotti di tutte le
  // location. Usata per la pagina di dettaglio prodotto e per la libreria.
  const prodottiFlat = useMemo(() => {
    const mappa = new Map();
    for (const it of items) {
      if (!mappa.has(it.product_id)) {
        mappa.set(it.product_id, {
          product_id: it.product_id,
          marca: it.marca,
          formato: it.formato,
          totale: 0,
          lotti: [],
        });
      }
      const p = mappa.get(it.product_id);
      p.totale += it.quantita_rimanente;
      p.lotti.push(it);
    }
    return [...mappa.values()].sort((a, b) => a.marca.localeCompare(b.marca));
  }, [items]);

  // Vista raggruppata per location: ogni gruppo contiene solo i lotti di
  // quella location, riaggregati per sigaro. I lotti senza location finiscono
  // nel gruppo "Non assegnati" (location_id null), su cui e' possibile fare
  // la multi-selezione per l'assegnazione in blocco.
  const gruppiPerLocation = useMemo(() => {
    const perLocation = new Map();
    for (const it of items) {
      if (it.quantita_rimanente <= 0) continue;
      const key = it.location_id ?? "none";
      if (!perLocation.has(key)) {
        perLocation.set(key, {
          location_id: it.location_id ?? null,
          location_nome: it.location_nome ?? null,
          location_colore: it.location_colore ?? null,
          totale: 0,
          prodottiMap: new Map(),
        });
      }
      const gruppo = perLocation.get(key);
      gruppo.totale += it.quantita_rimanente;
      if (!gruppo.prodottiMap.has(it.product_id)) {
        gruppo.prodottiMap.set(it.product_id, {
          product_id: it.product_id,
          marca: it.marca,
          formato: it.formato,
          totale: 0,
          lotti: [],
        });
      }
      const p = gruppo.prodottiMap.get(it.product_id);
      p.totale += it.quantita_rimanente;
      p.lotti.push(it);
    }
    const gruppiArr = [...perLocation.values()].map((g) => ({
      ...g,
      prodotti: [...g.prodottiMap.values()].sort((a, b) => a.marca.localeCompare(b.marca)),
    }));
    gruppiArr.sort((a, b) => {
      if (a.location_id === null) return 1;
      if (b.location_id === null) return -1;
      return a.location_nome.localeCompare(b.location_nome);
    });
    return gruppiArr;
  }, [items]);

  function toggleSelezione(key, prodotto) {
    setSelezionati((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, { lottiIds: prodotto.lotti.map((l) => l.id) });
      }
      return next;
    });
  }

  async function handleAssegnaLocation() {
    if (!locationScelta || selezionati.size === 0) return;
    setAssegnando(true);
    try {
      const itemIds = [...selezionati.values()].flatMap((v) => v.lottiIds);
      await bulkAssignLocation(itemIds, Number(locationScelta));
      setSelezionati(new Map());
      setLocationScelta("");
      await loadAll();
    } finally {
      setAssegnando(false);
    }
  }

  async function handleUndoFumata(id) {
    await undoFumata(id);
    await loadAll();
  }

  if (loading) return <p className="status-msg">Caricamento humidor...</p>;
  if (error) return <p className="error-msg">{error}</p>;

  const prodottoSelezionato = prodottiFlat.find((p) => p.product_id === prodottoAperto);

  if (prodottoSelezionato) {
    return (
      <ProductDetailPage
        prodotto={prodottoSelezionato}
        onBack={() => setProdottoAperto(null)}
        onChanged={loadAll}
      />
    );
  }

  if (libreriaAperta) {
    return (
      <LibraryPage items={items} onBack={() => setLibreriaAperta(false)} onChanged={loadAll} />
    );
  }

  return (
    <div className="humidor">
      {stats && (
        <div className="humidor-stats">
          <div className="stat-card">
            <span className="stat-value">{stats.totale_in_humidor}</span>
            <span className="stat-label">Sigari nell'humidor</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{formatEuro(stats.valore_in_humidor)}</span>
            <span className="stat-label">Valore in humidor</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.fumate_totali}</span>
            <span className="stat-label">Fumate totali</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.media_settimanale}</span>
            <span className="stat-label">Media / settimana</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.media_mensile}</span>
            <span className="stat-label">Media / mese</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.media_annuale}</span>
            <span className="stat-label">Media / anno</span>
          </div>
        </div>
      )}

      {stats && (stats.serie_settimanale.length > 0 || stats.serie_mensile.length > 0) && (
        <div className="humidor-charts">
          <div>
            <h3>Fumate per settimana</h3>
            <BarChart
              data={stats.serie_settimanale.map((s) => ({ label: s.periodo, value: s.totale }))}
              formatLabel={(d) => formatData(d).slice(0, 5)}
            />
          </div>
          <div>
            <h3>Fumate per mese</h3>
            <BarChart
              data={stats.serie_mensile.map((s) => ({ label: s.periodo, value: s.totale }))}
              formatLabel={(d) => MESI[new Date(d).getMonth()]}
            />
          </div>
        </div>
      )}

      <div className="humidor-section-header">
        <h2>Il mio humidor</h2>
        {prodottiFlat.length > 0 && (
          <button type="button" className="link-button" onClick={() => setLibreriaAperta(true)}>
            📖 Vista libreria dettagliata
          </button>
        )}
      </div>
      {prodottiFlat.length === 0 ? (
        <p className="status-msg">
          Il tuo humidor è vuoto. Usa il pulsante 🛒 per registrare il tuo primo acquisto.
        </p>
      ) : (
        <div className="humidor-locations-view">
          {gruppiPerLocation.map((gruppo) => {
            const isNonAssegnati = gruppo.location_id === null;
            return (
              <React.Fragment key={gruppo.location_id ?? "none"}>
                <LocationGroupSection
                  gruppo={gruppo}
                  onOpenProdotto={setProdottoAperto}
                  selezionabile={isNonAssegnati}
                  selezionati={selezionati}
                  onToggleSelezione={toggleSelezione}
                />
                {isNonAssegnati && (
                  <div className="location-bulk-toolbar">
                    <select
                      value={locationScelta}
                      onChange={(e) => setLocationScelta(e.target.value)}
                      disabled={selezionati.size === 0}
                    >
                      <option value="">Assegna a location...</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nome}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={selezionati.size === 0 || !locationScelta || assegnando}
                      onClick={handleAssegnaLocation}
                    >
                      {assegnando
                        ? "Assegno..."
                        : `Assegna${selezionati.size ? ` (${selezionati.size})` : ""}`}
                    </button>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {fumate.length > 0 && (
        <>
          <h2>Ultime fumate</h2>
          <ul className="fumate-log">
            {fumate.map((f) => (
              <li key={f.id}>
                <span>
                  {formatData(f.data_fumata)} — {f.marca} {f.formato ? `(${f.formato})` : ""}
                  {f.quantita > 1 ? ` ×${f.quantita}` : ""}
                </span>
                <button className="link-button" onClick={() => handleUndoFumata(f.id)}>
                  annulla
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
