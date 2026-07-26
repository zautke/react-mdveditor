# SESSION LOG

_Newest-first running handoff log._

## 2026-07-24 — 2nd continuity refresh; caught committed `.env.backup`

- Ran `/continuity` again. Location check clean (set under `docs/continuity/`,
  root clean). HEAD had advanced to `f847536 docs: continuity` — the 1st
  refresh's files were committed.
- **Finding:** `f847536` also committed `.env.backup-20260712212304` (a `.env`
  backup, not in `.gitignore`), swept in by a broad `git add`. It is
  **unpushed** (origin at `2795e44`, local ahead 1) → never left the machine, no
  secret exposure. Flagged for removal + gitignore before any push; not touching
  git history unprompted. See CURRENT_TASK_STATE / TASKS / REMEMBER.

## 2026-07-24 — Copy image/base64/source + iterations; continuity refresh

- Built copy-to-clipboard feature on new branch `feat/media-copy-snapshot`
  (off `feat/modal-diagram-zoom-pan`). Three decoupled layers:
  `media-capture.ts` (native SVG→PNG hot path + lazy `@zumer/snapdom` fallback,
  separate 46 KB-gzip chunk), `use-media-clipboard.ts` (headless status
  machine), `copy-icon-button.tsx` (presentational Copy→✓ morph). Commit
  `26218de`.
- Preceded by a 3-agent web-research team (web-search / Context7 / GitHub
  code-search), each returning 2 SOTA solutions. Convergent verdict: native
  primary + snapDOM fallback; image clipboard write is native
  `ClipboardItem(Promise<Blob>)` (Safari user-gesture); only `image/png` on the
  clipboard; secure context required.
- Iterations (commit `2795e44`): tuned base64 icon `Braces`→`Binary`; extended
  copy buttons to markdown images/videos (migrated off dead `copyLabel`/`onCopy`
  to `sourceText`=URL + `sourceLabel`); added `sonner` toasts via a decoupled
  `onResult(kind, ok)` callback; `<Toaster>` mounted in `main.tsx`.
- Verified live via Claude-in-Chrome (adagio.local:5250, computer-use): all
  three buttons morph to green ✓; "Source copied to clipboard" toast; Binary
  icon; copy-image resolves (snapDOM fallback fires for Mermaid foreignObject).
- Observed issue: snapDOM freezes the renderer ~30 s capturing the very large
  turn-flow Mermaid diagram. Attempted to measure its real element count — could
  not (renderer frozen). The "5000-node" figure is an unverified estimate.
- Both branches pushed to `origin`. Ran `/continuity`: created
  `docs/continuity/`, archived stale root docs (`PLANNING.md`, `TASKS.md`,
  `SESSION_HISTORY.md`, `HANDOFF.md`) under `docs/continuity/_archive/`, wrote
  the canonical six.

## 2026-07-23/24 — Modal diagram zoom + drag

- Branch `feat/modal-diagram-zoom-pan`. Added `react-zoom-pan-pinch@4` viewport
  to the expanded media modal (`MediaZoomViewport.tsx`). Rewired orphaned
  `__viewport*` CSS from the rewound April attempt. Commit `1a2bf4a`.
- Refined to spec (`d34de69`): replaced the library's zoom handlers with a
  controlled **exponential** model — wheel `scale*exp(-deltaY·k)`, buttons
  ×1.25/÷1.25 (exact inverses = symmetric curved zoom); live % via
  `useTransformComponent` (the `onTransformed` prop only fires on transform-end,
  so the readout was stuck); range 1%–5000%; middle-click reset; viewport fills
  modal with `overflow:hidden` (clip during pan).
- Verified live: symmetric zoom 100→244→…→5000% pinned at cap, clipped at
  extreme zoom, reset → 100%. Wheel + middle-click share the same
  `setTransform` code path but can't be driven by the Chrome extension
  (`scroll` gesture emits no DOM wheel; no middle-click primitive).

## Earlier (archived)

See `docs/continuity/_archive/` (`HANDOFF.md`, `SESSION_HISTORY.md`,
`PLANNING.md`, `TASKS.md`) for the April 2026 media-zoom incident and prior
history. Key durable facts extracted into REMEMBER.md.
