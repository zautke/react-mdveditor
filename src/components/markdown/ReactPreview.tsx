/**
 * ReactPreview — Live React/JSX/TSX component preview.
 *
 * Two rendering modes, switchable via a toggle in the header:
 *
 * - **Shared** (default): `useRunner()` renders the component directly
 *   in the app's React tree.  The component inherits Tailwind classes,
 *   design tokens, and the app's CSS context.
 *
 * - **Isolated**: A sandboxed `<iframe>` loads React from a CDN and
 *   transpiles + renders the code in complete JS/CSS isolation.
 *
 * Contract: accepts `{ content: string, documentId?: string }` per
 * the `RendererProps` type.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRunner } from 'react-runner'
import type { Scope } from 'react-runner'
import type { RendererProps } from '@/lib/document-types/types'
import {
  analyzeAndNormalizeReactSource,
  type PreviewDiagnostic,
  type PreviewDiagnosticCode,
} from '@/lib/react-preview/compile'
import { buildScope, defaultScope } from '@/lib/react-preview/scope'
import { extractImportSpecifiers } from '@/lib/react-preview/import-parser'
import { CDN_BASE, pinnedCdnUrl } from '@/lib/react-preview/cdn'
import {
  getMode as getSessionMode,
  setMode as setSessionMode,
  type PreviewMode,
} from '@/lib/react-preview/session-state'

// ── Constants ───────────────────────────────────────────────────────

const MIN_HEIGHT = 200

/** CDN base for loading React into the isolated iframe. */
const REACT_CDN = 'https://esm.sh'
const REACT_VERSION = '18.3.1'
const SUCRASE_VERSION = '3.35.0'

const BLOCKING_DIAGNOSTIC_CODES = new Set<PreviewDiagnosticCode>([
  'UNSUPPORTED_IMPORT',
  'NO_RENDERABLE_EXPORT',
  'AMBIGUOUS_NAMED_EXPORT',
])

const FALLBACK_ELIGIBLE_ERROR_PATTERNS = [
  /module not found/i,
  /cannot find module/i,
  /cannot use import statement outside a module/i,
  /unexpected token\s+(?:import|export)/i,
  // Two React copies. A CDN package builds against the CDN's React, while
  // shared mode renders into the app's bundled React, so the package's hooks
  // read a null dispatcher. Nothing the user can fix in their code — but the
  // isolated iframe has exactly one React, so it renders fine there.
  /invalid hook call/i,
  /cannot read propert(?:y|ies).*\buse[A-Z]\w*/i,
  /reactcurrentdispatcher/i,
]

const fallbackAttemptedKeys = new Set<string>()

// ── Helpers ─────────────────────────────────────────────────────────

function getDocumentKey(documentId?: string): string {
  return documentId && documentId.trim().length > 0
    ? documentId
    : '__react-preview:ephemeral__'
}

function getContentHash(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(16)
}

function getFallbackAttemptKey(documentId: string | undefined, code: string): string {
  return `${getDocumentKey(documentId)}:${getContentHash(code)}`
}

function isFallbackEligibleError(error: string): boolean {
  return FALLBACK_ELIGIBLE_ERROR_PATTERNS.some((pattern) => pattern.test(error))
}

// ── Isolated-mode iframe document ───────────────────────────────────

/**
 * Builds a self-contained HTML document that:
 * 1. Loads React 18 + ReactDOM from esm.sh
 * 2. Loads Sucrase for in-iframe JSX transpilation
 * 3. Transpiles and renders the user's code
 * 4. Posts resize events to the parent for auto-height
 */
