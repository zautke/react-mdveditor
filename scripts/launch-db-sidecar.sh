#!/usr/bin/env bash
# Launch the SQLite persistence sidecar (used directly, or by launchd/nohup).
#
# Usage: bash scripts/launch-db-sidecar.sh [-h|--help]
#
# Env overrides:
#   MDE_DB_SIDECAR_INTERNAL_PORT   listen port (default 15280)
#   MDE_DB_PATH                    sqlite file (default <repo>/db-sidecar/data/mdeditor.db)

set -euo pipefail

Usage() {
  cat <<'EOF'
launch-db-sidecar.sh — start the mdeditor SQLite persistence sidecar

USAGE
  bash scripts/launch-db-sidecar.sh
  bash scripts/launch-db-sidecar.sh -h | --help

Logs to <repo>/logs/db-sidecar.launchd.log. Requires Node >= 22.13 (node:sqlite).
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  Usage
  exit 0
fi

# Derive the repo root from this script's own location — never hardcode a machine path.
SCRIPT_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd -P "$SCRIPT_DIR/.." && pwd)"

# Version managers install node outside a launchd/GUI PATH; resolve it when missing.
if ! command -v node >/dev/null 2>&1; then
  for _nvm_root in "${NVM_DIR:-}" /usr/local/nvm "$HOME/.nvm"; do
    [ -n "$_nvm_root" ] && [ -d "$_nvm_root/versions/node" ] || continue
    _newest="$(ls -1 "$_nvm_root/versions/node" 2>/dev/null | sort -V | tail -n1)"
    if [ -n "$_newest" ] && [ -x "$_nvm_root/versions/node/$_newest/bin/node" ]; then
      PATH="$_nvm_root/versions/node/$_newest/bin:$PATH"
      break
    fi
  done
fi
command -v node >/dev/null 2>&1 || { echo "node not found on PATH" >&2; exit 1; }

mkdir -p "$ROOT/logs"
exec >> "$ROOT/logs/db-sidecar.launchd.log" 2>&1

cd "$ROOT"
# `date -Is` is a GNU extension; BSD/macOS date rejects it.
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] starting db-sidecar"

exec env \
  MDE_DB_SIDECAR_INTERNAL_PORT="${MDE_DB_SIDECAR_INTERNAL_PORT:-15280}" \
  MDE_DB_PATH="${MDE_DB_PATH:-$ROOT/db-sidecar/data/mdeditor.db}" \
  node "$ROOT/db-sidecar/server.ts"
