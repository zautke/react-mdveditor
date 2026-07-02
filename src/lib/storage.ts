/**
 * Persistence client for the SQLite sidecar.
 *
 * Replaces the former synchronous localStorage wrapper. State now lives in a
 * Node/SQLite sidecar reached through the same-origin `/api/db` proxy (Vite in
 * dev, nginx in prod). Because HTTP is async, `loadState` returns a Promise and
 * callers hydrate once at startup.
 *
 * All calls are fail-soft: if the sidecar is unreachable, reads fall back to
 * defaults and writes are held in the in-memory cache (flushed on the next
 * successful write) so the editor keeps working offline.
 */

const DB_BASE = '/api/db'

/** Former localStorage key prefix — used only to migrate legacy data once. */
const LEGACY_PREFIX = 'mdeditor:'

/** Keys migrated from a pre-sidecar localStorage install. */
const LEGACY_KEYS = ['documents', 'activeDocId', 'isExpanded', 'userSettings']

let cache: Record<string, unknown> | null = null
let hydratePromise: Promise<Record<string, unknown>> | null = null

/**
 * Fetch every persisted key in one request and cache it. Single-flight:
 * concurrent callers share the same fetch (and the same one-time migration).
 */
export function hydrateAll(): Promise<Record<string, unknown>> {
  if (!hydratePromise) hydratePromise = doHydrate()
  return hydratePromise
}

async function doHydrate(): Promise<Record<string, unknown>> {
  let state: Record<string, unknown> = {}
  try {
    const resp = await fetch(`${DB_BASE}/state`)
    if (resp.ok) state = (await resp.json()) as Record<string, unknown>
  } catch {
    // Sidecar unreachable — start from an empty cache.
  }
  cache = state
  await migrateLegacyLocalStorage(state)
  return state
}

export async function loadState<T>(key: string, fallback: T): Promise<T> {
  const all = await hydrateAll()
  return key in all && all[key] != null ? (all[key] as T) : fallback
}

export async function saveState(key: string, value: unknown): Promise<void> {
  if (cache) cache[key] = value
  try {
    await fetch(`${DB_BASE}/state/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    })
  } catch {
    // Offline — the cache holds the value; a later successful write persists it.
  }
}

export async function removeState(key: string): Promise<void> {
  if (cache) delete cache[key]
  try {
    await fetch(`${DB_BASE}/state/${encodeURIComponent(key)}`, { method: 'DELETE' })
  } catch {
    // Fail silently — cache already reflects the removal.
  }
}

/**
 * One-time import of legacy localStorage keys into the sidecar. Runs during the
 * first hydration: any legacy `mdeditor:<key>` present in localStorage but
 * missing from the DB is seeded, preserving the user's existing work. The
 * localStorage copy is left intact as a cold backup.
 */
async function migrateLegacyLocalStorage(current: Record<string, unknown>): Promise<void> {
  if (typeof localStorage === 'undefined') return
  for (const key of LEGACY_KEYS) {
    if (key in current) continue
    const raw = localStorage.getItem(LEGACY_PREFIX + key)
    if (raw === null) continue
    try {
      const value = JSON.parse(raw)
      current[key] = value
      await saveState(key, value)
    } catch {
      // Skip unparseable legacy values.
    }
  }
}
