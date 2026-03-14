import React, { memo } from 'react'
import { ViteMDXDCodeBlock } from './MdxCodeblock'

export interface RendererProps {
  content: string
}

const JsonPreview = memo(({ content }: RendererProps) => {
  let displayContent = content
  let isValidJson = false

  try {
    if (content.trim() !== '') {
      const parsed = JSON.parse(content)
      displayContent = JSON.stringify(parsed, null, 2)
      isValidJson = true
    }
  } catch (_e) {
    isValidJson = false
  }

  if (content.trim() === '') {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 text-muted-foreground/50">
        <p className="italic">Enter JSON to see a live preview</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-md border bg-muted/20">
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2 pointer-events-none">
        <span className="rounded bg-background/80 px-2 py-1 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-sm">
          JSON PREVIEW {isValidJson ? '' : '(Invalid)'}
        </span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <ViteMDXDCodeBlock
          language="json"
          codeContent={displayContent}
        />
      </div>
    </div>
  )
})

JsonPreview.displayName = 'JsonPreview'

export default JsonPreview
