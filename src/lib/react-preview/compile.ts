import { REACT_PREVIEW_ALLOWED_IMPORTS } from './scope'

export type PreviewDiagnosticCode =
  | 'UNSUPPORTED_IMPORT'
  | 'NO_RENDERABLE_EXPORT'
  | 'AMBIGUOUS_NAMED_EXPORT'

export interface PreviewDiagnostic {
  code: PreviewDiagnosticCode
  message: string
  details?: string
}

export interface CompileAnalysis {
  normalizedCode: string
  hasDefaultExport: boolean
  inferredDefaultExport?: string
  unsupportedImports: string[]
  diagnostics: PreviewDiagnostic[]
}

const ALLOWED_IMPORT_SET = new Set<string>(REACT_PREVIEW_ALLOWED_IMPORTS)

const IMPORT_SPECIFIER_PATTERN =
  /(?:^|\n)\s*import(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/g
const REEXPORT_SPECIFIER_PATTERN =
  /(?:^|\n)\s*export\s+(?:\*|\{[\s\S]*?\})\s+from\s+["']([^"']+)["']/g
const DEFAULT_EXPORT_PATTERN = /\bexport\s+default\b/
const EXPORTED_FUNCTION_PATTERN = /\bexport\s+function\s+([A-Z][A-Za-z0-9_]*)\b/g
const EXPORTED_CONST_PATTERN = /\bexport\s+const\s+([A-Z][A-Za-z0-9_]*)\b/g
const EXPORTED_CLASS_PATTERN = /\bexport\s+class\s+([A-Z][A-Za-z0-9_]*)\b/g

function collectModuleSpecifiers(code: string): string[] {
  const modules = new Set<string>()
  let match: RegExpExecArray | null

  IMPORT_SPECIFIER_PATTERN.lastIndex = 0
  while ((match = IMPORT_SPECIFIER_PATTERN.exec(code)) !== null) {
    modules.add(match[1])
  }

  REEXPORT_SPECIFIER_PATTERN.lastIndex = 0
  while ((match = REEXPORT_SPECIFIER_PATTERN.exec(code)) !== null) {
    modules.add(match[1])
  }

  return Array.from(modules)
}

function collectNamedComponentExports(code: string): string[] {
  const names = new Set<string>()
  let match: RegExpExecArray | null

  EXPORTED_FUNCTION_PATTERN.lastIndex = 0
  while ((match = EXPORTED_FUNCTION_PATTERN.exec(code)) !== null) {
    names.add(match[1])
  }

  EXPORTED_CONST_PATTERN.lastIndex = 0
  while ((match = EXPORTED_CONST_PATTERN.exec(code)) !== null) {
    names.add(match[1])
  }

  EXPORTED_CLASS_PATTERN.lastIndex = 0
  while ((match = EXPORTED_CLASS_PATTERN.exec(code)) !== null) {
    names.add(match[1])
  }

  return Array.from(names)
}

export function analyzeAndNormalizeReactSource(code: string): CompileAnalysis {
  const diagnostics: PreviewDiagnostic[] = []
  const importSpecifiers = collectModuleSpecifiers(code)
  const unsupportedImports = importSpecifiers.filter(
    (specifier) => !ALLOWED_IMPORT_SET.has(specifier),
  )

  if (unsupportedImports.length > 0) {
    diagnostics.push({
      code: 'UNSUPPORTED_IMPORT',
      message:
        'Only React imports are supported in this preview. Remove external imports or switch to isolated patterns.',
      details: `Unsupported imports: ${unsupportedImports.join(', ')}`,
    })
  }

  const hasDefaultExport = DEFAULT_EXPORT_PATTERN.test(code)
  if (hasDefaultExport) {
    return {
      normalizedCode: code,
      hasDefaultExport,
      unsupportedImports,
      diagnostics,
    }
  }

  const candidates = collectNamedComponentExports(code)

  if (candidates.length === 1) {
    const inferredDefaultExport = candidates[0]
    return {
      normalizedCode: `${code}\n\nexport default ${inferredDefaultExport}\n`,
      hasDefaultExport,
      inferredDefaultExport,
      unsupportedImports,
      diagnostics,
    }
  }

  if (candidates.length > 1) {
    diagnostics.push({
      code: 'AMBIGUOUS_NAMED_EXPORT',
      message:
        'Multiple exported components were found. Add an explicit `export default` to choose which component to render.',
      details: `Candidates: ${candidates.join(', ')}`,
    })
  } else {
    diagnostics.push({
      code: 'NO_RENDERABLE_EXPORT',
      message:
        'No renderable component export found. Export a PascalCase component with `export default` or a single named export.',
    })
  }

  return {
    normalizedCode: code,
    hasDefaultExport,
    unsupportedImports,
    diagnostics,
  }
}
