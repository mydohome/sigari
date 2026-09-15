import React, { useEffect, useState } from "react";
import {
  fetchBackups,
  createBackup,
  deleteBackup,
  restoreBackup,
  fetchAppVersion,
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  fetchHaIntegration,
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

function LocationManager() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuovoNome, setNuovoNome] = useState("");
  const [nuovoColore, setNuovoColore] = useState("#8b5e34");
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState(null);
  const [modificaId, setModificaId] = useState(null);
  const [modificaNome, setModificaNome] = useState("");
  const [modificaColore, setModificaColore] = useState("#8b5e34");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchLocations();
      setLocations(data.locations || []);
    } catch (err) {
      setErrore(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAggiungi(e) {
    e.preventDefault();
    if (!nuovoNome.trim()) return;
    setSalvando(true);
    setErrore(null);
    try {
      await createLocation(nuovoNome.trim(), nuovoColore);
      setNuovoNome("");
      setNuovoColore("#8b5e34");
      await load();
    } catch (err) {
      setErrore(err.message);
    } finally {
      setSalvando(false);
    }
  }

  function iniziaModifica(loc) {
    setModificaId(loc.id);
    setModificaNome(loc.nome);
    setModificaColore(loc.colore);
  }

  async function salvaModifica() {
    setErrore(null);
    try {
      await updateLocation(modificaId, { nome: modificaNome.trim(), colore: modificaColore });
      setModificaId(null);
      await load();
    } catch (err) {
      setErrore(err.message);
    }
  }

  async function handleElimina(loc) {
    if (
      !window.confirm(
        `Eliminare la location "${loc.nome}"? I lotti che la usano resteranno senza location.`
      )
    )
      return;
    setErrore(null);
    try {
      await deleteLocation(loc.id);
      await load();
    } catch (err) {
      setErrore(err.message);
    }
  }

  return (
    <div className="location-manager">
      {errore && <p className="error-msg small">{errore}</p>}
      {loading ? (
        <p className="status-msg small">Caricamento location...</p>
      ) : locations.length === 0 ? (
        <p className="status-msg small">Nessuna location definita.</p>
      ) : (
        <ul className="location-list">
          {locations.map((loc) => (
            <li key={loc.id}>
              {modificaId === loc.id ? (
                <>
                  <input
                    type="color"
                    value={modificaColore}
                    onChange={(e) => setModificaColore(e.target.value)}
                  />
                  <input
                    type="text"
                    value={modificaNome}
                    onChange={(e) => setModificaNome(e.target.value)}
                  />
                  <button type="button" className="link-button" onClick={salvaModifica}>
                    Salva
                  </button>
                  <button type="button" className="link-button" onClick={() => setModificaId(null)}>
                    Annulla
                  </button>
                </>
              ) : (
                <>
                  <span className="location-badge" style={{ "--location-colore": loc.colore }}>
                    {loc.nome}
                  </span>
                  <button type="button" className="link-button" onClick={() => iniziaModifica(loc)}>
                    Modifica
                  </button>
                  <button type="button" className="link-button" onClick={() => handleElimina(loc)}>
                    Elimina
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <form className="location-add-form" onSubmit={handleAggiungi}>
        <input type="color" value={nuovoColore} onChange={(e) => setNuovoColore(e.target.value)} />
        <input
          type="text"
          placeholder="Nuova location (es. Cantina)"
          value={nuovoNome}
          onChange={(e) => setNuovoNome(e.target.value)}
        />
        <button type="submit" disabled={salvando || !nuovoNome.trim()}>
          {salvando ? "Aggiungo..." : "Aggiungi location"}
        </button>
      </form>
    </div>
  );
}

// Stato e snippet pronti per collegare Home Assistant: un sensore REST che
// legge le statistiche dell'humidor, e un'automazione che invia la
// temperatura rilevata da un sensore HA verso una location. L'API key è
// configurata via HA_API_KEY sul server (come ADMIN_TOKEN): qui viene solo
// letta e mostrata, non generata né modificata.
function HaIntegrationCard() {
  const [stato, setStato] = useState(null);
  const [errore, setErrore] = useState(null);
  const [mostraChiave, setMostraChiave] = useState(false);
  const [copiato, setCopiato] = useState(null);

  useEffect(() => {
    fetchHaIntegration()
      .then(setStato)
      .catch((err) => setErrore(err.message));
  }, []);

  async function copia(testo, id) {
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(id);
      setTimeout(() => setCopiato(null), 1500);
    } catch {
      /* clipboard non disponibile (es. contesto non sicuro): l'utente può selezionare a mano */
    }
  }

  if (errore) return <p className="error-msg small">{errore}</p>;
  if (!stato) return <p className="status-msg small">Caricamento...</p>;

  if (!stato.configurata) {
    return (
      <p className="status-msg small">
        Non configurata. Imposta <code>HA_API_KEY</code> nel file <code>.env</code> sul server
        (genera un valore con <code>openssl rand -hex 32</code>) e rilancia{" "}
        <code>./update.sh</code>.
      </p>
    );
  }

  const origin = window.location.origin;
  const urlStats = `${origin}/api/ha/stats`;
  const urlTemp = `${origin}/api/ha/location-temp`;

  const snippetStats = `sensor:
  - platform: rest
    name: Sigari in humidor
    resource: ${urlStats}
    method: GET
    headers:
      x-api-key: ${stato.api_key}
    value_template: "{{ value_json.totale_sigari }}"
    json_attributes:
      - valore_humidor
      - per_location
    scan_interval: 900`;

  const snippetTemp = `rest_command:
  invia_temperatura_humidor:
    url: ${urlTemp}
    method: POST
    headers:
      x-api-key: ${stato.api_key}
      content-type: application/json
    payload: '{"location": "Humidor", "temperatura": {{ states("sensor.TUO_SENSORE_TEMPERATURA") }}}'

automation:
  - alias: Invia temperatura humidor a Sigari Track
    trigger:
      - platform: state
        entity_id: sensor.TUO_SENSORE_TEMPERATURA
    action:
      - service: rest_command.invia_temperatura_humidor`;

  return (
    <div className="ha-integration">
      <div className="ha-integration-key">
        <span>API key:</span>
        <code>{mostraChiave ? stato.api_key : "•".repeat(20)}</code>
        <button type="button" className="link-button" onClick={() => setMostraChiave((v) => !v)}>
          {mostraChiave ? "Nascondi" : "Mostra"}
        </button>
        <button type="button" className="link-button" onClick={() => copia(stato.api_key, "key")}>
          {copiato === "key" ? "Copiata ✓" : "Copia"}
        </button>
      </div>

      <p className="status-msg small">
        <strong>Statistiche verso HA</strong> — sensore REST da incollare nel{" "}
        <code>configuration.yaml</code> di Home Assistant, con il numero di sigari in humidor:
      </p>
      <pre className="ha-snippet">{snippetStats}</pre>
      <button type="button" className="link-button" onClick={() => copia(snippetStats, "stats")}>
        {copiato === "stats" ? "Copiato ✓" : "Copia snippet"}
      </button>

      <p className="status-msg small">
        <strong>Temperatura verso Sigari Track</strong> — automazione HA che invia la temperatura
        di un sensore alla location "Humidor" ogni volta che cambia (sostituisci{" "}
        <code>sensor.TUO_SENSORE_TEMPERATURA</code> con l'entità reale):
      </p>
      <pre className="ha-snippet">{snippetTemp}</pre>
      <button type="button" className="link-button" onClick={() => copia(snippetTemp, "temp")}>
        {copiato === "temp" ? "Copiato ✓" : "Copia snippet"}
      </button>
    </div>
  );
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

      <h2>Configurazione</h2>
      <p className="status-msg small">
        Location dove conservi i sigari (Humidor, Giara, Vetro, ...): usale per organizzare gli
        acquisti. "Humidor" viene proposta di default quando registri un nuovo acquisto.
      </p>
      <LocationManager />

      <h2>Integrazione Home Assistant</h2>
      <p className="status-msg small">
        Esponi il numero di sigari in humidor su una dashboard HA, e ricevi da HA la temperatura
        rilevata da un sensore per la location "Humidor". La connessione è sempre iniziata da HA
        (mai da questa app), così funziona anche se il server resta in una rete separata.
      </p>
      <HaIntegrationCard />

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
