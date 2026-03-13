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
 * Contract: accepts `{ content: string }` per the `RendererProps` type.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRunner } from 'react-runner'
import type { Scope } from 'react-runner'
import type { RendererProps } from '@/lib/document-types/types'
import { defaultScope, buildScope } from '@/lib/react-preview/scope'
import { extractImportSpecifiers } from '@/lib/react-preview/import-parser'
import { CDN_BASE, REACT_VERSION, cdnUrl } from '@/lib/react-preview/cdn'

// ── Constants ───────────────────────────────────────────────────────

const MIN_HEIGHT = 200
const SUCRASE_VERSION = '3.35.0'

// ── Isolated-mode iframe document ───────────────────────────────────

/**
 * Builds a self-contained HTML document that:
 * 1. Loads React 18 + ReactDOM from esm.sh via import map (single instance)
 * 2. Loads external packages from esm.sh with ?external=react,react-dom
 * 3. Loads Sucrase for in-iframe JSX transpilation
 * 4. Transpiles and renders the user's code
 * 5. Posts resize events to the parent for auto-height
 */
function buildIframeDoc(code: string, externalImports: string[]): string {
  // Escape the code for embedding inside a JS template literal
  const escapedCode = code
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')

  // Build import map for React dedup + external packages
  const importMapEntries: Record<string, string> = {
    react: `${CDN_BASE}/react@${REACT_VERSION}`,
    'react-dom': `${CDN_BASE}/react-dom@${REACT_VERSION}`,
    'react-dom/client': `${CDN_BASE}/react-dom@${REACT_VERSION}/client`,
  }
  for (const pkg of externalImports) {
    importMapEntries[pkg] = cdnUrl(pkg)
  }

  const importMapScript = `<script type="importmap">
${JSON.stringify({ imports: importMapEntries }, null, 2)}
</script>`

  // Generate top-level ESM imports for external packages
  // These run before user code, making modules available to require()
  const extImportLines = externalImports
    .map((pkg, i) => `    let __ext_${i};
    try {
      __ext_${i} = await import('${cdnUrl(pkg)}');
    } catch (e) {
      console.error('Failed to load ${pkg}:', e);
      __ext_${i} = null;
    }`)
    .join('\n')

  // Build the require() lookup map for Sucrase-transpiled code
  const requireEntries = externalImports
    .map((pkg, i) => `        '${pkg}': __ext_${i},`)
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${importMapScript}
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 1rem; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import React from '${CDN_BASE}/react@${REACT_VERSION}';
    import ReactDOM from '${CDN_BASE}/react-dom@${REACT_VERSION}';
    import { transform } from '${CDN_BASE}/sucrase@${SUCRASE_VERSION}';

    const { useState, useEffect, useRef, useMemo, useCallback, useContext,
            useReducer, useId, Fragment, createElement, createContext,
            forwardRef, memo, lazy, Suspense } = React;

    // Load external packages
${extImportLines}

    const userCode = \`${escapedCode}\`;

    try {
      const { code: transpiled } = transform(userCode, {
        transforms: ['jsx', 'typescript', 'imports'],
        production: true,
      });

      const exports = {};
      const module = { exports };
      const _extModules = {
        'react': React,
        'react-dom': ReactDOM,
${requireEntries}
      };
      const require = (mod) => {
        if (mod in _extModules) {
          if (_extModules[mod] === null) {
            throw new Error(
              'Package "' + mod + '" failed to load from CDN. ' +
              'Check the package name and your network connection.'
            );
          }
          return _extModules[mod];
        }
        throw new Error(
          'Module not found: "' + mod + '". ' +
          'External packages are loaded from esm.sh CDN. ' +
          'Verify the package name is correct and published on npm.'
        );
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
      root.render(React.createElement(Component));
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

// ── Shared-mode renderer ────────────────────────────────────────────

const SCOPE_DEBOUNCE_MS = 300

function SharedPreview({ content }: { content: string }) {
  const [scope, setScope] = useState<Scope>(defaultScope)
  const [scopeErrors, setScopeErrors] = useState<string[]>([])
  const [loadingPackages, setLoadingPackages] = useState(false)
  const [loadedKey, setLoadedKey] = useState<string>('')

  // Track which packages are in the current scope to avoid redundant rebuilds.
  // Ref for effect-time bail-out (avoids re-trigger loops); state for render-time.
  const loadedPackagesRef = useRef<string>('')

  // Extract import specifiers (memoized on content)
  const externalPackages = useMemo(
    () => extractImportSpecifiers(content),
    [content],
  )

  // Debounced async scope building when external packages change.
  // All setState calls are inside the setTimeout / .then() callbacks
  // to avoid synchronous state updates in the effect body.
  useEffect(() => {
    const key = [...externalPackages].sort().join(',')
    if (key === loadedPackagesRef.current) return

    let cancelled = false

    const timer = setTimeout(() => {
      if (cancelled) return

      // No external packages — reset to default scope
      if (externalPackages.length === 0) {
        loadedPackagesRef.current = key
        setLoadedKey(key)
        setScope(defaultScope)
        setScopeErrors([])
        setLoadingPackages(false)
        return
      }

      setLoadingPackages(true)
      buildScope(externalPackages)
        .then(({ scope: newScope, errors }) => {
          if (cancelled) return
          loadedPackagesRef.current = key
          setLoadedKey(key)
          setScope(newScope)
          setScopeErrors(errors)
          setLoadingPackages(false)
        })
        .catch((err) => {
          if (cancelled) return
          setScopeErrors([err instanceof Error ? err.message : String(err)])
          setLoadingPackages(false)
        })
    }, SCOPE_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [externalPackages])

  // While external packages are loading, run a no-op component to avoid
  // flash-of-error from useRunner executing code with missing imports.
  const needsLoad =
    externalPackages.length > 0 &&
    loadedKey !== [...externalPackages].sort().join(',')

  const effectiveCode =
    loadingPackages || needsLoad ? 'export default () => null' : content

  const { element, error } = useRunner({ code: effectiveCode, scope })

  return (
    <>
      {loadingPackages && (
        <div
          style={{
            padding: '0.5rem 1rem',
            marginBottom: '0.5rem',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            color: '#2563eb',
            fontSize: '0.8rem',
            fontFamily: 'system-ui, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <LoadingSpinner />
          Loading packages: {externalPackages.join(', ')}…
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
            color: '#92400e',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: '0.8rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {scopeErrors.join('\n')}
        </div>
      )}
      {error && (
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
          {error}
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

function IsolatedPreview({ content }: { content: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState<number>(MIN_HEIGHT)

  const externalPackages = useMemo(
    () => extractImportSpecifiers(content),
    [content],
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
      srcDoc={buildIframeDoc(content, externalPackages)}
      sandbox="allow-scripts allow-same-origin"
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

// ── Main component ──────────────────────────────────────────────────

function ReactPreview({ content }: RendererProps) {
  const [mode, setMode] = useState<'shared' | 'isolated'>('shared')

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
          Enter React/JSX code to see a live preview
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
            onClick={() => setMode('shared')}
          />
          <ModeButton
            label="Isolated"
            active={mode === 'isolated'}
            onClick={() => setMode('isolated')}
          />
        </div>
        <BadgeLabel />
      </div>

      {/* Preview pane */}
      <div style={{ padding: mode === 'shared' ? '1rem' : 0 }}>
        {mode === 'shared'
          ? <SharedPreview content={content} />
          : <IsolatedPreview content={content} />
        }
      </div>
    </div>
  )
}

// ── Small UI atoms ──────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="#93c5fd"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M8 2a6 6 0 0 1 6 6"
        stroke="#2563eb"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

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
