// Strato di accesso all'API di Sigari. Le risposte del backend (nomi e forme di Sigari)
// vengono convertite qui nelle forme che usano i componenti (vedi types/cigar.ts), cosi'
// l'interfaccia non dipende dai dettagli delle query.
import type {
  BackupInfo,
  Favorite,
  Fumata,
  HumidorItem,
  HumidorLocation,
  HumidorShop,
  HumidorStats,
  PriceHistoryPoint,
  Product,
  Provenienza,
  TastingReview,
  WishlistItem,
} from "../types/cigar";

const API = "/api";
const TOKEN_KEY = "sigari_auth_token";
const USER_KEY = "sigari_auth_user";

export interface AuthUser {
  id: number;
  email: string;
}

// --- Sessione ---

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Corpo = Record<string, unknown> | undefined;

async function rispondi(res: Response): Promise<Response> {
  if (res.ok) return res;
  let messaggio = `Errore ${res.status}`;
  try {
    const dati = await res.json();
    if (dati?.error) messaggio = dati.error;
  } catch {
    /* corpo non JSON */
  }
  // Token scaduto o non valido: la UI torna alla schermata di accesso
  if (res.status === 401 && getToken()) {
    clearSession();
    window.dispatchEvent(new Event("sigari:sessione-scaduta"));
  }
  throw new ApiError(messaggio, res.status);
}

async function chiedi<T>(percorso: string, metodo = "GET", corpo?: Corpo): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  const res = await rispondi(
    await fetch(`${API}${percorso}`, {
      method: metodo,
      headers,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    })
  );
  return (await res.json()) as T;
}

// --- Conversioni ---

type Riga = Record<string, any>;

function provenienza(valore: unknown): Provenienza {
  return valore === "Cuba" || valore === "Italia" || valore === "Extra-Cuba" ? valore : "Altro";
}

function numero(valore: unknown, predefinito = 0): number {
  const n = Number(valore);
  return valore === null || valore === undefined || Number.isNaN(n) ? predefinito : n;
}

function numeroOpz(valore: unknown): number | null {
  return valore === null || valore === undefined ? null : numero(valore);
}

// Prodotto con il prezzo di listino corrente. Il prezzo singolo manca per le confezioni di
// cui non si conosce il numero di pezzi: in quel caso vale il prezzo della confezione.
function prodotto(r: Riga, idKey = "product_id"): Product {
  const confezione = numero(r.prezzo_confezione);
  return {
    id: r[idKey] ?? r.id,
    marca: r.marca,
    categoria: r.categoria,
    formato: r.formato ?? null,
    pezzi_per_confezione: numeroOpz(r.pezzi_per_confezione),
    prezzo_confezione: confezione,
    prezzo_singolo: numero(r.prezzo_singolo, confezione),
    codice_prodotto: r.codice_prodotto ?? null,
    provenienza: provenienza(r.provenienza),
    variazione_180gg: numeroOpz(r.variazione_180gg),
    variazione_il: r.variazione_il ?? null,
    prezzo_precedente: numeroOpz(r.prezzo_precedente),
    is_preferito: Boolean(r.preferito),
    in_wishlist: Boolean(r.in_wishlist),
    ultimo_aggiornamento: r.valido_dal ?? r.listino_dal ?? "",
  };
}

function lotto(r: Riga): HumidorItem {
  return {
    id: r.id,
    product_id: r.product_id,
    product: prodotto({ ...r, valido_dal: r.listino_dal }),
    shop_id: r.shop_id ?? null,
    shop_nome: r.shop_nome ?? null,
    location_id: r.location_id ?? null,
    location_nome: r.location_nome ?? null,
    location_colore: r.location_colore ?? null,
    prezzo_acquisto: numero(r.prezzo_acquisto),
    data_acquisto: r.data_acquisto,
    quantita_iniziale: r.quantita_iniziale,
    quantita_rimanente: r.quantita_rimanente,
    note: r.note ?? null,
    created_at: r.created_at,
  };
}

