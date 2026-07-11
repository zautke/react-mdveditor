#!/usr/bin/env bash
set -euo pipefail

ROOT="/Volumes/FLOUNDER/dev/mdeditor"
NODE="/usr/local/nvm/versions/node/v24.13.0/bin/node"

mkdir -p "$ROOT/logs"
exec >> "$ROOT/logs/db-sidecar.launchd.log" 2>&1

cd "$ROOT"
echo "[$(date -Is)] starting db-sidecar"
exec env \
  MDE_DB_SIDECAR_INTERNAL_PORT=15280 \
  MDE_DB_PATH="$ROOT/db-sidecar/data/mdeditor.db" \
  "$NODE" "$ROOT/db-sidecar/server.ts"
