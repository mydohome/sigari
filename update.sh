#!/usr/bin/env bash
# Aggiornamento del Portale Prezzi Sigari in produzione.
# Uso: ./update.sh [-y]   (da eseguire dentro ~/docker/sigari sul server)
#   Mostra gli aggiornamenti in arrivo e chiede conferma prima di applicarli.
#   -y / --yes  salta la richiesta di conferma (es. per esecuzioni automatiche)
set -euo pipefail

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Mostra cosa sta per essere applicato (da HEAD a origin/main) e chiede conferma.
# Esce con 0 se l'utente rinuncia, cosi' "annullato" non e' un errore.
conferma_aggiornamento() {
  local assume_yes="$1" nuovi risposta
  nuovi=$(git rev-list --first-parent --count HEAD..origin/main)

  echo
  if [ "$nuovi" -eq 0 ]; then
    log "Nessun nuovo aggiornamento su origin/main: il codice e' gia' alla versione piu' recente."
  else
    log "Aggiornamenti in arrivo ($nuovi):"
    # --first-parent: una riga per ogni merge/commit su main, senza il dettaglio dei branch
    git --no-pager log --no-color --first-parent --reverse --format='  - %h  %s  (%cd)' --date=format:'%d/%m/%Y' HEAD..origin/main
    echo
    git --no-pager diff --shortstat HEAD origin/main | sed 's/^/  /'
    if git --no-pager diff --name-only HEAD origin/main | grep -q '^backend/src/db/migrate.js$'; then
      echo "  ATTENZIONE: include modifiche allo schema del database (migrazione applicata all'avvio del backend)."
    fi
    if git --no-pager diff --name-only HEAD origin/main | grep -q '^docker-compose.yml$'; then
      echo "  ATTENZIONE: include modifiche a docker-compose.yml."
    fi
  fi
  echo

  if [ "$assume_yes" = "1" ]; then
    log "Opzione -y: procedo senza chiedere conferma."
    return 0
  fi

  if [ ! -t 0 ]; then
    echo "ERRORE: nessun terminale interattivo per chiedere conferma. Usa ./update.sh -y per procedere comunque."
    exit 1
  fi

  if [ "$nuovi" -eq 0 ]; then
    read -r -p "Ricostruire comunque i container? [s/N] " risposta || risposta=""
  else
    read -r -p "Procedere con l'aggiornamento? [s/N] " risposta || risposta=""
  fi
  case "$risposta" in
    s | S | si | SI | Si | y | Y | yes) return 0 ;;
    *)
      log "Aggiornamento annullato: nessuna modifica applicata."
      exit 0
      ;;
  esac
}

wait_for() {
  local desc="$1" cmd="$2" tries="${3:-30}" delay="${4:-2}"
  for ((i = 1; i <= tries; i++)); do
    if eval "$cmd" >/dev/null 2>&1; then
      log "$desc: OK"
      return 0
    fi
    sleep "$delay"
  done
  log "$desc: FALLITO dopo $((tries * delay))s"
  return 1
}

# Tutta la logica vive dentro questa funzione (e non a livello di script) di
# proposito: bash legge un file di script a blocchi mentre lo esegue, non
# tutto in un colpo solo. Il `git merge` qui sotto riscrive update.sh stesso
# (e' un file versionato), e se il resto dei comandi fosse a livello di
# script, dopo il merge bash potrebbe eseguire un mix incoerente di righe
# vecchie/nuove del file appena cambiato sotto ai suoi piedi (e' successo:
# la riga "export GIT_COMMIT" aggiunta in un aggiornamento non veniva mai
# eseguita, l'immagine backend restava con GIT_COMMIT=dev e la pagina
# Impostazioni segnalava per sempre "nuova versione disponibile" anche a
# deploy riuscito). Una funzione, invece, viene interamente letta e
# "compilata" in memoria da bash nel momento in cui viene definita, quindi
# resta immune a modifiche del file su disco avvenute durante la sua stessa
# esecuzione.
main() {
  local assume_yes=0 arg
  for arg in "$@"; do
    case "$arg" in
      -y | --yes) assume_yes=1 ;;
      -h | --help)
        sed -n '2,5p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
        exit 0
        ;;
      *)
        echo "Opzione sconosciuta: $arg (uso: ./update.sh [-y])"
        exit 1
        ;;
    esac
  done

  cd "$(dirname "${BASH_SOURCE[0]}")"

  log "Avvio aggiornamento in $(pwd)"

  if [ -n "$(git status --porcelain)" ]; then
    echo "ERRORE: ci sono modifiche locali non committate:"
    git status --short
    echo "Risolvi (commit/stash/checkout) prima di eseguire l'aggiornamento."
    exit 1
  fi

  local before after
  before=$(git rev-parse --short HEAD)
  log "Commit attuale: $before"

  git fetch origin main
  conferma_aggiornamento "$assume_yes"

  log "git merge --ff-only origin/main"
  git merge --ff-only origin/main

  after=$(git rev-parse --short HEAD)
  log "Commit dopo il pull: $after"

  export GIT_COMMIT="$after"
  log "docker compose up --build -d (GIT_COMMIT=$GIT_COMMIT)"
  docker compose up --build -d

  local fail=0

  wait_for "db healthcheck" \
    '[ "$(docker inspect --format="{{.State.Health.Status}}" sigari-db-1 2>/dev/null)" = "healthy" ]' \
    30 2 || fail=1

  wait_for "backend /api/health" \
    'curl -fsS http://localhost:4000/api/health | grep -q "\"status\":\"ok\""' \
    30 2 || fail=1

  wait_for "frontend risponde (200)" \
    '[ "$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/)" = "200" ]' \
    30 2 || fail=1

  echo
  log "--- Stato container ---"
  docker compose ps

  if [ "$fail" -ne 0 ]; then
    log "AGGIORNAMENTO FALLITO: uno o più controlli di salute non sono passati."
    log "Ultimi log:"
    docker compose logs --tail=40
    exit 1
  fi

  log "Aggiornamento completato con successo ($before -> $after)"
}

main "$@"