function fumata(r: Riga): Fumata {
  return {
    id: r.id,
    humidor_item_id: r.humidor_item_id,
    product_id: r.product_id,
    product: prodotto({ ...r, prezzo_confezione: 0, prezzo_singolo: 0 }),
    quantita: r.quantita,
    data_fumata: r.data_fumata,
    ora_inizio: r.ora_inizio ? String(r.ora_inizio).slice(0, 5) : null,
    ora_fine: r.ora_fine ? String(r.ora_fine).slice(0, 5) : null,
    durata_minuti: r.durata_minuti ?? null,
    riaccensioni: r.riaccensioni ?? null,
    stelle: r.stelle ?? null,
    note: r.note ?? null,
    abbinamento: r.abbinamento ?? null,
    created_at: r.created_at,
  };
}

function scheda(r: Riga): TastingReview {
  return {
    product_id: r.product_id,
    marca: r.marca,
    formato: r.formato ?? null,
    provenienza: provenienza(r.provenienza),
    stelle: r.stelle ?? null,
    descrizione: r.descrizione ?? null,
    aromi: r.aromi ?? [],
    forza: r.forza ?? undefined,
    combustione: r.combustione ?? undefined,
    tiraggio: r.tiraggio ?? undefined,
    abbinamento_consigliato: r.abbinamento_consigliato ?? null,
    updated_at: r.updated_at,
  };
}

// --- Accesso ---

export function fetchRegistrationOpen(): Promise<{ open: boolean }> {
  return chiedi("/auth/registration-open");
}

export function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  return chiedi("/auth/login", "POST", { email, password });
}

export function register(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  return chiedi("/auth/register", "POST", { email, password });
}

// --- Listino prezzi ---

export type OrdinamentoPrezzi = "marca" | "prezzo_asc" | "prezzo_desc" | "variazione";

export interface FiltriRicerca {
  q?: string;
  categoria?: string;
  marca?: string;
  provenienza?: string;
  sort?: OrdinamentoPrezzi;
  variati?: boolean;
  page?: number;
  pageSize?: number;
}

export interface RisultatoRicerca {
  prodotti: Product[];
  totale: number;
}

export async function cercaProdotti(filtri: FiltriRicerca): Promise<RisultatoRicerca> {
  const params = new URLSearchParams();
  for (const [chiave, valore] of Object.entries(filtri)) {
    if (valore === undefined || valore === "" || valore === false) continue;
    params.set(chiave, valore === true ? "1" : String(valore));
  }
  const dati = await chiedi<{ results: Riga[]; totale: number }>(`/prices/search?${params}`);
  return { prodotti: dati.results.map((r) => prodotto(r)), totale: dati.totale };
}

export async function fetchSuggerimenti(q: string): Promise<string[]> {
  const dati = await chiedi<{ suggerimenti: string[] }>(`/prices/autocomplete?q=${encodeURIComponent(q)}`);
  return dati.suggerimenti;
}

export interface FiltriDisponibili {
  categorie: string[];
  marche: string[];
  provenienze: string[];
}

export async function fetchFiltri(): Promise<FiltriDisponibili> {
  const [c, m, p] = await Promise.all([
    chiedi<{ categorie: string[] }>("/prices/meta/categorie"),
    chiedi<{ marche: string[] }>("/prices/meta/marche"),
    chiedi<{ provenienze: string[] }>("/prices/meta/provenienze"),
  ]);
  return { categorie: c.categorie, marche: m.marche, provenienze: p.provenienze };
}

export async function fetchStoricoPrezzi(productId: number, anni = 5): Promise<PriceHistoryPoint[]> {
  const dati = await chiedi<{ history: Riga[] }>(`/prices/${productId}/history?anni=${anni}`);
  // Dal piu' vecchio al piu' recente, come serve per disegnare la curva
  return dati.history
    .map((r) => ({
      valido_dal: r.valido_dal as string,
      prezzo_confezione: numero(r.prezzo_confezione),
      prezzo_singolo: numero(r.prezzo_singolo, numero(r.prezzo_confezione)),
      fonte_documento: (r.fonte_documento as string) ?? "",
    }))
    .reverse();
}

