import { memo, useCallback, useEffect, useRef, useState } from 'react'
import type { RendererProps } from '@/lib/document-types/types'

/**
 * Wraps raw HTML in a full document with a ResizeObserver script
 * that posts the body's scrollHeight to the parent frame.
 */
const wrapWithResizeScript = (html: string): string => `
  <!DOCTYPE html>
  <html><head><style>body { margin: 0; font-family: system-ui, sans-serif; }</style></head>
  <body>${html}
  <script>
    const ro = new ResizeObserver(() => {
      window.parent.postMessage({ type: 'iframe-resize', height: document.body.scrollHeight }, '*');
    });
    ro.observe(document.body);
  </script>
  </body></html>
`

/** Shape of the postMessage payload sent by the injected resize script. */
interface IframeResizeMessage {
  type: 'iframe-resize'
  height: number
}

/** Type guard for messages originating from the injected resize script. */
function isResizeMessage(data: unknown): data is IframeResizeMessage {
  if (typeof data !== 'object' || data === null) return false
  const msg = data as Record<string, unknown>
  return msg.type === 'iframe-resize' && typeof msg.height === 'number'
}

const MIN_HEIGHT = 200

/**
 * HtmlPreview — renders raw HTML content inside a sandboxed iframe.
 *
 * Security: The iframe uses `sandbox="allow-scripts"` without
 * `allow-same-origin`, preventing the embedded content from accessing
 * the parent page's DOM, cookies, or storage.
 *
 * Auto-resize: A ResizeObserver script is injected into the iframe
 * document. It posts height changes via `postMessage`, which the
 * component listens for to adjust the iframe height dynamically.
 */
function HtmlPreview({ content }: RendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState<number>(MIN_HEIGHT)

  const handleMessage = useCallback((event: MessageEvent<unknown>) => {
    if (isResizeMessage(event.data)) {
      const newHeight = Math.max(event.data.height, MIN_HEIGHT)
      setHeight(newHeight)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [handleMessage])

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
        {/* Badge */}
        <span
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
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
          HTML Preview
        </span>
        <p
          style={{
            color: '#94a3b8',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '0.9rem',
            fontStyle: 'italic',
          }}
        >
          Enter HTML to see a live preview
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
      {/* Badge */}
      <span
        style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          fontSize: '0.65rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#64748b',
          backgroundColor: 'rgba(226, 232, 240, 0.9)',
          padding: '0.15rem 0.5rem',
          borderRadius: '4px',
          lineHeight: 1.4,
          zIndex: 1,
        }}
      >
        HTML Preview
      </span>
      <iframe
        ref={iframeRef}
        srcDoc={wrapWithResizeScript(content)}
        sandbox="allow-scripts"
        title="HTML Preview"
        style={{
          width: '100%',
          height: `${height}px`,
          border: 'none',
          display: 'block',
        }}
      />
    </div>
  )
}

HtmlPreview.displayName = 'HtmlPreview'

const MemoizedHtmlPreview = memo(HtmlPreview)
MemoizedHtmlPreview.displayName = 'HtmlPreview'

export default MemoizedHtmlPreview
