# Document Type Registry - Implementation Plan

## Executive Summary

Refactor the mdeditor from a monolithic markdown-only architecture to a plugin-based document type registry. This eliminates 16 identified coupling points in `EditorWithProview.tsx` and related components, enabling new document types (HTML, JSON, CSV, etc.) to be added by creating 2 files and modifying 1 barrel export -- zero changes to the editor shell.

---

## 1. Current State Analysis

### 1.1 Coupling Points Identified (16 Total)

| # | Concern | File | Line(s) | Mechanism |
|---|---------|------|---------|-----------|
| CP-1 | Document interface | EditorWithProview.tsx | 12-17 | `MarkdownDocument` has no `kind` discriminator |
| CP-2 | Default document content | EditorWithProview.tsx | 160 | Initial doc always markdown (`initialMarkdown`) |
| CP-3 | New tab default content | EditorWithProview.tsx | 304-308 | Hardcoded `'# New Document\n\nStart writing...'` |
| CP-4 | File input accept filter | EditorWithProview.tsx | 375 | `accept=".md,.mdx,.markdown"` |
| CP-5 | Drop handler file check | EditorWithProview.tsx | 275 | `.endsWith('.md')` / `type === 'text/markdown'` |
| CP-6 | Drop handler title strip | EditorWithProview.tsx | 282 | `file.name.replace(/\.(md\|markdown)$/, '')` |
| CP-7 | File input title strip | EditorWithProview.tsx | 340 | Duplicate of CP-6 |
| CP-8 | Export MIME type | EditorWithProview.tsx | 352 | `new Blob([...], { type: 'text/markdown' })` |
| CP-9 | Export file extension | EditorWithProview.tsx | 356 | `a.download = \`...\`.md\`` |
| CP-10 | Content detection | EditorWithProview.tsx | 227-237 | LaTeX-only detection, no mermaid/other |
| CP-11 | Input pane rendering | EditorWithProview.tsx | 90-134 | Always textarea with "Markdown Input" label |
| CP-12 | Preview pane rendering | EditorWithProview.tsx | 137-150 | Always `<MarkdownRenderer>` |
| CP-13 | Drag overlay text | EditorWithProview.tsx | 466-469 | "Drop Markdown Here" |
| CP-14 | Mermaid in renderers | MarkdownRenderer*.tsx | 28-29 | `match[1] === 'mermaid'` in code block handler |
| CP-15 | FileUploadButton default | file-upload-button.tsx | 20 | `accept=".md,.mdx"` |
| CP-16 | Demo menu items | TabSystemDemo.tsx | 88-113 | Hardcoded "New Markdown" / "New Mermaid" |

### 1.2 Key Observations

- `MarkdownDocument` interface (CP-1) is the root cause -- no `kind` field means every consumer assumes markdown
- `TabItem` interface already has an unused `icon` field ready for registry integration
- `TabSystem` component already supports `NewTabMenuItem` types for dropdown menus
- Three nearly-identical renderers exist (`MarkdownRenderer.tsx`, `MarkdownRenderer_orig.tsx`, `MDRendererTW.tsx`) -- only `_orig` is actively used
- `MermaidDiagram.tsx` accepts `{ chart: string }` props, not `{ content: string }` -- requires wrapper
- `MarkdownRenderer_orig.tsx` accepts `{ children: string }`, not `{ content: string }` -- requires wrapper
- No existing type system for document types (zero enums, zero discriminated unions)

---

## 2. Target Architecture

### 2.1 File Structure

```
src/
  lib/
    document-types/
      types.ts              # DocumentTypePlugin interface, type exports
      registry.ts           # DocumentTypeRegistry singleton + API
      index.ts              # Barrel export + plugin registration
      plugins/
        markdown.ts         # Markdown plugin definition
        mermaid.ts          # Mermaid plugin definition
  components/
    markdown/
      EditorWithProview.tsx  # Refactored -- uses registry, no hardcoded types
      MarkdownRenderer_orig.tsx  # Unchanged
      MermaidDiagram.tsx         # Unchanged
```

### 2.2 Interface Definitions

```typescript
// src/lib/document-types/types.ts

import type { ComponentType } from 'react'

/** Props contract for all renderer components */
export interface RendererProps {
  content: string
}

/** Plugin interface -- every document type implements this */
export interface DocumentTypePlugin {
  /** Unique lowercase identifier (e.g., 'markdown', 'mermaid', 'html') */
  readonly kind: string

  /** Human-readable label for UI (e.g., 'Markdown', 'Mermaid Diagram') */
  readonly label: string

  /** Icon component from lucide-react for tab/menu display */
  readonly icon: ComponentType

  /** Detection heuristic -- returns true if content matches this type.
   *  Must be pure, fast, deterministic, and never throw. */
  readonly detect: (text: string) => boolean

  /** Priority for detection ordering. Higher = checked first.
   *  markdown=0 (fallback), mermaid=10, new types=1-9 */
  readonly priority: number

  /** React component that renders content. Must accept { content: string }. */
  readonly renderer: ComponentType<RendererProps>

  /** File extensions this type handles (e.g., ['.md', '.mdx', '.markdown']) */
  readonly fileExtensions: readonly string[]

  /** IANA MIME type for export (e.g., 'text/markdown') */
  readonly exportMimeType: string

  /** Primary file extension for export (e.g., '.md') */
  readonly exportExtension: string

  /** Default content template for new documents */
  readonly defaultContent: string

  /** Title generator for new tabs (e.g., (n) => `Untitled-${n}`) */
  readonly defaultTitle: (n: number) => string
}
```

