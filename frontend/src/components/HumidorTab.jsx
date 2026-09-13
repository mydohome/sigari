import React, { useEffect, useState } from "react";
import {
  fetchHumidorItems,
  addHumidorItem,
  deleteHumidorItem,
  fetchFumate,
  addFumata,
  undoFumata,
  fetchHumidorStats,
} from "../api.js";
import ProductPicker from "./ProductPicker.jsx";
import ShopPicker from "./ShopPicker.jsx";
import BarChart from "./BarChart.jsx";
import HumidorReviewEditor from "./HumidorReviewEditor.jsx";

function formatEuro(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

function formatData(dateStr) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("it-IT").format(new Date(dateStr));
}

function oggi() {
  return new Date().toISOString().slice(0, 10);
}

const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

export default function HumidorTab() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [fumate, setFumate] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [prodottoScelto, setProdottoScelto] = useState(null);
  const [prezzo, setPrezzo] = useState("");
  const [dataAcquisto, setDataAcquisto] = useState(oggi());
  const [quantita, setQuantita] = useState(1);
  const [shop, setShop] = useState({ nome: "" });
  const [salvandoAcquisto, setSalvandoAcquisto] = useState(false);
  const [avvisoPrezzo, setAvvisoPrezzo] = useState(null);
  const [erroreForm, setErroreForm] = useState(null);

  const [showFumata, setShowFumata] = useState(false);
  const [itemFumata, setItemFumata] = useState("");
  const [quantitaFumata, setQuantitaFumata] = useState(1);
  const [registrandoFumata, setRegistrandoFumata] = useState(false);

  const [recensioneAperta, setRecensioneAperta] = useState(null);

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
  }, []);

  async function handleAddAcquisto(e) {
    e.preventDefault();
    setErroreForm(null);
    if (!prodottoScelto) {
      setErroreForm("Scegli un sigaro dall'elenco.");
      return;
    }
    setSalvandoAcquisto(true);
    setAvvisoPrezzo(null);
    try {
      const payload = {
        product_id: prodottoScelto.product_id,
        prezzo_acquisto: Number(prezzo),
        data_acquisto: dataAcquisto,
        quantita: Math.max(1, parseInt(quantita, 10) || 1),
        shop: shop?.nome?.trim() ? shop : null,
      };
      const res = await addHumidorItem(payload);
      if (res.confronto_prezzo) setAvvisoPrezzo(res.confronto_prezzo);
      setProdottoScelto(null);
      setPrezzo("");
      setQuantita(1);
      setShop({ nome: "" });
      await loadAll();
    } catch (err) {
      setErroreForm(err.message);
    } finally {
      setSalvandoAcquisto(false);
    }
  }

  async function handleFumata(e) {
    e.preventDefault();
    if (!itemFumata) return;
    setRegistrandoFumata(true);
    try {
      await addFumata({ humidor_item_id: Number(itemFumata), quantita: Math.max(1, parseInt(quantitaFumata, 10) || 1) });
      setItemFumata("");
      setQuantitaFumata(1);
      setShowFumata(false);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setRegistrandoFumata(false);
    }
  }

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

  const disponibili = items.filter((it) => it.quantita_rimanente > 0);

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

      <div className="humidor-actions">
        <button type="button" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Annulla" : "+ Aggiungi acquisto"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => setShowFumata((v) => !v)}
          disabled={disponibili.length === 0}
        >
          {showFumata ? "Annulla" : "🔥 Registra una fumata"}
        </button>
      </div>

      {showAdd && (
        <form className="humidor-form" onSubmit={handleAddAcquisto}>
          <ProductPicker selected={prodottoScelto} onSelect={setProdottoScelto} />
          <div className="humidor-form-row">
            <label>
              Prezzo pagato (a sigaro)
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={prezzo}
                onChange={(e) => setPrezzo(e.target.value)}
              />
            </label>
            <label>
              Data acquisto
              <input
                type="date"
                required
                value={dataAcquisto}
                onChange={(e) => setDataAcquisto(e.target.value)}
              />
            </label>
            <label>
              Quantità
              <input
                type="number"
                min="1"
                value={quantita}
                onChange={(e) => setQuantita(e.target.value)}
              />
            </label>
          </div>
          <ShopPicker value={shop?.nome || ""} onChange={setShop} />
          {erroreForm && <p className="error-msg small">{erroreForm}</p>}
          <button type="submit" disabled={salvandoAcquisto}>
            {salvandoAcquisto ? "Salvo..." : "Aggiungi all'humidor"}
          </button>
        </form>
      )}

      {avvisoPrezzo && (
        <p
          className={`hint-msg ${
            avvisoPrezzo.percentuale > 5 ? "hint-warn" : avvisoPrezzo.percentuale < -5 ? "hint-good" : ""
          }`}
        >
          Prezzo ufficiale aggiornato al {formatData(avvisoPrezzo.aggiornato_al)}:{" "}
          {formatEuro(avvisoPrezzo.prezzo_ufficiale)} a sigaro — hai pagato{" "}
          {avvisoPrezzo.differenza >= 0 ? "in più" : "in meno"} di {formatEuro(Math.abs(avvisoPrezzo.differenza))}{" "}
          ({avvisoPrezzo.percentuale > 0 ? "+" : ""}
          {avvisoPrezzo.percentuale}%).
        </p>
      )}

      {showFumata && (
        <form className="humidor-form" onSubmit={handleFumata}>
          <label>
            Cosa hai fumato?
            <select value={itemFumata} onChange={(e) => setItemFumata(e.target.value)} required>
              <option value="">Scegli dall'humidor...</option>
              {disponibili.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.marca} {it.formato ? `— ${it.formato}` : ""} ({it.quantita_rimanente} rimasti, acquistato
                  il {formatData(it.data_acquisto)}
                  {it.shop_nome ? ` da ${it.shop_nome}` : ""})
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantità
            <input
              type="number"
              min="1"
              value={quantitaFumata}
              onChange={(e) => setQuantitaFumata(e.target.value)}
            />
          </label>
          <button type="submit" disabled={registrandoFumata}>
            {registrandoFumata ? "Registro..." : "Registra fumata"}
          </button>
        </form>
      )}

      <h2>Il mio humidor</h2>
      {items.length === 0 ? (
        <p className="status-msg">Il tuo humidor è vuoto. Aggiungi il tuo primo acquisto qui sopra.</p>
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
    </div>
  );
}
