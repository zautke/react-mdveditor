# Branch Audit Report

**Date**: 2026-02-13  
**Auditor**: Claude Code (claude-opus-4-6)  
**Current branch**: `development` (dirty working tree)  
**Repository**: `/Volumes/FLOUNDER/dev/mdeditor`

---

## Branch Inventory

| Branch | Local | Remote | Ahead of dev | Behind dev | Merge Base | Last Commit |
|--------|-------|--------|-------------|------------|------------|-------------|
| `development` (current) | Y | Y | — | — | — | `daf9b3f` 2026-01-01 + dirty WIP |
| `main` | Y | Y | — | 3 behind dev | — | — |
| `feat/handle-frontmatter` | Y | Y | **1** | 2 | `daf9b3f` | `d9f2924` 2026-01-25 |
| `feat/persist-user-state` | Y | Y | **1** | 2 | `daf9b3f` | `dcdf0f1` 2026-01-25 |
| `feat/update-to-xmermaid` | Y | N | **0** | 2 | `daf9b3f` | `daf9b3f` 2026-01-01 |
| `feat/use-design-system` | Y | Y | **1** | 2 | `daf9b3f` | `d3ffe0b` 2026-01-04 |
| `feature/final-mvp` | Y | N | **0** | 8 | `276f7be` 2025-10-09 | `276f7be` 2025-10-09 |
| `origin/fix/tab-content-scrolling` | N | Y | **0** | 2 | `daf9b3f` | `daf9b3f` 2026-01-01 |

---

## Dirty Working Tree on `development`

The current `development` branch has **984 lines of uncommitted changes** across 10 files plus 3 untracked entries:

### Modified (unstaged)

| File | Delta | Summary |
|------|-------|---------|
| `package.json` | +1 | Likely a new dependency |
| `pnpm-lock.yaml` | +33 | Lock file changes matching package.json |
| `src/components/markdown/EditorWithProview.tsx` | +171/-? | Major: document `kind` system (`MarkdownDocumentKind`), `loadState`/`saveState` persistence, `newTabMenuItems` dropdown, mermaid detection |
| `src/components/markdown/MermaidDiagram.tsx` | +10/-? | Minor tweaks to mermaid rendering |
| `src/components/ui/tabs/TabSystem.tsx` | +183/-? | Major: `NewTabControl` dropdown menu, `IconLabel` integration, `LayoutGroup`, animation improvements |
| `src/components/ui/tabs/TabSystemDemo.tsx` | +58 | New demo page for tab variants |
| `src/components/ui/tabs/index.ts` | +1 | Export additions |
| `src/components/ui/tabs/tab-variants.ts` | +53/-? | New variant definitions, chrome tab styling tokens |
| `src/components/ui/tabs/types.ts` | +11 | `NewTabMenuItem` type, `grouping` stub prop |
| `src/styles/index.css` | +625/-? | Massive: design token system, tab CSS variables, chrome tab theming |

### Untracked

| File/Dir | What |
|----------|------|
| `CLAUDE_NOTES.md` | Claude session notes (created this session) |
| `docs/` | Architecture docs (created this session) |
| `src/components/ui/icon-label.tsx` | New `IconLabel` layout primitive for icon+text combos in tabs/menus |

### Assessment

This is a **substantial body of uncommitted work** implementing:
1. The complete `MarkdownDocumentKind` system (`'markdown' | 'mermaid'` detection + render dispatch)
2. `localStorage` persistence via `@/lib/storage` (`loadState`/`saveState`)
3. The `NewTabControl` dropdown menu system with animated dropdown
4. The `IconLabel` component
5. Comprehensive design token system in CSS custom properties
6. Chrome-style tab variants with hardware-accelerated animations

**Risk**: All of this is uncommitted. A stash pop, branch switch, or accidental reset would lose it.

---

## Branch-by-Branch Analysis

---

### 1. `feat/handle-frontmatter`

**Status**: 1 commit ahead, 2 behind development  
**Commit**: `d9f2924` — "(interim): ignore and format frontmatter"  
**Commit message prefix `(interim)`** signals this is WIP/incomplete.

#### What it does

Adds **YAML front matter detection and visualization** for markdown documents:

