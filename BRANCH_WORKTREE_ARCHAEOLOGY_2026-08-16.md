# Branch / Worktree Archaeology — 2026-08-16

| | |
|---|---|
| Repository | `/Volumes/FLOUNDER/dev/mdeditor` (`github:/zautke/react-mdveditor`) |
| HEAD at audit start | `d1dcd18d96f5037f9d5ce41308f6d62886c1e900` on `development` |
| HEAD at completion | `bf1f799d31c7520aa64364c5e3c483467f503587` on `development` (== `main`) |
| Baseline for comparison | `development` — the branch with the most recent integration history |
| Git version | 2.54.0 (Apple Git-157) |
| Code index | jCodemunch `local/mdeditor-be42815f`, indexed `2026-07-05` — **stale** vs HEAD. Used for orientation only; every branch/commit claim here comes from git plumbing. |
| Scope | All local heads, all remote heads (enumerated via `git ls-remote`, not remote-tracking refs), all worktrees, reflog, stash, unreachable objects. |
| Cleanup executed | **Yes** — see [Executed sequence](#executed-sequence). Authorized by the user for local branches, worktrees, and remote branches under a tag-then-delete policy. |

## Executive decision

At audit start the repository held **17 local branches, 15 remote refs, 9 worktrees (5 dangling), 110 unreachable objects (11 commits), and 1 stash**.

Two lanes of real work had diverged from `origin/main` (`326ea43`) and **neither contained the other**:

- `development` — sqlite sidecar persistence, Makefile/Docker, `.verify` baselines
- `main` — tab-system extraction into `design-system/ui`, `apps/tabbar-harness`, deletion of the duplicated `src/components/ui/tabs/*`

`main`'s tip `c803233` was **unpushed** — `git branch -r --contains` returned empty. It existed only on local refs and two *dangling* worktree entries. That was the single highest data-loss risk in the repository and was resolved first.

End state:

- `main` and `development` both at `bf1f799`, pushed to origin
- Every other local branch, remote branch, and worktree removed
- 32 `archive/2026-08-16/*` tags on origin covering every deleted ref
- `on-deck/` holds patch bundles for the five lanes that could not be merged
- **0 unreachable commits** remain — the tags made all 11 reachable

### What was NOT mutated

- The primary worktree `/Volumes/FLOUNDER/dev/mdeditor` — never detached, never reset
- `stash@{0}` — still present, additionally tagged and exported to `on-deck/`
- No force-push, no history rewrite, no `gc --prune`, no `reflog expire`
- No branch deleted before its archive tag was confirmed present **on origin**

## Worktrees

| Path | Branch | State at audit | Decision | Outcome |
|---|---|---|---|---|
| `/Volumes/FLOUNDER/dev/mdeditor` | `development` | attached, clean | **CURRENT — DO NOT TOUCH** | untouched |
| `~/.codex/worktrees/5512/mdeditor` | `codex/tab-system-theme-api` | dir missing | prune | pruned |
| `~/.codex/worktrees/8d05/mdeditor` | `codex/feat-tabbar-extraction-harness` | dir missing | prune | pruned |
| `~/.codex/worktrees/sidecar-integrity/deploy` | `codex/adagio-sidecar-deploy` | dir missing | prune | pruned |
| `~/.codex/worktrees/sidecar-integrity/mdeditor` | `codex/adagio-sidecar-integrity` | dir missing | prune | pruned |
| `/Users/luke/.config/superpowers/worktrees/mdeditor/feature-media-zoom-panel` | `feature/media-zoom-panel` | dir missing, **different user account** | prune | pruned |
| `/Volumes/FLOUNDER/dev/mdeditor-consolidation-2026-02-24` | `consolidate/feature-branch-harvest-2026-02-24` | exists, clean, 13M | absorb → remove | absorbed into `on-deck/2026-02-24-consolidation/`, removed |
| `.worktrees/feat-excalidraw-doctype` | `feat/excalidraw-doctype` | exists, clean, 632M | merge → remove | merged, removed |
| `.worktrees/feat-open-in-mde` | `feat/open-in-mde` | exists, clean, 181M | merge → remove | merged, removed |

All three live worktrees were verified clean (`git status --porcelain` empty, `git diff` and `git diff --cached` empty) immediately before removal. Removal reclaimed ~826 MB.

Worktree removal was pulled forward from the cleanup phase into the merge phase: `/Volumes/FLOUNDER` was at **100% capacity with 157 MiB free**, and `pnpm install` could not run. Removal is safe out of order — it deletes checkouts, not branches, and every affected branch was already tagged.

## Local branches

`development` and `main` are covered above. Every other local branch:

### Merged into `development`

| Branch | Unique commits | Merge commit | Conflicts |
|---|---|---|---|
| `main` | 2 | `d2d3801` | none |
| `codex/adagio-sidecar-integrity` | 9 | `f51d50b` | none |
| `feat/open-in-mde` | 8 | `f81bbea` | none |
| `feat/excalidraw-doctype` | 1 | `9f5c0a6` | `pnpm-lock.yaml`, `EditorWithProview.tsx` |

Full commit IDs, chronological:

```
main
  786dc8f98ea059e31567afbdf054f708cc489eef  feat(tabs): extract tab system and add isolation harness
  c80323388e9686649b5d3d6e30ce1329d0a63e72  fix(tabs): complete keyboard and isolation verification

codex/adagio-sidecar-integrity
  58fc89f98400fd76a425c7d6074a67a671eb66ec  fix(persistence): supervise adagio sqlite sidecar
  3c1017d6345ea3de1e6988a839a70545d543ae86  fix(persistence): detect Windows supervisor entrypoint
  019cbaf1bb334ed60f0803a55727a07580ffb6c5  fix(persistence): load adagio runtime environment
  edd044010d31682bc141123300b41b922b5c41a1  fix(persistence): launch Vite through pnpm on Windows
  a1c876d063c5464e8c16eb213e09140d4c79bac7  fix(persistence): resolve pnpm command on Windows
  7f61418f4efa61e5ae2b4fe9521002aeb026accf  fix(persistence): spawn Windows commands through shell
  14ac9315c2e49cc1eb841b1371935ef696ac701c  fix(persistence): let pnpm own Vite startup
  ddda35ac6d484cc36f50d4e0cc0e52b241f513be  chore(dev): add adagio Windows launcher
  de123bc6fadcb8e77bc1d163c0abced46950101b  fix(dev): load adagio pnpm command from env

feat/open-in-mde
  7a87589c101ee019c89800e2f70227419a7663fa  feat(cli): add global open_in_mde + Finder Quick Action + Merlyn button
  29f23cd4fb242397757016735354fd5dfaca2d89  feat(editor): add Open-in-MDE quick-capture panel
  df3566cef7c7b7051a05f9ea87ee1ee6e0f10233  docs: research — inline first-level Finder menu via FinderSync
  b9fb551bd66bdd0701983a4131de3f23b48fa7dc  feat(macos): first-level Finder 'Open in MDE' via FinderSync extension
  5e4772c644a444ffd000b7d5fda4af8bc6519850  fix(macos): keep app-sandbox entitlement when re-signing FinderSync appex
  a9d02a9f4fbacf490b63270e0949fc31f68fd5dc  feat(examples): add open-in-mde-button.tsx doctype demo + window bridge
  1cc584a74388719b42f4361e6488d6433a026d9d  fix(cli): probe candidate origins via /api/ping heartbeat before cold-start
  13c1b9374d7441672281a44ac4f38ac2ed8d82a7  fix(cli): reuse existing Chrome MDE tab instead of opening a new one

feat/excalidraw-doctype
  3734166af436149d28d10ec595fd424af4edf1f0  feat(doctype): add Excalidraw doctype (WIP)
```

No cherry-picking was required — all four merged as branches.

### Delete-safe by reachability

| Branch | Evidence |
|---|---|
| `feat/editable-tab-names-download-save` | 0 unique commits vs `development` |
| `feat/graphviz-doctype` | 0 unique |
| `feat/json-doctype` | 0 unique |
| `feature/media-zoom-panel` | 0 unique |
| `codex/tab-system-theme-api` | tip identical to `main` (`c803233`) |
| `codex/feat-tabbar-extraction-harness` | tip identical to `main` (`c803233`) |
| `codex/adagio-sidecar-deploy` | tree **identical** to `codex/adagio-sidecar-integrity`; `git diff` between tips is empty. Merging both would have been a no-op with extra history. |

### Salvaged, then deleted

Real unique work that conflicts with `development`. Preserved in `on-deck/` *and* by archive tag.

| Branch | Commit | Conflicts | Value |
|---|---|---|---|
| `feat/handle-frontmatter` | `d9f2924ad86f599e71861adea38f4d5ca4e00228` | `package.json`, `pnpm-lock.yaml`, `EditorWithProview.tsx` | frontmatter ignore/format, `FrontMatterPreview.tsx` |
| `feat/persist-user-state` | `dcdf0f193854cd536cda3182663e1db01da552ce` | `EditorWithProview.tsx` | single-key `mdeditor:state:v1` model |
| `feat/use-design-system` | `d3ffe0bd3664587354ee06207df3ef005ff9ccf2` | 6 files + **file/directory collision on `design-system`** | `theme-toggle.tsx`, `use-theme.ts`, token CSS |
| `off-dev-021326` | `fb3e8fd160bf6df3139ad44c972e936f8a23a89a` (the other 4 commits are patch-equivalent in `development`) | 10 files | document-kind system, `icon-label.tsx`, doc-type architecture docs |
| `consolidate/feature-branch-harvest-2026-02-24` | `575ff331d5a6c49e0678435ffc6c64a4008219be` | none (docs-only) | the pre-existing 2026-02-24 patch bundle — absorbed rather than re-derived |

## Remote refs

Enumerated with `git ls-remote --heads origin`, which is authoritative. **Local remote-tracking refs were stale and materially misleading** — see [Late findings](#late-findings).

### Mirror matrix

| Remote ref at audit start | Local counterpart | Relationship | Outcome |
|---|---|---|---|
| `origin/main` `326ea43` | `main` `c803233` | local 2 ahead, remote behind | fast-forwarded, then converged |
| `origin/development` `d1dcd18` → `ee4ffec` | `development` | **advanced mid-session** | reconciled, see below |
| `origin/feat/tab-ui-refactor` | — | == `origin/main` (`326ea43`), 0 unique | deleted |
| `origin/feat/enhanced-makefile-docker` | — | both commits `-` under `git cherry`; already patch-equivalent (landed as `7d51107`) | deleted |
| `origin/fix/react-doc-imports-adagio` | — | 2 unique, conflicts | salvaged → `on-deck/` → deleted |
| `origin/feat/media-copy-snapshot` | — | **8 unique, newest work in repo** | merged |
| `origin/feat/modal-diagram-zoom-pan` | — | strict ancestor of `media-copy-snapshot` | deleted |
| `origin/codex/*`, `origin/consolidate/*`, `origin/feat/persist-user-state` | present as stale remote-tracking refs | **not on origin** — removed by an earlier cleanup | n/a; tagged from local anyway |

### `origin/development` moved mid-session

Between the audit and the push, `origin/development` advanced from `d1dcd18` to `ee4ffec` — a merge of `feat/enhanced-makefile-docker` that also carried the adagio sidecar chain via the **`codex/adagio-sidecar-deploy`** commit objects. Local `development` had already merged **`codex/adagio-sidecar-integrity`**, whose tree is identical.

The push was rejected. It was **not** forced. `git fetch` + inspection confirmed the trees converge:

```
SAME  scripts/adagio-dev.mjs
SAME  scripts/sidecar-health.mjs
SAME  db-sidecar/server.ts
SAME  src/lib/sidecar-status.tsx
SAME  scripts/migrate-adagio-db.mjs
```

Reconciled in merge `43ecd4c`, conflicts on `package.json` and `vite.config.ts` resolved in favor of the typecheck fixes.

### Late findings

`origin/feat/media-copy-snapshot` and `origin/feat/modal-diagram-zoom-pan` **did not appear in `git for-each-ref refs/remotes`** at audit time and so were absent from the approved plan. They surfaced only when the deletion list was built from `git ls-remote` rather than from remote-tracking refs.

`feat/media-copy-snapshot` turned out to hold the **newest work in the repository** (through 2026-07-26, versus `development`'s 2026-07-12), including a silent data-loss fix:

```
f63ad35e0c6f1654c39914ac8ab36580d8d851e3
fix(persistence): reject malformed document payloads, unbreak container mounts

  A `documents` PUT whose value was not an array returned 200 and wrote nothing,
  so a client with a malformed body believed its work was saved. It is now a 400
  `invalid_payload`, with a regression test.
```

Its eight unique commits, chronological:

```
1a2bf4ad281232a0d2df532a80d1e56cdd75ea83  feat(media): modal diagram zoom + drag viewport
d34de69913c407325601b0b30c277e080ade9304  feat(media): exponential symmetric zoom, live %, 5000% cap, clipped viewport
26218de1ec37922b81098be7f88d864aca6f5e3d  feat(media): copy image / base64 / source icon buttons with success morph
2795e44a7cb854e9de95a759ff4bcccc5b0190a1  feat(media): tune copy icons, extend to images/videos, add success toasts
45427116cd57bbe06ea2ebffd441865bac1422fa  docs: continuity
79a0465c3008356cb39a8bb5ccac94ea0618eadb  media zoom and persistence stress test
f63ad35e0c6f1654c39914ac8ab36580d8d851e3  fix(persistence): reject malformed document payloads, unbreak container mounts
ec8a2b82d7ede47601a44a0f0aa9f437002e515a  docs(continuity): record the persistence root cause, fixes, and invariants
```

Files it brought that `development` lacked entirely: `MediaZoomViewport.tsx`, `copy-icon-button.tsx`, `media-capture.ts`, `use-media-clipboard.ts`, `storage.test.mjs` (33 tests), `state-http.test.mjs`, `durability.test.mjs`.

Deletion was halted, the user was consulted, and the branch was merged as `bf1f799`.

**Lesson:** enumerate remote branches with `git ls-remote`, never with `git for-each-ref refs/remotes`. Remote-tracking refs reflect the last fetch's refspec, not the remote.

## Unreachable objects

`git fsck --full --no-reflogs --unreachable` found **110 objects, 11 of them commits**. All 11 are now tagged under `archive/2026-08-16/unreachable/`; `git fsck` now reports **0 unreachable commits**.

Authored content, exported to `on-deck/unreachable/`:

```
7228c2e4fc18b067cbc614bbc9c9e16a5d81bc6c  2026-01-01  On spike/shadcn-migration: docker server work
                                          EditorWithProview.tsx +237/-291, src/main.tsx
a8e19b781a646c3c4b734bd25a83403d81e49057  2026-02-14  WIP on feat/html-doc-type
                                          CLAUDE_NOTES.md +37
```

Six `Codex Snapshot` commits (`1f619c49…`, `a703137a…`, `8f5af462…`, `abded2a7…`, `f59e6caa…`, `27bfc0a5…`) are automated checkpoints that precede and are superseded by `feat/use-design-system` (`d3ffe0b`). Exported as source-only patches for provenance; not applied.

Tagged but **not** exported — no authored content, must not be cherry-picked:

```
c11363e2ede4bbb074eaaa7fe27eb50925a3cd56  index on spike/shadcn-migration
a9660b4d7509246f88a5c9ebcc73db407ddd527b  index on feat/html-doc-type
2c6e79c3e46c88908ad984c9452be8c9fe25ea63  Merge branch 'feat/persistence-migration' into merge-test
```

### Stash

```
stash@{0} = 6a8ee83be475db62cc5e5d40f1409374f1803e30
WIP on development: 543ed0a docs: branch audit and cleanup plan (2026-02-24)
5 files, 204 insertions(+), 173 deletions(-)
```

It edits **both** copies of `tab-system.variants.ts`. Merging `main` deleted `src/components/ui/tabs/`, so the stash no longer applies. It was exported to `on-deck/stash-6a8ee83/` **before** that merge, and tagged as `archive/2026-08-16/stash-0-tab-variants`. The stash entry itself was left in place — deleting it was not authorized and it costs nothing.

## Indexed-code findings

**Duplicate implementation, now resolved.** `development` shipped the tab system twice:

```
src/components/ui/tabs/                          (TabSystem.tsx, hooks/, variants, types)
design-system/ui/src/components/tab-system/      (tab-system.tsx, hooks/, variants, types)
```

`main`'s extraction commits delete the former and consolidate on the latter as the `@braisenly/ui` workspace package. Merging `main` removed the duplication — the single largest structural win of this consolidation, and a correctness fix rather than tidying: `stash@{0}` demonstrates edits being made to both copies in the same session.

**Stale build output.** `design-system/ui/dist/tab-system.d.ts` did not contain `onRenameTab`, which the source has had since before the audit. `tsc` reported `Property 'onRenameTab' does not exist on type 'TabSystemProps'` against source that plainly declares it. `pnpm --filter @braisenly/ui build` cleared it. Any consumer of `@braisenly/ui` types must build the package first; `apps/tabbar-harness` encodes this as a `predev`/`prebuild` hook, the root app does not.

**Index staleness.** jCodemunch's index is dated `2026-07-05` against a HEAD of `2026-07-12` at audit start. It was used only for the opening orientation query. No claim in this report rests on it.

## Verification defect found and fixed

`pnpm typecheck` ran `tsc --noEmit` against `tsconfig.json` — a solution-style config with `"files": []` and only project references. **Without `-b`, that checks nothing and always exits 0.** No TypeScript error in this repository had ever been caught by the script.

This was discovered mid-consolidation, after three merges had been reported as "typecheck clean". Those three reports were vacuous and were retracted.

Fixed in `9256720`: the script is now `tsc -b`. Verified non-vacuous by injecting a deliberate type error and confirming a non-zero exit, then removing it.

Errors the real check then surfaced, all fixed:

| Error | Origin |
|---|---|
| `EditorWithProview.createDocFromText` omitted the required `persistedToFileSystem` field | **Cross-lane integration bug.** The function came from the open-in-mde lane, which branched before the sidecar lane added the field to `EditorDocument`. Every sibling construction site already set it. |
| `vite.config.ts` TS7016 — untyped `./scripts/sidecar-health.mjs` | sidecar merge; fixed with `scripts/sidecar-health.d.mts` |
| `vite.config.ts` TS2769 — async config rejected | sidecar merge. Vite exports `UserConfigFnPromise`, but without a return annotation the returned object literal is not contextually typed against `UserConfig`, so overload resolution fails with a misleading error. Fixed with an explicit `Promise<UserConfig>` annotation. |
| `JsonPreview.tsx`, `MdxCodeblock.tsx` TS6133 — unused React default import | **Pre-existing.** Both files are byte-identical to their `d1dcd18` versions; confirmed by diff. Unrelated to the merges, but they blocked a clean typecheck. |

`vite.config.ts` was confirmed type-clean at `d1dcd18` by checking out that revision of the file and typechecking `tsconfig.node.json` against it — so its two errors were genuine regressions introduced by the sidecar merge, invisible only because the script was a no-op.

## Executed sequence

1. `git push origin main` — resolved the unpushed-tip risk before anything else
2. Created 30 annotated `archive/2026-08-16/*` tags; `git push origin --tags`; verified with `git ls-remote --tags`
3. Built `on-deck/`; exported `stash@{0}` **first**, since merging `main` would break it; committed `2002e93`
4. `git worktree prune`, then `git worktree remove` ×3 — pulled forward to reclaim disk
5. Merges `d2d3801`, `f51d50b`, `f81bbea`, `9f5c0a6`; each preceded by a fresh `git merge-tree --write-tree` against the moved baseline
6. `9256720` — typecheck script fix and the errors it exposed
7. `43ecd4c` — reconciled with the mid-session `origin/development`
8. Tagged and merged the late finding as `bf1f799`
9. `git switch main && git merge --ff-only development`; `git push origin development main`
10. Pre-deletion gate: every ref proven either an ancestor of `development` **or** carrying an archive tag confirmed present on origin
11. Deleted 15 local branches, then 13 remote branches

## Verification

Run against the final tree at `bf1f799`:

| Check | Result |
|---|---|
| `pnpm typecheck` (`tsc -b`, both projects) | pass |
| `pnpm lint` (`--max-warnings 0`) | pass |
| `pnpm build` (`vite build --mode production`) | pass |
| `pnpm test:persistence` | 41 tests, 41 pass |
| `pnpm test:sidecar` | 8 tests, 8 pass |
| `bash tests/open-in-mde.test.sh` | 14 pass, 0 fail |
| `pnpm --filter @braisenly/ui test` | 22 tests, 22 pass |

Final state:

```
git branch --list      → development, main   (both at bf1f799)
git branch -r          → origin/development, origin/main
git worktree list      → primary only
git status --short     → clean
git fsck --unreachable → 0 unreachable commits
git ls-remote --heads  → development, main
archive tags on origin → 32
```

### Not run

- No browser/visual verification of the tab system after `src/components/ui/tabs/` was deleted. The design-system suite covers it at unit level (22 tests including drag-reorder, overflow, close, rename), and the production build succeeds, but tab behaviour was not exercised in a running app.
- `macos/finder-sync` — a Swift/Xcode appex. Merged as source, never built. Not wired into any pipeline.
- `apps/tabbar-harness` Playwright e2e (`pnpm --filter @braisenly/tabbar-harness test:e2e`). Playwright browser binaries are a hard prohibition on this machine; pnpm's `onlyBuiltDependencies: [esbuild]` blocked the postinstall, and `~/Library/Caches/ms-playwright` was confirmed absent before and after install.
- `pnpm dev` — the dev script now supervises the sqlite sidecar and refuses to run away from its expected host.

## Residual risks

- **`/Volumes/FLOUNDER` is at 100% capacity**, 914 MiB free after reclaiming ~826 MB of worktrees. This blocked `pnpm install` mid-consolidation and remains the most likely cause of a future failure in this repository.
- **`on-deck/fix-react-doc-imports-adagio/` is unmerged and valuable.** `src/lib/react-preview/cdn.ts` and `import-parser.ts` do not exist on `development`; React preview documents cannot resolve external CDN imports without them. Highest-value outstanding pickup.
- **`feat/excalidraw-doctype` was author-marked WIP** and is now on `main`. It typechecks, lints, and builds, but its runtime behaviour was not exercised.
- **Two lanes merged the same content via different commit objects** (`codex/adagio-sidecar-integrity` locally, `codex/adagio-sidecar-deploy` via `origin/development`). History shows both; trees are identical. Harmless, but `git log` will show apparent duplicates such as two `fix(dev): load adagio pnpm command from env`.
- **The jCodemunch index is stale** and should be re-indexed against `bf1f799`.

## Recovery

Every deleted ref is recoverable from origin:

```bash
git fetch origin --tags
git tag -l 'archive/2026-08-16/*'
git switch -c salvage/<name> archive/2026-08-16/<name>
```

Patch bundles and the per-lane risk map live in [`on-deck/INDEX.md`](on-deck/INDEX.md). The archive tags are the authoritative recovery vector; the patches are a convenience layer for hunk-picking.
