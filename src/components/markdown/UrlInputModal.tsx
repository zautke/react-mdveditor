/**
 * UrlInputModal — Radix Dialog for entering a URL to fetch.
 *
 * States: idle → validating → fetching → success / error
 *
 * The `prefillUrl` prop allows drag-and-drop to open the modal
 * with the dropped URL pre-filled (user confirms before fetch).
 *
 * Architecture: The inner content component is only mounted when
 * `open` is true, so it initialises state from props on every
 * open — no useEffect sync needed.
 */

import { useState, useCallback, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Globe, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { validateUrl } from '@/lib/url-validation'
import { fetchUrlContent } from '@/lib/url-fetch'
import type { FetchUrlResult } from '@/lib/url-fetch'

// ── Props ───────────────────────────────────────────────────────────

export interface UrlInputModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-filled URL (e.g. from drag-and-drop). */
  prefillUrl?: string
  /** Called with the fetched content + metadata on success. */
  onSuccess: (result: FetchUrlResult) => void
}

// ── State machine ───────────────────────────────────────────────────

type ModalState = 'idle' | 'fetching' | 'error'

// ── Inner content ────────────────────────────────────────────────────

function UrlInputModalBody({
  prefillUrl,
  onSuccess,
  onOpenChange,
}: {
  prefillUrl: string
  onSuccess: (result: FetchUrlResult) => void
  onOpenChange: (open: boolean) => void
}) {
  const [url, setUrl] = useState(prefillUrl)
  const [state, setState] = useState<ModalState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(async () => {
    const v = validateUrl(url)
    if (!v.valid) {
      setState('error')
      setErrorMsg(v.reason ?? 'Invalid URL')
      return
    }

    setState('fetching')
    setErrorMsg('')

    try {
      const result = await fetchUrlContent(v.url!)
      onSuccess(result)
      onOpenChange(false)
    } catch (err) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [url, onSuccess, onOpenChange])

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Globe className="h-5 w-5" style={{ color: 'oklch(0.62 0.15 245)' }} />
          Fetch URL
        </Dialog.Title>
        <Dialog.Close asChild>
          <button
            className="rounded-sm p-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </Dialog.Close>
      </div>

      {/* Description */}
      <Dialog.Description className="text-sm text-muted-foreground mb-4">
        Enter a web page URL to extract its article content.
      </Dialog.Description>

      {/* URL input */}
      <div className="space-y-3">
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            if (state === 'error') setState('idle')
          }}
          placeholder="https://example.com/article"
          disabled={state === 'fetching'}
          className={cn(
            'w-full rounded-md border px-3 py-2 text-sm',
            'bg-background text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'disabled:opacity-60',
            state === 'error' && 'border-destructive focus:ring-destructive',
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && state !== 'fetching') {
              e.preventDefault()
              handleSubmit()
            }
          }}
          aria-invalid={state === 'error'}
          aria-describedby={state === 'error' ? 'url-error' : undefined}
        />

        {/* Error message */}
        {state === 'error' && errorMsg && (
          <div
            id="url-error"
            className="flex items-center gap-1.5 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Dialog.Close asChild>
            <button
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium',
                'border border-border text-foreground',
                'hover:bg-accent transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-ring',
              )}
              disabled={state === 'fetching'}
            >
              Cancel
            </button>
          </Dialog.Close>
          <button
            onClick={handleSubmit}
            disabled={state === 'fetching' || !url.trim()}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium text-white',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
            style={{ backgroundColor: 'oklch(0.62 0.15 245)' }}
          >
            {state === 'fetching' ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching...
              </span>
            ) : (
              'Fetch'
            )}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Outer shell ─────────────────────────────────────────────────────

export function UrlInputModal({
  open,
  onOpenChange,
  prefillUrl = '',
  onSuccess,
}: UrlInputModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'focus:outline-none',
          )}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
          }}
        >
          <UrlInputModalBody
            prefillUrl={prefillUrl}
            onSuccess={onSuccess}
            onOpenChange={onOpenChange}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

UrlInputModal.displayName = 'UrlInputModal'
