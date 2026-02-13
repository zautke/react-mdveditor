# Example Agentic Prompt: Adding HTML Document Type

This is a concrete, worked example of adding a new document type (HTML) to the mdeditor application using the plugin-based document type registry. It serves as the reference implementation that the generic metaprompt is modeled after.

---

## Pre-requisites

Before executing this prompt, the **Document Type Registry** refactor (Phase 1 and Phase 2 from the architecture doc) must be complete. The registry at `src/lib/document-types/registry.ts` must be operational with `markdown` and `mermaid` plugins already registered.

**If the registry does not yet exist**, complete the registry refactor first using the architecture document at `docs/document-type-architecture.md`.

---

## Task

**Add HTML document type support to the mdeditor application.**

### Context

- **Repository**: `/Volumes/FLOUNDER/dev/mdeditor`
- **Stack**: React 18, Vite 7, TypeScript (strict), Tailwind CSS 4.1
- **Main component**: `src/components/markdown/EditorWithProview.tsx`
- **Registry**: `src/lib/document-types/registry.ts` (singleton, plugin-based)
- **Existing plugins**: `markdown` (priority 0, fallback), `mermaid` (priority 10)

### Verification Commands

```bash
pnpm typecheck   # zero errors
pnpm lint        # zero warnings (--max-warnings 0)
pnpm build       # clean production build
pnpm dev         # manual test at http://localhost:5200
```

---

## Step 1: Create the Renderer Component

**File**: `src/components/markdown/HtmlPreview.tsx`

### Requirements

- Accept `{ content: string }` as props
- Render HTML content in a **sandboxed `<iframe>`** using `srcDoc`
- Sandbox attribute: `sandbox="allow-scripts"` (no `allow-same-origin` for security)
- Auto-resize iframe height to match content height using `postMessage` from an injected script inside the iframe
- Display a small "HTML Preview" badge/indicator in the top-right corner of the container
- Handle empty content gracefully (show placeholder)
- Handle malformed HTML gracefully (iframe will render what it can)
- Wrap in a styled container consistent with other render panes (border, rounded corners, padding)
- Must be a **default export** for React Refresh/HMR compatibility

### Implementation Notes

```tsx
// Inject a resize script into srcDoc that posts height changes to parent
const wrapWithResizeScript = (html: string) => `
  <!DOCTYPE html>
  <html><head><style>body { margin: 0; font-family: system-ui, sans-serif; }</style></head>
  <body>${html}
  <script>
    const ro = new ResizeObserver(() => {
      window.parent.postMessage({ type: 'iframe-resize', height: document.body.scrollHeight }, '*');
    });
    ro.observe(document.body);
  </script>
  </body></html>
`;
```

- Use `useEffect` to listen for `message` events and update iframe height
- Set a `min-height` of 200px and `max-height` based on viewport
- Use `useRef` to track the iframe element

---

## Step 2: Create the Plugin Definition

**File**: `src/lib/document-types/plugins/html.ts`

### Plugin Object

```typescript
import { Code } from 'lucide-react'
import HtmlPreview from '@/components/markdown/HtmlPreview'
import type { DocumentTypePlugin } from '../types'

export const htmlPlugin: DocumentTypePlugin = {
  kind: 'html',
  label: 'HTML',
  icon: Code,
  detect: (text: string) => {
    const trimmed = text.trimStart().toLowerCase()
    return (
      trimmed.startsWith('<!doctype html') ||
      trimmed.startsWith('<html') ||
      /^<(head|body|div|section|article|main|nav|header|footer|table|form|ul|ol|dl|p|h[1-6])\b/i.test(trimmed)
    )
  },
  priority: 5,
  renderer: HtmlPreview,
  fileExtensions: ['.html', '.htm'],
  exportMimeType: 'text/html',
  exportExtension: '.html',
  defaultContent: [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <title>New Page</title>',
    '  <style>',
    '    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <h1>Hello World</h1>',
    '  <p>Start editing your HTML here...</p>',
    '</body>',
    '</html>',
  ].join('\n'),
  defaultTitle: (n: number) => `Page-${n}`,
}
```

### Detection Heuristic Rationale

- **Priority 5**: Between mermaid (10) and markdown (0). Mermaid's syntax is very distinctive (starts with `flowchart`, `sequenceDiagram`, etc.) so it should be checked first. HTML detection checks for opening tags, which could false-positive on markdown containing raw HTML — but only when the document *starts* with an HTML tag, which is a strong signal for full HTML documents.
- **`<!doctype html` and `<html`**: Canonical full-document signals
- **Block-level element regex**: Catches documents that start with structural HTML tags without a doctype

---

## Step 3: Register the Plugin

**File**: `src/lib/document-types/index.ts`

Add to the existing barrel file:

```typescript
import { htmlPlugin } from './plugins/html'

// ... existing registrations ...
documentTypeRegistry.register(htmlPlugin)
```

---

## Step 4: Manual Verification Matrix

| Test Case | Action | Expected Result |
|---|---|---|
| New tab menu | Click "+" > "New HTML" | New tab with HTML template, Code icon on tab |
| Content detection (paste) | Paste `<!DOCTYPE html><html>...` into empty doc | Auto-detects as `html` kind, renders in iframe |
| Content detection (negative) | Paste `# Hello\n<div>markdown</div>` | Stays as `markdown` (starts with `#`, not HTML tag) |
| File drop `.html` | Drag-drop an `.html` file | Opens as HTML document with iframe preview |
| File drop `.htm` | Drag-drop an `.htm` file | Opens as HTML document with iframe preview |
| File accept dialog | Click import button | File picker shows `.html`, `.htm` alongside `.md` etc. |
| Export/save | Click save on HTML tab | Downloads as `.html` with `text/html` MIME type |
| Tab icon | Observe HTML tab | Shows `Code` icon (from lucide) |
| Backwards compat | Load app with old localStorage (no `html` kind) | Old docs load as markdown/mermaid correctly |
| Mermaid still works | Create mermaid tab, paste mermaid syntax | Mermaid detection unaffected |
| Markdown still works | Create markdown tab, type markdown | Markdown rendering unaffected |

---

## Estimated Scope

| Item | New Files | Modified Files |
|---|---|---|
| HtmlPreview renderer | 1 | 0 |
| html plugin definition | 1 | 0 |
| Plugin registration | 0 | 1 (index.ts barrel) |
| **Total** | **2 new files** | **1 modified file** |

Zero changes to `EditorWithProview.tsx` — that is the entire point of the plugin architecture.
