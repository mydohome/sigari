import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Box,
  Check,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  FileSpreadsheet,
  HardDrive,
  LogOut,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  User,
} from "lucide-react";
import type { BackupInfo, HumidorLocation } from "../types/cigar";
import * as api from "../lib/api";
import { cardClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "./ui";

type Sezione = null | "account" | "locations" | "excel" | "homeassistant" | "backups";

interface SettingsTabProps {
  locations: HumidorLocation[];
  userEmail: string;
  onRefreshData: () => Promise<void>;
  onLogout: () => void;
  notify: (messaggio: string) => void;
}

const COLORI_PREDEFINITI = [
  { nome: "Cedro", hex: "#8b5e34" },
  { nome: "Vetro", hex: "#4a90d9" },
  { nome: "Giara", hex: "#5aa469" },
  { nome: "Bordeaux", hex: "#8e2f2f" },
  { nome: "Oro", hex: "#c99757" },
  { nome: "Ardesia", hex: "#6b7280" },
];

const messaggioErrore = (err: unknown) => (err instanceof Error ? err.message : "Operazione non riuscita.");

const formatDataOra = (data: string | null | undefined) =>
  data
    ? new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data))
    : "—";

const formatDimensione = (byte: number) =>
  byte < 1024 * 1024 ? `${Math.max(1, Math.round(byte / 1024))} KB` : `${(byte / 1024 / 1024).toFixed(1)} MB`;

