# Sigari Track

Monitoraggio dei prezzi dei **sigari** in Italia, con dati aggiornati automaticamente
ogni settimana.

## Funzionalità

L'interfaccia (tema scuro "club del fumo", Dashboard con KPI e grafici, barra di navigazione adattiva
desktop/telefono) riprende la grafica di `sigari_v2`; i dati restano quelli di Sigari (Postgres, login,
listini FIT). Schede: **Dashboard**, **Humidor**, **Prezzi FIT**, **Fumate**, **Degustazione**,
**Wishlist** (con i Preferiti), **Guida**, **Impostazioni**.

- **Dashboard**: giacenza, valore pagato e **plusvalore** rispetto ai listini di oggi, medie di consumo
  (settimana/mese/anno), durata media delle fumate (dopo 5 sessioni cronometrate), grafico di consumo a 12
  settimane o 12 mesi, marche più fumate, ripartizione per origine, ultime fumate.
- **Prezzi FIT**: ricerca sul listino (marca, formato, codice ADM), ordinamento per nome, prezzo o variazione,
  filtro per origine e «solo prezzi variati negli ultimi 180 giorni», **storico dei prezzi** in un grafico a gradini.
- **Fumate**: orari di inizio/fine facoltativi (durata calcolata, anche oltre la mezzanotte), riaccensioni,
  voto in stelle, abbinamento e note; si possono **modificare** dopo la registrazione e si possono registrare
  anche sigari non presenti in humidor. Annullando una fumata la giacenza torna al lotto.
- **Degustazione**: scheda sensoriale per sigaro (aromi, forza, combustione, tiraggio, abbinamento consigliato).
- **Ricerca con autocompletamento** sulle marche di sigari.
- **Login/registrazione multi-utente** (JWT). Necessario per usare preferiti, wishlist e generare recensioni.
- **Preferiti**: aggiungi un sigaro dalla ricerca (☆), assegnagli un tag personale (es. "da riprovare"), gestiscili nella scheda "Preferiti".
- **Wishlist**: aggiungi sigari con quantità, la scheda "Wishlist" calcola il totale per riga e il totale complessivo.
- **Recensioni AI**: dalla ricerca, apri "Recensione" su un sigaro per generare (o rigenerare) una sintesi in italiano delle opinioni trovate sulle fonti configurate in `REVIEW_SOURCES`, con elenco delle fonti citate.
- **Export Excel**: da Impostazioni > "Esporta in Excel" scarichi un .xlsx con i sigari posseduti (location, tabaccheria, prezzo unitario, valore), lo storico delle fumate (durata, riaccensioni, voto) o entrambi in due fogli. API: `GET /api/export/xlsx?tipo=sigari|fumate|tutto` (richiede login).

### Configurazione necessaria per le recensioni AI

Nel file `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...       # ottieni la tua chiave da https://console.anthropic.com/
REVIEW_SOURCES=gustotabacco.it,accademiafumolento.forumfree.it,rollingtobacco.it,bottegadelfumatore.com,sigarietabacchi.it
REVIEW_MODEL=claude-haiku-4-5-20251001   # modello economico, sufficiente per sintesi testuali
JWT_SECRET=<stringa-casuale-lunga, es. openssl rand -hex 32>
```

Puoi modificare `REVIEW_SOURCES` in qualsiasi momento (elenco di domini separati da virgola,
senza spazi) per aggiungere o togliere fonti, senza bisogno di ricompilare il codice — basta
riavviare il backend (`docker compose restart backend`).

## Fonte dati (prezzi)

Dopo aver verificato che il sito ufficiale ADM
(https://www.adm.gov.it/portale/monopoli/tabacchi/prezzi/prezzi_pubblico) pubblica solo
PDF di determine amministrative (non tabellari, difficili da interpretare in modo
affidabile), il progetto usa come fonte:

**Federazione Italiana Tabaccai (FIT)** — https://www.tabaccai.it/index.php/servizi/tariffe

FIT ripubblica, categoria per categoria, i listini ufficiali ADM in formato XLS
già pulito e tabellare ("I prezzi sono conformi alle tariffe pubblicate sul sito
internet dell'Agenzia delle Dogane e dei Monopoli"). Il file usato è quello della
categoria **Sigari**, con colonne: categoria, codice prodotto ADM, denominazione
commerciale, prezzo per Kg convenzionale, prezzo per confezione, tipo di confezione
(da cui si ricava il numero di pezzi per confezione e quindi il prezzo singolo).

Il link al file cambia nome ad ogni variazione tariffaria (es.
`/images/XLS/20260911/sigari_20260911.xls`), quindi ad ogni ciclo di scraping la
pagina indice viene riletta per trovare il file corrente.

### Storico prezzi

FIT lascia online anche i listini passati, ognuno in una cartella con la data nel
percorso (circa 1-2 al mese, **disponibili dal gennaio 2023**). Il ciclo di scraping,
oltre al listino corrente, prova ogni giorno trascorso dall'ultimo listino in archivio
e recupera quelli intermedi che lo scraping settimanale avrebbe saltato. Per caricare
tutto lo storico disponibile (una tantum, idempotente, qualche minuto):

```bash
docker compose exec backend node src/scraper/backfill.js            # dal 2023-01-01
docker compose exec backend node src/scraper/backfill.js --da 2025-01-01
```

Nella ricerca, accanto al prezzo singolo compare una freccia rossa (aumento) o verde
(diminuzione) se il prezzo è cambiato negli ultimi 180 giorni; cliccandola, o l'icona
dell'andamento presente sulle altre righe, si apre il grafico dello storico (fino a 5
anni, nei limiti dei listini disponibili). Nella ricerca compaiono solo i prodotti
presenti nell'ultimo listino: quelli usciti dalla tariffa restano nello storico.

## Avvio con Docker

```bash
cp .env.example .env
# modifica .env: imposta password ed eventuali token SENZA il carattere '$'
# (docker compose interpreta '$' come variabile — vedi nota sotto)
docker compose up --build
```

- Frontend: http://localhost:8080 (nginx: serve l'interfaccia e inoltra `/api` al backend)
- API backend: http://localhost:4000/api — raggiungibile **solo dal server stesso** (le richieste degli
  utenti passano da nginx, porta 8080)
