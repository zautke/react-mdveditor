/**
 * URL Validation — sanitisation and protocol whitelist.
 *
 * Only http: and https: URLs are accepted.  Rejects javascript:,
 * data:, file:, ftp:, and other exotic schemes.
 */

/** Protocols we allow the sidecar to fetch. */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export interface UrlValidationResult {
  valid: boolean
  /** The normalised URL string (only set when valid === true). */
  url?: string
  /** Human-readable error (only set when valid === false). */
  reason?: string
}

/**
 * Validate and sanitise a user-supplied URL string.
 *
 * - Trims whitespace
 * - Rejects empty input
 * - Parses via `URL` constructor (rejects malformed strings)
 * - Whitelists http/https only
 *
 * Returns a discriminated result object.
 */
export function validateUrl(raw: string): UrlValidationResult {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { valid: false, reason: 'URL cannot be empty' }
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { valid: false, reason: 'Invalid URL format' }
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return {
      valid: false,
      reason: `Protocol "${parsed.protocol}" is not allowed — use http or https`,
    }
  }

  return { valid: true, url: parsed.href }
}

/**
 * Quick boolean check — useful for detection heuristics.
 */
export function isHttpUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim())
}
