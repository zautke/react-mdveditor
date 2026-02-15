/**
 * Document Type Registry — Singleton Module
 *
 * ES-module-level singleton: evaluated once by Vite and cached.
 * No class instantiation required — import and call.
 */

import type { DocumentTypePlugin } from './types'

// ── Internal state ──────────────────────────────────────────────────

const plugins = new Map<string, DocumentTypePlugin>()
let sortedPlugins: readonly DocumentTypePlugin[] = []

/** Re-sort the cached array after any mutation. */
function rebuildSorted(): void {
  sortedPlugins = Array.from(plugins.values()).sort(
    (a, b) => b.priority - a.priority,
  )
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Register a document-type plugin.
 * If a plugin with the same `kind` is already registered it is overwritten
 * (a console warning is emitted in development).
 */
export function register(plugin: DocumentTypePlugin): void {
  if (plugins.has(plugin.kind)) {
    console.warn(
      `[DocumentTypeRegistry] Plugin "${plugin.kind}" is already registered — overwriting.`,
    )
  }
  plugins.set(plugin.kind, plugin)
  rebuildSorted()
}

/**
 * Detect the document type of the given text.
 *
 * Iterates registered plugins by priority (highest first).
 * The first plugin whose `detect()` returns `true` wins.
 * Falls back to `'markdown'` when nothing matches.
 */
export function detect(text: string): string {
  for (const plugin of sortedPlugins) {
    if (plugin.detect(text)) {
      return plugin.kind
    }
  }
  return 'markdown'
}

/**
 * Get a plugin by its `kind` string.
 *
 * Unknown kinds (e.g. stale localStorage values) gracefully fall back
 * to the `'markdown'` plugin.  Throws only if no fallback is available
 * (should never happen once the barrel import has executed).
 */
export function get(kind: string): DocumentTypePlugin {
  const plugin = plugins.get(kind)
  if (plugin) return plugin

  const fallback = plugins.get('markdown')
  if (fallback) return fallback

  throw new Error(
    `[DocumentTypeRegistry] Plugin "${kind}" not found and no markdown fallback is available.`,
  )
}

/** All registered plugins, sorted by priority (highest first). */
export function all(): readonly DocumentTypePlugin[] {
  return sortedPlugins
}

/** Flat array of every file extension from every registered plugin. */
export function allExtensions(): string[] {
  return sortedPlugins.flatMap((p) => [...p.fileExtensions])
}

/**
 * Find the plugin that handles a given file extension.
 * Returns `undefined` if no plugin claims the extension.
 */
export function getByExtension(
  ext: string,
): DocumentTypePlugin | undefined {
  const normalised = ext.startsWith('.')
    ? ext.toLowerCase()
    : `.${ext.toLowerCase()}`
  return sortedPlugins.find((p) =>
    p.fileExtensions.some((e) => e.toLowerCase() === normalised),
  )
}

/** Strip any registered extension from a filename to produce a title. */
export function stripExtension(filename: string): string {
  const exts = allExtensions()
  const lower = filename.toLowerCase()
  for (const ext of exts) {
    if (lower.endsWith(ext.toLowerCase())) {
      return filename.slice(0, -ext.length)
    }
  }
  return filename
}

/**
 * Reset all state — **testing only**.
 * @internal
 */
export function _reset(): void {
  plugins.clear()
  sortedPlugins = []
}

// ── Convenience re-export ───────────────────────────────────────────

export const documentTypeRegistry = {
  register,
  detect,
  get,
  all,
  allExtensions,
  getByExtension,
  stripExtension,
  _reset,
} as const
