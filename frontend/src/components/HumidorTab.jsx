import React, { useEffect, useState } from "react";
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

export default function HumidorTab({ refreshToken }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [fumate, setFumate] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recensioneAperta, setRecensioneAperta] = useState(null);
  const [itemInModifica, setItemInModifica] = useState(null);

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

  async function handleDeleteItem(id) {
    await deleteHumidorItem(id);
    await loadAll();
  }

  async function handleUndoFumata(id) {
    await undoFumata(id);
    await loadAll();
  }

  if (loading) return <p className="status-msg">Caricamento humidor...</p>;
  if (error) return <p className="error-msg">{error}</p>;

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

      <h2>Il mio humidor</h2>
      {items.length === 0 ? (
        <p className="status-msg">
          Il tuo humidor è vuoto. Usa il pulsante 🛒 per registrare il tuo primo acquisto.
        </p>
      ) : (
        <table className="results-table">
          <thead>
            <tr>
              <th>Marca</th>
              <th>Formato</th>
              <th>Rimasti</th>
              <th>Prezzo pagato</th>
              <th>Acquistato il</th>
              <th>Tabaccheria</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <React.Fragment key={it.id}>
                <tr>
                  <td className="marca-cell">{it.marca}</td>
                  <td>{it.formato || "—"}</td>
                  <td>
                    {it.quantita_rimanente} / {it.quantita_iniziale}
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
                      onClick={() =>
                        setRecensioneAperta(recensioneAperta === it.product_id ? null : it.product_id)
                      }
                    >
                      {recensioneAperta === it.product_id ? "Chiudi" : "Recensisci"}
                    </button>
                    <button className="link-button" onClick={() => handleDeleteItem(it.id)}>
                      Elimina
                    </button>
                  </td>
                </tr>
                {recensioneAperta === it.product_id && (
                  <tr className="expanded-row">
                    <td colSpan={7}>
                      <HumidorReviewEditor productId={it.product_id} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
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

      {itemInModifica && (
        <PurchaseModal
          item={itemInModifica}
          onClose={() => setItemInModifica(null)}
          onSaved={loadAll}
        />
      )}
    </div>
  );
}
