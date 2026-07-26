# CURRENT TASK STATE

_Compact resume point. Rewritten in place each refresh._
_Updated: 2026-07-24 (2nd refresh)._

## Where things stand

Two media-frame features are **complete, verified live, committed, and pushed**:

1. `feat/modal-diagram-zoom-pan` (@ `d34de69`) — modal diagram zoom/pan.
2. `feat/media-copy-snapshot` (branched off #1) — copy image/base64/source
   buttons with morph + toasts. Pushed at `2795e44`.

Current HEAD: `f847536 docs: continuity` (the 1st continuity refresh, committed;
**unpushed** — origin/feat/media-copy-snapshot is at `2795e44`, local ahead 1).

## ⚠ Needs decision (top priority)

`f847536` accidentally committed **`.env.backup-20260712212304`** (a `.env`
backup, not in `.gitignore`) via a broad `git add`. It is **unpushed → the
backup never left the machine** (no exposure, no rotation needed). Fix before
pushing: drop it from the commit + gitignore `.env.backup*`. Awaiting user's go
(their commit + a secrets file → not touching git history unprompted).

## Resume point

No active in-flight edit. After the `.env.backup` fix, next-highest is the
**non-blocking capture path** for oversized diagrams (snapDOM ~30 s renderer
freeze on the giant turn-flow Mermaid map). Full list in TASKS.md.

## Key files (current feature)

- `src/lib/media-capture.ts` — `CaptureAdapter`, `nativeCapture`,
  `snapdomCapture` (lazy), `smartCapture`, clipboard helpers.
- `src/lib/use-media-clipboard.ts` — `useMediaClipboard` / `useCopyAction`,
  `onResult(kind, ok)` callback.
- `src/components/ui/copy-icon-button.tsx` — presentational morph button.
- `src/components/markdown/media/MediaAssetFrame.tsx` — wires buttons + toasts;
  `src/components/markdown/media/MediaZoomViewport.tsx` — pan/zoom.
- Consumers pass `sourceText`: `MermaidDiagram.tsx`, `GraphvizPreview.tsx`,
  `MarkdownRenderer_orig.tsx` (images/videos).
- `src/main.tsx` — `<Toaster>` mount.

## Environment

Dev: `https://adagio.local:5250`. Verify in the browser instance the user is
actually looking at (Browser 2, Windows). `pnpm` package manager.
