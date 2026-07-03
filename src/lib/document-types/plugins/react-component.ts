/**
 * React Component Plugin — Document Type Definition
 *
 * Priority 8 — above HTML (5), below Mermaid (10).
 * Detects React/JSX/TSX code by checking for import statements,
 * React hooks, export defaults, and PascalCase JSX components.
 *
 * Detection rule: ≥1 strong signal OR ≥2 medium signals.
 */

import { Atom } from 'lucide-react'
import ReactPreview from '@/components/markdown/ReactPreview'
import type { DocumentTypePlugin } from '../types'

// ── Detection heuristic ─────────────────────────────────────────────

/** Strong signal: `import ... from 'react'` */
const reactImportPattern = /import\s+.*from\s+['"]react['"]/

/** Medium signal: any ES import statement */
const anyImportPattern = /^import\s+/m

/** Medium signal: `export default function/const/class` or `export default () =>` */
const exportDefaultPattern = /export\s+default\s+(function|const|class|\(?.*?\)?\s*=>)/

/** Medium signal: PascalCase JSX component tag (not HTML) */
const pascalCaseJsxPattern = /<[A-Z][a-zA-Z0-9]+[\s/>]/

/** Medium signal: React hook usage */
const hookPattern = /(useState|useEffect|useRef|useMemo|useCallback|useContext|useReducer|useId)\s*\(/

/** JSX angle-bracket syntax (for combining with import) */
const jsxReturnPattern = /return\s*\(?\s*<[a-zA-Z]/

/**
 * Returns `true` when `text` looks like React/JSX/TSX source code.
 *
 * Uses a scoring model to avoid false positives on HTML or markdown:
 * - Strong signals (≥1 required alone): React import
 * - Medium signals (≥2 required): export default, PascalCase JSX,
 *   hooks, import + JSX combination
 *
 * These are intentionally strict: an HTML document starting with
 * `<div>` will NOT match because it lacks imports/exports/hooks.
 * Markdown with inline JSX-like syntax will NOT match either.
 */
export function isReactText(text: string): boolean {
  if (!text.trim()) return false

  // ── Strong signals (any one is sufficient) ──────────────────
  if (reactImportPattern.test(text)) return true

  // Import from any package + JSX syntax = strong combined signal
  if (anyImportPattern.test(text) && jsxReturnPattern.test(text)) return true

  // ── Medium signals (need ≥2) ────────────────────────────────
  let mediumCount = 0

  if (exportDefaultPattern.test(text)) mediumCount++
  if (pascalCaseJsxPattern.test(text)) mediumCount++
  if (hookPattern.test(text)) mediumCount++
  if (anyImportPattern.test(text)) mediumCount++

  return mediumCount >= 2
}

// ── Default content ─────────────────────────────────────────────────

const defaultReactContent = `import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Hello React</h1>
      <p>You clicked {count} times</p>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{
          padding: '0.5rem 1rem',
          fontSize: '1rem',
          borderRadius: '6px',
          border: '1px solid #3b82f6',
          backgroundColor: '#3b82f6',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Click me
      </button>
    </div>
  )
}
`

// ── Plugin definition ───────────────────────────────────────────────

export const reactComponentPlugin: DocumentTypePlugin = {
  kind: 'react',
  label: 'React Component',
  icon: Atom,
  detect: isReactText,
  priority: 8,
  renderer: ReactPreview,
  layout: 'split',
  fileExtensions: ['.jsx', '.tsx'],
  exportMimeType: 'text/javascript',
  exportExtension: '.tsx',
  defaultContent: defaultReactContent,
  defaultTitle: (n: number) => `Component-${n}`,
  tabColor: 'oklch(0.65 0.15 220)',
}
