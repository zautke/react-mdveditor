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
