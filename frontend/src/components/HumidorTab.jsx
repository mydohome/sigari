import React, { useEffect, useMemo, useState } from "react";
import { fetchHumidorItems, deleteHumidorItem, fetchFumate, undoFumata, fetchHumidorStats } from "../api.js";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prodottoAperto, setProdottoAperto] = useState(null); // product_id
  const [libreriaAperta, setLibreriaAperta] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [i, f, s] = await Promise.all([fetchHumidorItems(), fetchFumate(15), fetchHumidorStats()]);
      setItems(i.items || []);
      setFumate(f.fumate || []);
      setStats(s);
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

  const prodotti = useMemo(() => {
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

  async function handleUndoFumata(id) {
    await undoFumata(id);
    await loadAll();
  }

  if (loading) return <p className="status-msg">Caricamento humidor...</p>;
  if (error) return <p className="error-msg">{error}</p>;

  const prodottoSelezionato = prodotti.find((p) => p.product_id === prodottoAperto);

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
        {prodotti.length > 0 && (
          <button type="button" className="link-button" onClick={() => setLibreriaAperta(true)}>
            📖 Vista libreria dettagliata
          </button>
        )}
      </div>
      {prodotti.length === 0 ? (
        <p className="status-msg">
          Il tuo humidor è vuoto. Usa il pulsante 🛒 per registrare il tuo primo acquisto.
        </p>
      ) : (
        <ul className="humidor-slim-list">
          {prodotti.map((p) => (
            <li key={p.product_id}>
              <button type="button" onClick={() => setProdottoAperto(p.product_id)}>
                <span className="humidor-slim-desc">
                  {p.marca}
                  {p.formato ? ` — ${p.formato}` : ""}
                </span>
                <span className="humidor-slim-qty">× {p.totale}</span>
              </button>
            </li>
          ))}
        </ul>
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
