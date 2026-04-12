/**
 * URL Plugin — Document Type Definition
 *
 * Priority 6 — above html(5) so the `<!--URL_META:…` prefix is
 * claimed before the HTML detector fires on the comment syntax.
 *
 * Detection:
 * 1. Content starts with `<!--URL_META:` — stored article
 * 2. Content is a bare http(s) URL — pending fetch
 */

import { lazy, Suspense, createElement } from 'react'
import { Globe } from 'lucide-react'
import type { DocumentTypePlugin, RendererProps } from '../types'

// ── Lazy renderer ───────────────────────────────────────────────────
// UrlPreview is only loaded when a URL document is opened.

const LazyUrlPreview = lazy(
  () => import('@/components/markdown/UrlPreview'),
)

function UrlRendererWrapper({ content, documentId }: RendererProps) {
  return createElement(
    Suspense,
    {
      fallback: createElement(
        'div',
        { style: { padding: '1rem', color: '#888', fontStyle: 'italic' } },
        'Loading article preview\u2026',
      ),
    },
    createElement(LazyUrlPreview, { content, documentId }),
  )
}
UrlRendererWrapper.displayName = 'UrlRendererWrapper'

export default UrlRendererWrapper

// ── Detection ───────────────────────────────────────────────────────

/**
 * Returns `true` when `text` is URL doctype content.
 *
 * Two patterns:
 * 1. Starts with `<!--URL_META:` — stored extracted article
 * 2. Bare http(s) URL on a single line — pending extraction
 */
export function isUrlContent(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  return (
    trimmed.startsWith('<!--URL_META:') ||
    /^https?:\/\/\S+$/i.test(trimmed)
  )
}

// ── Default content ─────────────────────────────────────────────────

const defaultUrlContent = ''

// ── Plugin definition ───────────────────────────────────────────────

export const urlPlugin: DocumentTypePlugin = {
  kind: 'url',
  label: 'Web Article',
  icon: Globe,
  detect: isUrlContent,
  priority: 6,
  renderer: UrlRendererWrapper,
  fileExtensions: ['.url.html'],
  exportMimeType: 'text/html',
  exportExtension: '.url.html',
  defaultContent: defaultUrlContent,
  defaultTitle: (n: number) => `Article-${n}`,
  tabColor: 'oklch(0.62 0.15 245)',
}
