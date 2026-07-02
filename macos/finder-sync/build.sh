#!/usr/bin/env bash
# Build, install, and enable the "Open in MDE" Finder Sync extension — the
# inline (first-level) Finder context-menu item. Local, ad-hoc signed; no
# Developer ID, App Group, or notarization required.
#
# Usage: bash build.sh [-h|--help]

set -euo pipefail

Usage() {
  cat <<'EOF'
Build + install the "Open in MDE" FinderSync extension (first-level Finder menu item).

USAGE
  bash build.sh            Generate project, build, ad-hoc sign, install, enable
  bash build.sh -h|--help  Show this help

Requires: Xcode, xcodegen (brew install xcodegen), and `open_in_mde` on PATH.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  Usage
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

APP_NAME="MDEFinder"
APPEX_BID="com.braisenly.mde.finder.OpenInMDEFinder"
DEST_DIR="$HOME/Applications"
DEST_APP="$DEST_DIR/$APP_NAME.app"

echo "==> Generating Xcode project (xcodegen)"
xcodegen generate

echo "==> Building (Release, ad-hoc signed)"
xcodebuild \
  -project "$APP_NAME.xcodeproj" \
  -scheme "$APP_NAME" \
  -configuration Release \
  -derivedDataPath build \
  CODE_SIGN_IDENTITY="-" \
  CODE_SIGNING_REQUIRED=YES \
  CODE_SIGNING_ALLOWED=YES \
  build

BUILT_APP="build/Build/Products/Release/$APP_NAME.app"
[ -d "$BUILT_APP" ] || { echo "build failed: $BUILT_APP missing" >&2; exit 1; }

echo "==> Re-signing ad-hoc (appex WITH sandbox entitlements, then app)"
# NB: do NOT use `--deep` here — it re-signs the embedded appex WITHOUT its
# entitlements, stripping com.apple.security.app-sandbox. macOS 26+ then
# silently refuses to load the FinderSync appex ("plug-ins must be sandboxed")
# and the menu item never appears. Sign the appex with its entitlements first,
# then the outer app.
codesign --force --sign - \
  --entitlements "$SCRIPT_DIR/Extension/OpenInMDEFinder.entitlements" \
  "$BUILT_APP/Contents/PlugIns/OpenInMDEFinder.appex"
codesign --force --sign - "$BUILT_APP"

echo "==> Installing to $DEST_APP"
mkdir -p "$DEST_DIR"
rm -rf "$DEST_APP"
cp -R "$BUILT_APP" "$DEST_APP"

echo "==> Installing NSUserUnixTask wrapper (sandbox-permitted script location)"
SCRIPTS_DIR="$HOME/Library/Application Scripts/$APPEX_BID"
mkdir -p "$SCRIPTS_DIR"
cp "$SCRIPT_DIR/Extension/open-in-mde-task.sh" "$SCRIPTS_DIR/open-in-mde-task.sh"
chmod 755 "$SCRIPTS_DIR/open-in-mde-task.sh"

echo "==> Registering with LaunchServices"
LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"
"$LSREGISTER" -f "$DEST_APP" || true
open "$DEST_APP"

APPEX="$DEST_APP/Contents/PlugIns/OpenInMDEFinder.appex"
echo "==> Enabling extension via pluginkit"
pluginkit -a "$APPEX" || true
pluginkit -e use -i "$APPEX_BID" || true
killall Finder 2>/dev/null || true

echo "==> Status (expect a leading '+'):"
pluginkit -m -i "$APPEX_BID" -vvv || true

cat <<EOF

Done. If the extension shows a leading '+', right-click any file in Finder —
"Open in MDE" appears at the TOP LEVEL (not under Services/Quick Actions).

If it does not appear:
  • System Settings → Login Items & Extensions → toggle OpenInMDEFinder on
  • Ensure open_in_mde is on PATH:  command -v open_in_mde
EOF