// --- Humidor ---

export async function fetchLotti(): Promise<HumidorItem[]> {
  const dati = await chiedi<{ items: Riga[] }>("/humidor/items");
  return dati.items.map(lotto);
}

export interface NuovoLotto {
  product_id: number;
  prezzo_acquisto: number;
  data_acquisto: string;
  quantita: number;
  location_id?: number | null;
  shop?: { id?: number; nome?: string };
  note?: string | null;
}

export function aggiungiLotto(dati: NuovoLotto) {
  return chiedi<{ id: number; confronto_prezzo?: Riga }>("/humidor/items", "POST", dati as unknown as Corpo);
}

export function modificaLotto(id: number, dati: Record<string, unknown>) {
  return chiedi<{ message: string }>(`/humidor/items/${id}`, "PATCH", dati);
}

export function eliminaLotto(id: number) {
  return chiedi<{ message: string }>(`/humidor/items/${id}`, "DELETE");
}

export async function fetchLocations(): Promise<HumidorLocation[]> {
  const dati = await chiedi<{ locations: Riga[] }>("/humidor/locations");
  return dati.locations.map((l) => ({
    id: l.id,
    nome: l.nome,
    colore: l.colore,
    temperatura: numeroOpz(l.temperatura),
    temperatura_aggiornata_il: l.temperatura_aggiornata_il ?? null,
    umidita: numeroOpz(l.umidita),
    umidita_aggiornata_il: l.umidita_aggiornata_il ?? null,
  }));
}

export function creaLocation(nome: string, colore: string) {
  return chiedi<HumidorLocation>("/humidor/locations", "POST", { nome, colore });
}

export function modificaLocation(id: number, dati: { nome?: string; colore?: string }) {
  return chiedi<HumidorLocation>(`/humidor/locations/${id}`, "PATCH", dati);
}

export function eliminaLocation(id: number) {
  return chiedi<{ message: string }>(`/humidor/locations/${id}`, "DELETE");
}

export async function fetchTabaccherie(): Promise<HumidorShop[]> {
  const dati = await chiedi<{ tabaccherie: HumidorShop[] }>("/humidor/shops");
  return dati.tabaccherie;
}

// --- Fumate e schede di degustazione ---

export async function fetchFumate(limite = 60): Promise<Fumata[]> {
  const dati = await chiedi<{ fumate: Riga[] }>(`/humidor/fumate?limit=${limite}`);
  return dati.fumate.map(fumata);
}

export function registraFumata(dati: Record<string, unknown>) {
  return chiedi<{ id: number }>("/humidor/fumate", "POST", dati);
}

export function modificaFumata(id: number, dati: Record<string, unknown>) {
  return chiedi<{ message: string }>(`/humidor/fumate/${id}`, "PATCH", dati);
}

export function annullaFumata(id: number) {
  return chiedi<{ message: string }>(`/humidor/fumate/${id}`, "DELETE");
}

export async function fetchSchede(): Promise<Record<number, TastingReview>> {
  const dati = await chiedi<{ reviews: Riga[] }>("/humidor/reviews");
  return Object.fromEntries(dati.reviews.map((r) => [r.product_id, scheda(r)]));
}

export async function salvaScheda(productId: number, dati: Record<string, unknown>): Promise<void> {
  await chiedi(`/humidor/reviews/${productId}`, "PUT", dati);
}

export async function fetchStatistiche(): Promise<HumidorStats> {
  return chiedi<HumidorStats>("/humidor/stats");
}

// --- Preferiti e wishlist ---

export async function fetchPreferiti(): Promise<Favorite[]> {
  const dati = await chiedi<{ preferiti: Riga[] }>("/favorites");
  return dati.preferiti.map((r) => ({
    id: r.product_id,
    product_id: r.product_id,
    product: prodotto(r),
    tag: r.tag ?? null,
    created_at: r.aggiunto_il,
  }));
}