- Postgres: porta 5432, **solo dal server stesso** (per accedere da fuori usa un tunnel SSH)

Al primo avvio, se `SCRAPE_ON_BOOT=true` (default), il backend esegue subito un primo
ciclo di scraping. Successivamente lo scraping gira in automatico secondo l'espressione
cron `SCRAPE_CRON` (default: **ogni lunedì alle 3:00**, `0 3 * * 1`).

### ⚠️ Attenzione al carattere `$` nel file `.env`

Se una password o un token generati casualmente contengono un `$`, Docker Compose lo
interpreta come riferimento a una variabile d'ambiente e lo sostituisce (silenziosamente)
con una stringa vuota, causando errori di autenticazione difficili da diagnosticare.
Genera valori sicuri e "puliti" con:

```bash
openssl rand -hex 24
```

(produce solo caratteri esadecimali, mai problematici).

## Struttura del progetto

```
backend/
  src/
    db/                 connessione Postgres + migrazione schema
    scraper/
      tabaccaiSource.js   trova e scarica il file XLS "Sigari" corrente da tabaccai.it
      xlsxParser.js        interpreta le righe del foglio XLS
      index.js             ciclo completo: scarica, elabora, salva su DB
      scheduler.js          cron settimanale + esecuzione al boot
    routes/
      prices.js            API pubbliche di ricerca
      admin.js              stato scraping, avvio manuale, import CSV
frontend/                 React 18 + TypeScript + Tailwind CSS v4 (Vite), icone lucide, animazioni motion
  src/
    App.tsx                 accesso, caricamento dati, schede e modali
    lib/api.ts              tutte le chiamate al backend + conversione nelle forme usate dall'interfaccia
    types/cigar.ts          tipi dei dati
    components/             una scheda per file (DashboardTab, HumidorTab, PricesTab, FumateTab, ...), modali in modals/
    data/wikiData.ts        contenuti della Guida
  nginx.conf, security-headers.conf   web server: compressione, cache, intestazioni di sicurezza, proxy /api
```

## API principali

- `GET /api/prices/search?q=cohiba&categoria=Sigari` — ricerca prezzi correnti (include flag `preferito`/`in_wishlist` se autenticato)
- `GET /api/prices/autocomplete?q=coh` — suggerimenti marche per l'autocompletamento
- `GET /api/prices/:productId/history?anni=5` — storico prezzi di un prodotto (default ultimi 5 anni)
- `GET /api/prices/meta/categorie` — elenco categorie disponibili
- `POST /api/auth/register` / `POST /api/auth/login` — creazione account / login, restituiscono un JWT
- `GET /api/favorites`, `POST /api/favorites`, `PATCH /api/favorites/:productId`, `DELETE /api/favorites/:productId` — gestione preferiti (richiede `Authorization: Bearer <token>`)
- `GET /api/wishlist`, `POST /api/wishlist`, `PATCH /api/wishlist/:productId`, `DELETE /api/wishlist/:productId` — gestione wishlist con totale (richiede autenticazione)
- `GET /api/reviews/:productId` — recensione salvata (pubblica)
- `POST /api/reviews/:productId/generate` — genera/rigenera la recensione (richiede autenticazione)
- `GET /api/admin/status` (richiede header `x-admin-token`) — stato ultimi cicli di scraping
- `POST /api/admin/scrape-now` (richiede header `x-admin-token`) — forza uno scraping immediato
- `POST /api/admin/import-csv` (richiede header `x-admin-token`, multipart `file`) — import manuale

### Formato CSV per l'import manuale

```csv
marca,categoria,formato,pezzi_per_confezione,prezzo_confezione,valido_dal,fonte_url,codice_prodotto
Cohiba Robusto,Sigari,Confezione da 25 pezzi,25,180.00,2026-09-11,https://www.tabaccai.it/...,12345
```

## Se in futuro tabaccai.it cambia struttura

Il punto di aggancio è `backend/src/scraper/tabaccaiSource.js`, funzione
`findSigariXlsLink`: cerca nella pagina un link del tipo
`.../download?url=/images/XLS/<data>/sigari_<data>.xls`. Se la Federazione dovesse
cambiare la struttura della pagina o il formato del nome file, questa è la funzione
da aggiornare. Il parser vero e proprio (`xlsxParser.js`) è indipendente e continuerà
a funzionare finché le colonne del foglio restano le stesse (categoria, codice,
denominazione, prezzo/kg, prezzo/confezione, tipo confezione).

Come rete di sicurezza resta disponibile l'import manuale via CSV (endpoint sopra),
utile anche per correggere singoli prezzi errati senza attendere il prossimo ciclo
automatico.
