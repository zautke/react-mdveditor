/**
 * UrlPreview — renders extracted web article content.
 *
 * Layout:
 *   ┌─────────────────────────────────────────┐
 *   │  Metadata bar (title, author, date…)    │
 *   ├─────────────────────────────────────────┤
 *   │  Sandboxed iframe with article HTML     │
 *   └─────────────────────────────────────────┘
 *
 * Empty state: shows an inline URL input form (no modal needed
 * for fresh "New Web Article" tabs).
 *
 * Security: Same sandboxed iframe pattern as HtmlPreview.tsx —
 * `sandbox="allow-scripts"` without `allow-same-origin`.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Globe, User, Calendar, Building2, RefreshCw } from 'lucide-react'
import type { RendererProps } from '@/lib/document-types/types'
import { parseUrlMeta, parseUrlBody, fetchUrlContent } from '@/lib/url-fetch'
import type { UrlMetadata, FetchUrlResult } from '@/lib/url-fetch'
import { validateUrl } from '@/lib/url-validation'
import { cn } from '@/lib/utils'

// ── Iframe auto-resize (shared with HtmlPreview) ────────────────────

const wrapWithResizeScript = (html: string): string => `
  <!DOCTYPE html>
  <html><head><style>
    body {
      margin: 0;
      padding: 1rem 1.5rem;
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.7;
      color: #1a1a1a;
      max-width: 72ch;
    }
    img { max-width: 100%; height: auto; border-radius: 4px; }
    a { color: oklch(0.55 0.15 245); }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background: #f5f5f5; }
    blockquote { border-left: 3px solid oklch(0.62 0.15 245); margin: 1rem 0; padding: 0.5rem 1rem; color: #555; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; }
    code { font-size: 0.9em; }
    h1, h2, h3, h4 { margin-top: 1.5rem; margin-bottom: 0.5rem; }
  </style></head>
  <body>${html}
  <script>
    const ro = new ResizeObserver(() => {
      window.parent.postMessage({ type: 'iframe-resize', height: document.body.scrollHeight }, '*');
    });
    ro.observe(document.body);
  </script>
  </body></html>
`

interface IframeResizeMessage {
  type: 'iframe-resize'
  height: number
}

function isResizeMessage(data: unknown): data is IframeResizeMessage {
  if (typeof data !== 'object' || data === null) return false
  const msg = data as Record<string, unknown>
  return msg.type === 'iframe-resize' && typeof msg.height === 'number'
}

const MIN_HEIGHT = 200

// ── Accent color ────────────────────────────────────────────────────
const ACCENT = 'oklch(0.62 0.15 245)'

// ── Metadata bar ────────────────────────────────────────────────────

function MetadataBar({ meta }: { meta: UrlMetadata }) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-xs border-b border-border bg-muted/30"
    >
      {meta.siteName && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Building2 className="h-3 w-3" />
          {meta.siteName}
        </span>
      )}
      {meta.author && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <User className="h-3 w-3" />
          {meta.author}
        </span>
      )}
      {meta.date && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {meta.date}
        </span>
      )}
      <a
        href={meta.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto flex items-center gap-1 font-medium transition-colors hover:underline"
        style={{ color: ACCENT }}
      >
        <ExternalLink className="h-3 w-3" />
        Source
      </a>
    </div>
  )
}

// ── Empty state with inline URL form ────────────────────────────────

function EmptyState({
  onFetched,
}: {
  onFetched: (result: FetchUrlResult) => void
}) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const v = validateUrl(url)
      if (!v.valid) {
        setError(v.reason ?? 'Invalid URL')
        return
      }
      setLoading(true)
      setError('')
      try {
        const result = await fetchUrlContent(v.url!)
        onFetched(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fetch failed')
        setLoading(false)
      }
    },
    [url, onFetched],
  )

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8">
      <Globe className="h-12 w-12 text-muted-foreground/30" />
      <p className="text-sm italic text-muted-foreground/50">
        Enter a URL to extract article content
      </p>
      <form onSubmit={handleSubmit} className="flex w-full max-w-md gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            if (error) setError('')
          }}
          placeholder="https://iamafoodblog.com/authentic-instant-pot-pho-recipe"
          disabled={loading}
          className={cn(
            'flex-1 rounded-md border px-3 py-2 text-sm',
            'bg-background text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'disabled:opacity-60',
            error && 'border-destructive',
          )}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium text-white',
            'transition-colors',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          )}
          style={{ backgroundColor: ACCENT }}
        >
          {loading ? 'Fetching...' : 'Fetch'}
        </button>
      </form>
      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}
    </div>
  )
}

// ── Main preview component ──────────────────────────────────────────

function UrlPreview({ content, documentId }: RendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState<number>(MIN_HEIGHT)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')

  const handleMessage = useCallback((event: MessageEvent<unknown>) => {
    if (isResizeMessage(event.data)) {
      setHeight(Math.max(event.data.height, MIN_HEIGHT))
    }
  }, [])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  // Parse content
  const meta = parseUrlMeta(content)
  const body = parseUrlBody(content)

  // Empty / bare-URL state — delegate to EmptyState with inline form.
  // The EmptyState's onFetched dispatches a custom event that the
  // EditorWithProview handles to update document content.
  const handleFetched = useCallback(
    (result: FetchUrlResult) => {
      // Dispatch a custom event — EditorWithProview listens for this
      // to update the document's content field.
      window.dispatchEvent(
        new CustomEvent('url-preview-fetched', {
          detail: { documentId, result },
        }),
      )
    },
    [documentId],
  )

  const handleRefresh = useCallback(async () => {
    if (!meta?.sourceUrl || refreshing) return

    setRefreshing(true)
    setRefreshError('')
    try {
      const result = await fetchUrlContent(meta.sourceUrl)
      handleFetched(result)
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }, [handleFetched, meta?.sourceUrl, refreshing])

  if (!meta) {
    return <EmptyState onFetched={handleFetched} />
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-border bg-background">
      {/* Badge */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/20">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="text-[0.65rem] font-semibold uppercase tracking-wider"
            style={{ color: ACCENT }}
          >
            Web Article
          </span>
          {meta.title && (
            <span className="text-xs font-medium text-foreground truncate max-w-[60%]">
              {meta.title}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
            'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Metadata bar */}
      <MetadataBar meta={meta} />

      {refreshError && (
        <div className="border-b border-border bg-destructive/5 px-4 py-2 text-xs text-destructive" role="alert">
          {refreshError}
        </div>
      )}

      {/* Article iframe */}
      <iframe
        ref={iframeRef}
        srcDoc={wrapWithResizeScript(body)}
        sandbox="allow-scripts"
        title={meta.title ?? 'Web Article Preview'}
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

UrlPreview.displayName = 'UrlPreview'

const MemoizedUrlPreview = memo(UrlPreview)
MemoizedUrlPreview.displayName = 'UrlPreview'

export default MemoizedUrlPreview
