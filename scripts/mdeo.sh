#!/usr/bin/env bash
set -euo pipefail

resolve_script_dir() {
  local source="${BASH_SOURCE[0]}"
  while [ -h "$source" ]; do
    local dir
    dir="$(cd -P "$(dirname "$source")" && pwd)"
    source="$(readlink "$source")"
    case "$source" in
      /*) ;;
      *) source="$dir/$source" ;;
    esac
  done
  cd -P "$(dirname "$source")" && pwd
}

SCRIPT_DIR="$(resolve_script_dir)"

export MDE_CLI_NAME="${MDE_CLI_NAME:-mdeo}"

# Thin wrapper: mdeo now delegates to the shared open_in_mde primitive, which
# handles extension gating + batching and forwards to bin/mde.mjs.
exec "$SCRIPT_DIR/open-in-mde.sh" "$@"
