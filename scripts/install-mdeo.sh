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
SOURCE_SCRIPT="$REPO_ROOT/scripts/mdeo.sh"
TARGET_DIR="$HOME/.local/bin"
TARGET_PATH="$TARGET_DIR/mdeo"

if [ ! -f "$SOURCE_SCRIPT" ]; then
  echo "Launcher not found: $SOURCE_SCRIPT" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
ln -sfn "$SOURCE_SCRIPT" "$TARGET_PATH"
echo "Linked $TARGET_PATH -> $SOURCE_SCRIPT"
