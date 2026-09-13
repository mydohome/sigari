import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import StarRating from "./StarRating.jsx";
import { fetchHumidorItems, addFumata, saveHumidorReview } from "../api.js";

function formatData(dateStr) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("it-IT").format(new Date(dateStr));
}

export default function FumataModal({ onClose, onSaved }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemId, setItemId] = useState("");
  const [quantita, setQuantita] = useState(1);
  const [registrando, setRegistrando] = useState(false);
  const [errore, setErrore] = useState(null);

  const [fumataFatta, setFumataFatta] = useState(null); // { product_id, marca, formato }
  const [stelle, setStelle] = useState(null);
  const [descrizione, setDescrizione] = useState("");
  const [salvandoRecensione, setSalvandoRecensione] = useState(false);
  const [recensioneSalvata, setRecensioneSalvata] = useState(false);

  useEffect(() => {
    fetchHumidorItems()
      .then((data) => setItems((data.items || []).filter((it) => it.quantita_rimanente > 0)))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!itemId) return;
    setErrore(null);
    setRegistrando(true);
    try {
      await addFumata({ humidor_item_id: Number(itemId), quantita: Math.max(1, parseInt(quantita, 10) || 1) });
      const scelto = items.find((it) => String(it.id) === String(itemId));
      onSaved();
      setFumataFatta(scelto);
    } catch (err) {
      setErrore(err.message);
    } finally {
      setRegistrando(false);
    }
  }

  async function handleSalvaRecensione() {
    setSalvandoRecensione(true);
    try {
      await saveHumidorReview(fumataFatta.product_id, { stelle, descrizione: descrizione.trim() || null });
      setRecensioneSalvata(true);
      setTimeout(onClose, 900);
    } finally {
      setSalvandoRecensione(false);
    }
  }

  if (fumataFatta) {
    return (
      <Modal title="Fumata registrata 🔥" onClose={onClose}>
        <p className="status-msg">
          <strong>
            {fumataFatta.marca} {fumataFatta.formato ? `— ${fumataFatta.formato}` : ""}
          </strong>{" "}
          tolto dall'humidor. Vuoi lasciare una recensione veloce?
        </p>
        <div className="humidor-review-editor">
          <StarRating value={stelle} onChange={setStelle} size="1.6rem" />
          <textarea
            placeholder="Note personali sul sigaro (facoltativo)"
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            rows={2}
          />
          <div className="humidor-review-actions">
            <button type="button" onClick={handleSalvaRecensione} disabled={salvandoRecensione}>
              {salvandoRecensione ? "Salvo..." : "Salva recensione"}
            </button>
            <button type="button" className="link-button" onClick={onClose}>
              Salta
            </button>
            {recensioneSalvata && <span className="status-msg small">Salvata ✓</span>}
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Registra una fumata" onClose={onClose}>
      {loading ? (
        <p className="status-msg">Caricamento humidor...</p>
      ) : items.length === 0 ? (
        <p className="status-msg">Il tuo humidor è vuoto: aggiungi prima un acquisto.</p>
      ) : (
        <form className="humidor-form" onSubmit={handleSubmit}>
          <label>
            Cosa hai fumato?
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} required>
              <option value="">Scegli dall'humidor...</option>
              {items.map((it) => (
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
            <input type="number" min="1" value={quantita} onChange={(e) => setQuantita(e.target.value)} />
          </label>
          {errore && <p className="error-msg small">{errore}</p>}
          <button type="submit" disabled={registrando}>
            {registrando ? "Registro..." : "Registra fumata"}
          </button>
        </form>
      )}
    </Modal>
  );
}
