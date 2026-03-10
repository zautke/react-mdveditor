# Branch Cleanup Plan - 2026-02-24

## Goal
Audit all non-`main` branches for work that should be in `development`, then remove stale feature branches safely.

## Baseline
- Audit date: 2026-02-24
- Integration target: `development`
- `development` tip at audit time: `b426224` (`feat: blacklist-based file validation and drop-to-new-tab`, 2026-02-21)
- Working tree status: dirty on `development` (modified + untracked files). Commit or stash before any cherry-pick/rebase work.

## Method
- Loaded repository context with `codebase-retrieval` and prior audit docs.
- Refreshed refs with `git fetch --all --prune`.
- Compared every non-`main` branch to `development` using:
  - `git rev-list --left-right --count development...<branch>`
  - `git cherry -v development <branch>`
  - `git diff --name-status development...<branch>`

## Branch Matrix (All Non-main Branches)

| Branch | Local | Remote | Ahead of `development` | Behind `development` | Assessment | Cleanup Action |
|---|---|---|---:|---:|---|---|
| `feat/file-drop-blacklist` | Y | N | 0 | 0 | Exact duplicate pointer of `development` | Delete now (local) |
| `feat/html-doc-type` | Y | N | 0 | 12 | No unique commits | Delete now (local) |
| `feat/html-document-type` | Y | Y | 0 | 9 | No unique commits (already integrated) | Delete now (local + remote) |
| `feat/react-document-type` | Y | Y | 0 | 6 | No unique commits (already integrated) | Delete now (local + remote) |
| `feat/tab-system-redesign` | Y | Y | 0 | 2 | No unique commits (already integrated) | Delete now (local + remote) |
| `feature/document-type-registry` | Y | N | 0 | 11 | No unique commits | Delete now (local) |
| `feat/handle-frontmatter` | Y | Y | 1 | 18 | One unique commit `d9f2924` (frontmatter feature) | Integrate selectively, then delete |
| `feat/persist-user-state` | Y | Y | 1 | 18 | One unique commit `dcdf0f1` (UI state persistence) | Integrate selectively/supersede, then delete |
| `feat/use-design-system` | Y | Y | 1 | 18 | One unique commit `d3ffe0b`; includes binary bloat + `design-system` symlink | Do not merge as-is; harvest and delete |
| `off-dev-021326` | Y | Y | 5 | 16 | `git cherry` shows 4 patch-equivalent already in `development`; 1 unique commit `fb3e8fd` remains | Review/cherry-pick `fb3e8fd`, then delete |

## Unique Work Requiring Triage Before Deletion

### 1) `off-dev-021326`
- Unique candidate: `fb3e8fd` (`feat: document kind system with mermaid detection, tab menus, and state persistence`)
- `git cherry` result: only this commit is not patch-equivalent to `development`
- Recommendation: manually replay/cherry-pick only desired hunks because current `development` has ongoing edits in overlapping files (`EditorWithProview.tsx`, `MermaidDiagram.tsx`).

### 2) `feat/handle-frontmatter`
- Unique commit: `d9f2924`
- Adds frontmatter feature with large edits to `EditorWithProview.tsx` and new `FrontMatterPreview.tsx`
- Recommendation: extract only the frontmatter capability needed now; avoid direct merge due drift/conflict risk.

### 3) `feat/persist-user-state`
- Unique commit: `dcdf0f1`
- Focused on persistence logic in `EditorWithProview.tsx`
- Recommendation: verify against current persistence implementation and keep only missing logic.

### 4) `feat/use-design-system`
- Unique commit: `d3ffe0b`
- Contains useful UI work plus problematic payload:
  - many committed binaries under `.playwright-mcp/` and `test-results/`
  - `design-system` symlink (mode `120000`)
  - large file deletions mixed into the same commit
- Recommendation: do not merge/cherry-pick whole commit. Recreate or selectively cherry-pick only targeted source files.

## Execution Plan

### Phase 0 - Safety
1. Commit or stash current `development` working tree.
2. Create archival branches for unique-work branches before cleanup:
   - `archive/feat-handle-frontmatter-2026-02-24`
   - `archive/feat-persist-user-state-2026-02-24`
   - `archive/feat-use-design-system-2026-02-24`
   - `archive/off-dev-021326-2026-02-24`

### Phase 1 - Immediate Deletions (No Unique Work)
Delete now:
- Local only: `feat/file-drop-blacklist`, `feat/html-doc-type`, `feature/document-type-registry`
- Local + remote: `feat/html-document-type`, `feat/react-document-type`, `feat/tab-system-redesign`

### Phase 2 - Integrate Remaining Unique Work
1. `off-dev-021326`: handle `fb3e8fd`.
2. `feat/handle-frontmatter`: salvage required frontmatter functionality.
3. `feat/persist-user-state`: salvage missing persistence logic only.
4. `feat/use-design-system`: harvest source-only changes, exclude binaries/symlink noise.

### Phase 3 - Final Branch Removal
After Phase 2 validation, delete the four unique-work branches locally and remotely.

## Command Runbook

```bash
# 0) Safety: preserve current edits first (pick one)
git add -A && git commit -m "wip: checkpoint before branch cleanup"
# OR
# git stash push -u -m "pre-branch-cleanup"

# 1) Archive unique-work branches before deleting
for b in feat/handle-frontmatter feat/persist-user-state feat/use-design-system off-dev-021326; do
  git branch "archive/${b//\//-}-2026-02-24" "$b"
done

# 2) Delete branches with zero unique commits (local)
git branch -d feat/file-drop-blacklist feat/html-doc-type feature/document-type-registry \
  feat/html-document-type feat/react-document-type feat/tab-system-redesign

# 3) Delete already-merged remote branches
git push origin --delete feat/html-document-type feat/react-document-type feat/tab-system-redesign

# 4) Integrate/salvage unique branches (manual cherry-pick/hunk pick)
# git cherry-pick -n fb3e8fd
# git checkout --patch feat/handle-frontmatter -- src/components/markdown/EditorWithProview.tsx
# ...repeat selectively...

# 5) After integration is complete, delete remaining feature branches
git branch -d feat/handle-frontmatter feat/persist-user-state feat/use-design-system off-dev-021326
git push origin --delete feat/handle-frontmatter feat/persist-user-state feat/use-design-system off-dev-021326

# 6) Final verification
git fetch --all --prune
git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin | sort
```

## Definition of Done
- No stale feature branches remain locally/remotely.
- Unique work is either integrated into `development` or intentionally archived and closed.
- `development` retains clean history without binary artifacts or accidental symlink/submodule additions.
