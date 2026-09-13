import React, { useEffect, useState } from "react";
import {
  fetchBackups,
  createBackup,
  deleteBackup,
  restoreBackup,
  fetchAppVersion,
} from "../api.js";
import { authHeaders } from "../auth.js";

function formatDataOra(dateStr) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(dateStr)
  );
}

function formatDimensione(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SettingsTab() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [azioneInCorso, setAzioneInCorso] = useState(null); // filename in corso
  const [messaggio, setMessaggio] = useState(null);
  const [errore, setErrore] = useState(null);
  const [versione, setVersione] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchBackups();
      setBackups(data.backups || []);
    } catch (err) {
      setErrore(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    fetchAppVersion()
      .then(setVersione)
      .catch(() => setVersione(null));
  }, []);

  async function handleCreaBackup() {
    setCreando(true);
    setErrore(null);
    setMessaggio(null);
    try {
      await createBackup();
      setMessaggio("Backup creato.");
      await load();
    } catch (err) {
      setErrore(err.message);
    } finally {
      setCreando(false);
    }
  }

  async function handleScarica(filename) {
    try {
      const res = await fetch(`/api/settings/backups/${encodeURIComponent(filename)}`, {
        headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error("Errore nel download del backup.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrore(err.message);
    }
  }

  async function handleElimina(filename) {
    if (!window.confirm(`Eliminare definitivamente il backup "${filename}"?`)) return;
    setAzioneInCorso(filename);
    try {
      await deleteBackup(filename);
      await load();
    } catch (err) {
      setErrore(err.message);
    } finally {
      setAzioneInCorso(null);
    }
  }

  async function handleRipristina(filename) {
    if (
      !window.confirm(
        `Ripristinare l'humidor allo stato del backup "${filename}"?\n\n` +
          "I dati attuali (acquisti, fumate, recensioni, preferiti, wishlist) verranno " +
          "sostituiti con quelli del backup. Verrà comunque creato automaticamente un " +
          "backup di sicurezza dello stato attuale prima di procedere."
      )
    )
      return;
    setAzioneInCorso(filename);
    setErrore(null);
    setMessaggio(null);
    try {
      const res = await restoreBackup(filename);
      setMessaggio(
        `Ripristino completato. Backup di sicurezza dello stato precedente: ${res.backup_di_sicurezza}.`
      );
      await load();
    } catch (err) {
      setErrore(err.message);
    } finally {
      setAzioneInCorso(null);
    }
  }

  return (
    <div className="settings">
      <h2>Versione app</h2>
      {versione ? (
        <div className="version-box">
          <p>
            Versione in esecuzione: <code>{versione.corrente}</code>
          </p>
          {versione.errore && <p className="status-msg small">{versione.errore}</p>}
          {versione.ultimo && (
            <>
              <p>
                Ultima versione su GitHub: <code>{versione.ultimo.sha}</code> —{" "}
                {versione.ultimo.messaggio}
              </p>
              {versione.aggiornato ? (
                <p className="hint-msg hint-good">Sei aggiornato all'ultima versione.</p>
              ) : (
                <p className="hint-msg hint-warn">
                  È disponibile una nuova versione. Per aggiornare, collegati via SSH al server ed
                  esegui <code>./update.sh</code> nella cartella del progetto.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="status-msg small">Verifica versione non disponibile.</p>
      )}

      <h2>Backup humidor</h2>
      <p className="status-msg small">
        Il backup include i tuoi dati personali (acquisti, fumate, recensioni, preferiti,
        wishlist e account) — non il catalogo prezzi, sempre ricostruibile dal listino ufficiale.
      </p>

      <button type="button" onClick={handleCreaBackup} disabled={creando}>
        {creando ? "Creo backup..." : "Crea backup ora"}
      </button>

      {messaggio && <p className="hint-msg hint-good">{messaggio}</p>}
      {errore && <p className="error-msg">{errore}</p>}

      {loading ? (
        <p className="status-msg">Caricamento backup...</p>
      ) : backups.length === 0 ? (
        <p className="status-msg">Nessun backup ancora creato.</p>
      ) : (
        <table className="results-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Dimensione</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.filename}>
                <td>{formatDataOra(b.creato_il)}</td>
                <td>{formatDimensione(b.dimensione)}</td>
                <td className="actions-cell">
                  <button className="link-button" onClick={() => handleScarica(b.filename)}>
                    Scarica
                  </button>
                  <button
                    className="link-button"
                    disabled={azioneInCorso === b.filename}
                    onClick={() => handleRipristina(b.filename)}
                  >
                    Ripristina
                  </button>
                  <button
                    className="link-button"
                    disabled={azioneInCorso === b.filename}
                    onClick={() => handleElimina(b.filename)}
                  >
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
