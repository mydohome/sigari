# Contesto progetto: Portale Prezzi Sigari Italia

Questo documento riassume le decisioni prese e lo stato attuale del progetto, per
continuare il lavoro in Claude Code senza dover rispiegare tutto da capo.

## Cos'è

Portale web (Docker) per monitorare i prezzi dei **sigari** in Italia, con ricerca,
autocompletamento, preferiti (con tag), wishlist (con calcolo totale), e recensioni
generate via AI a partire da fonti italiane selezionate.

Stack: Node.js/Express + PostgreSQL (backend), React 18 + TypeScript + Tailwind v4 + Vite (frontend,
grafica ripresa da `sigari_v2`), nginx davanti a tutto, in Docker Compose.

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
      humidor.js        umidor personale: acquisti (lotti), fumate, recensioni utente, location, statistiche
      settings.js       backup/ripristino JSON dei dati personali, versione app, integrazione Home Assistant
      ha.js             endpoint per Home Assistant (stats, temperatura/umidita' per location), protetti da HA_API_KEY
      export.js         export Excel (.xlsx) di sigari posseduti e fumate
frontend/
  src/
    App.tsx                  accesso (AuthScreen), caricamento dati, schede, modali, notifiche
    lib/api.ts               sessione (token in localStorage) + chiamate al backend + conversione nelle forme
                             dei tipi: l'interfaccia non conosce i nomi delle colonne/risposte del backend
    types/cigar.ts           tipi (Product, HumidorItem, Fumata, TastingReview, HumidorStats, ...)
    components/              DashboardTab, HumidorTab, PricesTab, FumateTab, TastingNotesTab, WishlistTab,
                             WikiTab, SettingsTab, Navbar, MobileBottomNav, ProductPicker, ui.ts (classi comuni)
    components/modals/       FumataModal, PurchaseModal, EditHumidorItemModal, PriceHistoryModal, AIReviewModal
  nginx.conf, security-headers.conf, Dockerfile   web server (gzip, cache, CSP, proxy /api con timeout lungo)
Nota: la struttura sopra e' un riepilogo, non esaustivo; per l'elenco completo vedi `backend/src` e
`frontend/src/components`.

## Decisioni della nuova interfaccia (da non rompere)

- **Nessun dato inventato**: orari, stelle, forza/combustione/tiraggio sono facoltativi e partono vuoti;
  la durata media compare solo con almeno 5 fumate cronometrate (`MIN_CAMPIONI_DURATA` in `humidor.js`).
- **Durata fumata**: `backend/src/db/durata.js` (`sqlDurataMinuti`) e' l'unica definizione; se fine < inizio la
  fumata e' passata oltre la mezzanotte, ma solo fino a 6 ore (oltre: errore di digitazione, durata ignota).
- **Fumate e lotti**: `humidor_fumate.humidor_item_id` e' nullo per i sigari fumati fuori humidor e diventa
  nullo (non si cancella) se il lotto viene eliminato: lo storico e le statistiche restano.
  Modificando la quantita' di una fumata la giacenza del lotto si riallinea.
- **Wishlist**: la quantita' conta le **confezioni** (totale = prezzo confezione x quantita'); passando
  all'acquisto diventa quantita' x pezzi per confezione.
- **Ricerca prezzi**: solo i prodotti presenti nell'ultimo listino; ordinamento e filtri sono lato server
  (`ORDINAMENTI` in `routes/prices.js`), il frontend carica a pagine (max 500 righe per richiesta).
- **Statistiche** (`GET /api/humidor/stats`): serie a 12 slot con zeri, plusvalore a listino calcolato dal server,
  distribuzioni per origine e location. I campi `NUMERIC` escono come numeri (parser in `db/pool.js`).
- **Sicurezza**: JWT HS256 e `JWT_SECRET` obbligatorio all'avvio, limite ai tentativi di login, CORS chiuso,
  confronti a tempo costante per `ADMIN_TOKEN`/`HA_API_KEY`, errori sempre in JSON. DB e porta 4000 sono
  legati a 127.0.0.1 nel compose; nginx e' l'unico ingresso (CSP senza CDN: font e immagini sono nella build).
- **Provare in locale su OneDrive**: la cartella `dist` puo' generare duplicati (`assets 2`) per i conflitti di
  sincronizzazione; per provare la build usa `vite build --outDir` fuori dalla cartella sincronizzata.

## Variabili d'ambiente richieste (.env)

```
POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
SCRAPE_CRON, SCRAPE_ON_BOOT
ADMIN_TOKEN       # protegge /api/admin/*
JWT_SECRET        # firma i token di login — MAI vuoto
ANTHROPIC_API_KEY # per generare recensioni
REVIEW_SOURCES    # domini consentiti per web_search, separati da virgola
REVIEW_MODEL      # default claude-haiku-4-5-20251001
HA_API_KEY        # opzionale: abilita l'integrazione Home Assistant (openssl rand -hex 32)
```

## Aggiornamento: funzionalita' aggiunte dopo la prima stesura

Il documento originale copriva solo ricerca prezzi, preferiti, wishlist e recensioni AI. Da allora
sono state aggiunte (dettagli nel `README.md`):

- **Umidor personale**: acquisti registrati come lotti (`humidor_items`, con prezzo **per singolo
  sigaro**, quantita' iniziale/rimanente, tabaccheria, location), fumate (`humidor_fumate`, con orari,
  durata e riaccensioni facoltativi) e recensioni/voti personali (`humidor_reviews`).
- **Location** (Humidor, Giara, Vetro, personalizzabili) con temperatura/umidita' valorizzate da Home Assistant.
- **Dashboard fumate**, **storico prezzi** (backfill dal gennaio 2023 con `src/scraper/backfill.js`),
  provenienza dei prodotti (`src/data/provenienze.js`), tab Wiki.
- **Impostazioni**: backup/ripristino JSON dei dati personali (esclude il catalogo prezzi, sempre
  ricostruibile), controllo versione su GitHub, integrazione Home Assistant.
- **Export Excel** (`backend/src/routes/export.js`): `GET /api/export/xlsx?tipo=sigari|fumate|tutto`,
  richiede login e riguarda solo l'utente loggato. Genera con la libreria `xlsx` (gia' dipendenza) un
  file con i fogli "Sigari posseduti" (solo lotti con quantita' rimanente > 0, con totali) e "Fumate"
  (storico completo, con durata calcolata e voto). I pulsanti sono in Impostazioni > "Esporta in Excel".
  Il download lato frontend passa da `fetch` con header di autenticazione (`esportaExcel` in
  `lib/api.ts`), perche' un semplice link non invierebbe il token JWT.
- Deploy/aggiornamento: `./update.sh` sul server (mostra gli aggiornamenti e chiede conferma).

## Cosa NON è ancora stato fatto / possibili prossimi passi

- Nessun test automatico (unit/integration) è stato scritto.
- Nessuna gestione "dimenticata password" per gli utenti.
- Il parser XLS (`xlsxParser.js`) assume la struttura colonne attuale di tabaccai.it;
  se cambia, va aggiornato lì.
- Nessuna paginazione/infinite-scroll lato frontend oltre al `pageSize` di default (20).
- L'export Excel include solo i sigari ancora posseduti, non lo storico dei lotti esauriti
  (aggiungibile come terzo foglio in `export.js`).
