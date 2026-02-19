/**
 * Mermaid Plugin — Document Type Definition
 *
 * Priority 10 (highest built-in) — checked before markdown.
 * Detects raw mermaid diagram syntax pasted or dropped into the editor.
 */

import { lazy, Suspense, createElement } from 'react'
import { GitBranch } from 'lucide-react'
import type { DocumentTypePlugin, RendererProps } from '../types'

// Lazy-load MermaidDiagram — the mermaid library (~2.3 MB) is only fetched
// when a user actually opens or creates a mermaid document type.
const LazyMermaidDiagram = lazy(() => import('@/components/markdown/MermaidDiagram'))

// ── Detection heuristic ─────────────────────────────────────────────

/** First-line keywords that unambiguously start a mermaid diagram. */
const mermaidStarters = [
  'flowchart',
  'graph',
  'sequencediagram',
  'classdiagram',
  'statediagram',
  'statediagram-v2',
  'erdiagram',
  'gantt',
  'pie',
  'journey',
  'gitgraph',
  'mindmap',
  'timeline',
  'quadrantchart',
  'sankey-beta',
  'xychart-beta',
  'block-beta',
  'packet-beta',
  'kanban',
  'architecture-beta',
  'c4context',
  'c4container',
  'c4component',
  'c4deployment',
  'c4dynamic',
  'requirementdiagram',
  'zenuml',
] as const

/**
 * Returns `true` when `text` looks like raw mermaid diagram source.
 *
 * Checks whether the first non-empty line starts with one of the
 * known mermaid diagram keywords.  Fast, pure, and deterministic.
 */
export function isMermaidText(text: string): boolean {
  const trimmed = text.trimStart().toLowerCase()
  if (!trimmed) return false

  // Extract the first word (up to whitespace or newline)
  const firstWord = trimmed.split(/[\s\n]/)[0]
  return mermaidStarters.some((starter) => firstWord === starter)
}

// ── Renderer wrapper ────────────────────────────────────────────────
// MermaidDiagram accepts `{ chart: string }`.
// The registry contract requires `{ content: string }`.

function MermaidRendererWrapper({ content }: RendererProps) {
  return createElement(
    Suspense,
    { fallback: createElement('div', {
        style: { padding: '1rem', color: '#888', fontStyle: 'italic' }
      }, 'Loading diagram…')
    },
    createElement(LazyMermaidDiagram, { chart: content })
  )
}
MermaidRendererWrapper.displayName = 'MermaidRendererWrapper'

export default MermaidRendererWrapper

// ── Plugin definition ───────────────────────────────────────────────

const defaultMermaidContent = `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
`

export const mermaidPlugin: DocumentTypePlugin = {
  kind: 'mermaid',
  label: 'Mermaid Diagram',
  icon: GitBranch,
  detect: isMermaidText,
  priority: 10,
  renderer: MermaidRendererWrapper,
  fileExtensions: ['.mmd', '.mermaid'],
  exportMimeType: 'text/plain',
  exportExtension: '.mmd',
  defaultContent: defaultMermaidContent,
  defaultTitle: (n: number) => `Diagram-${n}`,
  tabColor: 'oklch(0.62 0.15 155)',
}
