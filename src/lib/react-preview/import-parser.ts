/**
 * React Preview — Import Specifier Parser
 *
 * Extracts bare (npm) import specifiers from user JSX/TSX code using regex.
 * Excludes relative paths, data URIs, and built-in packages (react, react-dom)
 * that are already provided by the preview runtime.
 */

/** Packages already provided by the preview runtime — never resolve from CDN. */
const BUILTIN_PACKAGES = new Set(['react', 'react-dom', 'react-dom/client'])

/**
 * Matches ES module import/export-from statements and extracts the specifier.
 *
 * Handles:
 *  - import X from 'pkg'
 *  - import { X } from 'pkg'
 *  - import * as X from 'pkg'
 *  - import 'pkg'              (side-effect)
 *  - export { X } from 'pkg'   (re-export)
 *  - export * from 'pkg'
 *
 * Does NOT match dynamic `import('pkg')` — those would need async CDN
 * resolution at a different level.
 */
const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g

/**
 * Returns true for specifiers that should be resolved from CDN.
 * Excludes relative paths (./foo, ../bar), absolute paths (/foo),
 * data URIs, and built-in packages.
 */
function isBareSpecifier(specifier: string): boolean {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false
  if (specifier.startsWith('data:') || specifier.startsWith('http')) return false
  return !BUILTIN_PACKAGES.has(specifier)
}

/**
 * Extracts deduplicated bare npm package names from user code.
 *
 * For scoped packages (`@scope/pkg/deep`), returns `@scope/pkg`.
 * For unscoped packages (`pkg/deep/path`), returns `pkg`.
 */
export function extractImportSpecifiers(code: string): string[] {
  const seen = new Set<string>()
  let match: RegExpExecArray | null

  // Reset regex state (global flag)
  IMPORT_RE.lastIndex = 0

  while ((match = IMPORT_RE.exec(code)) !== null) {
    const raw = match[1]
    if (!isBareSpecifier(raw)) continue

    // Normalize to package root: @scope/pkg or pkg
    const parts = raw.split('/')
    const pkgName = raw.startsWith('@')
      ? `${parts[0]}/${parts[1]}`
      : parts[0]

    seen.add(pkgName)
  }

  return [...seen]
}