export const SettingsTab: React.FC<SettingsTabProps> = ({ locations, userEmail, onRefreshData, onLogout, notify }) => {
  const [sezione, setSezione] = useState<Sezione>(null);

  // --- Versione ---
  const [versione, setVersione] = useState<api.InfoVersione | null>(null);

  // --- Location ---
  const [modificaId, setModificaId] = useState<number | null>(null);
  const [modificaNome, setModificaNome] = useState("");
  const [modificaColore, setModificaColore] = useState("#8b5e34");
  const [nuovoNome, setNuovoNome] = useState("");
  const [nuovoColore, setNuovoColore] = useState("#8b5e34");

  // --- Excel ---
  const [esportando, setEsportando] = useState<string | null>(null);

  // --- Home Assistant ---
  const [ha, setHa] = useState<{ configurata: boolean; api_key: string | null } | null>(null);
  const [mostraChiave, setMostraChiave] = useState(false);
  const [copiato, setCopiato] = useState<string | null>(null);

  // --- Backup ---
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [backupInCorso, setBackupInCorso] = useState<string | null>(null);

  const caricaBackup = useCallback(async () => {
    try {
      setBackups(await api.fetchBackup());
    } catch (err) {
      notify(messaggioErrore(err));
    }
  }, [notify]);

  // Dati caricati una volta sola, in modo che i riquadri dell'indice mostrino gia' lo stato
  useEffect(() => {
    api.fetchVersione().then(setVersione).catch(() => setVersione(null));
    api.fetchIntegrazioneHA().then(setHa).catch(() => setHa(null));
    caricaBackup();
  }, [caricaBackup]);

  const esegui = async (azione: () => Promise<unknown>, ok?: string): Promise<boolean> => {
    try {
      await azione();
      if (ok) notify(ok);
      return true;
    } catch (err) {
      notify(messaggioErrore(err));
      return false;
    }
  };

  const copia = async (testo: string, chiave: string) => {
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(chiave);
      window.setTimeout(() => setCopiato(null), 2000);
    } catch {
      notify("Copia non riuscita: seleziona il testo e copialo a mano.");
    }
  };

  // ----- Location -----
  const aggiungiLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = nuovoNome.trim();
    if (!nome) return;
    if (await esegui(() => api.creaLocation(nome, nuovoColore), "Location creata.")) {
      setNuovoNome("");
      await onRefreshData();
    }
  };

  const salvaLocation = async () => {
    if (modificaId === null) return;
    if (await esegui(() => api.modificaLocation(modificaId, { nome: modificaNome.trim(), colore: modificaColore }), "Location aggiornata.")) {
      setModificaId(null);
      await onRefreshData();
    }
  };

  const eliminaLocation = async (loc: HumidorLocation) => {
    if (!window.confirm(`Eliminare la location "${loc.nome}"? I lotti che la usano resteranno senza location.`)) return;
    if (await esegui(() => api.eliminaLocation(loc.id), "Location eliminata.")) await onRefreshData();
  };

  // ----- Backup -----
  const creaBackup = async () => {
    setBackupInCorso("nuovo");
    if (await esegui(() => api.creaBackup(), "Backup creato con successo!")) await caricaBackup();
    setBackupInCorso(null);
  };

  const ripristina = async (filename: string) => {
    if (
      !window.confirm(
        `Ripristinare l'humidor allo stato del backup "${filename}"?\n\n` +
          "I dati attuali (acquisti, fumate, schede, preferiti, wishlist) verranno sostituiti con quelli del backup. " +
          "Prima di procedere viene creato automaticamente un backup di sicurezza dello stato attuale."
      )
    )
      return;
    setBackupInCorso(filename);
    try {
      const r = await api.ripristinaBackup(filename);
      notify(`Ripristino completato. Backup di sicurezza: ${r.backup_di_sicurezza}.`);
      await caricaBackup();
      await onRefreshData();
    } catch (err) {
      notify(messaggioErrore(err));
    } finally {
      setBackupInCorso(null);
    }
  };

  const eliminaBackup = async (filename: string) => {
    if (!window.confirm(`Eliminare definitivamente il backup "${filename}"?`)) return;
    setBackupInCorso(filename);
    if (await esegui(() => api.eliminaBackup(filename), "Backup eliminato.")) await caricaBackup();
    setBackupInCorso(null);
  };

  // ----- Home Assistant -----
  const origin = window.location.origin;
  const chiaveHa = ha?.api_key ?? "";
  const snippetAbilita = `homeassistant:\n  packages: !include_dir_named packages`;
  // Un solo package: tutta l'integrazione sta in un file rimovibile. Nessuna chiave di primo livello
  // nel contenuto: con !include_dir_named e' il nome del file a fare da nome del pacchetto.
  const snippetPackage = `sensor:
  - platform: rest
    name: Sigari in humidor
    resource: ${origin}/api/ha/stats
    method: GET
    headers:
      x-api-key: ${chiaveHa}
    value_template: "{{ value_json.totale_sigari }}"
    json_attributes:
      - valore_humidor
      - per_location
    scan_interval: 900

rest_command:
  invia_temperatura_humidor:
    url: ${origin}/api/ha/location-temp
    method: POST
    headers:
      x-api-key: ${chiaveHa}
      content-type: application/json
    payload: '{"location": "Humidor", "temperatura": {{ states("sensor.TUO_SENSORE_TEMPERATURA") }}}'
  invia_umidita_humidor:
    url: ${origin}/api/ha/location-humidity
    method: POST
    headers:
      x-api-key: ${chiaveHa}
      content-type: application/json
    payload: '{"location": "Humidor", "umidita": {{ states("sensor.TUO_SENSORE_UMIDITA") }}}'

automation:
  - alias: Invia temperatura humidor a Sigari Track
    trigger:
      - platform: state
        entity_id: sensor.TUO_SENSORE_TEMPERATURA
    action:
      - service: rest_command.invia_temperatura_humidor
  - alias: Invia umidità humidor a Sigari Track
    trigger:
      - platform: state
        entity_id: sensor.TUO_SENSORE_UMIDITA
    action:
      - service: rest_command.invia_umidita_humidor`;

  // ----- Interfaccia -----
  const riquadri = [
    {
      id: "account" as const,
      titolo: "Account & Versione",
      badge: versione?.aggiornato === false ? "Aggiornamento disponibile" : "Versione",
      badgeClass:
        versione?.aggiornato === false
          ? "bg-amber-950/60 text-amber-300 border-amber-800"
          : "bg-[#231b17] text-[#f5ebd9] border-[#3a2c24]",
      icona: User,
      coloreIcona: "text-[#c99757]",
      dettaglio: userEmail,
      descrizione: "Utente collegato, uscita dall'app e controllo dell'ultima versione disponibile su GitHub.",
    },
    {
      id: "locations" as const,
      titolo: "Location & Microclima",
      badge: `${locations.length} contenitori`,
      badgeClass: "bg-[#271d18] text-[#c99757] border-[#382b24]",
      icona: Box,
      coloreIcona: "text-[#c99757]",
      dettaglio: "Humidor, giare, vetri e altri contenitori",
      descrizione:
        "Crea, rinomina e colora i contenitori in cui conservi i sigari. Temperatura e umidità arrivano da Home Assistant.",
    },
    {
      id: "excel" as const,
      titolo: "Esportazione Excel",
      badge: "XLSX",
      badgeClass: "bg-[#2a1d12] text-[#d9aa6b] border-[#593d25]",
      icona: FileSpreadsheet,
      coloreIcona: "text-amber-400",
      dettaglio: "Sigari posseduti · Fumate",
      descrizione: "Scarica l'inventario dell'humidor e il diario delle fumate in un foglio di calcolo.",
    },
    {
      id: "homeassistant" as const,
      titolo: "Home Assistant & Sensori",
      badge: ha?.configurata ? "Attiva" : "Non configurata",
      badgeClass: ha?.configurata
        ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
        : "bg-[#221815] text-[#8c7e75] border-[#382b24]",
      icona: Radio,
      coloreIcona: "text-sky-400",
      dettaglio: ha?.configurata ? "Chiave API impostata" : "Nessuna chiave sul server",
      descrizione: "Collega i termoigrometri via HTTP: chiave API, snippet YAML pronti da copiare.",
    },
    {
      id: "backups" as const,
      titolo: "Backup & Ripristino",
      badge: `${backups.length} archivi`,
      badgeClass: "bg-[#231b17] text-[#f5ebd9] border-[#3a2c24]",
      icona: HardDrive,
      coloreIcona: "text-[#d9aa6b]",
      dettaglio: backups[0] ? `Ultimo: ${formatDataOra(backups[0].creato_il)}` : "Nessun backup salvato",
      descrizione: "Copia di sicurezza dei tuoi dati (acquisti, fumate, schede, preferiti, wishlist) e ripristino.",
    },
  ];

  const barraSuperiore = (titolo: string, sottotitolo: string) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#291f1a]">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSezione(null)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#f5ebd9] bg-[#221a16] hover:bg-[#2d221d] border border-[#3d2e26] hover:border-[#c99757] rounded-xl transition-all shadow-sm active:scale-95 group shrink-0"
          title="Torna all'indice delle impostazioni"
        >
          <ArrowLeft className="w-4 h-4 text-[#c99757] group-hover:-translate-x-1 transition-transform" />
          <span>Indietro</span>
        </button>
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8c7e75] font-mono">
            <span>Impostazioni</span>
            <span>/</span>
            <span className="text-[#c99757] font-semibold">{titolo}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#faf3ea] mt-0.5">{titolo}</h2>
        </div>
      </div>
      <span className="text-xs text-[#8c7e75] italic">{sottotitolo}</span>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Main Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#faf3ea] flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-[#c99757]" />
            <span>Impostazioni & Strumenti</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#8c7e75] mt-0.5">
            Location, esportazione Excel, Home Assistant, backup e versione dell'app
          </p>
        </div>
        {sezione && (
          <button
            onClick={() => setSezione(null)}
            className="self-start sm:self-auto text-xs text-[#c99757] hover:text-[#f5ebd9] underline flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Menu Principale Impostazioni</span>
          </button>
        )}
      </div>

      {/* INDICE */}
      {sezione === null && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {riquadri.map((r) => {
            const Icona = r.icona;
            return (
              <button
                key={r.id}
                onClick={() => setSezione(r.id)}
                className="group text-left p-5 rounded-2xl bg-[#181311] border border-[#2e231e] hover:border-[#c99757] transition-all hover:shadow-xl hover:shadow-black/40 flex flex-col justify-between active:scale-[0.99] focus:outline-none"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#221814] border border-[#382a22] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-[#c99757] transition-all">
                        <Icona className={`w-5 h-5 ${r.coloreIcona}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base text-[#faf3ea] group-hover:text-[#c99757] transition-colors">
                          {r.titolo}
                        </h3>
                        <span className="text-[11px] text-[#7d6f66] block font-mono truncate">{r.dettaglio}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border shrink-0 font-medium ${r.badgeClass}`}>
                      {r.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#a3948b] leading-relaxed line-clamp-2 mt-1">{r.descrizione}</p>
                </div>
                <div className="pt-3 mt-3 border-t border-[#231a15] flex items-center justify-between text-xs font-semibold text-[#c99757] group-hover:text-[#f5ebd9]">
                  <span>Apri sezione</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ACCOUNT & VERSIONE */}
      {sezione === "account" && (
        <div className={`${cardClass} space-y-6`}>
          {barraSuperiore("Account & Versione", "Utente collegato e aggiornamenti")}

          <div className="p-4 rounded-xl bg-[#130f0d] border border-[#271d18] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-[#7d6f66] block">Collegato come</span>
              <span className="text-sm font-semibold text-[#f5ebd9]">{userEmail}</span>
            </div>
            <button onClick={onLogout} className={secondaryButtonClass}>
              <LogOut className="w-3.5 h-3.5 text-[#c99757]" />
              <span>Esci</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[#130f0d] border border-[#271d18] space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#8c7e75]">Versione in esecuzione</span>
              <code className="font-mono text-[#f5ebd9] bg-[#1b1411] px-2 py-0.5 rounded">{versione?.corrente ?? "—"}</code>
            </div>
            {versione?.ultimo && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-[#8c7e75] shrink-0">Ultima su GitHub</span>
                <span className="text-right text-[#c4b5a8]">
                  <code className="font-mono text-[#f5ebd9] bg-[#1b1411] px-2 py-0.5 rounded">{versione.ultimo.sha}</code>
                  <span className="block mt-1">{versione.ultimo.messaggio}</span>
                </span>
              </div>
            )}
            {versione?.errore && <p className="text-[#8c7e75]">{versione.errore}</p>}
            {versione?.aggiornato === true && (
              <p className="text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> L'app è aggiornata.
              </p>
            )}
            {versione?.aggiornato === false && (
              <p className="text-amber-300 bg-amber-950/30 border border-amber-900/50 rounded-lg px-3 py-2">
                È disponibile una nuova versione. Per aggiornare, collegati via SSH al server ed esegui{" "}
                <code className="font-mono text-[#f5ebd9]">./update.sh</code> nella cartella del progetto.
              </p>
            )}
          </div>
        </div>
      )}

      {/* LOCATION */}
      {sezione === "locations" && (
        <div className={`${cardClass} space-y-6`}>
          {barraSuperiore("Location & Microclima", "Contenitori fisici e sensori")}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {locations.map((loc) => (
              <div key={loc.id} className="p-4 rounded-xl bg-[#130f0d] border border-[#271d18] flex flex-col justify-between">
                {modificaId === loc.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-[#8c7e75] uppercase block mb-1">Nome Location</label>
                      <input
                        type="text"
                        value={modificaNome}
                        onChange={(e) => setModificaNome(e.target.value)}
                        className="w-full bg-[#1b1411] border border-[#3b2d24] rounded-lg px-2.5 py-1.5 text-xs text-[#f5ebd9] focus:outline-none focus:border-[#c99757]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8c7e75] uppercase block mb-1">Colore Etichetta</label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="color"
                          value={modificaColore}
                          onChange={(e) => setModificaColore(e.target.value)}
                          className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                        />
                        {COLORI_PREDEFINITI.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setModificaColore(c.hex)}
                            className="w-5 h-5 rounded-full border border-white/20"
                            style={{ backgroundColor: c.hex }}
                            title={c.nome}
                            aria-label={c.nome}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setModificaId(null)} className="text-xs text-[#a3948b] hover:text-[#f5ebd9] px-2 py-1">
                        Annulla
                      </button>
                      <button onClick={salvaLocation} className="text-xs font-semibold text-[#14100e] bg-[#c99757] px-3 py-1.5 rounded-lg">
                        Salva
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: loc.colore }} />
                        <span className="font-semibold text-sm text-[#f5ebd9] truncate">{loc.nome}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setModificaId(loc.id);
                            setModificaNome(loc.nome);
                            setModificaColore(loc.colore);
                          }}
                          className="p-1.5 text-[#a3948b] hover:text-[#c99757] rounded"
                          title="Modifica"
                          aria-label={`Modifica ${loc.nome}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => eliminaLocation(loc)}
                          className="p-1.5 text-[#7d6f66] hover:text-rose-400 rounded"
                          title="Elimina"
                          aria-label={`Elimina ${loc.nome}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-[#a3948b] font-mono">
                      <span>{loc.temperatura != null ? `${loc.temperatura.toFixed(1)}°C` : "— °C"}</span>
                      <span>{loc.umidita != null ? `${loc.umidita.toFixed(1)}% UR` : "— % UR"}</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={aggiungiLocation} className="p-4 rounded-xl bg-[#120e0d] border border-[#261d18] space-y-3">
            <span className="text-xs font-semibold text-[#f5ebd9] block">Nuova location</span>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="color"
                value={nuovoColore}
                onChange={(e) => setNuovoColore(e.target.value)}
                aria-label="Colore della nuova location"
                className="w-9 h-9 rounded border-0 cursor-pointer bg-transparent shrink-0"
              />
              <input
                type="text"
                value={nuovoNome}
                maxLength={60}
                onChange={(e) => setNuovoNome(e.target.value)}
                placeholder="Es. Cantina, Giara toscani, Tupperdor..."
                className={`${inputClass} flex-1`}
              />
              <button type="submit" disabled={!nuovoNome.trim()} className={`${primaryButtonClass} shrink-0`}>
                <Plus className="w-3.5 h-3.5" />
                <span>Aggiungi</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EXCEL */}
      {sezione === "excel" && (
        <div className={`${cardClass} space-y-6`}>
          {barraSuperiore("Esportazione Excel", "Fogli di calcolo dei tuoi dati")}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                ["sigari", "Sigari posseduti", "Lotti in humidor con prezzo pagato, valore di listino e location"],
                ["fumate", "Fumate", "Diario completo con orari, durata, riaccensioni, voto e abbinamento"],
                ["tutto", "Tutto (2 fogli)", "Inventario e diario nello stesso file"],
              ] as const
            ).map(([tipo, titolo, descrizione]) => (
              <div key={tipo} className="p-4 rounded-xl bg-[#130f0d] border border-[#271d18] flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#f5ebd9]">{titolo}</h3>
                  <p className="text-xs text-[#8c7e75] mt-1 leading-relaxed">{descrizione}</p>
                </div>
                <button
                  disabled={esportando !== null}
                  onClick={async () => {
                    setEsportando(tipo);
                    await esegui(() => api.esportaExcel(tipo), "File Excel scaricato.");
                    setEsportando(null);
                  }}
                  className={secondaryButtonClass}
                >
                  {esportando === tipo ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#c99757]" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-[#c99757]" />
                  )}
                  <span>{esportando === tipo ? "Preparazione..." : "Scarica .xlsx"}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HOME ASSISTANT */}
      {sezione === "homeassistant" && (
        <div className={`${cardClass} space-y-6`}>
          {barraSuperiore("Home Assistant & Sensori", "Temperatura e umidità dei contenitori")}

          {!ha ? (
            <p className="text-xs text-[#8c7e75]">Caricamento...</p>
          ) : !ha.configurata ? (
            <p className="text-xs text-[#a3948b] leading-relaxed">
              Non configurata. Imposta <code className="font-mono text-[#c99757]">HA_API_KEY</code> nel file{" "}
              <code className="font-mono text-[#c99757]">.env</code> sul server (genera un valore con{" "}
              <code className="font-mono text-[#c99757]">openssl rand -hex 32</code>) e rilancia{" "}
              <code className="font-mono text-[#c99757]">./update.sh</code>.
            </p>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-[#130f0d] border border-[#271d18]">
                <label className={labelClass}>Chiave API</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <code className="flex-1 bg-[#120e0d] border border-[#2f231c] rounded-xl px-3.5 py-2.5 text-xs text-[#f5ebd9] font-mono break-all">
                    {mostraChiave ? chiaveHa : "•".repeat(24)}
                  </code>
                  <button onClick={() => setMostraChiave((v) => !v)} className={secondaryButtonClass}>
                    {mostraChiave ? "Nascondi" : "Mostra"}
                  </button>
                  <button onClick={() => copia(chiaveHa, "chiave")} className={secondaryButtonClass}>
                    {copiato === "chiave" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiato === "chiave" ? "Copiata" : "Copia"}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-[#a3948b] leading-relaxed">
                  <strong className="text-[#f5ebd9]">1. Solo la prima volta</strong> — se non usi ancora i package,
                  abilitali nel <code className="font-mono text-[#c99757]">configuration.yaml</code>:
                </p>
                <pre className="p-3 bg-[#0a0807] rounded-lg border border-[#201814] text-[11px] font-mono text-[#d9cbbd] overflow-x-auto">
                  {snippetAbilita}
                </pre>
                <button onClick={() => copia(snippetAbilita, "abilita")} className="text-xs text-[#a3948b] hover:text-[#c99757] flex items-center gap-1">
                  {copiato === "abilita" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiato === "abilita" ? "Copiato" : "Copia snippet"}</span>
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-[#a3948b] leading-relaxed">
                  <strong className="text-[#f5ebd9]">2. Package Sigari Track</strong> — salva questo contenuto, senza
                  altre chiavi attorno, in <code className="font-mono text-[#c99757]">&lt;config&gt;/packages/sigari_track.yaml</code>.
                  Espone il numero di sigari su HA e riceve temperatura e umidità per la location «Humidor»: sostituisci{" "}
                  <code className="font-mono text-[#c99757]">sensor.TUO_SENSORE_*</code> con le tue entità.
                </p>
                <pre className="p-3 bg-[#0a0807] rounded-lg border border-[#201814] text-[11px] font-mono text-[#d9cbbd] overflow-x-auto leading-relaxed">
                  {snippetPackage}
                </pre>
                <button onClick={() => copia(snippetPackage, "package")} className="text-xs text-[#a3948b] hover:text-[#c99757] flex items-center gap-1">
                  {copiato === "package" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiato === "package" ? "Copiato" : "Copia snippet"}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* BACKUP */}
      {sezione === "backups" && (
        <div className={`${cardClass} space-y-6`}>
          {barraSuperiore("Backup & Ripristino", "Copie di sicurezza dei tuoi dati")}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#130f0d] border border-[#271d18]">
            <p className="text-xs text-[#a3948b] leading-relaxed max-w-xl">
              Il backup contiene acquisti, fumate, schede di degustazione, preferiti e wishlist. Il listino prezzi non
              serve: si ricostruisce da solo dai listini FIT.
            </p>
            <button onClick={creaBackup} disabled={backupInCorso !== null} className={`${primaryButtonClass} shrink-0`}>
              {backupInCorso === "nuovo" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
              <span>{backupInCorso === "nuovo" ? "Creazione..." : "Crea backup ora"}</span>
            </button>
          </div>

          {backups.length === 0 ? (
            <p className="text-xs text-[#8c7e75] text-center py-6">Nessun backup salvato.</p>
          ) : (
            <div className="divide-y divide-[#241c18] border border-[#241c18] rounded-xl overflow-hidden bg-[#120e0d]">
              {backups.map((b) => (
                <div key={b.filename} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <span className="font-mono text-[#f5ebd9] block truncate">{b.filename}</span>
                    <span className="text-[#7d6f66]">
                      {formatDataOra(b.creato_il)} · {formatDimensione(b.dimensione)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => esegui(() => api.scaricaBackup(b.filename))}
                      className="px-2.5 py-1.5 text-[#a3948b] hover:text-[#c99757] border border-[#2f241f] rounded-lg flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Scarica</span>
                    </button>
                    <button
                      onClick={() => ripristina(b.filename)}
                      disabled={backupInCorso !== null}
                      className="px-2.5 py-1.5 text-[#a3948b] hover:text-[#f5ebd9] border border-[#2f241f] rounded-lg flex items-center gap-1 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Ripristina</span>
                    </button>
                    <button
                      onClick={() => eliminaBackup(b.filename)}
                      disabled={backupInCorso !== null}
                      aria-label={`Elimina ${b.filename}`}
                      className="p-1.5 text-[#7d6f66] hover:text-rose-400 rounded-lg disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
