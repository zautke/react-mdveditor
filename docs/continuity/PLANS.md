# PLANS

_Source of truth for goals/phases. Rewritten in place; supersede stale facts._
_Last refreshed: 2026-07-24._

## Current goal

Media-frame interaction polish for the markdown editor: a modal diagram
viewer with fluid zoom/pan, plus copy-to-clipboard actions (image / base64 /
source) with animated feedback — all built as decoupled, app-agnostic
components.

## Phases

1. **Modal diagram zoom + drag** — DONE (branch `feat/modal-diagram-zoom-pan`).
   Exponential symmetric zoom (wheel + buttons), live % readout, 1%–5000%
   range, middle-click reset, overflow-clipped viewport filling the modal.
2. **Copy image / base64 / source** — DONE (branch `feat/media-copy-snapshot`,
   off phase 1). Native SVG→PNG hot path + lazy snapDOM fallback; Safari-safe
   `ClipboardItem(Promise<Blob>)`; animated Copy→✓ morph; success/error toasts;
   extended to markdown images/videos.
3. **Open follow-ups** — see TASKS.md. Notably: non-blocking capture for very
   large diagrams (snapDOM freezes the renderer ~30 s on the giant turn-flow
   Mermaid map); live-verify image/video buttons; open PRs.

## Current facts

- Two feature branches pushed to `origin`, both off `development` lineage:
  - `feat/modal-diagram-zoom-pan` @ `1a2bf4a`, `d34de69`
  - `feat/media-copy-snapshot` @ `26218de`, `2795e44` (pushed)
- Local HEAD `f847536 docs: continuity` (unpushed, ahead 1) — but it also swept
  in `.env.backup*`; must be cleaned before pushing (see TASKS.md).
- Dev server: `https://adagio.local:5250` (`.env` `MDE_DEV_PORT`; app port 5200
  usually down).
- Deps added: `react-zoom-pan-pinch@^4.0.3`, `@zumer/snapdom@^2.18.0`,
  `sonner@^2.0.7`.
- Decoupling seam: `CaptureAdapter = (el) => Promise<{blob, dataUrl}>` — native
  ↔ snapDOM ↔ modern-screenshot swappable in one function.

## Non-goals

- Reintroducing GSAP or `@panzoom/panzoom` (the April 2026 rewrite that
  destabilized the app; fully rewound — see REMEMBER.md).
- Changing Mermaid `htmlLabels` rendering (out of scope; snapDOM fallback
  handles the foreignObject taint instead).
- Reducing diagram DOM size — large node counts are authored document content,
  not app baseline.
