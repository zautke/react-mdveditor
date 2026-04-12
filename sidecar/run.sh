#!/usr/bin/env bash
# Local dev startup — installs deps in a venv and runs uvicorn.
# Usage: cd sidecar && bash run.sh
# Optional: MDE_URL_SIDECAR_PORT=8788 bash run.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV_DIR=".venv"
PORT="${MDE_URL_SIDECAR_PORT:-8787}"

if [ ! -d "$VENV_DIR" ]; then
  echo "Creating virtual environment…"
  python3 -m venv "$VENV_DIR"
fi

echo "Installing dependencies…"
"$VENV_DIR/bin/pip" install -q -r requirements.txt

echo "Starting sidecar on http://localhost:${PORT}"
exec "$VENV_DIR/bin/uvicorn" server:app --host 0.0.0.0 --port "$PORT" --reload
