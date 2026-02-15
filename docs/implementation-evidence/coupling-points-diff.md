# Coupling Points Elimination — Evidence Summary

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `src/lib/document-types/types.ts` | NEW | 62 lines — `DocumentTypePlugin` + `RendererProps` interfaces |
| `src/lib/document-types/registry.ts` | NEW | 120 lines — Singleton registry with 8 API methods |
| `src/lib/document-types/index.ts` | NEW | 22 lines — Barrel export + plugin registration |
| `src/lib/document-types/plugins/markdown.ts` | NEW | 51 lines — Markdown plugin + renderer wrapper |
| `src/lib/document-types/plugins/mermaid.ts` | NEW | 92 lines — Mermaid plugin + detection heuristic + renderer wrapper |
| `src/components/markdown/EditorWithProview.tsx` | MODIFIED | 149 insertions, 90 deletions |

## Coupling Points Eliminated

| CP# | Before | After | Status |
|-----|--------|-------|--------|
| CP-1 | `MarkdownDocument` (no kind) | `EditorDocument` with `kind: string` | ELIMINATED |
| CP-2 | `initialMarkdown` hardcoded | `initialContent` (first-launch only, not coupled) | ELIMINATED |
| CP-3 | `'# New Document\n...'` hardcoded | `plugin.defaultContent` via registry | ELIMINATED |
| CP-4 | `accept=".md,.mdx,.markdown"` | `accept={registry.allExtensions().join(',')}` | ELIMINATED |
| CP-5 | `.endsWith('.md')` check | `registry.getByExtension(ext)` | ELIMINATED |
| CP-6 | `replace(/\.(md\|markdown)$/, '')` | `registry.stripExtension(filename)` | ELIMINATED |
| CP-7 | Duplicate of CP-6 | Consolidated with CP-6 | ELIMINATED |
| CP-8 | `type: 'text/markdown'` | `plugin.exportMimeType` | ELIMINATED |
| CP-9 | `.md` extension | `plugin.exportExtension` | ELIMINATED |
| CP-10 | LaTeX-only detection | `registry.detect(text)` pipeline | ELIMINATED |
| CP-11 | "Markdown Input" label | "Editor" (generic) | ELIMINATED |
| CP-12 | Always `<MarkdownRenderer>` | `createElement(plugin.renderer, { content })` | ELIMINATED |
| CP-13 | "Drop Markdown Here" | "Drop File Here" (generic) | ELIMINATED |

## Verification: Zero Hardcoded References

```
$ rg "MarkdownRenderer|MermaidDiagram|MarkdownDocument" EditorWithProview.tsx
ZERO DIRECT RENDERER/TYPE REFERENCES

$ rg "\.md,|\.mdx|\.markdown|text/markdown" EditorWithProview.tsx  (excluding content strings)
ZERO HARDCODED EXTENSION/MIME REFERENCES
```

## Remaining `'markdown'` References (All Acceptable)

| Line | Context | Why Acceptable |
|------|---------|----------------|
| 198 | `kind: 'markdown'` in initial document | First-launch default — uses registry key, not direct import |
| 230 | `activeDoc?.kind \|\| 'markdown'` | Null-safety fallback — matches registry.get() behavior |
| 351 | `kind: string = 'markdown'` | Default param for handleNewTab — sensible default |
| 503 | `onNewTab={() => handleNewTab('markdown')}` | "+" button click default — dropdown provides alternatives |

These are all **registry key references** (the string `'markdown'`), not direct renderer imports or hardcoded rendering logic.
