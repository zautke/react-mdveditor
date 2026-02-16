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

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useRunner } from 'react-runner'
import type { RendererProps } from '@/lib/document-types/types'
import { defaultScope } from '@/lib/react-preview/scope'

// ── Constants ───────────────────────────────────────────────────────

const MIN_HEIGHT = 200

/** CDN base for loading React into the isolated iframe. */
const REACT_CDN = 'https://esm.sh'
const REACT_VERSION = '18.3.1'
const SUCRASE_VERSION = '3.35.0'

// ── Isolated-mode iframe document ───────────────────────────────────

/**
 * Builds a self-contained HTML document that:
 * 1. Loads React 18 + ReactDOM from esm.sh
 * 2. Loads Sucrase for in-iframe JSX transpilation
 * 3. Transpiles and renders the user's code
 * 4. Posts resize events to the parent for auto-height
 */
function buildIframeDoc(code: string): string {
  // Escape the code for embedding inside a JS template literal
  const escapedCode = code
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')

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
    import { transform } from '${REACT_CDN}/sucrase@${SUCRASE_VERSION}';

    const { useState, useEffect, useRef, useMemo, useCallback, useContext,
            useReducer, useId, Fragment, createElement, createContext,
            forwardRef, memo, lazy, Suspense } = React;

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

function SharedPreview({ content }: { content: string }) {
  const { element, error } = useRunner({
    code: content,
    scope: defaultScope,
  })

  return (
    <>
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
      srcDoc={buildIframeDoc(content)}
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