function buildIframeDoc(code: string, externalPackages: string[] = []): string {
  // Escape the code for embedding inside a JS template literal
  const escapedCode = code
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')

  // Fetch each bare npm import the user's code references, keyed by specifier
  // so the `require` shim below can hand it back. Failures are reported per
  // package instead of taking down the whole preview.
  const externalLoader = externalPackages.length
    ? `
    const externals = {};
    const externalErrors = [];
    // Flag namespaces as ES modules so the CJS interop below unwraps \`default\`
    // instead of wrapping the namespace. See withEsModuleInterop in cdn.ts.
    const withEsModuleInterop = (mod) =>
      mod !== null && typeof mod === 'object' ? { __esModule: true, ...mod } : mod;
    await Promise.all(${JSON.stringify(externalPackages)}.map(async (pkg, i) => {
      try {
        externals[pkg] = withEsModuleInterop(await import(${JSON.stringify(
          externalPackages.map((pkg) => pinnedCdnUrl(pkg)),
        )}[i]));
      } catch (err) {
        externalErrors.push(
          'Failed to load "' + pkg + '" from ${CDN_BASE}: ' + (err && err.message ? err.message : String(err))
        );
      }
    }));
    if (externalErrors.length > 0) {
      const warn = document.createElement('pre');
      warn.style.cssText = 'color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:0.75rem 1rem;white-space:pre-wrap;font-size:0.8rem;';
      warn.textContent = externalErrors.join('\\n');
      document.body.insertBefore(warn, document.getElementById('root'));
    }`
    : `
    const externals = {};`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 1rem; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import React from '${REACT_CDN}/react@${REACT_VERSION}';
    import ReactDOM from '${REACT_CDN}/react-dom@${REACT_VERSION}';
    import * as ReactJsxRuntime from '${REACT_CDN}/react@${REACT_VERSION}/jsx-runtime';
    import { transform } from '${REACT_CDN}/sucrase@${SUCRASE_VERSION}';

    const { useState, useEffect, useRef, useMemo, useCallback, useContext,
            useReducer, useId, Fragment, createElement, createContext,
            forwardRef, memo, lazy, Suspense } = React;
${externalLoader}

    const userCode = \`${escapedCode}\`;

    try {
      const { code: transpiled } = transform(userCode, {
        transforms: ['jsx', 'typescript', 'imports'],
        production: true,
      });

      const exports = {};
      const module = { exports };
      const require = (mod) => {
        if (mod === 'react') return React;
        if (mod === 'react-dom') return ReactDOM;
        if (mod === 'react/jsx-runtime') return ReactJsxRuntime;
        if (mod in externals) return externals[mod];
        // Deep import into a package that was loaded at its root, e.g.
        // 'lucide-react/icons/x' when 'lucide-react' is present.
        const root = mod.startsWith('@') ? mod.split('/').slice(0, 2).join('/') : mod.split('/')[0];
        if (root in externals) return externals[root];
        throw new Error('Module not found: ' + mod);
      };

      const fn = new Function(
        'React', 'exports', 'module', 'require',
        'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback',
        'useContext', 'useReducer', 'useId',
        'Fragment', 'createElement', 'createContext',
        'forwardRef', 'memo', 'lazy', 'Suspense',
        transpiled
      );
      fn(
        React, exports, module, require,
        useState, useEffect, useRef, useMemo, useCallback,
        useContext, useReducer, useId,
        Fragment, createElement, createContext,
        forwardRef, memo, lazy, Suspense
      );

      const Component = module.exports.default || module.exports;
      const root = ReactDOM.createRoot(document.getElementById('root'));

      if (React.isValidElement(Component)) {
        root.render(Component);
      } else if (typeof Component === 'function') {
        root.render(React.createElement(Component));
      } else if (typeof Component === 'string') {
        root.render(Component);
      } else {
        throw new Error('No renderable export found. Add export default for your component.');
      }
    } catch (err) {
      document.getElementById('root').innerHTML =
        '<pre style="color:#ef4444;white-space:pre-wrap;font-size:0.85rem;">' +
        (err.message || String(err)).replace(/</g, '&lt;') +
        '</pre>';
    }

    // Resize observer — posts height to parent
    const ro = new ResizeObserver(() => {
      window.parent.postMessage(
        { type: 'iframe-resize', height: document.body.scrollHeight },
        '*'
      );
    });
    ro.observe(document.body);
  </script>
</body>
</html>`
}

// ── Type guard for resize messages ──────────────────────────────────

interface IframeResizeMessage {
  type: 'iframe-resize'
  height: number
}

function isResizeMessage(data: unknown): data is IframeResizeMessage {
  if (typeof data !== 'object' || data === null) return false
  const msg = data as Record<string, unknown>
  return msg.type === 'iframe-resize' && typeof msg.height === 'number'
}

