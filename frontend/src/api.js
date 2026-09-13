import { authHeaders } from "./auth.js";

// In produzione il frontend viene servito da nginx che fa proxy di /api verso il backend
// (vedi frontend/nginx.conf), quindi usiamo un path relativo.
const API_BASE = "/api";

async function handle(res) {
  if (!res.ok) {
    let message = `Errore ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

// --- Ricerca prezzi ---

export async function searchPrices({ q, categoria, marca, provenienza, page = 1, pageSize = 20 }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (categoria) params.set("categoria", categoria);
  if (marca) params.set("marca", marca);
  if (provenienza) params.set("provenienza", provenienza);
  params.set("page", page);
  params.set("pageSize", pageSize);

  const res = await fetch(`${API_BASE}/prices/search?${params.toString()}`, {
    headers: { ...authHeaders() },
  });
  return handle(res);
}

export async function fetchCategorie() {
  const res = await fetch(`${API_BASE}/prices/meta/categorie`);
  return handle(res);
}

export async function fetchMarche() {
  const res = await fetch(`${API_BASE}/prices/meta/marche`);
  return handle(res);
}

export async function fetchProvenienze() {
  const res = await fetch(`${API_BASE}/prices/meta/provenienze`);
  return handle(res);
}

export async function fetchHistory(productId) {
  const res = await fetch(`${API_BASE}/prices/${productId}/history`);
  return handle(res);
}

export async function fetchAutocomplete(q) {
  const res = await fetch(`${API_BASE}/prices/autocomplete?q=${encodeURIComponent(q)}`);
  return handle(res);
}

// --- Autenticazione ---

export async function fetchRegistrationOpen() {
  const res = await fetch(`${API_BASE}/auth/registration-open`);
  return handle(res);
}

export async function register(email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handle(res);
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handle(res);
}

// --- Preferiti ---

export async function fetchFavorites() {
  const res = await fetch(`${API_BASE}/favorites`, { headers: { ...authHeaders() } });
  return handle(res);
}

export async function addFavorite(productId, tag) {
  const res = await fetch(`${API_BASE}/favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ product_id: productId, tag }),
  });
  return handle(res);
}

export async function updateFavoriteTag(productId, tag) {
  const res = await fetch(`${API_BASE}/favorites/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ tag }),
  });
  return handle(res);
}

export async function removeFavorite(productId) {
  const res = await fetch(`${API_BASE}/favorites/${productId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handle(res);
}

// --- Wishlist ---

export async function fetchWishlist() {
  const res = await fetch(`${API_BASE}/wishlist`, { headers: { ...authHeaders() } });
  return handle(res);
}

export async function addToWishlist(productId, quantita = 1) {
  const res = await fetch(`${API_BASE}/wishlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ product_id: productId, quantita }),
  });
  return handle(res);
}

export async function updateWishlistQuantity(productId, quantita) {
  const res = await fetch(`${API_BASE}/wishlist/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ quantita }),
  });
  return handle(res);
}

export async function removeFromWishlist(productId) {
  const res = await fetch(`${API_BASE}/wishlist/${productId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handle(res);
}

// --- Recensioni ---

export async function fetchReview(productId) {
  const res = await fetch(`${API_BASE}/reviews/${productId}`);
  return handle(res);
}

export async function generateReview(productId) {
  const res = await fetch(`${API_BASE}/reviews/${productId}/generate`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return handle(res);
}

// --- Humidor ---

export async function fetchHumidorShops(q) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const res = await fetch(`${API_BASE}/humidor/shops?${params.toString()}`, {
    headers: { ...authHeaders() },
  });
  return handle(res);
}

export async function searchExternalShops(q) {
  const res = await fetch(`${API_BASE}/humidor/shops/search-external?q=${encodeURIComponent(q)}`, {
    headers: { ...authHeaders() },
  });
  return handle(res);
}

export async function fetchHumidorItems(all = false) {
  const res = await fetch(`${API_BASE}/humidor/items${all ? "?all=1" : ""}`, {
    headers: { ...authHeaders() },
  });
  return handle(res);
}

export async function addHumidorItem(payload) {
  const res = await fetch(`${API_BASE}/humidor/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function updateHumidorItem(id, payload) {
  const res = await fetch(`${API_BASE}/humidor/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function deleteHumidorItem(id) {
  const res = await fetch(`${API_BASE}/humidor/items/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handle(res);
}

export async function fetchFumate(limit = 30) {
  const res = await fetch(`${API_BASE}/humidor/fumate?limit=${limit}`, {
    headers: { ...authHeaders() },
  });
  return handle(res);
}

export async function addFumata(payload) {
  const res = await fetch(`${API_BASE}/humidor/fumate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function undoFumata(id) {
  const res = await fetch(`${API_BASE}/humidor/fumate/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handle(res);
}

export async function fetchHumidorReview(productId) {
  const res = await fetch(`${API_BASE}/humidor/reviews/${productId}`, {
    headers: { ...authHeaders() },
  });
  return handle(res);
}

export async function saveHumidorReview(productId, { stelle, descrizione }) {
  const res = await fetch(`${API_BASE}/humidor/reviews/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ stelle, descrizione }),
  });
  return handle(res);
}

export async function fetchHumidorStats() {
  const res = await fetch(`${API_BASE}/humidor/stats`, { headers: { ...authHeaders() } });
  return handle(res);
}

// --- Location humidor (tag: Humidor, Giara, Vetro, ...) ---

export async function fetchLocations() {
  const res = await fetch(`${API_BASE}/humidor/locations`, { headers: { ...authHeaders() } });
  return handle(res);
}

export async function createLocation(nome, colore) {
  const res = await fetch(`${API_BASE}/humidor/locations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ nome, colore }),
  });
  return handle(res);
}

export async function updateLocation(id, payload) {
  const res = await fetch(`${API_BASE}/humidor/locations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function deleteLocation(id) {
  const res = await fetch(`${API_BASE}/humidor/locations/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handle(res);
}

export async function bulkAssignLocation(itemIds, locationId) {
  const res = await fetch(`${API_BASE}/humidor/items/bulk-location`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ item_ids: itemIds, location_id: locationId }),
  });
  return handle(res);
}

// --- Impostazioni (backup humidor, versione app) ---

export async function fetchBackups() {
  const res = await fetch(`${API_BASE}/settings/backups`, { headers: { ...authHeaders() } });
  return handle(res);
}

export async function createBackup() {
  const res = await fetch(`${API_BASE}/settings/backups`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return handle(res);
}

export function backupDownloadUrl(filename) {
  return `${API_BASE}/settings/backups/${encodeURIComponent(filename)}`;
}

export async function deleteBackup(filename) {
  const res = await fetch(`${API_BASE}/settings/backups/${encodeURIComponent(filename)}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handle(res);
}

export async function restoreBackup(filename) {
  const res = await fetch(`${API_BASE}/settings/backups/${encodeURIComponent(filename)}/restore`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return handle(res);
}

export async function fetchAppVersion() {
  const res = await fetch(`${API_BASE}/settings/version`, { headers: { ...authHeaders() } });
  return handle(res);
}