- **New dependency**: `js-yaml` (+ `@types/js-yaml`)
- **New component**: `FrontMatterPreview.tsx` — parses YAML front matter using `js-yaml`, displays structured preview with error handling
- **EditorWithProview changes** (+313 lines):
  - New interfaces: `FrontMatterNode`, `FrontMatterInfo`, `FrontMatterSummary`
  - `extractFrontMatter()` — parses `---` delimited YAML blocks
  - `buildFrontMatterTree()` — recursive tree builder from YAML key/value pairs
  - `buildMermaidGraphBlock()` — generates a mermaid `graph TD` visualization of the front matter tree structure
  - `upsertFrontMatterGraph()` / `removeFrontMatterGraph()` — inserts/replaces the generated mermaid block in the document
  - InputPane now shows front matter status badges ("detected" / "open" / "none"), line/node counts, and a "Generate graph" button
  - `useMemo` hooks for memoizing front matter parsing

#### Merge Conflict Potential

**High (2 conflict regions detected)**: Both this branch and development's dirty WIP modify `EditorWithProview.tsx` extensively. The branch adds ~313 lines of front matter logic; development's dirty index adds ~171 lines of `kind` system + persistence. These changes overlap in the same file regions (imports, interfaces, InputPane props).

#### Code Quality Concerns

- `FrontMatterPreview.tsx` uses `any` type: `let data: any = null` and `catch (e: any)` — violates project `unknown` preference
- The `(interim)` commit message indicates incomplete/experimental state
- Massive inline additions to `EditorWithProview.tsx` rather than extraction to dedicated modules
- `packageManager` field changed from pinned hash to bare version

---

### 2. `feat/persist-user-state`

**Status**: 1 commit ahead, 2 behind development  
**Commit**: `dcdf0f1` — "feat: persist ui state"

#### What it does

Implements **localStorage persistence** for editor state:

- **New dependency**: `react-x-mermaid` (unrelated to persistence — appears to have been added opportunistically)
- **New types**: `PersistedState`, `STORAGE_KEY = 'mdeditor:state:v1'`
- **`sanitizeDocument()`**: Validates persisted document shape using `unknown` type narrowing (good TypeScript practice)
- **`loadPersistedState()`**: Loads from localStorage with full validation, graceful failure
- **`getInitialState()`**: Provides fallback to default documents
- **`useEffect` persistence**: Writes state to localStorage on every change to `documents`, `activeDocId`, `isExpanded`

#### Relationship to Development

**This work appears to have been partially superseded.** Development's committed codebase already has `src/lib/storage.ts` with `loadState`/`saveState` utilities, and the dirty WIP on development uses them in `EditorWithProview.tsx`. The approach differs:

| Aspect | `feat/persist-user-state` | `development` (dirty WIP) |
|--------|--------------------------|--------------------------|
| Storage key | `mdeditor:state:v1` (single blob) | `mdeditor:` prefix + per-key (`documents`, `activeDocId`, `isExpanded`) |
| Validation | Full `sanitizeDocument()` with `unknown` narrowing | `loadState<T>` generic with `JSON.parse as T` cast |
| Module | Inline in `EditorWithProview.tsx` | Extracted to `src/lib/storage.ts` |
| Mermaid dep | Adds `react-x-mermaid` | Does not |

The `sanitizeDocument()` validation approach in this branch is **superior** from a type safety standpoint, but the extracted `lib/storage.ts` module in development is better architecturally.

#### Merge Conflict Potential

**High (2 conflict regions)**: Both modify `EditorWithProview.tsx` state initialization and persistence.

---

### 3. `feat/update-to-xmermaid`

**Status**: 0 commits ahead, 2 behind development  
**Branch tip**: `daf9b3f` (same as merge base)

#### What it does

**Nothing.** This branch has zero unique commits relative to development's merge base. It was created at `daf9b3f` and never received any commits.

#### Assessment

This is a **dead branch** — likely created with intent to swap `mermaid` for `react-x-mermaid` but never started. The `react-x-mermaid` dependency was instead added in `feat/persist-user-state`.

---

### 4. `feat/use-design-system`

**Status**: 1 commit ahead, 2 behind development  
**Commit**: `d3ffe0b` — "(interim): switch to @braisenly design"  
**Commit message prefix `(interim)`** signals this is WIP/incomplete.

#### What it does

A large-scope refactor to adopt a unified design system:

