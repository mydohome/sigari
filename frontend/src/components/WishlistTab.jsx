import React, { useEffect, useState } from "react";
import { fetchWishlist, updateWishlistQuantity, removeFromWishlist } from "../api.js";

function formatEuro(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

export default function WishlistTab() {
  const [articoli, setArticoli] = useState([]);
  const [totale, setTotale] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWishlist();
      setArticoli(data.articoli || []);
      setTotale(data.totale_complessivo || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleQuantityChange(productId, value) {
    const qty = Math.max(1, parseInt(value, 10) || 1);
    await updateWishlistQuantity(productId, qty);
    load();
  }

  async function handleRemove(productId) {
    await removeFromWishlist(productId);
    load();
  }

  if (loading) return <p className="status-msg">Caricamento wishlist...</p>;
  if (error) return <p className="error-msg">{error}</p>;
  if (!articoli.length) return <p className="status-msg">La tua wishlist è vuota. Aggiungi sigari dalla ricerca.</p>;

  return (
    <>
      <table className="results-table">
        <thead>
          <tr>
            <th>Marca</th>
            <th>Formato</th>
            <th>Prezzo confezione</th>
            <th>Quantità</th>
            <th>Totale riga</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {articoli.map((a) => (
            <tr key={a.product_id}>
              <td className="marca-cell">{a.marca}</td>
              <td>{a.formato || "—"}</td>
              <td className="prezzo-cell">{formatEuro(a.prezzo_confezione)}</td>
              <td>
                <input
                  type="number"
                  min={1}
                  className="quantity-input"
                  value={a.quantita}
                  onChange={(e) => handleQuantityChange(a.product_id, e.target.value)}
                />
              </td>
              <td className="prezzo-cell prezzo-singolo">{formatEuro(a.prezzo_totale_riga)}</td>
              <td>
                <button className="link-button" onClick={() => handleRemove(a.product_id)}>
                  Rimuovi
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="wishlist-total">
        Totale complessivo: <strong>{formatEuro(totale)}</strong>
      </div>
    </>
  );
}
