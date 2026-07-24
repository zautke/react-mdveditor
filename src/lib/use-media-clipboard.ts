import { useCallback, useEffect, useRef, useState } from 'react'
import {
  canCopyImage,
  canCopyText,
  copyImageToClipboard,
  copyText,
  smartCapture,
  type CaptureAdapter,
  type CaptureOptions,
} from './media-capture'

export type CopyStatus = 'idle' | 'working' | 'done' | 'error'

export interface CopyAction {
  status: CopyStatus
  /** Call synchronously from a click handler (preserves the user gesture for Safari). */
  run: () => void
}

/**
 * Wrap one async copy operation as a status machine that drives an
 * idle → working → done/error → idle morph. Framework-light and app-agnostic.
 */
export function useCopyAction(
  action: () => Promise<void>,
  resetMs = 1500,
  onResult?: (ok: boolean) => void,
): CopyAction {
  const [status, setStatus] = useState<CopyStatus>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const run = useCallback(() => {
    window.clearTimeout(timer.current)
    setStatus('working')
    // action() must start synchronously so any clipboard.write inside stays in
    // the user-gesture window.
    Promise.resolve()
      .then(action)
      .then(() => {
        setStatus('done')
        onResult?.(true)
      })
      .catch(() => {
        setStatus('error')
        onResult?.(false)
      })
      .finally(() => {
        timer.current = window.setTimeout(() => setStatus('idle'), resetMs)
      })
  }, [action, resetMs, onResult])

  return { status, run }
}

export interface MediaClipboard {
  image: CopyAction
  base64: CopyAction
  source: CopyAction
  /** Whether the image/base64 buttons should render (capability + content gated). */
  canImage: boolean
  canBase64: boolean
  canSource: boolean
}

/** Which copy action completed — for host-side notifications (toasts, analytics). */
export type CopyKind = 'image' | 'base64' | 'source'

/**
 * Headless clipboard controller for a media element. `getTarget` returns the
 * element to snapshot (e.g. the diagram content, excluding surrounding chrome);
 * `sourceText` is the optional raw source for a "copy source" action.
 *
 * Reusable across apps — depends only on the browser + `media-capture`.
 */
export function useMediaClipboard(
  getTarget: () => Element | null,
  options: {
    sourceText?: string
    adapter?: CaptureAdapter
    captureOptions?: CaptureOptions
    resetMs?: number
    /** Notified when any action settles — host wires this to a toast/analytics. */
    onResult?: (kind: CopyKind, ok: boolean) => void
  } = {},
): MediaClipboard {
  const { sourceText, adapter = smartCapture, captureOptions, resetMs, onResult } = options

  const image = useCopyAction(
    useCallback(async () => {
      const el = getTarget()
      if (!el) throw new Error('no capture target')
      await copyImageToClipboard(() => adapter(el, captureOptions).then((r) => r.blob))
    }, [getTarget, adapter, captureOptions]),
    resetMs,
    useCallback((ok: boolean) => onResult?.('image', ok), [onResult]),
  )

  const base64 = useCopyAction(
    useCallback(async () => {
      const el = getTarget()
      if (!el) throw new Error('no capture target')
      const { dataUrl } = await adapter(el, captureOptions)
      await copyText(dataUrl)
    }, [getTarget, adapter, captureOptions]),
    resetMs,
    useCallback((ok: boolean) => onResult?.('base64', ok), [onResult]),
  )

  const source = useCopyAction(
    useCallback(async () => {
      if (!sourceText) throw new Error('no source text')
      await copyText(sourceText)
    }, [sourceText]),
    resetMs,
    useCallback((ok: boolean) => onResult?.('source', ok), [onResult]),
  )

  return {
    image,
    base64,
    source,
    canImage: canCopyImage(),
    canBase64: canCopyText(),
    canSource: canCopyText() && !!sourceText,
  }
}
