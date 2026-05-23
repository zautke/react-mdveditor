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
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

export MDE_CLI_NAME="${MDE_CLI_NAME:-mdeo}"

exec node "$REPO_ROOT/bin/mde.mjs" "$@"
