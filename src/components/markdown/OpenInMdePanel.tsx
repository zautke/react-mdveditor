import { useState, useCallback } from 'react'

interface OpenInMdePanelProps {
  /** Create a new editor document containing `text`. */
  onOpenInMde: (text: string) => void
}

/**
 * Quick-capture strip: type/paste text, click "Open in MDE" to create a new
 * document from it. Kind is auto-detected by the caller's document registry.
 */
export function OpenInMdePanel({ onOpenInMde }: OpenInMdePanelProps) {
  const [text, setText] = useState('')

  const handleOpen = useCallback(() => {
    const value = text.trim()
    if (!value) return
    onOpenInMde(value)
    setText('')
  }, [text, onOpenInMde])

  return (
    <div
      className="flex items-start gap-2 px-3 py-2 border-b border-border bg-muted/30"
      role="group"
      aria-label="Open text in MDE"
    >
      <textarea
        data-testid="oimde-textarea"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste or type text, then Open in MDE to create a new document…"
        rows={2}
        className="flex-1 resize-y rounded-md border border-border bg-background px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
        aria-label="Text to open in MDE"
      />
      <button
        data-testid="oimde-open-button"
        type="button"
        onClick={handleOpen}
        disabled={text.trim().length === 0}
        className="shrink-0 rounded-md border border-border bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        Open in MDE
      </button>
    </div>
  )
}

export default OpenInMdePanel
