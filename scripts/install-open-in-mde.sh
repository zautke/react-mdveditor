#!/usr/bin/env bash
set -euo pipefail

# Install the global `open_in_mde` command by symlinking the shared launcher
# into ~/.local/bin (mirrors install-mdeo.sh).

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
SOURCE_SCRIPT="$REPO_ROOT/scripts/open-in-mde.sh"
TARGET_DIR="$HOME/.local/bin"
TARGET_PATH="$TARGET_DIR/open_in_mde"

if [ ! -f "$SOURCE_SCRIPT" ]; then
  echo "Launcher not found: $SOURCE_SCRIPT" >&2
  exit 1
fi

chmod +x "$SOURCE_SCRIPT"
mkdir -p "$TARGET_DIR"
ln -sfn "$SOURCE_SCRIPT" "$TARGET_PATH"
echo "Linked $TARGET_PATH -> $SOURCE_SCRIPT"

case ":$PATH:" in
  *":$TARGET_DIR:"*) ;;
  *) echo "note: $TARGET_DIR is not on PATH; add it to use \`open_in_mde\` globally." >&2 ;;
esac
