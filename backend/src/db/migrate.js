const pool = require("./pool");

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  marca TEXT NOT NULL,
  categoria TEXT NOT NULL,          -- Sigarette, Sigari, Sigaretti, Trinciato, Altri tabacchi da fumo, ecc.
  formato TEXT,                     -- descrizione confezione, es. "Pacchetto da 20", "Astuccio da 5"
  pezzi_per_confezione INTEGER,     -- quante unita' singole contiene la confezione (se noto)
  codice_prodotto TEXT,             -- codice ufficiale ADM del prodotto, quando disponibile (solo informativo)
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (marca, categoria, formato)
);

-- Aggiunge la colonna anche su database gia' esistenti creati prima di questa modifica
ALTER TABLE products ADD COLUMN IF NOT EXISTS codice_prodotto TEXT;

CREATE INDEX IF NOT EXISTS idx_products_marca_lower ON products (LOWER(marca));
CREATE INDEX IF NOT EXISTS idx_products_categoria ON products (categoria);

CREATE TABLE IF NOT EXISTS prices (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  prezzo_confezione NUMERIC(10,2) NOT NULL,
  prezzo_singolo NUMERIC(10,4),     -- calcolato: prezzo_confezione / pezzi_per_confezione, se disponibile
  valido_dal DATE NOT NULL,
  fonte_url TEXT,
  fonte_documento TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (product_id, valido_dal)
);

CREATE INDEX IF NOT EXISTS idx_prices_product_valido_dal ON prices (product_id, valido_dal DESC);

-- Tiene traccia dei documenti/provvedimenti ADM gia' elaborati, per non riprocessarli
CREATE TABLE IF NOT EXISTS scraped_documents (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  titolo TEXT,
  elaborato_il TIMESTAMP NOT NULL DEFAULT now(),
  righe_estratte INTEGER DEFAULT 0,
  esito TEXT,                       -- 'ok', 'parziale', 'errore'
  dettaglio TEXT
);

CREATE TABLE IF NOT EXISTS scrape_runs (
  id SERIAL PRIMARY KEY,
  iniziato_il TIMESTAMP NOT NULL DEFAULT now(),
  concluso_il TIMESTAMP,
  documenti_trovati INTEGER DEFAULT 0,
  documenti_nuovi INTEGER DEFAULT 0,
  prezzi_inseriti INTEGER DEFAULT 0,
  esito TEXT,
  dettaglio TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites (user_id);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantita INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items (user_id);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  testo TEXT NOT NULL,
  fonti JSONB,
  generato_il TIMESTAMP NOT NULL DEFAULT now(),
  modello TEXT
);

-- --- Humidor personale (inventario, acquisti, fumate, recensioni utente) ---

CREATE TABLE IF NOT EXISTS humidor_shops (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  indirizzo TEXT,
  lat NUMERIC(9,6),
  lon NUMERIC(9,6),
  osm_id TEXT,                      -- id OpenStreetMap del punto scelto, se trovato tramite ricerca esterna
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (nome, indirizzo)
);

CREATE INDEX IF NOT EXISTS idx_humidor_shops_nome_lower ON humidor_shops (LOWER(nome));

CREATE TABLE IF NOT EXISTS humidor_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shop_id INTEGER REFERENCES humidor_shops(id) ON DELETE SET NULL,
  prezzo_acquisto NUMERIC(10,2) NOT NULL,
  data_acquisto DATE NOT NULL,
  quantita_iniziale INTEGER NOT NULL DEFAULT 1,
  quantita_rimanente INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_humidor_items_user ON humidor_items (user_id);
CREATE INDEX IF NOT EXISTS idx_humidor_items_product ON humidor_items (product_id);

CREATE TABLE IF NOT EXISTS humidor_fumate (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  humidor_item_id INTEGER NOT NULL REFERENCES humidor_items(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantita INTEGER NOT NULL DEFAULT 1,
  data_fumata DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_humidor_fumate_user_data ON humidor_fumate (user_id, data_fumata DESC);

CREATE TABLE IF NOT EXISTS humidor_reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stelle SMALLINT CHECK (stelle BETWEEN 1 AND 5),
  descrizione TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA_SQL);
    console.log("Migrazione completata: schema aggiornato.");
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migrazione fallita:", err);
      process.exit(1);
    });
}

module.exports = { migrate };