```typescript
// src/lib/document-types/registry.ts

import type { DocumentTypePlugin } from './types'

/** Module-level singleton registry */
const plugins = new Map<string, DocumentTypePlugin>()
let sortedPlugins: DocumentTypePlugin[] = []

/** Register a document type plugin */
export function register(plugin: DocumentTypePlugin): void {
  if (plugins.has(plugin.kind)) {
    console.warn(`DocumentTypePlugin "${plugin.kind}" is already registered. Overwriting.`)
  }
  plugins.set(plugin.kind, plugin)
  sortedPlugins = Array.from(plugins.values())
    .sort((a, b) => b.priority - a.priority)
}

/** Detect document type from content. Returns the matching plugin's kind.
 *  Iterates plugins by priority (highest first). Falls back to 'markdown'. */
export function detect(text: string): string {
  for (const plugin of sortedPlugins) {
    if (plugin.detect(text)) {
      return plugin.kind
    }
  }
  return 'markdown'
}

/** Get a plugin by kind. Throws if not found. */
export function get(kind: string): DocumentTypePlugin {
  const plugin = plugins.get(kind)
  if (!plugin) {
    // Graceful fallback for unknown kinds (e.g., stale localStorage)
    const fallback = plugins.get('markdown')
    if (fallback) return fallback
    throw new Error(`DocumentTypePlugin "${kind}" not found and no fallback available`)
  }
  return plugin
}

/** Get all registered plugins (sorted by priority descending) */
export function all(): readonly DocumentTypePlugin[] {
  return sortedPlugins
}

/** Get all file extensions from all registered plugins */
export function allExtensions(): string[] {
  return sortedPlugins.flatMap(p => [...p.fileExtensions])
}

/** Find which plugin handles a given file extension */
export function getByExtension(ext: string): DocumentTypePlugin | undefined {
  const normalized = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`
  return sortedPlugins.find(p =>
    p.fileExtensions.some(e => e.toLowerCase() === normalized)
  )
}

/** For testing -- reset registry state */
export function _reset(): void {
  plugins.clear()
  sortedPlugins = []
}

