# PLANS

_Source of truth for goals/phases. Rewritten in place; supersede stale facts._
_Last refreshed: 2026-07-26._

## Current goal

**Stop losing documents.** Persistence must be correct under concurrent clients,
proven by tests that run on every change, and wired identically into the prod and
dev Docker stacks against one shared database.

Secondary (previous goal, complete): media-frame interaction polish — modal
diagram zoom/pan and copy image/base64/source.

## Phases

1. **Stand both stacks up** — DONE. prod (`5200`) and dev (`5250`) run together
   in one Compose project. `db-sidecar` is defined only in `compose.yml`, which
   both merges include, so they *structurally* cannot diverge onto different
   databases.
2. **Find the real loss mechanism** — DONE. Not durability. A stale whole-array
   PUT: `documents` persists as DELETE-then-INSERT and the only guard rejected an
   empty payload, so an outdated client silently deleted what it could not see.
3. **Fix it** — DONE. Optimistic concurrency end to end (`meta.revision` →
   `__revision` → echoed on PUT → `409 stale_revision` → re-read and merge), plus
   the client-side vectors: placeholder id collision, status-edge re-adoption,
   accumulating tombstones, unload flush.
4. **Make the safety net real** — DONE. Backups were being written into the
   container's writable layer because only the `.db` file was bind-mounted. The
   directory is now bound; snapshots are host-visible and immune to `down -v`.
5. **Bake in the tests** — DONE. 41 persistence tests under `node --test` with no
   new dependencies, plus a 16-assertion end-to-end script covering both stacks.
6. **Remaining** — see TASKS.md. Notably: surface the storage status in the UI
   (it degrades silently today), and CI (deferred by decision).

## Current facts

- HEAD `f63ad35` on `feat/media-copy-snapshot`, pushed.
- One `db-sidecar` serves both stacks; verified by matching `instanceId` and
  host inode `dbFileId`.
- Database: `${MDE_DB_DIR}/${MDE_DB_FILENAME}` =
  `C:/Users/me/AppData/Local/mdeditor/data/mdeditor.db`, directory-bound at
  `/data`. Snapshots in `data/backups/` on the host.
- `journal_mode=DELETE`, `synchronous=FULL` — asserted by test.
- Test surface: `pnpm test` (49), `bash scripts/verify-persistence.sh` (16).
- Branch state: all absorbed persistence branches archived as `archive/*` tags
  on origin and deleted. `main` and `development` untouched.

## Non-goals

- **Switching SQLite to WAL.** Its `-shm` mmap is what breaks over a Docker
  Desktop bind mount. There is a test pinning `DELETE`.
- Adding a second test runner or a DOM test environment — `storage.ts` resolves
  `fetch`/`localStorage` off the global at call time, so `node --test` with
  global stubs covers it with zero dependencies.
- Env-indirecting container-internal paths — only the host side of a bind is
  configuration.
- Reintroducing GSAP or `@panzoom/panzoom` (the April 2026 rewrite that
  destabilised the app; fully rewound — see REMEMBER.md).
