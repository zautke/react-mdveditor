import { memo, useEffect, useState } from 'react'
import { Graphviz } from '@hpcc-js/wasm-graphviz'
import type { RendererProps } from '@/lib/document-types/types'
import { MediaAssetFrame } from './media/MediaAssetFrame'

// ── WASM singleton ──────────────────────────────────────────────────
// Graphviz.load() fetches the WASM binary — call once, reuse forever.
// On failure the promise is cleared so the next content change retries.
let _graphvizPromise: Promise<Graphviz> | null = null

function getGraphviz(): Promise<Graphviz> {
  if (!_graphvizPromise) {
    _graphvizPromise = Graphviz.load().catch((err: unknown) => {
      _graphvizPromise = null // allow retry on next content change
      throw err
    })
  }
  return _graphvizPromise
}

// ── Component ───────────────────────────────────────────────────────

const GraphvizPreview = memo(({ content }: RendererProps) => {
  const [error, setError] = useState<string | null>(null)
  const [svgMarkup, setSvgMarkup] = useState('')

  useEffect(() => {
    let cancelled = false

    if (!content.trim()) {
      return
    }

    getGraphviz()
      .then((gviz) => {
        if (cancelled) return
        const svg = gviz.dot(content, 'svg') // throws on invalid DOT
        setError(null)
        setSvgMarkup(svg)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        setSvgMarkup('')
      })

    return () => {
      cancelled = true
    }
  }, [content])

  if (!content.trim()) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 text-muted-foreground/50">
        <p className="italic">Enter DOT language to see a live preview</p>
      </div>
    )
  }

  return (
    <MediaAssetFrame
      label="Expanded Graphviz diagram"
      contentClassName="min-h-[12rem]"
      renderContent={({ zoomed }) => (
        <>
          {error !== null && (
            <div className="absolute right-4 top-4 z-30 pointer-events-none">
              <span className="rounded bg-background/80 px-2 py-1 text-xs font-semibold text-destructive shadow-sm backdrop-blur-sm">
                {error}
              </span>
            </div>
          )}
          {svgMarkup ? (
            <div
              className={
                zoomed
                  ? 'flex-1 overflow-auto p-4 [&_svg]:max-w-full'
                  : 'flex-1 overflow-auto p-4 [&_svg]:max-w-full'
              }
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          ) : (
            <div className="flex-1" />
          )}
        </>
      )}
    />
  )
})

GraphvizPreview.displayName = 'GraphvizPreview'

export default GraphvizPreview
