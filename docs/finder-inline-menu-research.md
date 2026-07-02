# Inline (first-level) Finder context-menu items — research (2026-07-02)

Goal: "Open in MDE" at the **top level** of the Finder right-click menu, like
Google Drive — **no submenu**. Target macOS 27 beta 2 / 26.5 Tahoe. Sourced from
a 3-agent SOTA sweep (Apple docs + shipping OSS + DTS forums), all cited inline
in the session; primary refs listed at bottom.

## Verdict

**FinderSync app extension (`FIFinderSync`) is the ONLY supported mechanism for
inline top-level items.** NSServices / Automator Quick Actions (what we shipped)
*always* nest under the "Services"/"Quick Actions" submenu — no config moves them
up. Google Drive, Dropbox, ownCloud, Insync all use FinderSync. There is no
non-FinderSync API on macOS 26/27 that injects inline items (old CMM/SIMBL hacks
are dead + need SIP off).

Why it's inline: `menu(for: .contextualMenuForItems)` returns an `NSMenu` whose
items are **flattened directly into the top level** (submenus are *dropped* — you
literally cannot nest). Only `title`, `image`, `action` are honored; `target` is
forced nil so actions dispatch to the `FIFinderSync` subclass via the responder
chain.

## What it costs

- **Packaging:** a host `.app` with the `.appex` embedded at `Contents/PlugIns/`.
  Must be a real `.xcodeproj` + `xcodebuild` — **SwiftPM cannot build an appex**.
- **Signing:** **ad-hoc (`codesign -s -`) is enough for LOCAL use; no
  notarization.** A Developer-ID/Apple-Development cert is only needed if you use
  **App Groups or host↔appex XPC** (those are Team-ID-gated). Ad-hoc builds run
  only on the build machine — fine here.
- **Sandbox:** for a *local* tool, ship the appex **non-sandboxed** — it loads
  fine and can `Process`-exec the CLI directly. (Sandboxed appex cannot spawn;
  you'd need NSWorkspace→helper.app + App Group, or `NSUserUnixTask`.)
- **Enable (scriptable):** `pluginkit -a <appex>` → `pluginkit -e use -i <id>` →
  verify `pluginkit -m -i <id>` (leading `+`). GUI toggle lives in System Settings
  → Login Items & Extensions on 26/27. `pluginkit` enable is semi-official and may
  need re-asserting after rebuilds.
- **Scope:** `FIFinderSyncController.default().directoryURLs = [URL(fileURLWithPath: "/")]`
  (or mounted-volume URLs) so the item appears everywhere.

## Minimal implementation shape

```swift
// FinderSync appex principal class
import Cocoa; import FinderSync
class FinderSync: FIFinderSync {
  override init() {
    super.init()
    FIFinderSyncController.default().directoryURLs = [URL(fileURLWithPath: "/")]
  }
  override func menu(for kind: FIMenuKind) -> NSMenu {
    let m = NSMenu(title: "")
    guard kind == .contextualMenuForItems else { return m }
    let it = NSMenuItem(title: "Open in MDE", action: #selector(openInMDE(_:)), keyEquivalent: "")
    it.image = NSImage(named: "MenuIcon")            // inline icon like Google Drive
    m.addItem(it)
    return m
  }
  @objc func openInMDE(_ sender: AnyObject?) {
    let urls = FIFinderSyncController.default().selectedItemURLs() ?? []
    let p = Process()                                 // non-sandboxed appex: direct exec
    p.executableURL = URL(fileURLWithPath: "\(NSHomeDirectory())/.local/bin/open_in_mde")
    p.arguments = urls.map(\.path)                    // batch, filtering handled by open_in_mde
    try? p.run()
  }
}
```

Build/enable/test loop:
```bash
xcodebuild -project MDE.xcodeproj -scheme MDEHost -configuration Debug \
  -derivedDataPath ./build CODE_SIGN_IDENTITY="-" build
codesign --force -s - --entitlements MDEFinder.entitlements "$APPEX"   # non-sandbox
codesign --force -s - "$APP"
open "$APP"; pluginkit -a "$APPEX"; pluginkit -e use -i "$BID"; killall -KILL Finder
pluginkit -m -i "$BID" -vvv                                            # expect "+"
```
As-user test: reuse our working harness — `cliclick rc:x,y` on a selected file,
then System Events reads `menu 1 of window 1`; the item now appears **directly**
in `menu items` (top level), not under `menu item "Services"`. That name-location
difference is itself the assertion that the inline requirement is met.

## Caveats
- Avoid the XPC/`SMAppService` route — reported macOS 26 Tahoe regression.
- MDM `DeniedExtensionPoints` profiles silently block all extensions (the "Tahoe
  ARM broken" red herring). Check `profiles` if the appex never loads.
- The Sequoia "extensions UI missing" bug (FB15249290) is fixed on 26/27.

## Recommendation (local personal tool)
Non-sandboxed host `.app` + FinderSync appex, **ad-hoc signed**, `directoryURLs=["/"]`,
menu action `Process`-execs `~/.local/bin/open_in_mde` with `selectedItemURLs`.
No cert, no App Group, no helper, no notarization. This complements (or replaces)
the existing Services-submenu Quick Action with a true first-level item.

## Primary sources
- Apple: FinderSync / `FIMenuKind.contextualMenuForItems` / `menu(for:)` / `directoryURLs`
- App Extension Programming Guide → Finder Sync (embedding, principal class)
- OSS exemplars: OpenInTerminal, FiScript, TermHere, ownCloud client (FinderSync.m)
- DTS forums: 756711 (pluginkit enable, FB15249290), 776087 (App Groups need Team ID),
  717098 (sandbox + root URL access), 806607 (MDM block red herring)
- Objective-See "Finder Syncs"; theevilbit beyond_0026; Eclectic Light (pluginkit, 2025-04-16)
