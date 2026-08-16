import Cocoa

// Minimal host application. Its only job is to carry the embedded FinderSync
// extension so LaunchServices registers it; it runs headless (accessory policy,
// LSUIElement) with no dock icon or window. Quit it any time after the
// extension is enabled — the extension keeps working.
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
app.run()
