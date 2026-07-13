/**
 * Persistence client for the SQLite sidecar.
 *
 * State lives in a Node/SQLite sidecar reached through the same-origin `/api/db`
 * proxy (Vite in dev, nginx in prod). HTTP is async, so `loadState` returns a
 * Promise and callers hydrate once at startup.
 *
 * ## Why this is more than a fetch wrapper
 *
 * An earlier version treated "the sidecar is unreachable" and "the database is
 * empty" as the same thing: a failed GET produced an empty cache, the editor fell
 * back to its default document, and the next save overwrote the database with it —
 * destroying every document. Persisting `documents` is a DELETE-then-INSERT, so a
 * degraded client could wipe the real data.
 *
 * The invariant that prevents it:
 *
 *   **Never write to the database from a client that has not successfully read it.**
 *
 * Until a `GET /state` succeeds, this module is `offline`: edits are buffered in
 * localStorage (so nothing is lost across a reload or a closed tab) and *nothing*
 * is sent to the server. A heal loop retries in the background; when it succeeds we
 * `reconcile()` — merging buffered edits over the authoritative server state by
 * document id, rather than blindly overwriting it — and resume normal writes.
 */

const DB_BASE = '/api/db'

/** Buffer for writes made while offline. Survives reload/close. */
const PENDING_PREFIX = 'mdeditor:pending:'
/** Ids the user deleted while offline; must not be resurrected by a merge. */
const TOMBSTONE_KEY = 'mdeditor:pending:deletedIds'

/** Legacy pre-sidecar localStorage keys, imported once. */
const LEGACY_PREFIX = 'mdeditor:'
const LEGACY_KEYS = ['documents', 'activeDocId', 'isExpanded', 'userSettings']

const HEAL_MIN_MS = 1_000
const HEAL_MAX_MS = 30_000

export type StorageStatus = 'connecting' | 'online' | 'offline' | 'buffer-full'

interface PersistedDocument {
  id: string
  [key: string]: unknown
}

let cache: Record<string, unknown> = {}
let hydrateOk = false
let status: StorageStatus = 'connecting'
let hydratePromise: Promise<Record<string, unknown>> | null = null
let healTimer: ReturnType<typeof setTimeout> | null = null
let healDelay = HEAL_MIN_MS
/** Guards reconcile() against re-entry: it writes, and a rejected write re-reads. */
let reconciling = false

const listeners = new Set<(s: StorageStatus) => void>()

// ── Status ──────────────────────────────────────────────────────────

export function getStatus(): StorageStatus {
  return status
}

/** Subscribe to status changes. Returns an unsubscribe function. */
export function subscribe(listener: (s: StorageStatus) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Called by the health stream when the sidecar vanishes between writes. */
export function markSidecarOffline(): void {
  if (!hydrateOk && status === 'offline') return
  hydrateOk = false
  setStatus('offline')
  startHealing()
}

/** Called by the health stream when the sidecar is reachable again. */
export function markSidecarOnline(): void {
  if (!hydrateOk) startHealing()
}

function setStatus(next: StorageStatus): void {
  if (status === next) return
  status = next
  for (const listener of listeners) listener(next)
}

// ── Offline buffer (localStorage) ───────────────────────────────────

function bufferWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(PENDING_PREFIX + key, JSON.stringify(value))
  } catch {
    // Quota exceeded — the user must know their work is no longer being captured.
    setStatus('buffer-full')
  }
}

function bufferRead(key: string): unknown | undefined {
  try {
    const raw = localStorage.getItem(PENDING_PREFIX + key)
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

function bufferClear(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PENDING_PREFIX)) localStorage.removeItem(key)
    }
  } catch {
    // Nothing we can do; the buffer is advisory once we're back online.
  }
}

/** Record a document id deleted while offline so a merge cannot resurrect it. */
export function markDeleted(id: string): void {
  try {
    const ids = new Set((bufferRead('deletedIds') as string[] | undefined) ?? [])
    ids.add(id)
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify([...ids]))
  } catch {
    // Best-effort.
  }
}

