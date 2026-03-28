import { memo, useEffect, useRef, useState } from 'react'
import { Graphviz } from '@hpcc-js/wasm-graphviz'
import type { RendererProps } from '@/lib/document-types/types'

// ── WASM singleton ──────────────────────────────────────────────────
// Graphviz.load() fetches the WASM binary — call once, reuse forever.
let _graphvizPromise: Promise<Graphviz> | null = null

function getGraphviz(): Promise<Graphviz> {
  if (!_graphvizPromise) _graphvizPromise = Graphviz.load()
  return _graphvizPromise
}

// ── Component ───────────────────────────────────────────────────────

const GraphvizPreview = memo(({ content }: RendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (!content.trim()) {
      container.innerHTML = ''
      return
    }

    getGraphviz()
      .then((gviz) => {
        setError(null)
        const svg = gviz.dot(content, 'svg')
        container.innerHTML = svg
        // Make SVG fill the container width responsively
        const svgEl = container.querySelector('svg')
        if (svgEl) {
          svgEl.setAttribute('width', '100%')
          svgEl.removeAttribute('height')
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        container.innerHTML = ''
      })
  }, [content])

  if (!content.trim()) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 text-muted-foreground/50">
        <p className="italic">Enter DOT language to see a live preview</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-md border bg-muted/20">
      {error !== null && (
        <div className="absolute right-4 top-4 z-30 pointer-events-none">
          <span className="rounded bg-background/80 px-2 py-1 text-xs font-semibold text-destructive shadow-sm backdrop-blur-sm">
            {error}
          </span>
        </div>
      )}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 [&_svg]:max-w-full"
      />
    </div>
  )
})

GraphvizPreview.displayName = 'GraphvizPreview'

export default GraphvizPreview
