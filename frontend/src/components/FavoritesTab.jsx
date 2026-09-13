import React, { useEffect, useState } from "react";
import { fetchFavorites, updateFavoriteTag, removeFavorite } from "../api.js";

function formatEuro(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

export default function FavoritesTab() {
  const [preferiti, setPreferiti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [tagDraft, setTagDraft] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFavorites();
      setPreferiti(data.preferiti || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveTag(productId) {
    await updateFavoriteTag(productId, tagDraft);
    setEditingId(null);
    load();
  }

  async function handleRemove(productId) {
    await removeFavorite(productId);
    load();
  }

  if (loading) return <p className="status-msg">Caricamento preferiti...</p>;
  if (error) return <p className="error-msg">{error}</p>;
  if (!preferiti.length) return <p className="status-msg">Non hai ancora preferiti. Aggiungine dalla ricerca.</p>;

  return (
    <table className="results-table">
      <thead>
        <tr>
          <th>Marca</th>
          <th>Formato</th>
          <th>Prezzo confezione</th>
          <th>Tag</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {preferiti.map((p) => (
          <tr key={p.product_id}>
            <td className="marca-cell">{p.marca}</td>
            <td>{p.formato || "—"}</td>
            <td className="prezzo-cell">{formatEuro(p.prezzo_confezione)}</td>
            <td>
              {editingId === p.product_id ? (
                <input
                  autoFocus
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onBlur={() => saveTag(p.product_id)}
                  onKeyDown={(e) => e.key === "Enter" && saveTag(p.product_id)}
                  placeholder="es. Da provare, Preferito assoluto..."
                />
              ) : (
                <button
                  className="link-button"
                  onClick={() => {
                    setEditingId(p.product_id);
                    setTagDraft(p.tag || "");
                  }}
                >
                  {p.tag || "+ aggiungi tag"}
                </button>
              )}
            </td>
            <td>
              <button className="link-button" onClick={() => handleRemove(p.product_id)}>
                Rimuovi
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
