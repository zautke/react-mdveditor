#!/usr/bin/env bash
# Local dev startup for the mdeditor SQLite persistence sidecar.
# Zero dependencies — runs the TypeScript entrypoint directly on Node 22.13+
# (native type stripping). Usage: cd db-sidecar && bash run.sh
#
# Env overrides:
#   MDE_DB_SIDECAR_INTERNAL_PORT / MDE_DB_SIDECAR_PORT   listen port (default 15280)
#   MDE_DB_PATH                                          sqlite file (default ./data/mdeditor.db)

set -euo pipefail

Usage() {
  cat <<'EOF'
Usage: bash run.sh
  Starts the mdeditor db-sidecar (node:sqlite KV store) on MDE_DB_SIDECAR_PORT.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  Usage
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${MDE_DB_SIDECAR_INTERNAL_PORT:-${MDE_DB_SIDECAR_PORT:-15280}}"
export MDE_DB_SIDECAR_INTERNAL_PORT="$PORT"
export MDE_DB_PATH="${MDE_DB_PATH:-$SCRIPT_DIR/data/mdeditor.db}"

echo "Starting db-sidecar on http://localhost:${PORT} (db: ${MDE_DB_PATH})"
exec node --watch server.ts
