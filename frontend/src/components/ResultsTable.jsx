import React, { useState } from "react";
import ReviewPanel from "./ReviewPanel.jsx";
import PurchaseModal from "./PurchaseModal.jsx";
import PriceHistoryModal from "./PriceHistoryModal.jsx";
import { IconTrend } from "./icons/Icons.jsx";
import { addFavorite, removeFavorite, addToWishlist } from "../api.js";

function formatEuro(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

function formatData(dateStr) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("it-IT").format(new Date(dateStr));
}

// Una variazione di prezzo piu' vecchia di cosi' non e' piu' una novita':
// resta consultabile nello storico, ma non mostra piu' la freccia.
const GIORNI_VARIAZIONE_RECENTE = 180;

function variazioneRecente(r) {
  if (!r.variazione_il || r.prezzo_precedente === null || r.prezzo_precedente === undefined) return null;
  const giorni = (Date.now() - new Date(r.variazione_il).getTime()) / 86400000;
  if (giorni > GIORNI_VARIAZIONE_RECENTE) return null;
  const attuale = Number(r.prezzo_confezione);
  const precedente = Number(r.prezzo_precedente);
  return { aumento: attuale > precedente, percentuale: ((attuale - precedente) / precedente) * 100, precedente };
}

function descriviVariazione(r, v) {
  const pct = Math.abs(v.percentuale).toFixed(1).replace(".", ",");
  return (
    `${v.aumento ? "Aumento" : "Diminuzione"} del ${pct}% dal ${formatData(r.variazione_il)} ` +
    `(confezione da ${formatEuro(v.precedente)} a ${formatEuro(r.prezzo_confezione)}). Clicca per lo storico.`
  );
}

export default function ResultsTable({ results, loading, user, onRequireLogin, onChanged }) {
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [acquistoRow, setAcquistoRow] = useState(null);
  const [storicoRow, setStoricoRow] = useState(null);

  if (loading) return <p className="status-msg">Caricamento risultati...</p>;
  if (!results.length) return <p className="status-msg">Nessun risultato trovato.</p>;

  async function toggleFavorite(row) {
    if (!user) return onRequireLogin();
    setBusyId(row.product_id);
    try {
      if (row.preferito) {
        await removeFavorite(row.product_id);
      } else {
        await addFavorite(row.product_id);
      }
      onChanged?.();
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddToWishlist(row) {
    if (!user) return onRequireLogin();
    setBusyId(row.product_id);
    try {
      await addToWishlist(row.product_id, 1);
      onChanged?.();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
    <table className="results-table">
      <thead>
        <tr>
          <th></th>
          <th>Marca</th>
          <th>Categoria</th>
          <th>Formato</th>
          <th>Prezzo confezione</th>
          <th>Prezzo singolo</th>
          <th>Aggiornato al</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {results.map((r) => (
          <React.Fragment key={r.product_id}>
            <tr>
              <td>
                <button
                  className={`icon-button ${r.preferito ? "active" : ""}`}
                  title={r.preferito ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                  disabled={busyId === r.product_id}
                  onClick={() => toggleFavorite(r)}
                >
                  {r.preferito ? "★" : "☆"}
                </button>
              </td>
              <td className="marca-cell">{r.marca}</td>
              <td>{r.categoria}</td>
              <td>{r.formato || "—"}</td>
              <td className="prezzo-cell">{formatEuro(r.prezzo_confezione)}</td>
              <td className="prezzo-cell prezzo-singolo">
                <span className="prezzo-con-trend">
                  {r.prezzo_singolo ? formatEuro(r.prezzo_singolo) : "—"}
                  {(() => {
                    const v = variazioneRecente(r);
                    return v ? (
                      <button
                        type="button"
                        className={`price-trend ${v.aumento ? "su" : "giu"}`}
                        title={descriviVariazione(r, v)}
                        aria-label={descriviVariazione(r, v)}
                        onClick={() => setStoricoRow(r)}
                      >
                        {v.aumento ? "▲" : "▼"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="price-trend neutro"
                        title="Storico prezzi"
                        aria-label="Storico prezzi"
                        onClick={() => setStoricoRow(r)}
                      >
                        <IconTrend />
                      </button>
                    );
                  })()}
                </span>
              </td>
              <td>{formatData(r.valido_dal)}</td>
              <td className="actions-cell">
                <button
                  className="icon-button"
                  title="Aggiungi alla wishlist"
                  disabled={busyId === r.product_id || r.in_wishlist}
                  onClick={() => handleAddToWishlist(r)}
                >
                  {r.in_wishlist ? "✓" : "+ 🛒"}
                </button>
                <button
                  className="icon-button"
                  title="Registra acquisto"
                  onClick={() => (user ? setAcquistoRow(r) : onRequireLogin())}
                >
                  🛍️
                </button>
                <button
                  className="link-button"
                  onClick={() => setExpandedId(expandedId === r.product_id ? null : r.product_id)}
                >
                  {expandedId === r.product_id ? "Chiudi recensione" : "Recensione"}
                </button>
              </td>
            </tr>
            {expandedId === r.product_id && (
              <tr className="expanded-row">
                <td colSpan={8}>
                  <ReviewPanel productId={r.product_id} user={user} onRequireLogin={onRequireLogin} />
                </td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
    {storicoRow && <PriceHistoryModal prodotto={storicoRow} onClose={() => setStoricoRow(null)} />}
    {acquistoRow && (
      <PurchaseModal
        presetProduct={acquistoRow}
        onClose={() => setAcquistoRow(null)}
        onSaved={() => onChanged?.()}
      />
    )}
    </>
  );
}