function readTombstones(): Set<string> {
  try {
    const raw = localStorage.getItem(TOMBSTONE_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

// ── Hydration ───────────────────────────────────────────────────────

/**
 * Fetch every persisted key in one request. Single-flight: concurrent callers
 * share the fetch. On failure we go `offline` and start healing — we do NOT
 * pretend the database is empty.
 */
export function hydrateAll(): Promise<Record<string, unknown>> {
  if (!hydratePromise) hydratePromise = doHydrate()
  return hydratePromise
}

async function doHydrate(): Promise<Record<string, unknown>> {
  const server = await fetchState()

  if (server === null) {
    // Unreachable. Fall back to whatever we buffered locally so the editor still
    // shows the user's work, but stay offline: no writes until we can read.
    hydrateOk = false
    cache = restoreFromBuffer()
    setStatus('offline')
    startHealing()
    return cache
  }

  hydrateOk = true
  cache = server
  setStatus('online')

  // A buffer left over from a previous offline session must be merged in, not dropped.
  if (hasBufferedWrites()) await reconcile()
  await migrateLegacyLocalStorage(cache)

  return cache
}

/** GET /state, or null if the sidecar could not be reached. */
async function fetchState(): Promise<Record<string, unknown> | null> {
  try {
    const resp = await fetch(`${DB_BASE}/state`)
    if (!resp.ok) return null
    return (await resp.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

/** Rebuild an in-memory view from the offline buffer (used when the server is down). */
function restoreFromBuffer(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of LEGACY_KEYS) {
    const buffered = bufferRead(key)
    if (buffered !== undefined) out[key] = buffered
  }
  return out
}

function hasBufferedWrites(): boolean {
  try {
    return Object.keys(localStorage).some(k => k.startsWith(PENDING_PREFIX))
  } catch {
    return false
  }
}

// ── Reads / writes ──────────────────────────────────────────────────

export async function loadState<T>(key: string, fallback: T): Promise<T> {
  // Await the initial hydration, but read from the live `cache` afterwards rather
  // than from the value that promise resolved with: `hydrateAll` is memoized, while
  // reconcile() replaces `cache` with a freshly merged object. Reading the resolved
  // value would hand callers the pre-heal snapshot.
  await hydrateAll()
  return key in cache && cache[key] != null ? (cache[key] as T) : fallback
}

/**
 * Persist one key. Always buffers locally first, so a crash or a closed tab cannot
 * lose the write. Only reaches the database when we have successfully read it
 * (`hydrateOk`) — otherwise we would risk overwriting good data with a degraded view.
 */
export async function saveState(key: string, value: unknown): Promise<void> {
  cache[key] = value
  bufferWrite(key, value)

  if (!hydrateOk) {
    startHealing()
    return
  }

  const ok = await putState(key, value)
  if (ok) {
    clearBufferedKey(key)
  } else {
    // Lost the server mid-session. Keep the buffered copy and heal.
    hydrateOk = false
    setStatus('offline')
    startHealing()
  }
}

export async function removeState(key: string): Promise<void> {
  delete cache[key]
  clearBufferedKey(key)
  if (!hydrateOk) return
  try {
    await fetch(`${DB_BASE}/state/${encodeURIComponent(key)}`, { method: 'DELETE' })
  } catch {
    hydrateOk = false
    setStatus('offline')
    startHealing()
  }
}

/** PUT one key. Returns false when the sidecar is unreachable or rejected the write. */
async function putState(key: string, value: unknown): Promise<boolean> {
  try {
    const resp = await fetch(`${DB_BASE}/state/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    })
    if (resp.status === 409) {
      // The server refused an unsafe write (e.g. an empty `documents` payload against
      // a non-empty table). Our view is the degraded one, so re-read instead of
      // retrying. reconcile() itself writes, so it is re-entry guarded — without that
      // a persistently-rejected write would recurse forever.
      console.warn('[storage] write rejected as unsafe; re-reading server state')
      await reconcile()
      return true
    }
    return resp.ok
  } catch {
    return false
  }
}

function clearBufferedKey(key: string): void {
  try {
    localStorage.removeItem(PENDING_PREFIX + key)
  } catch {
    // Ignore.
  }
}

// ── Healing ─────────────────────────────────────────────────────────

/** Retry the sidecar with backoff until it answers, then reconcile and resume writes. */
function startHealing(): void {
  if (healTimer !== null) return

  const attempt = async (): Promise<void> => {
    healTimer = null
    const server = await fetchState()

    if (server === null) {
      healDelay = Math.min(healDelay * 2, HEAL_MAX_MS)
      healTimer = setTimeout(() => void attempt(), healDelay)
      return
    }

    cache = server
    hydrateOk = true
    healDelay = HEAL_MIN_MS
    await reconcile()
    setStatus('online')
  }

  healTimer = setTimeout(() => void attempt(), healDelay)
}

/**
 * Merge buffered offline edits over the authoritative server state.
 *
 * This is the safety-critical step. A client that was offline may hold a partial or
 * default view of the world, so we must never push it wholesale. Instead the server
 * is the base and buffered edits are layered on top **per document id**: locally
 * edited documents win, documents that only exist on the server are preserved, and
 * documents the user deleted offline stay deleted (via tombstones).
 */
export async function reconcile(): Promise<void> {
  if (reconciling) return
  reconciling = true
  try {
    await doReconcile()
  } finally {
    reconciling = false
  }
}

async function doReconcile(): Promise<void> {
  const server = await fetchState()
  if (server === null) {
    hydrateOk = false
    setStatus('offline')
    startHealing()
    return
  }

  const merged: Record<string, unknown> = { ...server }

  const serverDocs = (server.documents as PersistedDocument[] | undefined) ?? []
  const localDocs = bufferRead('documents') as PersistedDocument[] | undefined

  if (localDocs) {
    const tombstones = readTombstones()
    const byId = new Map<string, PersistedDocument>()

    for (const doc of serverDocs) byId.set(doc.id, doc)
    for (const doc of localDocs) byId.set(doc.id, doc) // local edits win per id
    for (const id of tombstones) byId.delete(id)

    // Preserve the local ordering the user sees, then append server-only documents.
    const ordered: PersistedDocument[] = []
    const seen = new Set<string>()
    for (const doc of localDocs) {
      const winner = byId.get(doc.id)
      if (winner && !seen.has(doc.id)) { ordered.push(winner); seen.add(doc.id) }
    }
    for (const doc of serverDocs) {
      const winner = byId.get(doc.id)
      if (winner && !seen.has(doc.id)) { ordered.push(winner); seen.add(doc.id) }
    }
    merged.documents = ordered
  }

  // Scalar keys: a buffered value is a newer user intent than the server's.
  for (const key of ['activeDocId', 'isExpanded', 'userSettings']) {
    const buffered = bufferRead(key)
    if (buffered !== undefined) merged[key] = buffered
  }

  hydrateOk = true
  cache = merged

  // Push the merged result back, then drop the buffer.
  for (const key of LEGACY_KEYS) {
    if (merged[key] === undefined) continue
    const ok = await putState(key, merged[key])
    if (!ok) {
      hydrateOk = false
      setStatus('offline')
      startHealing()
      return
    }
  }

  bufferClear()
  try {
    localStorage.removeItem(TOMBSTONE_KEY)
  } catch {
    // Ignore.
  }
  setStatus('online')
}

// ── Legacy import ───────────────────────────────────────────────────

/**
 * One-time import of pre-sidecar `mdeditor:<key>` localStorage values. Only runs
 * against a database we successfully read (guaranteed by the caller), and only
 * seeds keys the database does not already have — it must never overwrite live data.
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

/**
 * Flush a value synchronously on page hide. `fetch` is unreliable during unload, so
 * we use sendBeacon; the localStorage buffer is the backstop if even that is dropped.
 */
export function flushOnUnload(key: string, value: unknown): void {
  bufferWrite(key, value)
  if (!hydrateOk) return
  try {
    const blob = new Blob([JSON.stringify({ value })], { type: 'application/json' })
    navigator.sendBeacon(`${DB_BASE}/state/${encodeURIComponent(key)}`, blob)
  } catch {
    // Buffered above; it will sync on next load.
  }
}
