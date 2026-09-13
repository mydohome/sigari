import React, { useState } from "react";
import Modal from "./Modal.jsx";
import ProductPicker from "./ProductPicker.jsx";
import ShopPicker from "./ShopPicker.jsx";
import { addHumidorItem, updateHumidorItem } from "../api.js";

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

// Usato sia per registrare un nuovo acquisto (senza `item`) sia per
// modificarne uno esistente (passando `item`): in modifica il sigaro non è
// cambiabile, solo prezzo/data/tabaccheria/note.
export default function PurchaseModal({ item, onClose, onSaved }) {
  const editing = Boolean(item);
  const [prodottoScelto, setProdottoScelto] = useState(null);
  const [prezzo, setPrezzo] = useState(editing ? item.prezzo_acquisto : "");
  const [dataAcquisto, setDataAcquisto] = useState(editing ? item.data_acquisto?.slice(0, 10) : oggi());
  const [quantita, setQuantita] = useState(1);
  const [shop, setShop] = useState(
    editing ? { id: item.shop_id, nome: item.shop_nome || "" } : { nome: "" }
  );
  const [note, setNote] = useState(editing ? item.note || "" : "");
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState(null);
  const [avvisoPrezzo, setAvvisoPrezzo] = useState(null);
  const [fatto, setFatto] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrore(null);

    if (!editing && !prodottoScelto) {
      setErrore("Scegli un sigaro dall'elenco.");
      return;
    }

    setSalvando(true);
    try {
      if (editing) {
        await updateHumidorItem(item.id, {
          prezzo_acquisto: Number(prezzo),
          data_acquisto: dataAcquisto,
          note: note.trim() || null,
          shop: shop?.nome?.trim() ? shop : null,
        });
        onSaved();
        onClose();
      } else {
        const res = await addHumidorItem({
          product_id: prodottoScelto.product_id,
          prezzo_acquisto: Number(prezzo),
          data_acquisto: dataAcquisto,
          quantita: Math.max(1, parseInt(quantita, 10) || 1),
          shop: shop?.nome?.trim() ? shop : null,
        });
        onSaved();
        if (res.confronto_prezzo) {
          setAvvisoPrezzo(res.confronto_prezzo);
          setFatto(true);
        } else {
          onClose();
        }
      }
    } catch (err) {
      setErrore(err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (fatto) {
    return (
      <Modal title="Acquisto aggiunto" onClose={onClose}>
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
        <button type="button" onClick={onClose}>
          Fatto
        </button>
      </Modal>
    );
  }

  return (
    <Modal title={editing ? "Modifica acquisto" : "Aggiungi acquisto"} onClose={onClose}>
      <form className="humidor-form" onSubmit={handleSubmit}>
        {editing ? (
          <p className="status-msg">
            <strong>
              {item.marca} {item.formato ? `— ${item.formato}` : ""}
            </strong>
          </p>
        ) : (
          <ProductPicker selected={prodottoScelto} onSelect={setProdottoScelto} />
        )}
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
          {!editing && (
            <label>
              Quantità
              <input
                type="number"
                min="1"
                value={quantita}
                onChange={(e) => setQuantita(e.target.value)}
              />
            </label>
          )}
        </div>
        <ShopPicker value={shop?.nome || ""} onChange={setShop} />
        {editing && (
          <label>
            Note
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        )}
        {errore && <p className="error-msg small">{errore}</p>}
        <button type="submit" disabled={salvando}>
          {salvando ? "Salvo..." : editing ? "Salva modifiche" : "Aggiungi all'humidor"}
        </button>
      </form>
    </Modal>
  );
}
