# SESSION LOG

_Newest-first running handoff log._

## 2026-07-26 — Persistence hardening: found and fixed live document loss

- **Both stacks up together for the first time.** prod (`5200`, nginx) and dev
  (`5250`, vite) now run side by side in one Compose project against a single
  `db-sidecar`. Proven, not assumed: both origins return an identical
  `instanceId` **and** `dbFileId` (host inode) from `/api/db/health`.
- **Root-caused the document loss. It is not a durability failure** —
  `synchronous=FULL`, `integrity_check=ok`, and the database survives SIGKILL
  with no orphaned journal. The loss is a **stale whole-array overwrite**:
  persisting `documents` is DELETE-then-INSERT and the existing guard only
  rejects an *empty* payload, so a client holding an outdated 11-document view
  silently deletes a 12th. Caught live — every row carried the same
  `updated_at`, written by a browser tab 13 s before a restart, destroying a
  document written seconds earlier.
- **Fix: optimistic concurrency.** `meta.revision` bumps on every documents
  write; `GET /state` returns `__revision`; the client echoes it on PUT; a
  mismatch is `409 stale_revision`, which routes into the re-read-and-merge
  reconcile path that already existed.
- **Four live defects that only running the containers could reveal:**
  1. `nginx.conf` used `location /api/db` (no trailing slash) with
     `proxy_pass .../`, so `/api/db/state` arrived at the sidecar as `//state`
     → 404. **Prod persistence was permanently offline, silently.**
  2. `frontend-dev` crash-looped: `pnpm dev` front-runs `scripts/adagio-dev.mjs`,
     a host-only supervisor that refuses any hostname but `adagio`. The
     container now runs `pnpm exec vite` directly.
  3. `vite.config.ts` merged `.env` *over* `process.env`, so the baked-in
     host-shaped `.env` overrode compose's container values. Precedence flipped.
  4. Dev TLS pointed at host Windows paths; the cert dir is now bind-mounted
     read-only at `/certs`.
- **The backup safety net did not exist.** `backup.ts` wrote snapshots to
  `/data/backups` while only the `.db` **file** was bind-mounted, so all ten
  snapshots lived in the container's writable layer and any recreate destroyed
  them. Rescued to the host first, then switched the mount to the directory.
- **Frontend loss vectors fixed:** the first-run placeholder no longer hard-codes
  `doc-1` and is not buffered until touched; merged state is re-adopted off a
  storage revision instead of a status edge that never fired; tombstones are
  offline-only and purged on hydrate; the unload flush no longer depends on
  `visibilityState`.
- **Tests: 0 → 41 persistence tests**, all `node --test`, no new dependencies.
  `db-schema.test.mjs` was orphaned (bare top-level asserts, wired to nothing)
  and is now `node:test` cases inside `pnpm test`. New suites: `state-http`,
  `durability` (SIGKILL round trip), `src/lib/storage.test.mjs`. Plus
  `scripts/verify-persistence.sh` — 16/16 green end-to-end across both stacks.
- **Branch audit:** all seven persistence branches were fully absorbed or
  deliberately superseded — nothing to merge. Archived as `archive/*` tags
  (pushed to origin) and deleted local + remote. `main` and `development`
  deliberately excluded.
- Commits `79a0465`, `f63ad35`; pushed.

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
