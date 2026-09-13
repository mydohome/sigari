#!/usr/bin/env bash
# Aggiornamento del Portale Prezzi Sigari in produzione.
# Uso: ./update.sh   (da eseguire dentro ~/docker/sigari sul server)
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "Avvio aggiornamento in $(pwd)"

if [ -n "$(git status --porcelain)" ]; then
  echo "ERRORE: ci sono modifiche locali non committate:"
  git status --short
  echo "Risolvi (commit/stash/checkout) prima di eseguire l'aggiornamento."
  exit 1
fi

BEFORE=$(git rev-parse --short HEAD)
log "Commit attuale: $BEFORE"

log "git fetch + merge --ff-only origin/main"
git fetch origin main
git merge --ff-only origin/main

AFTER=$(git rev-parse --short HEAD)
log "Commit dopo il pull: $AFTER"

log "docker compose up --build -d"
docker compose up --build -d

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

FAIL=0

wait_for "db healthcheck" \
  '[ "$(docker inspect --format="{{.State.Health.Status}}" sigari-db-1 2>/dev/null)" = "healthy" ]' \
  30 2 || FAIL=1

wait_for "backend /api/health" \
  'curl -fsS http://localhost:4000/api/health | grep -q "\"status\":\"ok\""' \
  30 2 || FAIL=1

wait_for "frontend risponde (200)" \
  '[ "$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/)" = "200" ]' \
  30 2 || FAIL=1

echo
log "--- Stato container ---"
docker compose ps

if [ "$FAIL" -ne 0 ]; then
  log "AGGIORNAMENTO FALLITO: uno o più controlli di salute non sono passati."
  log "Ultimi log:"
  docker compose logs --tail=40
  exit 1
fi

log "Aggiornamento completato con successo ($BEFORE -> $AFTER)"
