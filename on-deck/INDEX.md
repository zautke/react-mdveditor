# On-Deck — Salvaged Branch Work

Work preserved during the **2026-08-16 repo consolidation**, when the repository was
reduced to `main` + `development` only.

Nothing here is merged. Everything here is *recoverable*.

## Recovery vectors, in order of fidelity

1. **Archive tags on `origin`** — full history, exact trees, nothing lost.
   ```bash
   git fetch origin --tags
   git tag -l 'archive/2026-08-16/*'
   git switch -c salvage/<name> archive/2026-08-16/<name>
   ```
   This is the authoritative vector. The patches below are a convenience layer for
   reading and hunk-picking without checking anything out.

2. **Patches in this directory** — text-only. Binaries (screenshots, lockfiles) were
   deliberately excluded to keep the tree small; they live in the tags.

## Pickup order

Ranked by value to `development` as of 2026-08-16.

| # | Lane | Why | Archive tag |
|---|---|---|---|
| — | ~~[`fix-react-doc-imports-adagio/`](fix-react-doc-imports-adagio/)~~ | **PICKED UP 2026-08-16.** `cdn.ts` and `import-parser.ts` were restored byte-identical and integrated against development's current preview architecture; see `feat(react-preview): resolve external npm imports from the CDN`. Kept here for provenance — the bundle's `ReactPreview.tsx` was *not* used, it predates the diagnostics/shared-isolated split. | `archive/2026-08-16/fix-react-doc-imports-adagio` |
| 1 | [`2026-02-24-consolidation/`](2026-02-24-consolidation/) | Four legacy lanes already triaged in Feb with a per-lane behavior-replacement risk map. Read its `README.md` before applying any of them. | see that README |
| 2 | [`stash-6a8ee83/`](stash-6a8ee83/) | Tab-system variant work, uncommitted. **Historical only** — see note below. | `archive/2026-08-16/stash-0-tab-variants` |
| 3 | [`unreachable/`](unreachable/) | Dangling objects recovered from `git fsck`. Mostly superseded. | `archive/2026-08-16/unreachable/*` |

## Lane summaries

### `fix-react-doc-imports-adagio/` — picked up 2026-08-16

Base `b42622433530d2673c021649cd0e4fabab243be0`. Two commits:

```
ef32ad9f0e32962d01aee72d36c9d8f578b414da  (interim)
769f5ed399354cf04fd38aa48eedeff0c8006aaf  life by design
```

Adds `src/lib/react-preview/cdn.ts`, `src/lib/react-preview/import-parser.ts`, rewrites
`ReactPreview.tsx`, and ships two test samples exercising external imports.

**Resolved.** `cdn.ts` and `import-parser.ts` were restored byte-identical and wired
into `buildScope()`; `compile.ts` no longer blocks bare npm specifiers. The bundle's
`ReactPreview.tsx` was deliberately *not* applied — it predates development's
diagnostics system and shared/isolated split, so the integration was written fresh.

Integrating surfaced three bugs, two of them latent in this bundle: side-effect imports
were dropped by a greedy regex group, and default imports resolved to the module
namespace because `import()` namespaces carry no `__esModule`. Both are fixed in
`development` with tests. Anyone re-reading these patches should not reintroduce them.

Conflicts against `development`: `.gitignore`, `.serena/.gitignore`, `.serena/project.yml`,
`src/components/markdown/ReactPreview.tsx`. The `.serena/*` and `.gitignore` conflicts are
noise — take `development`'s side.

### `2026-02-24-consolidation/`

Absorbed verbatim from the `consolidate/feature-branch-harvest-2026-02-24` branch, which
was deleted in this consolidation. Covers `off-dev-021326`, `feat/handle-frontmatter`,
`feat/persist-user-state`, `feat/use-design-system`.

Its `README.md` carries the per-lane replacement-risk map. The headline warning still
holds and has only gotten sharper: **`off-dev-021326` applied wholesale would replace the
plugin-registry dispatch in `EditorWithProview` with older hardcoded markdown/mermaid
logic.** Hunk-pick only.

Note `feat/use-design-system` also collides file-vs-directory on `design-system` — that
path is now a real pnpm workspace, so its `full.patch` cannot be applied directly at all.
Use `source-only.patch`.

### `stash-6a8ee83/`

```
6a8ee83be475db62cc5e5d40f1409374f1803e30
WIP on development: 543ed0a docs: branch audit and cleanup plan (2026-02-24)
5 files, 204 insertions(+), 173 deletions(-)
```

**This patch no longer applies.** It edits *both* copies of `tab-system.variants.ts` —
`src/components/ui/tabs/` and `design-system/ui/src/components/tab-system/`. The
2026-08-16 merge of `main` deleted the former as part of de-duplicating the tab system.
Exported before that merge specifically so the content survives; kept for reference on
what the variants looked like mid-refactor.

### `unreachable/`

Recovered from `git fsck --unreachable`. All tagged under
`archive/2026-08-16/unreachable/`.

| Patch | Note |
|---|---|
| `7228c2e-shadcn-docker-server-work.patch` | Stash WIP, 2026-01-01. `EditorWithProview.tsx` +237/−291. Predates the plugin registry; historical. |
| `a8e19b7-wip-html-doc-type.patch` | Stash WIP, 2026-02-14. `CLAUDE_NOTES.md` +37 only. |
| `codex-snapshot-{1..6}-*.patch` | Auto-snapshots, 2025-12 → 2026-01. Precede and are superseded by `feat/use-design-system`. Kept for provenance, not for application. |

Not exported as patches (bookkeeping objects, no authored content — tags only):
`c11363e2…` and `a9660b4d…` (`index on …` stash index objects), `2c6e79c3…` (a scratch
`merge-test` merge).

## Applying anything from here

Patches are known-conflicting by construction — these lanes were parked *because* they
conflict. `git apply --check` failing is the expected result, not a defect.

```bash
git switch -c salvage/<lane> development
git apply --reject --whitespace=fix on-deck/<lane>/<patch>
# review every .rej, then stage deliberately
git add -p
```

Prefer branching from the archive tag when you want the real history rather than a diff.
