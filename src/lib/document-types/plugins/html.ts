/**
 * HTML Plugin — Document Type Definition
 *
 * Priority 5 — between mermaid (10) and markdown (0).
 * Detects raw HTML documents by checking for doctype declarations,
 * `<html>` tags, or structural block-level HTML elements at the
 * start of the text.
 */

import { Code } from 'lucide-react'
import HtmlPreview from '@/components/markdown/HtmlPreview'
import type { DocumentTypePlugin } from '../types'

// ── Detection heuristic ─────────────────────────────────────────────

/**
 * Block-level HTML elements that unambiguously signal a full HTML document
 * (as opposed to inline HTML embedded in markdown).
 */
const blockElementPattern =
  /^<(head|body|div|section|article|main|nav|header|footer|table|form|ul|ol|dl|p|h[1-6])\b/i

/**
 * Returns `true` when `text` looks like raw HTML source.
 *
 * Three checks on the trimmed, lowercased text:
 * 1. Starts with `<!doctype html` — canonical full-document signal
 * 2. Starts with `<html` — root element
 * 3. Starts with a block-level HTML element — structural HTML without doctype
 *
 * These are intentionally strict: markdown that happens to contain inline
 * HTML (e.g. `# Title\n<div>…</div>`) will NOT match because the text
 * doesn't *start* with an HTML tag.
 */
export function isHtmlText(text: string): boolean {
  const trimmed = text.trimStart()
  if (!trimmed) return false

  const lower = trimmed.toLowerCase()
  return (
    lower.startsWith('<!doctype html') ||
    lower.startsWith('<html') ||
    blockElementPattern.test(trimmed)
  )
}

// ── Plugin definition ───────────────────────────────────────────────

const defaultHtmlContent = [
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
].join('\n')

export const htmlPlugin: DocumentTypePlugin = {
  kind: 'html',
  label: 'HTML',
  icon: Code,
  detect: isHtmlText,
  priority: 5,
  renderer: HtmlPreview,
  fileExtensions: ['.html', '.htm'],
  exportMimeType: 'text/html',
  exportExtension: '.html',
  defaultContent: defaultHtmlContent,
  defaultTitle: (n: number) => `Page-${n}`,
  tabColor: 'oklch(0.62 0.16 45)',
}
