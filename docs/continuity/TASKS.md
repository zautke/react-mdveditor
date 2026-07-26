# TASKS

_Checkbox state + follow-ups. Supersede stale items in place._
_Last refreshed: 2026-07-24._

## Done

- [x] Modal diagram viewport: zoom + drag-to-pan (`react-zoom-pan-pinch`) — `1a2bf4a`
- [x] Exponential symmetric zoom (wheel `exp(-deltaY·k)` + button ×1.25/÷1.25), live % via `useTransformComponent`, 1%–5000%, middle-click reset, overflow-clipped viewport filling modal — `d34de69`
- [x] Copy image (PNG) / base64 (data URL) / source text icon buttons with animated Copy→✓ morph — `26218de`
- [x] Decoupled layers: `media-capture.ts` (native + lazy snapDOM), `use-media-clipboard.ts` (headless status machine), `copy-icon-button.tsx` (presentational) — `26218de`
- [x] Tune icons (base64 `Braces`→`Binary`); extend copy buttons to markdown images/videos (`sourceText` = URL); sonner success/error toasts via `onResult` — `2795e44`
- [x] Verified live (computer-use): all three morphs → green ✓; source toast; Binary icon; 5000% cap + clipping; symmetric zoom-in/out
- [x] Both branches pushed to `origin`

## Open follow-ups

- [ ] Non-blocking capture for oversized diagrams — snapDOM freezes renderer ~30 s on the giant turn-flow Mermaid map. Options: cap raster `scale`, run snapDOM in `requestIdleCallback` with a "rendering…" state, or offload.
- [ ] Live-verify image/video copy buttons (no markdown-image doc was open; not clicked). Capture path: native `drawImage` for `<img>`/`<video>` → snapDOM fallback.
- [ ] Live-verify the copy-**image** toast string ("Image copied to clipboard") — not re-captured due to the renderer freeze; shares the verified `reportCopy` path.
- [ ] Measure the real element count of the turn-flow diagram SVG (the "5000" figure was an estimate; renderer was frozen when attempted).
- [ ] **`.env.backup-20260712212304` was accidentally committed in `f847536`** (swept in by a broad `git add`; not gitignored). Unpushed, so no exposure. Fix before any push: `git rm --cached` it + amend/recommit `f847536` without it, and add `.env.backup*` to `.gitignore`.
- [ ] Decide whether to open PRs for the two branches.

## Verification commands

- `pnpm typecheck && pnpm lint && pnpm build`
- Live: Claude-in-Chrome at `https://adagio.local:5250` (test in the exact visible instance — see REMEMBER.md).
