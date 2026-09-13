# Contesto progetto: Portale Prezzi Sigari Italia

Questo documento riassume le decisioni prese e lo stato attuale del progetto, per
continuare il lavoro in Claude Code senza dover rispiegare tutto da capo.

## Cos'è

Portale web (Docker) per monitorare i prezzi dei **sigari** in Italia, con ricerca,
autocompletamento, preferiti (con tag), wishlist (con calcolo totale), e recensioni
generate via AI a partire da fonti italiane selezionate.

Stack: Node.js/Express + PostgreSQL (backend), React/Vite (frontend), tutto in Docker Compose.

## Decisioni chiave prese durante lo sviluppo

1. **Fonte prezzi**: ADM (adm.gov.it) pubblica solo PDF di determine, non tabellari e
   difficili da interpretare in modo affidabile. Si usa invece **tabaccai.it**
   (Federazione Italiana Tabaccai), che ripubblica i listini ADM in **XLS pulito**,
   filtrato per categoria "Sigari". Vedi `backend/src/scraper/tabaccaiSource.js` e
   `xlsxParser.js`. Il link al file cambia nome ad ogni variazione tariffa
   (`/images/XLS/<data>/sigari_<data>.xls`), quindi si rilegge la pagina indice
   (`https://www.tabaccai.it/index.php/servizi/tariffe`) ad ogni ciclo.

2. **Autenticazione**: multi-utente con JWT (email+password, bcrypt). Necessaria per
   preferiti, wishlist, generazione recensioni. Vedi `backend/src/routes/auth.js` e
   `backend/src/middleware/auth.js`.

3. **Recensioni AI**: generate on-demand (non automatiche) chiamando l'API Anthropic
   con il tool `web_search` **limitato** (`allowed_domains`) alle fonti in
   `REVIEW_SOURCES` (env var, di default: gustotabacco.it, accademiafumolento.forumfree.it,
   rollingtobacco.it, bottegadelfumatore.com, sigarietabacchi.it). Modello: **Haiku 4.5**
   (`claude-haiku-4-5-20251001`, il più economico), configurabile via `REVIEW_MODEL`.
   Cache su tabella `reviews`, con pulsante "Rigenera". Vedi
   `backend/src/reviews/anthropicClient.js` e `backend/src/routes/reviews.js`.

4. **Deploy**: su server Debian (`deb-srv-003`), cartella `~/docker/sigari`, gestito
   via `docker compose`. Accesso SFTP con Royal TSX (client che nasconde i file che
   iniziano con `.`, attenzione quando si cercano `.env` ecc.).

## Problemi risolti durante il debug (per non ripeterli)

- **`$` nelle password/token nel `.env`**: Docker Compose interpreta `$` come inizio
  di riferimento a variabile e lo sostituisce silenziosamente con stringa vuota.
  Soluzione: generare sempre segreti con `openssl rand -hex 32` (solo esadecimale).
- **Link PDF ADM non rilevati**: i link Liferay hanno il pattern
  `NOME.pdf/<uuid>?t=<timestamp>` (il `.pdf` non è a fine stringa). Risolto ma poi
  abbandonato l'approccio PDF a favore dell'XLS di tabaccai.it (vedi punto 1 sopra).
- **`JWT_SECRET` vuoto nel container**: il `docker-compose.yml` sul server non era
  stato aggiornato con le nuove variabili d'ambiente dopo l'aggiunta di auth/preferiti/
  wishlist/recensioni. Assicurarsi che `docker-compose.yml` includa: `JWT_SECRET`,
  `ANTHROPIC_API_KEY`, `REVIEW_SOURCES`, `REVIEW_MODEL` nell'`environment` del backend.
- **Heredoc multi-riga nel terminale dell'utente**: si troncano/si rompono nel
  copia-incolla. Usare comandi a riga singola con `base64 -d` quando serve trasferire
  script o file di testo lunghi via terminale.

## Struttura repository

```
backend/
  src/
    db/                 pool.js, migrate.js (schema completo incluse tabelle users/favorites/wishlist_items/reviews)
    middleware/auth.js    requireAuth / optionalAuth (JWT)
    scraper/
      tabaccaiSource.js    trova/scarica XLS sigari da tabaccai.it
      xlsxParser.js         interpreta le righe XLS
      index.js               ciclo di scraping completo
      scheduler.js            cron settimanale (default lunedì 3:00)
    reviews/anthropicClient.js   chiamata API Anthropic con web_search
    routes/
      prices.js    ricerca, autocomplete, storico, categorie
      auth.js       register/login/me
      favorites.js   CRUD preferiti (richiede auth)
      wishlist.js     CRUD wishlist + totale (richiede auth)
      reviews.js       GET/generate recensione
      admin.js          stato scraping, scrape forzato, import CSV manuale
frontend/
  src/
    auth.js              gestione token JWT in localStorage
    api.js                 tutte le chiamate al backend
    App.jsx                 tab Ricerca/Preferiti/Wishlist + auth
    components/
      SearchBar.jsx (autocomplete), ResultsTable.jsx (azioni preferito/wishlist/recensione),
      ReviewPanel.jsx, FavoritesTab.jsx, WishlistTab.jsx, AuthBar.jsx
```

## Variabili d'ambiente richieste (.env)

```
POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
SCRAPE_CRON, SCRAPE_ON_BOOT
ADMIN_TOKEN       # protegge /api/admin/*
JWT_SECRET        # firma i token di login — MAI vuoto
ANTHROPIC_API_KEY # per generare recensioni
REVIEW_SOURCES    # domini consentiti per web_search, separati da virgola
REVIEW_MODEL      # default claude-haiku-4-5-20251001
```

## Cosa NON è ancora stato fatto / possibili prossimi passi

- Nessun test automatico (unit/integration) è stato scritto.
- Nessuna gestione "dimenticata password" per gli utenti.
- Il parser XLS (`xlsxParser.js`) assume la struttura colonne attuale di tabaccai.it;
  se cambia, va aggiornato lì.
- Nessuna paginazione/infinite-scroll lato frontend oltre al `pageSize` di default (20).
- Il repository git locale è in fase di setup sul Mac dell'utente (non ancora fatto
  push su GitHub al momento di scrivere questo documento).
