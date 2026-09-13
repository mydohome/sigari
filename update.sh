#!/usr/bin/env bash
# Aggiornamento del Portale Prezzi Sigari in produzione.
# Uso: ./update.sh   (da eseguire dentro ~/docker/sigari sul server)
set -euo pipefail

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

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

  log "git fetch + merge --ff-only origin/main"
  git fetch origin main
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
