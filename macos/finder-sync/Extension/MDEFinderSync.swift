import Cocoa
import FinderSync

/// Finder Sync extension providing the inline (first-level) "Open in MDE" item
/// in the Finder right-click menu — the same mechanism Google Drive/Dropbox use.
///
/// The module is deliberately NOT named `FinderSync` (that would shadow the
/// system framework). `@objc(MDEFinderSync)` pins a stable Objective-C runtime
/// name so the extension's `NSExtensionPrincipalClass` (set to `MDEFinderSync`
/// in Info.plist) resolves without a module prefix.
///
/// The menu returned from `menu(for: .contextualMenuForItems)` is flattened
/// directly into the top level of the context menu — submenus are dropped, which
/// is exactly why this yields a first-level item.
@objc(MDEFinderSync)
final class MDEFinderSync: FIFinderSync {
    override init() {
        super.init()
        // Observe the whole filesystem so the item appears everywhere.
        FIFinderSyncController.default().directoryURLs = [URL(fileURLWithPath: "/")]
    }

    override func menu(for menuKind: FIMenuKind) -> NSMenu {
        let menu = NSMenu(title: "")
        guard menuKind == .contextualMenuForItems else { return menu }
        let item = NSMenuItem(
            title: "Open in MDE",
            action: #selector(openInMDE(_:)),
            keyEquivalent: ""
        )
        item.image = NSImage(systemSymbolName: "doc.text", accessibilityDescription: nil)
        menu.addItem(item)
        return menu
    }

    /// Batch-hand the selected paths to the canonical CLI launcher, which does
    /// extension filtering and talks to the running MDE dev server.
    ///
    /// The appex is sandboxed (macOS 26+ requires it), so it cannot fork/exec
    /// directly. `NSUserUnixTask` is the sanctioned escape: it runs a wrapper
    /// script pre-installed by build.sh in the sandbox-permitted
    /// `~/Library/Application Scripts/<bundle-id>/` directory, which in turn
    /// execs `~/.local/bin/open_in_mde` with the selected paths.
    @objc func openInMDE(_ sender: AnyObject?) {
        let urls = FIFinderSyncController.default().selectedItemURLs() ?? []
        guard !urls.isEmpty else { return }
        do {
            let scriptsDir = try FileManager.default.url(
                for: .applicationScriptsDirectory,
                in: .userDomainMask,
                appropriateFor: nil,
                create: false
            )
            let scriptURL = scriptsDir.appendingPathComponent("open-in-mde-task.sh")
            let task = try NSUserUnixTask(url: scriptURL)
            task.execute(withArguments: urls.map(\.path)) { error in
                if let error {
                    NSLog("[OpenInMDEFinder] task failed: \(error)")
                }
            }
        } catch {
            NSLog("[OpenInMDEFinder] could not run open-in-mde-task.sh: \(error)")
        }
    }
}
