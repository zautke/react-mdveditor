/**
 * Document Type Plugin System — Type Definitions
 *
 * Every document type (markdown, mermaid, html, etc.) is described by a
 * DocumentTypePlugin object.  The registry iterates these by priority
 * to detect content type and dispatch rendering.
 */

import type { ComponentType } from 'react'

/** Universal props contract for all renderer components. */
export interface RendererProps {
  content: string
}

/**
 * A document-type plugin.
 *
 * All properties are `readonly` — plugins are immutable once registered.
 */
export interface DocumentTypePlugin {
  /** Unique lowercase identifier (e.g. 'markdown', 'mermaid', 'html'). */
  readonly kind: string

  /** Human-readable label for menus and UI (e.g. 'Markdown', 'Mermaid Diagram'). */
  readonly label: string

  /** Icon component (from lucide-react) shown on tabs and menus. */
  readonly icon: ComponentType

  /**
   * Detection heuristic — returns `true` when `text` looks like this type.
   *
   * **Contract:**
   * - Must be pure (no side effects).
   * - Must be fast  (called on every paste / drop / load).
   * - Must be deterministic.
   * - Must never throw.
   */
  readonly detect: (text: string) => boolean

  /**
   * Priority for the detection pipeline.
   * Higher values are checked first.
   *
   * Convention: markdown = 0 (fallback), mermaid = 10, new types = 1–9.
   */
  readonly priority: number

  /** React component that renders this document type's content. */
  readonly renderer: ComponentType<RendererProps>

  /** File extensions this type handles (e.g. ['.md', '.mdx']). */
  readonly fileExtensions: readonly string[]

  /** IANA MIME type used when exporting / saving. */
  readonly exportMimeType: string

  /** Primary file extension appended on export (e.g. '.md'). */
  readonly exportExtension: string

  /** Default content template for newly created documents. */
  readonly defaultContent: string

  /** Title generator for new tabs (receives a 1-based counter). */
  readonly defaultTitle: (n: number) => string

  /** Accent color for the tab header (CSS color value, e.g. oklch(...)). */
  readonly tabColor: string

  /** Darker accent for the tab icon (auto-derived via color-mix if omitted). */
  readonly tabIconColor?: string
}
