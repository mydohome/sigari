export type Provenienza = "Cuba" | "Italia" | "Extra-Cuba" | "Altro";

export interface Product {
  id: number;
  marca: string;
  categoria: string;
  formato: string | null;
  pezzi_per_confezione: number | null;
  prezzo_confezione: number;
  prezzo_singolo: number;
  codice_prodotto: string | null;
  provenienza: Provenienza;
  variazione_180gg?: number | null; // delta in euro del prezzo singolo rispetto a 180 giorni fa
  variazione_il?: string | null; // data dell'ultimo cambio di prezzo
  prezzo_precedente?: number | null; // prezzo della confezione prima dell'ultimo cambio
  is_preferito?: boolean;
  in_wishlist?: boolean;
  preferito_tag?: string | null;
  ultimo_aggiornamento: string;
  descrizione_breve?: string;
  vitola?: string;
  lunghezza_mm?: number;
  ceppo?: number; // ring gauge
}

export interface PriceHistoryPoint {
  valido_dal: string;
  prezzo_confezione: number;
  prezzo_singolo: number;
  fonte_documento: string;
}

export interface HumidorShop {
  id: number;
  nome: string;
  indirizzo?: string;
  lat?: number;
  lon?: number;
}

export interface HumidorLocation {
  id: number;
  nome: string;
  colore: string;
  temperatura?: number | null;
  temperatura_aggiornata_il?: string | null;
  umidita?: number | null;
  umidita_aggiornata_il?: string | null;
}

export interface HumidorItem {
  id: number;
  product_id: number;
  product?: Product;
  shop_id?: number | null;
  shop_nome?: string | null;
  location_id?: number | null;
  location_nome?: string | null;
  location_colore?: string | null;
  prezzo_acquisto: number;
  data_acquisto: string;
  quantita_iniziale: number;
  quantita_rimanente: number;
  note?: string | null;
  created_at: string;
}

export interface Fumata {
  id: number;
  humidor_item_id: number;
  product_id: number;
  product?: Product;
  quantita: number;
  data_fumata: string;
  ora_inizio?: string | null;
  ora_fine?: string | null;
  durata_minuti?: number | null;
  riaccensioni?: number | null;
  stelle?: number | null;
  note?: string | null;
  abbinamento?: string | null;
  created_at: string;
}

export interface TastingReview {
  product_id: number;
  marca?: string;
  formato?: string | null;
  provenienza?: Provenienza;
  stelle: number | null;
  descrizione: string | null;
  aromi?: string[];
  forza?: "Leggera" | "Medio-leggera" | "Media" | "Medio-forte" | "Forte";
  combustione?: "Perfetta" | "Buona" | "Irregolare";
  tiraggio?: "Ottimale" | "Aperto" | "Serrato";
  abbinamento_consigliato?: string | null;
  updated_at: string;
}

export interface Favorite {
  id: number;
  product_id: number;
  product?: Product;
  tag?: string | null;
  created_at: string;
}

export interface WishlistItem {
  id: number;
  product_id: number;
  product?: Product;
  quantita: number;
  created_at: string;
}

export interface HumidorStats {
  totale_in_humidor: number;
  valore_in_humidor: number;
  valore_investito: number;
  valore_listino_in_humidor: number; // valore dei sigari in humidor ai prezzi di listino di oggi
  plusvalore_listino: number; // listino di oggi meno quanto pagato
  min_campioni_durata: number;
  media_settimanale: number;
  media_mensile: number;
  media_annuale: number;
  fumate_totali: number;
  durata_media_minuti: number | null;
  fumate_con_durata: number;
  serieSettimanale: Array<{ periodo: string; totale: number }>;
  serieMensile: Array<{ periodo: string; totale: number }>;
  topMarche: Array<{ marca: string; totale: number }>;
  distribuzioneProvenienza: Array<{ provenienza: string; totale: number; valore: number }>;
  distribuzioneLocation: Array<{ location: string; colore: string; totale: number; valore: number }>;
}

export interface BackupInfo {
  filename: string;
  dimensione: number;
  creato_il: string;
}
