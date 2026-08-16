import '@excalidraw/excalidraw/index.css'

import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { RendererProps } from '@/lib/document-types/types'
import {
  parseExcalidrawContent,
  serializeExcalidrawScene,
} from '@/lib/excalidraw-file'

function ExcalidrawSurface({
  content,
  mode = 'editor',
  onContentChange,
}: RendererProps) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null)

  const parsed = useMemo(() => parseExcalidrawContent(content), [content])
  const lastSerializedContentRef = useRef<string>(content)

  useEffect(() => {
    if (!api || !parsed.ok) return
    if (lastSerializedContentRef.current === content) return

    api.updateScene(parsed.value.scene)
    lastSerializedContentRef.current = content
  }, [api, content, parsed])

  if (!parsed.ok) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="max-w-xl rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-left">
          <p className="text-sm font-semibold text-destructive">Excalidraw scene is invalid</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Fix the document JSON in the source editor to restore the canvas.
          </p>
          <pre className="mt-3 overflow-auto rounded bg-background/80 p-3 text-xs text-foreground">
            {parsed.error}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full min-h-[32rem] w-full overflow-hidden rounded-md border bg-background">
      <Excalidraw
        excalidrawAPI={setApi}
        initialData={parsed.value.scene}
        viewModeEnabled={mode === 'preview'}
        onChange={(elements, appState, files) => {
          if (!onContentChange) return

          const next = serializeExcalidrawScene({
            elements: [...elements],
            appState,
            files,
          })

          if (next === lastSerializedContentRef.current) return

          lastSerializedContentRef.current = next
          onContentChange(next)
        }}
      />
    </div>
  )
}

const MemoizedExcalidrawSurface = memo(ExcalidrawSurface)
MemoizedExcalidrawSurface.displayName = 'ExcalidrawSurface'

export default MemoizedExcalidrawSurface
