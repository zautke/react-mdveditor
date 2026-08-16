/**
 * Markdown Plugin — Document Type Definition
 *
 * Priority 0 (lowest) — acts as the universal fallback.
 * Its `detect()` always returns true, so it matches anything
 * that no higher-priority plugin has claimed.
 */

import { FileText } from 'lucide-react'
import MarkdownRendererOrig from '@/components/markdown/MarkdownRenderer_orig'
import type { DocumentTypePlugin, RendererProps } from '../types'

// ── Renderer wrapper ────────────────────────────────────────────────
// MarkdownRenderer_orig accepts `{ children: string }`.
// The registry contract requires `{ content: string }`.

function MarkdownRendererWrapper({ content }: RendererProps) {
  return MarkdownRendererOrig({ children: content })
}
MarkdownRendererWrapper.displayName = 'MarkdownRendererWrapper'

export default MarkdownRendererWrapper

// ── Plugin definition ───────────────────────────────────────────────

const initialMarkdown = `# New Document

Start writing markdown here...

## Features
- **Bold** and *italic* text
- [Links](https://example.com)
- Code blocks with syntax highlighting

\`\`\`typescript
const greeting = 'Hello, world!'
console.log(greeting)
\`\`\`
`

export const markdownPlugin: DocumentTypePlugin = {
  kind: 'markdown',
  label: 'Markdown',
  icon: FileText,
  detect: () => true, // universal fallback
  priority: 0,
  renderer: MarkdownRendererWrapper,
  layout: 'split',
  fileExtensions: ['.md', '.mdx', '.markdown'],
  exportMimeType: 'text/markdown',
  exportExtension: '.md',
  defaultContent: initialMarkdown,
  defaultTitle: (n: number) => `Untitled-${n}`,
  tabColor: 'oklch(0.60 0.10 250)',
}
