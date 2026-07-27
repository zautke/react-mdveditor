# CURRENT TASK STATE

_Compact resume point. Rewritten in place each refresh._
_Updated: 2026-07-26._

## Where things stand

Persistence is fixed, tested, and running. Both stacks are up **simultaneously**
against one shared database:

| Service | Origin | Status |
|---|---|---|
| `frontend-prod` (nginx) | `http://adagio.local:5200` | healthy |
| `frontend-dev` (vite) | `https://adagio.local:5250` | healthy |
| `url-sidecar` | `:5280` | healthy |
| `db-sidecar` | `127.0.0.1:15280` | healthy — **the single persistence source** |

Proof they share one database: both origins return the same `instanceId` *and*
the same `dbFileId` (host inode) from `/api/db/health`.

HEAD: `f63ad35` on `feat/media-copy-snapshot`, pushed. Working tree clean apart
from these continuity docs. Live database holds 13 documents, integrity `ok`.

## What was actually losing documents

Not durability. `synchronous=FULL`, `integrity_check=ok`, survives SIGKILL with
no orphaned journal. The loss was a **stale whole-array overwrite**: persisting
`documents` is DELETE-then-INSERT, and the only guard rejected an *empty*
payload — so a client holding an outdated view silently deleted every document
it could not see. Observed live during this session.

Fixed with optimistic concurrency: `meta.revision` → `__revision` on read →
echoed on write → `409 stale_revision` → re-read and merge.

## Verification (all green)

- `pnpm test` — 41 persistence tests + 8 pre-existing. 49/49.
- `bash scripts/verify-persistence.sh` — 16/16 end-to-end across both stacks,
  including a container bounce and SIGKILL. Non-destructive; restores state.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` — clean.

## Resume point

No in-flight edit. Highest-value next items, in order:

1. Surface `useSidecarStatus()` in the UI — it has **zero consumers**, so the app
   degrades to `offline` / `buffer-full` with no visible signal. `buffer-full`
   means "your typing is no longer being captured anywhere" and currently
   renders nothing.
2. CI — deliberately deferred this session ("tag for downstream"). Every test is
   hermetic and CI-ready; nothing runs on push today.

Full list in TASKS.md.

## Key files (persistence)

- `db-sidecar/db.ts` — schema, `meta.revision`, `DestructiveWriteError`,
  `StaleRevisionError`, `InvalidPayloadError`.
- `db-sidecar/server.ts` — `/state` routes, `/health` (now exposes `dbPath`,
  `dbFileId`, `backupDir`), `/events` SSE.
- `db-sidecar/backup.ts` — `VACUUM INTO` snapshots into `MDE_DB_BACKUP_DIR`.
- `src/lib/storage.ts` — offline buffer, heal loop, `reconcile()`, revision
  publish/subscribe (`subscribeToState` / `peekState` / `getStateRevision`).
- `src/components/markdown/EditorWithProview.tsx` — hydration, debounced saves,
  placeholder suppression, revision-driven re-adopt.
- `compose.yml` (db-sidecar + directory bind), `compose.dev.yml`, `nginx.conf`,
  `vite.config.ts`, `Makefile`, `.env`.

## Environment

Host is `adagio`. `pnpm`. Zero-tolerance lint. `make both-up` starts prod + dev
together; `make stack-down` is the only target that stops the shared sidecars.
