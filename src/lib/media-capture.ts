/**
 * media-capture — framework-agnostic snapshot + clipboard utilities.
 *
 * Zero React, zero app coupling: give it any DOM Element and it produces a PNG
 * (blob + data URL) and writes to the system clipboard. The heavy DOM-capture
 * engine (snapDOM) is loaded lazily, so nothing here inflates the main bundle
 * until an image copy is actually requested on content the native path can't
 * handle.
 *
 * Portable to any app — the only browser assumptions are the Async Clipboard
 * API and a secure (HTTPS) context.
 */

export interface CaptureResult {
  /** PNG raster, ready for `ClipboardItem`. */
  blob: Blob
  /** `data:image/png;base64,…` — self-describing, pasteable as text. */
  dataUrl: string
}

export interface CaptureOptions {
  /** Resolution multiplier (retina). Default 2. */
  scale?: number
  /** Opaque background (SVG/PNG are transparent → paste looks broken without it). `null` keeps transparency. Default '#ffffff'. */
  backgroundColor?: string | null
}

/** `(element) => Promise<{ blob, dataUrl }>` — the single swappable capture seam. */
export type CaptureAdapter = (el: Element, opts?: CaptureOptions) => Promise<CaptureResult>

const DEFAULTS: Required<CaptureOptions> = { scale: 2, backgroundColor: '#ffffff' }

// ── shared canvas → result ──────────────────────────────────────────────
// `toDataURL` throws SecurityError synchronously on a tainted canvas — that is
// the signal `smartCapture` uses to fall back from native to snapDOM.
async function canvasToResult(canvas: HTMLCanvasElement): Promise<CaptureResult> {
  const dataUrl = canvas.toDataURL('image/png')
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))), 'image/png'),
  )
  return { blob, dataUrl }
}

// ── native engine (0 dependencies) ──────────────────────────────────────
// Resolve the real thing to rasterize: an inline <svg> serializes cleanly; an
// <img>/<video>/<canvas> draws directly; anything else is handed to snapDOM.
function resolveTarget(el: Element): Element {
  if (el instanceof SVGSVGElement) return el
  const svg = el.querySelector('svg')
  return svg ?? el
}

async function svgToResult(svg: SVGSVGElement, scale: number, bg: string | null): Promise<CaptureResult> {
  const rect = svg.getBoundingClientRect()
  const w = Math.max(1, rect.width)
  const h = Math.max(1, rect.height)

  // Clone so we never mutate the live diagram; stamp explicit dims + xmlns so
  // the serialized SVG is standalone (Firefox renders to 0×0 without sizes).
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))

  const xml = new XMLSerializer().serializeToString(clone)
  // base64 (not URI-encoding) survives #, &, and non-ASCII in the markup.
  const src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`

  const img = new Image()
  img.decoding = 'async'
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('native capture: SVG failed to decode'))
    img.src = src
  })

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w * scale)
  canvas.height = Math.ceil(h * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('native capture: no 2d context')
  if (bg) {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.drawImage(img, 0, 0, w, h)
  return canvasToResult(canvas)
}

async function mediaToResult(
  media: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  scale: number,
  bg: string | null,
): Promise<CaptureResult> {
  const w =
    media instanceof HTMLVideoElement
      ? media.videoWidth || media.clientWidth
      : media instanceof HTMLCanvasElement
        ? media.width
        : media.naturalWidth || media.clientWidth
  const h =
    media instanceof HTMLVideoElement
      ? media.videoHeight || media.clientHeight
      : media instanceof HTMLCanvasElement
        ? media.height
        : media.naturalHeight || media.clientHeight

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(Math.max(1, w) * scale)
  canvas.height = Math.ceil(Math.max(1, h) * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('native capture: no 2d context')
  if (bg) {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(media, 0, 0, canvas.width, canvas.height)
  return canvasToResult(canvas)
}

/** Native serialize→canvas path. Fast, 0-dependency; throws on foreignObject/CORS taint. */
export const nativeCapture: CaptureAdapter = async (el, opts) => {
  const { scale, backgroundColor } = { ...DEFAULTS, ...opts }
  const target = resolveTarget(el)
  if (target instanceof SVGSVGElement) return svgToResult(target, scale, backgroundColor)
  if (
    target instanceof HTMLImageElement ||
    target instanceof HTMLVideoElement ||
    target instanceof HTMLCanvasElement
  ) {
    return mediaToResult(target, scale, backgroundColor)
  }
  throw new Error('native capture: no rasterizable target (needs <svg>/<img>/<video>/<canvas>)')
}

/** snapDOM fallback (lazy-loaded). Handles foreignObject, web-fonts, shadow DOM, mixed content. */
export const snapdomCapture: CaptureAdapter = async (el, opts) => {
  const { scale, backgroundColor } = { ...DEFAULTS, ...opts }
  const { snapdom } = await import('@zumer/snapdom')
  const canvas = await snapdom.toCanvas(el as HTMLElement, {
    scale,
    backgroundColor: backgroundColor ?? undefined,
    embedFonts: true,
  })
  return canvasToResult(canvas)
}

/** Native first; on any failure (taint, foreignObject, unsupported target) fall back to snapDOM. */
export const smartCapture: CaptureAdapter = async (el, opts) => {
  try {
    return await nativeCapture(el, opts)
  } catch {
    return snapdomCapture(el, opts)
  }
}

// ── clipboard ───────────────────────────────────────────────────────────

/** Image clipboard write is supported (needs `ClipboardItem` + a secure context). */
export function canCopyImage(): boolean {
  return typeof ClipboardItem !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.clipboard?.write
}

/** Text clipboard write is supported. */
export function canCopyText(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText
}

/**
 * Write a PNG to the clipboard. `makeBlob` is invoked synchronously and its
 * Promise is handed straight to `ClipboardItem` — this keeps the async
 * rasterization inside the user-gesture window (required by Safari) while
 * working identically in Chrome/Firefox.
 */
export async function copyImageToClipboard(makeBlob: () => Promise<Blob>): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': makeBlob() })])
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}
