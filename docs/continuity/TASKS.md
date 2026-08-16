# TASKS

_Checkbox state + follow-ups. Supersede stale items in place._
_Last refreshed: 2026-08-16._

## Done — React preview CDN imports (2026-08-16)

Salvaged `on-deck/fix-react-doc-imports-adagio`, the top follow-up from the
consolidation. React preview documents can now import published npm packages.

- [x] Restore `cdn.ts` and `import-parser.ts` byte-identical from the archive tag
- [x] `buildScope()` extends the import map with CDN-loaded packages; a package
      that fails to load is reported and skipped, not fatal
- [x] `UNSUPPORTED_IMPORT` now fires only for relative/absolute paths, which
      genuinely cannot resolve in a single-file preview
- [x] Shared mode resolves packages asynchronously with a race guard and a
      placeholder, so no spurious "module not found" flashes while fetching
- [x] Isolated mode's iframe fetches the same packages and serves them from its
      `require` shim, including deep imports into a root-loaded package
- [x] Fix: side-effect imports were dropped — a greedy optional clause group ran
      past the statement and captured the next one's specifier
- [x] Fix: default imports resolved to the namespace, not the export, because
      `import()` namespaces carry no `__esModule` for the CJS interop
- [x] Fix: a CDN package building against the CDN's React hit a null dispatcher
      in shared mode (two React copies); the shared→isolated auto-fallback now
      recognises that signature
- [x] 15 tests via `pnpm test:preview`; full suite 64
- [x] Verified in Chrome against the production build, both modes and the fallback

### Follow-ups

- [ ] `pnpm preview` cannot start without the db sidecar. `assertSidecarHealthy`
      is gated on `command === 'serve'`, but Vite reports `serve` for *preview*
      as well as dev, so serving a production build locally fails with
      `TypeError: fetch failed` from the config. Decide whether preview should
      require persistence at all; if not, gate on the dev server only
- [ ] Shared mode cannot share React with CDN packages that use hooks or
      context. It auto-falls back to isolated, which is correct but silent —
      consider telling the user why the mode changed. A real fix needs a
      document-level import map aliasing `react` to the app's instance

## Done — repo consolidation (2026-08-16)

Full audit and evidence: [`BRANCH_WORKTREE_ARCHAEOLOGY_2026-08-16.md`](../../BRANCH_WORKTREE_ARCHAEOLOGY_2026-08-16.md).
Salvaged-but-unmerged work: [`on-deck/INDEX.md`](../../on-deck/INDEX.md).

Started from 17 local branches, 15 remote refs, 9 worktrees (5 dangling),
11 unreachable commits, 1 stash. Ended at `main` + `development` only,
both at `bf1f799`, one worktree, 0 unreachable commits.

- [x] Push `main` — its tip `c803233` was unpushed and existed only on this
      disk plus two dangling worktree entries
- [x] Tag every ref slated for deletion as `archive/2026-08-16/*`; push and
      verify all 32 on origin before deleting anything
- [x] Build `on-deck/` — patch bundles for the lanes that cannot merge;
      export `stash@{0}` first, since merging `main` breaks it
- [x] Merge `main` — tab-system extraction into `design-system/ui`,
      `apps/tabbar-harness`, and deletion of the duplicated
      `src/components/ui/tabs/*`. `development` had been shipping the tab
      system twice
- [x] Merge `codex/adagio-sidecar-integrity` — sidecar supervision, Windows
      launcher, migrate/health scripts, 4 test files
- [x] Merge `feat/open-in-mde` — CLI, Finder Quick Action, FinderSync appex,
      `/api/ping` heartbeat, quick-capture panel
- [x] Merge `feat/excalidraw-doctype`
- [x] Merge `feat/media-copy-snapshot` — found late, held the newest work in
      the repo including the `documents` non-array payload data-loss fix and
      33 storage tests
- [x] Reconcile with `origin/development`, which advanced mid-session; no
      force-push
- [x] Converge `main` to `development` by fast-forward; push both
- [x] Prune 5 dangling worktrees, remove 3 live ones (~826 MB reclaimed)
- [x] Delete 15 local and 13 remote branches behind a gate requiring each ref
      to be an ancestor of `development` or carry a tag confirmed on origin

### Fixed along the way

- [x] `pnpm typecheck` was `tsc --noEmit` against a solution config with
      `"files": []` — it checked nothing and always exited 0. No TypeScript
      error in this repo had ever been caught by it. Now `tsc -b`, verified
      non-vacuous by injecting a deliberate error
- [x] `createDocFromText` omitted the required `persistedToFileSystem` field
      — the open-in-mde lane branched before the sidecar lane added it
- [x] `vite.config.ts` — typed the `sidecar-health.mjs` import, annotated the
      async config's return as `Promise<UserConfig>` so overload resolution
      picks `UserConfigFnPromise`
- [x] Dropped unused React default imports in `JsonPreview.tsx` and
      `MdxCodeblock.tsx` (pre-existing, blocked a clean typecheck)

### Follow-ups

- [x] Pick up `on-deck/fix-react-doc-imports-adagio/` — done, see
      "Done — React preview CDN imports" below
- [x] Exercise the tab system in a running app — verified in Chrome against
      the production build: tab creation, switching, per-tab content, doctype
      icons and the close affordance all work from the merged `@braisenly/ui`
      package
- [ ] `/Volumes/FLOUNDER` is at 100% capacity (914 MiB free). This blocked
      `pnpm install` mid-consolidation
- [ ] `pnpm test` failed once non-reproducibly, immediately after `pnpm build`
      in the same shell; 4 later runs passed 49/49. Not isolated. Watch it in
      CI before trusting the suite as deterministic
- [x] Re-index jCodemunch — reindexed, now 165 files / 10,373 symbols
- [ ] Consider a root `predev`/`prebuild` hook that builds `@braisenly/ui`.
      A stale `design-system/ui/dist` made `tsc` report `onRenameTab` missing
      from source that declares it. `apps/tabbar-harness` already does this

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