/** Public API object for convenience imports */
export const documentTypeRegistry = {
  register,
  detect,
  get,
  all,
  allExtensions,
  getByExtension,
  _reset,
} as const
```

### 2.3 Updated Document Interface

```typescript
// In EditorWithProview.tsx (or shared types)
interface EditorDocument {
  id: string
  title: string
  content: string
  kind: string  // NEW -- discriminator linked to plugin registry
}
```

### 2.4 Migration Strategy for localStorage

Existing `MarkdownDocument` records in localStorage lack a `kind` field. On load:

```typescript
// State restoration with migration
const migratedDocs = loadState<EditorDocument[]>('documents', []).map(doc => ({
  ...doc,
  kind: doc.kind ?? documentTypeRegistry.detect(doc.content),
}))
```

Unknown `kind` values in persisted state gracefully fall back to markdown via `registry.get()`.

---

## 3. Phase Breakdown

### Phase A: Registry Core (Registry Engineer)

**Goal**: Create the type system and registry module.

**Deliverables**:
1. `src/lib/document-types/types.ts` -- `DocumentTypePlugin` interface, `RendererProps` type
2. `src/lib/document-types/registry.ts` -- Singleton registry with `register`, `detect`, `get`, `all`, `allExtensions`, `getByExtension`
3. `src/lib/document-types/index.ts` -- Barrel export (empty plugin list initially)

**Quality gate**: `pnpm typecheck` passes with zero errors.

**Estimated effort**: 1-2 hours

### Phase B: Plugin Migration (Plugin Migration Engineer)

**Goal**: Extract existing markdown and mermaid logic into plugin definitions.

**Deliverables**:
1. `src/lib/document-types/plugins/markdown.ts` -- Markdown plugin with:
   - `kind: 'markdown'`, `priority: 0`, `detect: () => true` (fallback)
   - Renderer wrapper: adapts `MarkdownRenderer_orig` (`children` prop) to `RendererProps` (`content` prop)
   - Extensions: `['.md', '.mdx', '.markdown']`
   - MIME: `'text/markdown'`, export ext: `'.md'`
2. `src/lib/document-types/plugins/mermaid.ts` -- Mermaid plugin with:
   - `kind: 'mermaid'`, `priority: 10`, `detect: isMermaidText()`
   - Renderer wrapper: adapts `MermaidDiagram` (`chart` prop) to `RendererProps` (`content` prop)
   - Extensions: `['.mmd', '.mermaid']`
   - MIME: `'text/plain'`, export ext: `'.mmd'`
3. Updated `src/lib/document-types/index.ts` -- Import and register both plugins

**Quality gate**: `pnpm typecheck` + `pnpm lint` pass. Registry correctly detects mermaid content and falls back to markdown.

**Estimated effort**: 2-3 hours

### Phase C: Integration (Integration Engineer)

**Goal**: Refactor `EditorWithProview.tsx` to use registry, eliminating all coupling points.

**Changes** (by coupling point):

| CP | Before | After |
|----|--------|-------|
| CP-1 | `MarkdownDocument` (no kind) | `EditorDocument` with `kind: string` |
| CP-2 | `initialMarkdown` hardcoded | `registry.get('markdown').defaultContent` |
| CP-3 | Hardcoded markdown template | `registry.get(kind).defaultContent` |
| CP-4 | `accept=".md,.mdx,.markdown"` | `accept={registry.allExtensions().join(',')}` |
| CP-5 | `.endsWith('.md')` check | `registry.getByExtension(ext)` |
| CP-6 | `replace(/\.(md\|markdown)$/, '')` | Strip any registered extension |
| CP-7 | Duplicate of CP-6 | Consolidate with CP-6 into helper |
| CP-8 | `type: 'text/markdown'` | `type: registry.get(doc.kind).exportMimeType` |
| CP-9 | `.md` extension | `registry.get(doc.kind).exportExtension` |
| CP-10 | LaTeX-only detection | `registry.detect(text)` pipeline |
| CP-11 | "Markdown Input" label | Generic label or plugin-derived |
| CP-12 | Always `<MarkdownRenderer>` | `registry.get(doc.kind).renderer` |
| CP-13 | "Drop Markdown Here" | "Drop file here" (generic) |

**New `RenderPane`**:
```tsx
const RenderPane = memo(({ content, kind }: { content: string; kind: string }) => {
  const plugin = documentTypeRegistry.get(kind)
  const Renderer = plugin.renderer
  return <Renderer content={content} />
}, (prev, next) => prev.content === next.content && prev.kind === next.kind)
```

**New tab menu generation**:
```tsx
const newTabMenuItems = documentTypeRegistry.all().map(plugin => ({
  label: `New ${plugin.label}`,
  icon: plugin.icon,
  onClick: () => handleNewTab(plugin.kind),
}))
```

**Quality gate**: `pnpm typecheck` + `pnpm lint` + `pnpm build` pass. All 16 coupling points eliminated. Zero regressions.

**Estimated effort**: 3-4 hours

### Phase D: Verification (QA Engineer + Browser Test Engineer)

**Goal**: Execute all 17 manual test cases and capture evidence.

**Quality gate**: All tests pass, screenshot evidence for each, zero console errors.

**Estimated effort**: 2-3 hours

---

## 4. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| localStorage migration breaks existing sessions | Medium | High | Null-coalescing fallback: `doc.kind ?? registry.detect(doc.content)` |
| Mermaid renderer wrapper introduces performance regression | Low | Medium | Memo wrapper, benchmark before/after |
| Bundle size increase from new modules | Low | Low | Registry is ~50 lines; wrappers are thin. Verify with `pnpm build` |
| Detection false positives (mermaid vs markdown) | Low | Medium | Existing `isMermaidText()` is proven; keep it unchanged in the plugin |
| React HMR breaks with component wrappers | Medium | Low | All wrappers use default exports per CLAUDE.md convention |
| Tab state loss during refactor | Low | High | Incremental refactor; test localStorage round-trip at each step |
| Priority collisions between plugins | Low | Low | Document priority ranges; log warning on duplicate priorities |

### Rollback Plan

1. **Git branch**: All work on a feature branch (`feature/document-type-registry`)
2. **Incremental commits**: One commit per coupling point removal (enables `git bisect`)
3. **Quick rollback**: `git checkout main` restores fully working monolithic version
4. **No destructive changes**: Existing renderer components are not modified, only wrapped
5. **localStorage compatible**: New format (`kind` field) is additive; old format works with migration

---

## 5. Bundle Impact Estimate

| New Module | Estimated Size | Notes |
|-----------|---------------|-------|
| `types.ts` | ~0 KB (types only, erased at compile) | Zero runtime cost |
| `registry.ts` | ~0.5 KB minified | Pure functions, no deps |
| `plugins/markdown.ts` | ~0.3 KB minified | Thin wrapper + config object |
| `plugins/mermaid.ts` | ~0.3 KB minified | Detection heuristic + config object |
| `index.ts` | ~0.2 KB minified | Import + register calls |
| **Total new code** | **~1.3 KB minified** | Negligible |

The refactored `EditorWithProview.tsx` should be **smaller** (removing hardcoded logic), partially offsetting the new modules.

---

## 6. Success Criteria

1. `pnpm typecheck` -- zero errors
2. `pnpm lint` -- zero warnings
3. `pnpm build` -- clean production build, bundle size within 2 KB of baseline
4. All 17 manual verification tests pass with screenshot evidence
5. Zero browser console errors/warnings
6. New document types can be added by creating 2 files + 1 barrel export modification
7. `EditorWithProview.tsx` contains zero references to specific document types
