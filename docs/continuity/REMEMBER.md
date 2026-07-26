# REMEMBER

_Append-only durable facts, invariants, pitfalls. Dated entries._

## 2026-07-24 — Clipboard + capture invariants

- **Image clipboard write is native** — no library abstracts it. Use
  `navigator.clipboard.write([ new ClipboardItem({ 'image/png': makeBlob() }) ])`.
- **Safari user-gesture rule:** pass a `Promise<Blob>` (unawaited) to
  `ClipboardItem` and call `clipboard.write` synchronously in the click handler,
  so async rasterization resolves inside the retained gesture. Works in
  Chrome/Firefox too — single universal path.
- **Only `image/png` on the clipboard** (SVG-on-clipboard is unreliable in
  Firefox/Safari). Requires a **secure context** — app is HTTPS (adagio.local).
- **Native canvas taints on Mermaid `htmlLabels: true`** (`<foreignObject>` HTML
  labels): `canvas.toDataURL()` throws `SecurityError` → that's the signal
  `smartCapture` uses to fall back to snapDOM. So snapDOM is the common path for
  typical Mermaid flowcharts, not a rare one.
- **Capture target = the content element**, not the frame. The action-bar is a
  DOM **sibling** of `.mdeditor-media-asset__content`, so snapshotting the
  content naturally excludes the buttons.
- snapDOM = `@zumer/snapdom` (0-dep, MIT, ~46 KB gz). Chosen as fallback for its
  built-in font embedding + `exclude`/`filter` + best SVG story. Loaded via
  `import()` → separate chunk, 0 KB on the main bundle.

## 2026-07-24 — react-zoom-pan-pinch quirks

- `onTransformed` prop fires only on transform **end** → a live scale readout
  built on it stays stuck. Use `useTransformComponent(({state}) => …)` (it
  subscribes every tick).
- For symmetric "curved" zoom, drive it yourself via `setTransform` with a
  multiplicative/exponential factor; the library's own `zoomIn/zoomOut` step +
  wheel `smoothStep` produced erratic jumps.
- A green success ✓ morph appears only when the copy promise **resolves** →
  doubles as proof the clipboard write succeeded (failure → red ✕).

## 2026-07-24 — Environment

- Dev server origin: **`https://adagio.local:5250`** (`.env` `MDE_DEV_PORT`).
  App port 5200 is usually down. (Older notes citing `localhost:5200` are stale.)
- `pnpm` is the package manager. Zero-tolerance lint.

## 2026-07-24 — Pitfall: `.env.backup*` not gitignored

- `.gitignore` covers `.env.local` and `.env.*.local` but **not**
  `.env.backup-*`. A broad `git add`/`git commit -a` will sweep an env backup
  into a commit (happened in `f847536`). Keep `.env` backups out of git — add
  `.env.backup*` to `.gitignore`, and prefer explicit path adds over `git add -A`.

## 2026-04 (carried forward) — April media-zoom incident

- A smoothness-driven rewrite (GSAP + `@panzoom/panzoom` + fetch hardening)
  **destabilized the working app** and was fully rewound. That work was
  **never committed** (working-tree only). Baseline restored to the Motion +
  Radix path. **Do not reintroduce GSAP or `@panzoom/panzoom`.** Full account:
  `docs/continuity/_archive/HANDOFF.md`.