function hasBlockingDiagnostics(diagnostics: readonly PreviewDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => BLOCKING_DIAGNOSTIC_CODES.has(diagnostic.code))
}

// ── Shared-mode renderer ────────────────────────────────────────────

/**
 * Rendered while external packages are still being fetched. `useRunner` is a
 * hook and cannot be skipped, so we feed it a benign module rather than let it
 * evaluate the real code against a scope that does not yet have the imports —
 * which would surface a spurious "module not found" for a moment.
 */
const SCOPE_LOADING_PLACEHOLDER = 'export default function PreviewLoading() { return null }'

function SharedPreview({
  code,
  onErrorChange,
}: {
  code: string
  onErrorChange: (error: string | null) => void
}) {
  // Bare npm specifiers in the user's code, resolved from the CDN below.
  const packages = useMemo(() => extractImportSpecifiers(code), [code])
  // Stable dependency — `packages` is a fresh array each render.
  const packagesKey = packages.join(' ')

  const [scope, setScope] = useState<Scope>(defaultScope)
  const [scopeErrors, setScopeErrors] = useState<string[]>([])
  const [isLoadingScope, setIsLoadingScope] = useState(false)

  useEffect(() => {
    if (packages.length === 0) {
      setScope(defaultScope)
      setScopeErrors([])
      setIsLoadingScope(false)
      return
    }

    // Guards against an earlier, slower fetch overwriting a later one.
    let cancelled = false
    setIsLoadingScope(true)

    buildScope(packages)
      .then(({ scope: nextScope, errors }) => {
        if (cancelled) return
        setScope(nextScope)
        setScopeErrors(errors)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setScopeErrors([err instanceof Error ? err.message : String(err)])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingScope(false)
      })

    return () => {
      cancelled = true
    }
    // `packages` is derived from `packagesKey`; depending on the key keeps this
    // from re-firing on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packagesKey])

  const { element, error } = useRunner({
    code: isLoadingScope ? SCOPE_LOADING_PLACEHOLDER : code,
    scope,
  })

  const normalizedError = error ? String(error) : null

  useEffect(() => {
    onErrorChange(normalizedError)
  }, [normalizedError, onErrorChange])

  useEffect(() => {
    return () => onErrorChange(null)
  }, [onErrorChange])

  return (
    <>
      {isLoadingScope && (
        <div
          role="status"
          style={{
            padding: '0.5rem 1rem',
            marginBottom: '0.5rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            color: '#475569',
            fontSize: '0.8rem',
          }}
        >
          {`Loading ${packages.length} package${packages.length === 1 ? '' : 's'} from CDN: ${packages.join(', ')}`}
        </div>
      )}
      {scopeErrors.length > 0 && (
        <div
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '0.5rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            color: '#b45309',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: '0.8rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {scopeErrors.join('\n')}
        </div>
      )}
      {normalizedError && (
        <div
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '0.5rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#dc2626',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: '0.8rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {normalizedError}
        </div>
      )}
      {element && (
        <div style={{ minHeight: `${MIN_HEIGHT}px` }}>
          {element}
        </div>
      )}
    </>
  )
}

// ── Isolated-mode renderer ──────────────────────────────────────────

function IsolatedPreview({ code }: { code: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState<number>(MIN_HEIGHT)

  // Same bare specifiers shared mode resolves; the iframe fetches them itself
  // since it has its own module registry.
  const externalPackages = useMemo(() => extractImportSpecifiers(code), [code])
  const srcDoc = useMemo(
    () => buildIframeDoc(code, externalPackages),
    [code, externalPackages],
  )

  const handleMessage = useCallback((event: MessageEvent<unknown>) => {
    if (isResizeMessage(event.data)) {
      setHeight(Math.max(event.data.height, MIN_HEIGHT))
    }
  }, [])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      title="React Preview (Isolated)"
      style={{
        width: '100%',
        height: `${height}px`,
        border: 'none',
        display: 'block',
        minHeight: `${MIN_HEIGHT}px`,
      }}
    />
  )
}

function DiagnosticsPanel({ diagnostics }: { diagnostics: readonly PreviewDiagnostic[] }) {
  return (
    <div
      style={{
        minHeight: `${MIN_HEIGHT}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      {diagnostics.map((diagnostic, index) => (
        <div
          key={`${diagnostic.code}-${index}`}
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#b91c1c',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: '0.8rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          <strong>{diagnostic.code}</strong>
          <div>{diagnostic.message}</div>
          {diagnostic.details && <div>{diagnostic.details}</div>}
        </div>
      ))}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────

function ReactPreview({ content, documentId }: RendererProps) {
  const [mode, setModeState] = useState<PreviewMode>(() => getSessionMode(documentId))

  const analysis = useMemo(
    () => analyzeAndNormalizeReactSource(content),
    [content],
  )

  const hasBlocking = useMemo(
    () => hasBlockingDiagnostics(analysis.diagnostics),
    [analysis.diagnostics],
  )

  const setPreviewMode = useCallback((nextMode: PreviewMode) => {
    setModeState(nextMode)
    setSessionMode(documentId, nextMode)
  }, [documentId])

  const handleSharedErrorChange = useCallback((error: string | null) => {
    if (!error) return
    if (mode !== 'shared') return
    if (hasBlocking) return
    if (!isFallbackEligibleError(error)) return

    const fallbackKey = getFallbackAttemptKey(documentId, analysis.normalizedCode)
    if (fallbackAttemptedKeys.has(fallbackKey)) return

    fallbackAttemptedKeys.add(fallbackKey)
    setPreviewMode('isolated')
  }, [
    analysis.normalizedCode,
    documentId,
    hasBlocking,
    mode,
    setPreviewMode,
  ])

  // Empty content placeholder
  if (!content.trim()) {
    return (
      <div
        style={{
          position: 'relative',
          minHeight: `${MIN_HEIGHT}px`,
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BadgeLabel />
        <p
          style={{
            color: '#94a3b8',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '0.9rem',
            fontStyle: 'italic',
          }}
        >
          Enter React/JSX/TSX code to see a live preview
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: `${MIN_HEIGHT}px`,
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Header bar with toggle + badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.35rem 0.5rem',
          backgroundColor: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '0.7rem',
        }}
      >
        {/* Mode toggle */}
        <div
          role="radiogroup"
          aria-label="Preview rendering mode"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <ModeButton
            label="Shared"
            active={mode === 'shared'}
            onClick={() => setPreviewMode('shared')}
          />
          <ModeButton
            label="Isolated"
            active={mode === 'isolated'}
            onClick={() => setPreviewMode('isolated')}
          />
        </div>
        <BadgeLabel />
      </div>

      {/* Preview pane */}
      <div style={{ padding: mode === 'shared' || hasBlocking ? '1rem' : 0 }}>
        {hasBlocking
          ? <DiagnosticsPanel diagnostics={analysis.diagnostics} />
          : mode === 'shared'
            ? (
              <SharedPreview
                code={analysis.normalizedCode}
                onErrorChange={handleSharedErrorChange}
              />
            )
            : <IsolatedPreview code={analysis.normalizedCode} />
        }
      </div>
    </div>
  )
}

// ── Small UI atoms ──────────────────────────────────────────────────

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      role="radio"
      aria-checked={active}
      style={{
        padding: '0.15rem 0.5rem',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.65rem',
        fontWeight: active ? 600 : 400,
        backgroundColor: active ? '#3b82f6' : 'transparent',
        color: active ? '#ffffff' : '#64748b',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  )
}

function BadgeLabel() {
  return (
    <span
      style={{
        fontSize: '0.65rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: '#64748b',
        backgroundColor: '#e2e8f0',
        padding: '0.15rem 0.5rem',
        borderRadius: '4px',
        lineHeight: 1.4,
      }}
    >
      React Preview
    </span>
  )
}

// ── Export ───────────────────────────────────────────────────────────

ReactPreview.displayName = 'ReactPreview'

const MemoizedReactPreview = memo(ReactPreview)
MemoizedReactPreview.displayName = 'ReactPreview'

export default MemoizedReactPreview
