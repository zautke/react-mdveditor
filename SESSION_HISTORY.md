# Session History — Document Type Registry

## State

- **Branch**: `feature/document-type-registry` (uncommitted)
- **Base commit**: `343b3e5`
- **Quality gates**: typecheck/lint/build all PASS (verified 2026-02-14)
- **Bundle delta**: +3.73 kB (+0.15%)

## What Was Built

A plugin registry that decouples `EditorWithProview.tsx` from all document-type knowledge.

```
src/lib/document-types/
  types.ts          # DocumentTypePlugin interface, RendererProps
  registry.ts       # Singleton: register, detect, get, all, allExtensions, getByExtension, stripExtension
  index.ts          # Barrel: imports + registers markdown & mermaid plugins
  plugins/
    markdown.ts     # priority 0, detect: () => true, wraps MarkdownRenderer_orig (children→content)
    mermaid.ts      # priority 10, detect: isMermaidText(), wraps MermaidDiagram (chart→content)
```

`EditorWithProview.tsx` refactored — zero direct renderer imports, zero hardcoded extensions/MIME types. Uses `documentTypeRegistry.*` for all dispatch.

## What Needs To Happen Next

### 1. Commit the registry refactor

Everything is staged-ready but uncommitted. Commit on `feature/document-type-registry`.

### 2. Implement the HTML document type

Reference docs (both exist in `docs/`):
- `docs/metaprompt-add-document-type.md` — generic 5-phase scaffolding framework
- `docs/example-html-document-type-prompt.md` — exact HTML implementation spec

The HTML type is the **validation case** proving the registry works. Per the architecture, adding it requires **2 new files + 1 modified file**, zero changes to `EditorWithProview.tsx`.

#### Files to create

**`src/components/markdown/HtmlPreview.tsx`** — Renderer
- Accept `{ content: string }` (RendererProps contract)
- Render in sandboxed `<iframe srcDoc={...}>` with `sandbox="allow-scripts"` (no `allow-same-origin`)
- Inject resize script via `postMessage` + `ResizeObserver` for auto-height
- Empty state placeholder, malformed HTML handled gracefully
- Default export, `displayName` set

**`src/lib/document-types/plugins/html.ts`** — Plugin definition
```typescript
kind: 'html'
label: 'HTML'
icon: Code              // from lucide-react
priority: 5             // between mermaid(10) and markdown(0)
fileExtensions: ['.html', '.htm']
exportMimeType: 'text/html'
exportExtension: '.html'
defaultTitle: (n) => `Page-${n}`
```

Detection logic (3 checks on `text.trimStart().toLowerCase()`):
1. `startsWith('<!doctype html')`
2. `startsWith('<html')`
3. `/^<(head|body|div|section|article|main|nav|header|footer|table|form|ul|ol|dl|p|h[1-6])\b/i`

#### File to modify

**`src/lib/document-types/index.ts`** — Add 2 lines:
```typescript
import { htmlPlugin } from './plugins/html'
register(htmlPlugin)
```

### 3. Verify (11-point HTML test matrix from the example doc)

| # | Test | Expected |
|---|------|----------|
| 1 | New tab menu | "New HTML" with Code icon |
| 2 | Paste `<!DOCTYPE html>...` | Auto-detects as html, iframe preview |
| 3 | Paste `# Hello\n<div>...` | Stays markdown (starts with `#`) |
| 4 | Drop `.html` file | Opens as html |
| 5 | Drop `.htm` file | Opens as html |
| 6 | File accept dialog | Shows `.html`, `.htm` |
| 7 | Save HTML tab | Downloads `.html`, `text/html` MIME |
| 8 | Tab icon | Code icon from lucide |
| 9 | Old localStorage | Loads as markdown/mermaid correctly |
| 10 | Mermaid still works | Unaffected |
| 11 | Markdown still works | Unaffected |

### 4. Quality gates after HTML plugin

```bash
pnpm typecheck   # zero errors
pnpm lint        # zero warnings
pnpm build       # clean build
```

## Registry API Quick Reference

```typescript
import { documentTypeRegistry } from '@/lib/document-types'

documentTypeRegistry.register(plugin)           // add plugin
documentTypeRegistry.detect(text)               // → kind string (priority-ordered)
documentTypeRegistry.get(kind)                  // → plugin (falls back to markdown)
documentTypeRegistry.all()                      // → readonly plugin[] (by priority desc)
documentTypeRegistry.allExtensions()            // → string[] (all file exts)
documentTypeRegistry.getByExtension('.html')    // → plugin | undefined
documentTypeRegistry.stripExtension('foo.html') // → 'foo'
```

## Constraints

