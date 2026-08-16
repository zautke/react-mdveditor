#!/usr/bin/env bash
set -euo pipefail

# Install the "Open in MDE" Finder Quick Action into ~/Library/Services.
#
# The .workflow bundle is plain data interpreted by the trusted pbs /
# WorkflowServiceRunner, so no code signing or notarization is required for a
# local tool. Requires `open_in_mde` on PATH (run scripts/install-open-in-mde.sh
# first).

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
SRC="$SCRIPT_DIR/OpenInMDE.workflow"
DST_DIR="$HOME/Library/Services"
DST="$DST_DIR/OpenInMDE.workflow"

if [ ! -d "$SRC" ]; then
  echo "Quick Action bundle not found: $SRC" >&2
  exit 1
fi

if ! command -v open_in_mde >/dev/null 2>&1; then
  echo "warning: \`open_in_mde\` not on PATH; run scripts/install-open-in-mde.sh first." >&2
fi

# Strip quarantine so Gatekeeper doesn't block the locally-built workflow.
xattr -dr com.apple.quarantine "$SRC" 2>/dev/null || true

mkdir -p "$DST_DIR"
rm -rf "$DST"
cp -R "$SRC" "$DST"

# Re-vend Services without logout; nudge Finder to pick it up.
/System/Library/CoreServices/pbs -flush 2>/dev/null || true
killall Finder 2>/dev/null || true

echo "Installed: $DST"
echo "Verify:    /System/Library/CoreServices/pbs -dump_pboard | grep -i 'Open in MDE'"
echo "Then right-click Markdown files in Finder -> Quick Actions -> Open in MDE."
