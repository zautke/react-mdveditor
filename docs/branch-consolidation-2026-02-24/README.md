# Branch Consolidation Bundle - 2026-02-24

## What this is
This worktree consolidates all remaining non-merged feature-branch work into patch bundles.

- Worktree path: `/Volumes/FLOUNDER/dev/mdeditor-consolidation-2026-02-24`
- Branch: `consolidate/feature-branch-harvest-2026-02-24`
- Base commit: `b426224` (`development` tip at consolidation time)
- Merge status: **No merge performed**
- App code status in this branch: **unchanged** (only docs/patch artifacts added)

## Included patch bundles
Directory: `docs/branch-consolidation-2026-02-24/patches`

1. `off-dev-021326-fb3e8fd-full.patch`
2. `off-dev-021326-fb3e8fd-focused.patch`
3. `feat-handle-frontmatter-d9f2924-full.patch`
4. `feat-handle-frontmatter-d9f2924-focused.patch`
5. `feat-persist-user-state-dcdf0f1-full.patch`
6. `feat-persist-user-state-dcdf0f1-focused.patch`
7. `feat-use-design-system-d3ffe0b-full.patch`
8. `feat-use-design-system-d3ffe0b-source-only.patch`

## Exact behavior replacement risk map

### `off-dev-021326` (`fb3e8fd`)
If applied wholesale, this patch replaces the current plugin-registry flow in `EditorWithProview` with older hardcoded markdown/mermaid logic:
- renderer dispatch
- kind detection path
- new-tab menu construction
- import/paste/drop behavior wiring

Current `development` already has registry-based behavior, so this should be applied only by hunk-level selection.

### `feat/handle-frontmatter` (`d9f2924`)
If applied wholesale, this patch replaces current editor-pane behavior by introducing frontmatter graph auto-insertion/removal into document content and additional input-pane controls/status.

### `feat/persist-user-state` (`dcdf0f1`)
If applied wholesale, this patch replaces current three-key storage (`documents`/`activeDocId`/`isExpanded`) with a single `mdeditor:state:v1` payload model.

### `feat/use-design-system` (`d3ffe0b`)
`full.patch` includes binaries/symlink/noise and must not be applied directly.
Use `source-only.patch` or hunk-pick from it.
Main replacement areas are styling/theming behavior (not registry architecture).

## Suggested pickup order (manual)
1. `feat-use-design-system-d3ffe0b-source-only.patch` (only desired hunks)
2. `feat-persist-user-state-dcdf0f1-focused.patch` (`sanitizeDocument`-style logic only)
3. `feat-handle-frontmatter-d9f2924-focused.patch` (frontmatter pieces only)
4. `off-dev-021326-fb3e8fd-focused.patch` (only non-registry-regressing hunks)

## Safe application workflow

```bash
# start from this worktree branch
cd /Volumes/FLOUNDER/dev/mdeditor-consolidation-2026-02-24

# optional: create a scratch branch for trial pickup
git switch -c scratch/pickup-trial

# preview a patch without applying
git apply --check docs/branch-consolidation-2026-02-24/patches/feat-handle-frontmatter-d9f2924-focused.patch

# interactive apply (recommended)
git apply --reject --whitespace=fix docs/branch-consolidation-2026-02-24/patches/feat-handle-frontmatter-d9f2924-focused.patch

# review and stage only what you want
git add -p
```

## Branches remaining after cleanup phase 1
- `feat/handle-frontmatter`
- `feat/persist-user-state`
- `feat/use-design-system`
- `off-dev-021326`

(Phase 1 stale branches already deleted locally/remotely.)
