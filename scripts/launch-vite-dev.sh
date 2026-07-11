#!/usr/bin/env bash
# Launch the Vite dev server (used directly, or by launchd/nohup).
#
# Usage: bash scripts/launch-vite-dev.sh [-h|--help]

set -euo pipefail

Usage() {
  cat <<'EOF'
launch-vite-dev.sh — start the mdeditor Vite dev server

USAGE
  bash scripts/launch-vite-dev.sh
  bash scripts/launch-vite-dev.sh -h | --help

Logs to <repo>/logs/vite-dev.launchd.log. Port comes from MDE_DEV_PORT (.env).
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  Usage
  exit 0
fi

# Derive the repo root from this script's own location — never hardcode a machine path.
SCRIPT_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd -P "$SCRIPT_DIR/.." && pwd)"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Version managers install node/pnpm outside a launchd/GUI PATH; resolve when missing.
if ! command -v pnpm >/dev/null 2>&1; then
  for _nvm_root in "${NVM_DIR:-}" /usr/local/nvm "$HOME/.nvm"; do
    [ -n "$_nvm_root" ] && [ -d "$_nvm_root/versions/node" ] || continue
    _newest="$(ls -1 "$_nvm_root/versions/node" 2>/dev/null | sort -V | tail -n1)"
    if [ -n "$_newest" ] && [ -x "$_nvm_root/versions/node/$_newest/bin/pnpm" ]; then
      PATH="$_nvm_root/versions/node/$_newest/bin:$PATH"
      break
    fi
  done
fi
command -v pnpm >/dev/null 2>&1 || { echo "pnpm not found on PATH" >&2; exit 1; }

mkdir -p "$ROOT/logs"
exec >> "$ROOT/logs/vite-dev.launchd.log" 2>&1

cd "$ROOT"
# `date -Is` is a GNU extension; BSD/macOS date rejects it.
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] starting vite dev"

exec pnpm dev
