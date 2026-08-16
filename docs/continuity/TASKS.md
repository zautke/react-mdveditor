# TASKS

_Checkbox state + follow-ups. Supersede stale items in place._
_Last refreshed: 2026-07-26._

## Done — persistence (2026-07-26)

- [x] Start prod **and** dev containers together on one shared persistence source
- [x] Prove the shared source by identity (`instanceId` + host `dbFileId` match
      across `:5200` and `:5250`), not just by behaviour
- [x] Fix `nginx.conf` `/api/db` prefix strip — prod persistence was 404ing
      (`//state`) and had been silently offline for its entire existence
- [x] Fix `frontend-dev` crash loop (`pnpm dev` runs a host-only supervisor;
      container now runs `pnpm exec vite`)
- [x] Fix `vite.config.ts` env precedence — `.env` was overriding compose values
- [x] Bind-mount the dev TLS cert directory at `/certs`
- [x] Rescue 10 backup snapshots stranded in the container's writable layer
- [x] Bind the database **directory** instead of the `.db` file, so the journal
      and backups live on the host
- [x] Make backup dir / retention / interval configurable; correct `backup.ts`'s
      two false docstring claims (WAL, "named volume")
- [x] Optimistic concurrency: `meta.revision`, `__revision` on read, `409
      stale_revision` on stale write — **the actual document-loss fix**
- [x] Guard `DELETE /state/documents` (was an unguarded full wipe)
- [x] Non-array `documents` payload is now `400 invalid_payload` (was a silent 200)
- [x] Client: unique first-run id, no buffering of an untouched placeholder
- [x] Client: revision-driven re-adopt of merged state (was keyed off a status
      edge that never fired for the case that mattered)
- [x] Client: tombstones offline-only + purged on hydrate
- [x] Client: unconditional `pagehide`/`beforeunload` flush
- [x] Rewire orphaned `db-schema.test.mjs` into `node:test` + `pnpm test`
- [x] New suites: `state-http`, `durability` (SIGKILL), `src/lib/storage.test.mjs`
- [x] `scripts/verify-persistence.sh` + `make test` / `make verify-persistence`
      / `make both-up` / `make stack-down` / `make db-backup`
- [x] Scope `prod-down`/`dev-down` so they stop only their own frontend — a bare
      project `down` was taking the shared database sidecar with it
- [x] Sync `scripts/list-tasks.ps1` with the Makefile; correct `MAKEFILE.md`'s
      false "mutually exclusive" claim
- [x] Strip the UTF-8 BOM from `.env` (broke `source .env` in bash)
- [x] Branch audit: archive `archive/*` tags pushed, absorbed persistence
      branches deleted local + remote

## Open follow-ups

- [ ] **Surface `useSidecarStatus()` in the UI.** Zero consumers today, so
      `offline` and `buffer-full` are invisible. `buffer-full` means typing is no
      longer captured anywhere — it must not render nothing.
- [ ] **CI** — deferred by decision ("tag for downstream"). All 49 tests are
      hermetic (temp dirs, spawned sidecars, no Docker, no host paths) and would
      run as-is on `node --test`. Nothing runs on push today.
- [ ] `MDE_ADAGIO_DB_PATH` duplicates `${MDE_DB_DIR}/${MDE_DB_FILENAME}` — either
      delete it or add an env-contract test asserting they agree (SSoT).
- [ ] Consider an env-contract test: every `${VAR}` used in `compose*.yml` exists
      in `.env.example`, and `list-tasks.ps1` matches the Makefile `.PHONY`.
- [ ] A `doc-1 / Untitled-1` placeholder is sitting in the live database — an
      artifact of the old hard-coded first-run id. Harmless; delete it in the UI
      if unwanted.
- [ ] Non-blocking capture for oversized diagrams — snapDOM freezes the renderer
      ~30 s on the giant turn-flow Mermaid map.
- [ ] Live-verify image/video copy buttons and the copy-image toast string.
- [ ] Decide whether to open PRs for `feat/modal-diagram-zoom-pan` and
      `feat/media-copy-snapshot`.

## Verification commands

- `pnpm typecheck && pnpm lint && pnpm build`
- `pnpm test` — 49 tests
- `bash scripts/verify-persistence.sh` — 16 end-to-end assertions, both stacks
- `make both-up` / `make list`
