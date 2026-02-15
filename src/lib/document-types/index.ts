/**
 * Document Type Registry — Barrel Export
 *
 * Import this module to get the fully-initialised registry with all
 * built-in plugins registered.  This is the *only* import site the
 * rest of the application should use.
 */

// Re-export public API
export { documentTypeRegistry } from './registry'
export type { DocumentTypePlugin, RendererProps } from './types'

// ── Plugin registration ─────────────────────────────────────────────
// Plugins are imported and registered here so the registry is ready
// the moment any consumer imports from this barrel.

import { register } from './registry'
import { markdownPlugin } from './plugins/markdown'
import { mermaidPlugin } from './plugins/mermaid'

register(markdownPlugin)
register(mermaidPlugin)