- **ThemeToggle component** (`src/components/ui/theme-toggle.tsx`): Light/dark/system theme switcher using `document.documentElement.classList`, `matchMedia`, localStorage persistence, smooth CSS transitions
- **useTheme hook** (`src/hooks/use-theme.ts`): Centralized theme state management
- **MarkdownRenderer.tsx overhaul**: Converts all inline `style={{...}}` objects to Tailwind utility classes (`mexican-*` design tokens), massive deletion of inline CSS (-2114 lines)
- **MDRendererTW.tsx updates**: Migrates from `brand-*` class prefixes to `mexican-*` token names
- **EditorWithProview.tsx**: Adds `<ThemeToggle />` to the control bar
- **App.tsx / AppTW.tsx**: Wraps in `bg-background text-foreground` root classes
- **DesignTokenDemo.tsx**: Updates to use new token names
- **index.css**: +109 lines of dark mode token definitions and design system variables
- **Session doc**: `docs/sessions/VDS-001-ThemeToggle-Mission.md`

#### Problem: Binary blobs committed

This branch has **~5MB of binary files** committed:
- `.playwright-mcp/*.png` — 13 screenshot files (~3.5MB total)
- `test-results/*.png` — 4 screenshot files (~1.4MB total)
- A Chrome extension `.crx` file (758KB)
- Two large markdown docs (`GENERALIZED_AUTONOMOUS_TESTING_MANUAL.md`, `MANUAL_CREATION_APPROACH_REPORT.md`) that are **deleted** in the diff (existed on the base, removed here)

**These binary files should NOT be in version control.** They inflate the repo size permanently even if deleted later.

#### Problem: `design-system` submodule reference

The diff shows `design-system` as a new file (mode 160000 = git submodule), but there is no `.gitmodules` file. This is a **broken submodule reference** that will cause `git submodule` operations to fail.

#### Merge Conflict Potential

**Very High (5 conflict regions)**: Touches `MarkdownRenderer.tsx`, `MarkdownRenderer_orig.tsx`, `EditorWithProview.tsx`, `index.css`, and several other files that development's dirty WIP also modifies heavily.

---

### 5. `feature/final-mvp`

**Status**: 0 commits ahead, 8 behind development  
**Branch tip**: `276f7be` — "test" (2025-10-09)

#### What it does

**Nothing unique.** This branch has zero commits ahead of development. It is the **oldest branch** in the repo (October 2025) and is 8 commits behind. Its full history is just 3 commits:

1. `7bb499e` — "Initial commit: Markdown editor with comprehensive test suite"
2. `9974943` — "Add generalized autonomous testing manual and approach report"
3. `276f7be` — "test"

All of this content has long since been incorporated into `development` and `main`.

#### Assessment

This is a **stale ancestor branch** with no unique work. Pure cleanup candidate.

---

### 6. `origin/fix/tab-content-scrolling` (remote-only)

**Status**: 0 commits ahead, 2 behind development  
**Branch tip**: `daf9b3f` (same as development merge base)

#### What it does

**Nothing unique.** Same commit as the merge base. This branch's work (commit `daf9b3f`: "fix: no vertical scrolling for content in tabs") was already merged into `development`.

#### Assessment

This is a **merged and abandoned remote branch**. The fix is already in development.

---

## Summary of Findings

### Branch Health Matrix

| Branch | Unique Work | Dirty | Stale | Binary Bloat | Broken Refs | Conflict Risk |
|--------|------------|-------|-------|-------------|-------------|---------------|
| `development` (WIP) | Major uncommitted | **YES** | No | No | No | — |
| `feat/handle-frontmatter` | Front matter parsing + viz | No | Moderate | No | No | High |
| `feat/persist-user-state` | State persistence | No | Moderate | No | No | High |
| `feat/update-to-xmermaid` | None | No | **Dead** | No | No | None |
| `feat/use-design-system` | Theme system + token refactor | No | Moderate | **YES (~5MB)** | **Broken submodule** | Very High |
| `feature/final-mvp` | None | No | **Dead** | No | No | None |
| `origin/fix/tab-content-scrolling` | None (merged) | No | **Merged** | No | No | None |

### What development's dirty WIP already supersedes