- TypeScript strict: `noUnusedLocals`, `noUnusedParameters`, no `any` (use `unknown`)
- All renderers: default export, accept `{ content: string }`, set `displayName`
- Icons: `lucide-react` only
- Package manager: `pnpm` only
- `EditorWithProview.tsx` must NOT be modified when adding new types

---

## Session: 2026-03-28 — GraphViz Doctype (feat/graphviz-doctype)

### Branch State

- **Branch**: `feat/graphviz-doctype`
- **Base commit**: `947f309` (fix: JSON preview styling and tab dimensions)
- **Status at session start**: clean working tree

### What Was Designed

GraphViz (DOT language) document type plugin, fully planned via brainstorm → spec → plan workflow.

**Key decisions:**
- Library: `@hpcc-js/wasm-graphviz` (WASM port, React 18 compatible, lazy-loaded)
- Priority: **11** (above mermaid=10) — required to pre-empt mermaid's `'graph'` keyword claim
- Detection regex: `/^(strict\s+)?(di)?graph(\s+[\w"]+)?\s*\{/is` on first 100 chars
  - Brace heuristic: `digraph { }` has `{`; mermaid's `graph TD` never does
- Tab color: `oklch(0.65 0.18 45)` — vibrant orange, unique among all plugins
- Icon: `Workflow` from lucide-react (mermaid uses `GitBranch`)

**Artefacts produced:**
- Spec: `docs/superpowers/specs/2026-03-28-graphviz-doctype-design.md`
- Plan: `docs/superpowers/plans/2026-03-28-graphviz-doctype.md`

### Files To Create / Modify

| Action | Path |
|--------|------|
| Install | `@hpcc-js/wasm-graphviz` (Task 1 — done) |
| Create | `src/components/markdown/GraphvizPreview.tsx` |
| Create | `src/lib/document-types/plugins/graphviz.ts` |
| Modify | `src/lib/document-types/index.ts` (+1 import, +1 register) |
| Maybe | `vite.config.ts` (`optimizeDeps.exclude` only if build fails) |

### Default Content

The `digraph Pipeline { rankdir=LR; ... }` 15-node RAG pipeline provided by the user.

### Verification Checklist (10 points)

1. GraphViz tab in New Tab menu — `Workflow` icon, orange tab color
2. Default Pipeline digraph renders
3. Pasting `digraph { A -> B }` auto-detects as graphviz
4. Pasting `graph TD` still detects as mermaid
5. Invalid DOT shows red error badge (no crash)
6. Empty content shows placeholder text
7. Dropping `.dot`/`.gv` file opens as graphviz
8. Export produces `.dot` with `text/plain` MIME
9. Existing markdown/mermaid/json/html tabs unaffected
10. Network tab: WASM only loads when a graphviz tab opens

### Quality Gates

```bash
pnpm typecheck   # 0 errors
pnpm lint        # 0 warnings
pnpm build       # clean build
```

### Implementation Status: **CODE COMPLETE — manual verification pending**

Three commits on `feat/graphviz-doctype`:

| SHA | Message |
|-----|---------|
| `9cdb2b8` | chore: add @hpcc-js/wasm-graphviz dependency |
| `7a4fe93` | feat: add GraphViz document type plugin |
| `5d7ae5c` | fix: graphviz doctype review fixes |

**Automated verification (fresh run, 2026-03-28):**
- `pnpm typecheck` → EXIT:0 ✅
- `pnpm lint` → EXIT:0 ✅
- `pnpm build` → ✓ built in 9.62s ✅
- `dist/assets/GraphvizPreview-DR46ybnv.js` 797 KB / 623 KB gzip — separate lazy chunk ✅
- `package.json`: `"@hpcc-js/wasm-graphviz": "^1.21.2"` ✅
- `index.ts:23,30`: import + `register(graphvizPlugin)` ✅
- No `vite.config.ts` change needed

**3-reviewer code review fixes applied (commit `5d7ae5c`):**
- Cancellation token (`let cancelled = false; return () => { cancelled = true }`) — prevents stale renders on rapid typing / React strict mode double-invoke
- WASM singleton retry-on-failure (`_graphvizPromise = null` in catch) — allows retry after network/CSP failure
- `setError(null)` moved after `gviz.dot()` — success-only, prevents misleading state
- `export default GraphvizRendererWrapper` added (mermaid convention parity)
- Detection regex: `(sub|di)?graph` extended for top-level `subgraph` blocks
- `types.ts` priority convention comment updated to document priority > 10 for diagram types

**Remaining:** Manual G5 verification at `localhost:5200` — run `pnpm dev` and complete the 10-point checklist in TASKS.md (G5-1 through G5-10)
