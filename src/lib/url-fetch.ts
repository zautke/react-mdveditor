/**
 * URL Fetch Client — calls the Python sidecar and packs results
 * into the URL doctype's content storage format.
 *
 * Content format:
 *   <!--URL_META:{"sourceUrl":"…","title":"…",...}-->\n<article>…</article>
 */

// ── Types ───────────────────────────────────────────────────────────

export interface UrlMetadata {
  sourceUrl: string
  title: string | null
  author: string | null
  date: string | null
  siteName: string | null
  images: string[]
}

interface SidecarResponse {
  title: string | null
  author: string | null
  date: string | null
  siteName: string | null
  content: string
  images: string[]
}

export interface FetchUrlResult {
  /** Full content string ready for the document model. */
  content: string
  /** Extracted metadata for UI display. */
  meta: UrlMetadata
}

// ── Fetch ───────────────────────────────────────────────────────────

const EXTRACT_ENDPOINT = '/api/extract'
const FETCH_TIMEOUT_MS = 30_000

/**
 * Fetch a URL via the sidecar and return packed content + metadata.
 *
 * Throws on network errors, sidecar errors, or timeout.
 */
export async function fetchUrlContent(url: string): Promise<FetchUrlResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const resp = await fetch(EXTRACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    })

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({ detail: resp.statusText }))
      const detail = (body as { detail?: string }).detail ?? resp.statusText
      throw new Error(`Extraction failed: ${detail}`)
    }

    const data: SidecarResponse = await resp.json()

    const meta: UrlMetadata = {
      sourceUrl: url,
      title: data.title,
      author: data.author,
      date: data.date,
      siteName: data.siteName,
      images: data.images,
    }

    // Pack into storage format: metadata comment + article HTML
    const metaComment = `<!--URL_META:${JSON.stringify(meta)}-->`
    const content = `${metaComment}\n<article>${data.content}</article>`

    return { content, meta }
  } finally {
    clearTimeout(timer)
  }
}

// ── Parse ───────────────────────────────────────────────────────────

/**
 * Extract UrlMetadata from a packed content string.
 * Returns `null` if the content doesn't contain the metadata comment.
 */
export function parseUrlMeta(content: string): UrlMetadata | null {
  const match = content.match(/^<!--URL_META:(.*?)-->/)
  if (!match?.[1]) return null

  try {
    return JSON.parse(match[1]) as UrlMetadata
  } catch {
    return null
  }
}

/**
 * Extract the article HTML body from packed content.
 * Falls back to the full content if no metadata prefix is found.
 */
export function parseUrlBody(content: string): string {
  const idx = content.indexOf('-->\n')
  if (idx === -1) return content
  return content.slice(idx + 4)
}