export function aggiungiPreferito(productId: number, tag?: string) {
  return chiedi("/favorites", "POST", { product_id: productId, tag });
}

export function aggiornaTagPreferito(productId: number, tag: string) {
  return chiedi(`/favorites/${productId}`, "PATCH", { tag });
}

export function rimuoviPreferito(productId: number) {
  return chiedi(`/favorites/${productId}`, "DELETE");
}

export async function fetchWishlist(): Promise<WishlistItem[]> {
  const dati = await chiedi<{ articoli: Riga[] }>("/wishlist");
  return dati.articoli.map((r) => ({
    id: r.product_id,
    product_id: r.product_id,
    product: prodotto(r),
    quantita: r.quantita,
    created_at: r.aggiunto_il,
  }));
}

export function aggiungiAllaWishlist(productId: number, quantita = 1) {
  return chiedi("/wishlist", "POST", { product_id: productId, quantita });
}

export function aggiornaQuantitaWishlist(productId: number, quantita: number) {
  return chiedi(`/wishlist/${productId}`, "PATCH", { quantita });
}

export function rimuoviDallaWishlist(productId: number) {
  return chiedi(`/wishlist/${productId}`, "DELETE");
}

// --- Recensioni generate dall'AI ---

export interface RecensioneAI {
  testo: string;
  fonti: { titolo?: string; url?: string }[];
  generato_il: string;
  modello?: string;
}

export async function fetchRecensioneAI(productId: number): Promise<RecensioneAI | null> {
  const dati = await chiedi<{ recensione: RecensioneAI | null }>(`/reviews/${productId}`);
  return dati.recensione;
}

export async function generaRecensioneAI(productId: number): Promise<RecensioneAI> {
  const dati = await chiedi<{ recensione: RecensioneAI }>(`/reviews/${productId}/generate`, "POST");
  return dati.recensione;
}

// --- Impostazioni ---

export async function fetchBackup(): Promise<BackupInfo[]> {
  const dati = await chiedi<{ backups: BackupInfo[] }>("/settings/backups");
  return dati.backups;
}

export function creaBackup() {
  return chiedi<{ filename: string }>("/settings/backups", "POST");
}

export function ripristinaBackup(filename: string) {
  return chiedi<{ message: string; backup_di_sicurezza: string }>(`/settings/backups/${encodeURIComponent(filename)}/restore`, "POST");
}

export function eliminaBackup(filename: string) {
  return chiedi<{ message: string }>(`/settings/backups/${encodeURIComponent(filename)}`, "DELETE");
}

export interface InfoVersione {
  corrente: string;
  ultimo: { sha: string; messaggio: string; data: string | null } | null;
  aggiornato: boolean | null;
  errore: string | null;
}

export function fetchVersione(): Promise<InfoVersione> {
  return chiedi("/settings/version");
}

export function fetchIntegrazioneHA(): Promise<{ configurata: boolean; api_key: string | null }> {
  return chiedi("/settings/ha-integration");
}

// Scarica un file protetto dal login (l'intestazione Authorization non passa con un link normale).
async function scaricaFile(percorso: string, nomePredefinito: string): Promise<void> {
  const token = getToken();
  const res = await rispondi(
    await fetch(`${API}${percorso}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  );
  const blob = await res.blob();
  const disposizione = res.headers.get("Content-Disposition") ?? "";
  const nome = /filename="?([^";]+)"?/.exec(disposizione)?.[1] ?? nomePredefinito;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function esportaExcel(tipo: "tutto" | "sigari" | "fumate"): Promise<void> {
  return scaricaFile(`/export/xlsx?tipo=${tipo}`, `${tipo}.xlsx`);
}

export function scaricaBackup(filename: string): Promise<void> {
  return scaricaFile(`/settings/backups/${encodeURIComponent(filename)}`, filename);
}
