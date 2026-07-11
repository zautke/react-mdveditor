#!/usr/bin/env bash
set -euo pipefail

ROOT="/Volumes/FLOUNDER/dev/mdeditor"
PNPM="/usr/local/nvm/versions/node/v24.13.0/bin/pnpm"
export PATH="/usr/local/nvm/versions/node/v24.13.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

mkdir -p "$ROOT/logs"
exec >> "$ROOT/logs/vite-dev.launchd.log" 2>&1

cd "$ROOT"
echo "[$(date -Is)] starting vite dev"
exec "$PNPM" dev