| Feature | Branch Origin | Status on Development WIP |
|---------|--------------|--------------------------|
| State persistence | `feat/persist-user-state` | **Reimplemented** via `lib/storage.ts` with `loadState`/`saveState` |
| Document kind system | New on development | `MarkdownDocumentKind`, `isMermaidText()`, `RenderPane` dispatch |
| Tab dropdown menu | New on development | `NewTabControl`, `NewTabMenuItem`, `newTabMenuItems` |
| `IconLabel` component | New on development | Extracted UI primitive |
| Design tokens | Partially from `feat/use-design-system` | Expanded in `index.css` WIP (+625 lines) |

---

## Proposed Actions

### IMMEDIATE: Commit the dirty working tree

**Priority: CRITICAL**

The `development` branch has ~984 lines of uncommitted work that represents the current state of the application. This should be committed immediately to prevent data loss. Suggested approach:

1. Stage all modified files
2. Decide whether to include `docs/` and `CLAUDE_NOTES.md` (created this session)
3. Commit with a descriptive message summarizing the body of work

### DELETE: Dead and merged branches

| Branch | Action | Reason |
|--------|--------|--------|
| `feat/update-to-xmermaid` | Delete local | Zero unique commits. Never started. |
| `feature/final-mvp` | Delete local | 0 ahead, 8 behind. Ancient ancestor. All work is in development. |
| `origin/fix/tab-content-scrolling` | Delete remote | 0 ahead. Fix already merged into development. |

### CHERRY-PICK SELECTIVELY: `feat/persist-user-state`

**Do not merge this branch.** Development already has a reimplemented persistence layer. However, the `sanitizeDocument()` function with proper `unknown` type narrowing is worth salvaging:

1. Cherry-pick the validation approach into `src/lib/storage.ts` or a new validation utility
2. Do NOT bring in the `react-x-mermaid` dependency (it was added opportunistically and is unrelated)
3. Delete the branch after extracting value

### REBASE AND CONTINUE: `feat/handle-frontmatter`

This branch has genuine unique work (front matter detection, YAML parsing, mermaid graph generation). Recommended path:

1. **Rebase onto current development** (after committing the dirty WIP)
2. **Resolve conflicts** in `EditorWithProview.tsx` — the front matter logic is additive and can coexist with the `kind` system
3. **Fix code quality issues**:
   - Replace `any` with `unknown` in `FrontMatterPreview.tsx`
   - Extract front matter logic out of `EditorWithProview.tsx` into `src/lib/frontmatter.ts`
   - Restore the pinned `packageManager` hash
4. **Rename from `(interim)` to proper feature commit**
5. **Merge to development** once clean

### HARVEST AND CLOSE: `feat/use-design-system`

This branch has valuable work but also serious problems. Recommended path:

1. **Do NOT merge as-is** — binary blobs and broken submodule reference would corrupt the repo
2. **Cherry-pick the valuable parts** onto a clean branch:
   - `src/components/ui/theme-toggle.tsx` — the ThemeToggle component
   - `src/hooks/use-theme.ts` — the useTheme hook
   - The `mexican-*` to design token migration in `MDRendererTW.tsx`
   - Dark mode CSS variables from `index.css`
3. **Do NOT bring**:
   - `.playwright-mcp/` screenshots
   - `test-results/` screenshots
   - The `.crx` Chrome extension file
   - The broken `design-system` submodule reference
   - The deleted `GENERALIZED_AUTONOMOUS_TESTING_MANUAL.md` / `MANUAL_CREATION_APPROACH_REPORT.md` (these deletions may or may not be intentional — verify with the author)
4. Delete the original branch after harvesting

### TRIAGE PRIORITY ORDER

| # | Action | Branch | Effort | Risk |
|---|--------|--------|--------|------|
| 1 | **Commit dirty WIP** | `development` | Low | Prevents data loss |
| 2 | **Delete dead branches** | `feat/update-to-xmermaid`, `feature/final-mvp`, `origin/fix/tab-content-scrolling` | Trivial | None |
| 3 | **Cherry-pick validation logic** | `feat/persist-user-state` | Low | None |
| 4 | **Rebase + clean + merge** | `feat/handle-frontmatter` | Medium | Merge conflicts in EditorWithProview |
| 5 | **Harvest + clean branch** | `feat/use-design-system` | Medium-High | Must avoid binary bloat + fix submodule |
