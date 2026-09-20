import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import StarRating from "./StarRating.jsx";
import { fetchHumidorItems, addFumata, updateFumata, saveHumidorReview } from "../api.js";

function formatData(dateStr) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("it-IT").format(new Date(dateStr));
}

function oggi() {
  return new Date().toISOString().slice(0, 10);
}

// `fumata`, se presente, mette il modal in modalita' modifica di una fumata
// gia' registrata (niente selezione sigaro, niente recensione a fine form).
export default function FumataModal({ fumata, onClose, onSaved }) {
  const isModifica = Boolean(fumata);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(!isModifica);
  const [itemId, setItemId] = useState("");
  const [quantita, setQuantita] = useState(fumata?.quantita ?? 1);
  const [dataFumata, setDataFumata] = useState(fumata?.data_fumata ? fumata.data_fumata.slice(0, 10) : oggi());
  const [oraInizio, setOraInizio] = useState(fumata?.ora_inizio ? fumata.ora_inizio.slice(0, 5) : "");
  const [oraFine, setOraFine] = useState(fumata?.ora_fine ? fumata.ora_fine.slice(0, 5) : "");
  const [riaccensioni, setRiaccensioni] = useState(fumata?.riaccensioni ?? "");
  const [registrando, setRegistrando] = useState(false);
  const [errore, setErrore] = useState(null);

  const [fumataFatta, setFumataFatta] = useState(null); // { product_id, marca, formato }
  const [stelle, setStelle] = useState(null);
  const [descrizione, setDescrizione] = useState("");
  const [salvandoRecensione, setSalvandoRecensione] = useState(false);
  const [recensioneSalvata, setRecensioneSalvata] = useState(false);

  useEffect(() => {
    if (isModifica) return;
    fetchHumidorItems()
      .then((data) => setItems((data.items || []).filter((it) => it.quantita_rimanente > 0)))
      .finally(() => setLoading(false));
  }, [isModifica]);

  function datiOrari() {
    return {
      quantita: Math.max(1, parseInt(quantita, 10) || 1),
      data_fumata: dataFumata,
      ora_inizio: oraInizio || null,
      ora_fine: oraFine || null,
      riaccensioni: riaccensioni === "" ? null : Math.max(0, parseInt(riaccensioni, 10) || 0),
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrore(null);
    setRegistrando(true);
    try {
      if (isModifica) {
        await updateFumata(fumata.id, datiOrari());
        onSaved();
        onClose();
        return;
      }
      if (!itemId) return;
      await addFumata({ humidor_item_id: Number(itemId), ...datiOrari() });
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

  const oraFineNonValida = oraInizio && oraFine && oraFine < oraInizio;

  return (
    <Modal title={isModifica ? "Modifica fumata" : "Registra una fumata"} onClose={onClose}>
      {!isModifica && loading ? (
        <p className="status-msg">Caricamento humidor...</p>
      ) : !isModifica && items.length === 0 ? (
        <p className="status-msg">Il tuo humidor è vuoto: aggiungi prima un acquisto.</p>
      ) : (
        <form className="humidor-form" onSubmit={handleSubmit}>
          {isModifica ? (
            <p className="status-msg small">
              {fumata.marca} {fumata.formato ? `— ${fumata.formato}` : ""}
            </p>
          ) : (
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
          )}
          <div className="humidor-form-row">
            <label>
              Quantità
              <input type="number" min="1" value={quantita} onChange={(e) => setQuantita(e.target.value)} />
            </label>
            <label>
              Data
              <input
                type="date"
                required
                value={dataFumata}
                onChange={(e) => setDataFumata(e.target.value)}
              />
            </label>
          </div>
          <div className="humidor-form-row">
            <label>
              Ora inizio (facoltativo)
              <input type="time" value={oraInizio} onChange={(e) => setOraInizio(e.target.value)} />
            </label>
            <label>
              Ora fine (facoltativo)
              <input type="time" value={oraFine} onChange={(e) => setOraFine(e.target.value)} />
            </label>
            <label>
              Riaccensioni
              <input
                type="number"
                min="0"
                placeholder="0"
                value={riaccensioni}
                onChange={(e) => setRiaccensioni(e.target.value)}
              />
            </label>
          </div>
          {oraFineNonValida && (
            <p className="error-msg small">L'ora di fine non può essere precedente all'ora di inizio.</p>
          )}
          {errore && <p className="error-msg small">{errore}</p>}
          <button type="submit" disabled={registrando || oraFineNonValida}>
            {registrando ? "Salvo..." : isModifica ? "Salva modifiche" : "Registra fumata"}
          </button>
        </form>
      )}
    </Modal>
  );
}
