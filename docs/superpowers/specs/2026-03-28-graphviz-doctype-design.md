# GraphViz Document Type — Design Spec

**Date:** 2026-03-28
**Branch:** `feat/graphviz-doctype`
**Status:** Approved

---

## Context

The mdeditor plugin registry already supports markdown, mermaid, HTML, React component, and JSON document types. This spec adds **GraphViz** (DOT language) as a first-class document type, following the identical plugin pattern. The user wants to author and preview Graphviz pipeline diagrams, starting from a `digraph Pipeline { ... }` default.

---

## Architecture

Two new files, one barrel modification — identical scope to JSON (the most recent addition).

| Action   | Path                                                          |
|----------|---------------------------------------------------------------|
| Create   | `src/lib/document-types/plugins/graphviz.ts`                  |
| Create   | `src/components/markdown/GraphvizPreview.tsx`                  |
| Modify   | `src/lib/document-types/index.ts` (1 import + 1 register call) |

---

## Library

**`@hpcc-js/wasm-graphviz`** — the official Graphviz WASM port.

- Converts DOT string → SVG string synchronously once the WASM module is loaded.
- No D3 dependency; no React version constraint (works with React 18).
- WASM binary ~650 KB raw / ~165 KB gzip, lazy-loaded only when a `.dot` tab is active.
- API: `const svg = await Graphviz.load().then(g => g.dot(dotString, 'svg'))`

Pan/zoom is deferred; the preview container uses `overflow: auto` for v1.

---

## Plugin Definition

```typescript
// src/lib/document-types/plugins/graphviz.ts
{
  kind: 'graphviz',
  label: 'GraphViz Diagram',
  icon: Workflow,                     // lucide-react — distinct from mermaid's GitBranch
  detect: isGraphvizText,
  priority: 11,                       // above mermaid (10); see Detection below
  renderer: GraphvizRendererWrapper,  // lazy-loaded via React.lazy
  fileExtensions: ['.dot', '.gv'],
  exportMimeType: 'text/plain',
  exportExtension: '.dot',
  defaultContent: PIPELINE_DIGRAPH,   // the Pipeline digraph provided by user
  defaultTitle: (n) => `Graph-${n}`,
  tabColor: 'oklch(0.65 0.18 45)',    // vibrant orange — unique across all plugins
}
```

---

## Detection

```typescript
export function isGraphvizText(text: string): boolean {
  const peek = text.trimStart().slice(0, 100)
  // Require opening brace to distinguish from mermaid's 'graph TD/LR' syntax
  // (mermaid never has a brace on the same/next line as the graph keyword)
  return /^(strict\s+)?(di)?graph(\s+[\w"]+)?\s*\{/is.test(peek)
}
```

**Why priority 11?** Mermaid (priority 10) claims the word `'graph'` as a first-word match. An undirected `graph { ... }` block would be incorrectly detected as mermaid unless graphviz runs first. At priority 11, graphviz pre-empts mermaid; the brace requirement ensures `graph TD` (mermaid) is not a false positive.

---

## Renderer: `GraphvizPreview`

States:

| State       | UI                                                              |
|-------------|-----------------------------------------------------------------|
| Empty       | Centered italic: "Enter DOT language to see a live preview"    |
| WASM loading| Suspense fallback: "Rendering diagram…" (matches mermaid UX)   |
| Parse error | Red badge (top-right) with the error message from the WASM API |
| Valid       | SVG rendered inline; container `overflow: auto`; `width="100%"` on `<svg>` |

The component uses `useEffect` to re-render on content change, with a try/catch around the WASM call to surface parse errors without crashing. The WASM module is initialized once and cached via module-level promise.

---

## Default Content

The `digraph Pipeline { ... }` diagram provided by the user (full text preserved verbatim as the `defaultContent` string in the plugin file).

---

## Verification

All of the following must pass before the feature is considered deploy-ready:

### Automated gates (CI-equivalent)
```bash
pnpm typecheck   # 0 errors (strict mode)
pnpm lint        # 0 warnings (--max-warnings 0)
pnpm build       # clean production build
```

### Manual verification at `http://localhost:5200`
1. GraphViz tab appears in the New Tab dropdown menu with `Workflow` icon and orange tab color
2. Creating a new GraphViz tab renders the Pipeline digraph correctly in the preview pane
3. Pasting valid DOT content into an empty document auto-detects as `graphviz`
4. Pasting `graph TD` (mermaid content) still detects as `mermaid` — not graphviz
5. Dropping a `.dot` or `.gv` file opens as the graphviz document type
6. Exporting produces a `.dot` file with `text/plain` MIME type
7. Pasting invalid DOT shows the red error badge (not a crash)
8. Empty content shows the empty-state placeholder
9. Existing markdown, mermaid, JSON, HTML, and React tabs are completely unaffected
10. The WASM module is NOT loaded on initial page load (check Network tab: no `.wasm` request until a graphviz tab is created or detected)

---

## Out of Scope (v1)

- Pan/zoom interaction (add `react-zoom-pan-pinch` in a follow-up)
- Node click events / interactive graph exploration
- DOT syntax highlighting in the editor pane (separate concern)
- Undirected `graph {}` detection improvement (covered by priority 11 + brace heuristic)
