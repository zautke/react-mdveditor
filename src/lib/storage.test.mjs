/**
 * Client persistence state machine — the offline buffer, heal loop and reconcile
 * merge in `storage.ts`. This is where documents were actually being lost, and it
 * had no tests at all.
 *
 * Runs under plain `node --test`. `storage.ts` imports nothing and touches only
 * `fetch`, `localStorage` and `setTimeout`, all of which it resolves off the
 * global object at call time — so stubbing the globals is enough and no DOM test
 * environment, extra runner, or dependency-injection layer is needed.
 */

import assert from 'node:assert/strict'
import test, { beforeEach } from 'node:test'

import {
  __resetForTests,
  getStateRevision,
  hydrateAll,
  loadState,
  markDeleted,
  peekState,
  reconcile,
  saveState,
  subscribeToState,
} from './storage.ts'

// ── Test doubles ────────────────────────────────────────────────────

/**
 * Entries are stored as own enumerable properties, exactly as the real Web Storage
 * object exposes them — `bufferClear()` and `hasBufferedWrites()` both walk the
 * store with `Object.keys(localStorage)`, so a Map-backed double silently reports
 * an empty buffer and hides real behaviour. Class methods and accessors are
 * non-enumerable, so they never show up as keys.
 */
class MemoryStorage {
  get length() { return Object.keys(this).length }
  key(i) { return Object.keys(this)[i] ?? null }
  getItem(k) { return Object.hasOwn(this, k) ? this[k] : null }
  setItem(k, v) { this[k] = String(v) }
  removeItem(k) { delete this[k] }
  clear() { for (const k of Object.keys(this)) delete this[k] }
}

/**
 * A stand-in for the sidecar. `offline` makes every request throw, exactly as a
 * dead sidecar does from the browser's point of view.
 */
function makeServer(initial = {}) {
  const server = {
    state: { __revision: 0, ...initial },
    offline: false,
    status: 200,
    writes: [],
  }

  server.fetch = async (url, init = {}) => {
    if (server.offline) throw new TypeError('fetch failed')

    const path = String(url).replace('/api/db', '')
    const method = init.method ?? 'GET'

    if (method === 'GET' && path === '/state') {
      if (server.status !== 200) {
        return new Response('boom', { status: server.status })
      }
      return Response.json(server.state)
    }

    const key = path.startsWith('/state/') ? decodeURIComponent(path.slice(7)) : null

    if ((method === 'PUT' || method === 'POST') && key) {
      const body = JSON.parse(init.body)
      server.writes.push({ key, value: body.value, revision: body.revision })

      if (key === 'documents') {
        if (Array.isArray(body.value) && body.value.length === 0 &&
            (server.state.documents ?? []).length > 0) {
          return Response.json(
            { error: 'refusing', code: 'destructive_write_rejected' },
            { status: 409 },
          )
        }
        if (body.revision !== undefined && body.revision !== server.state.__revision) {
          return Response.json(
            { error: 'stale', code: 'stale_revision', revision: server.state.__revision },
            { status: 409 },
          )
        }
        server.state.__revision += 1
      }

      server.state[key] = body.value
      return Response.json({ ok: true, revision: server.state.__revision })
    }

    if (method === 'DELETE' && key) {
      delete server.state[key]
      return Response.json({ ok: true })
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return server
}

const doc = (id, content = `content-${id}`) => ({
  id, title: `title-${id}`, content, kind: 'markdown', persistedToFileSystem: false,
})

let store

beforeEach(() => {
  store = new MemoryStorage()
  globalThis.localStorage = store
  __resetForTests()
})

function install(server) {
  globalThis.fetch = server.fetch
  return server
}

const pendingKeys = () =>
  Array.from({ length: store.length }, (_, i) => store.key(i))
    .filter(k => k.startsWith('mdeditor:pending:'))

// ── Hydration ───────────────────────────────────────────────────────

test('hydration reads the server and exposes the documents', async () => {
  install(makeServer({ documents: [doc('a'), doc('b')] }))

  const documents = await loadState('documents', [])
  assert.deepEqual(documents.map(d => d.id), ['a', 'b'])
})

test('an unreachable sidecar does not look like an empty database', async () => {
  const server = install(makeServer({ documents: [doc('real')] }))
  server.offline = true

  const documents = await loadState('documents', [])
  assert.deepEqual(documents, [], 'the client shows nothing it has not read')
  assert.equal(server.writes.length, 0, 'and must not write anything back')
})

test('a 5xx response is treated as unreachable, not as empty state', async () => {
  const server = install(makeServer({ documents: [doc('real')] }))
  server.status = 500

  await loadState('documents', [])
  assert.equal(server.writes.length, 0)

  // The server's documents must still be intact.
  assert.deepEqual(server.state.documents.map(d => d.id), ['real'])
})

// ── The write kill-switch ───────────────────────────────────────────

test('an offline client buffers locally and never writes to the database', async () => {
  const server = install(makeServer({ documents: [doc('real')] }))
  server.offline = true
  await hydrateAll()

  await saveState('documents', [doc('local-edit')])

  assert.equal(server.writes.length, 0, 'no write may reach a database we could not read')
  assert.ok(pendingKeys().includes('mdeditor:pending:documents'), 'the edit is buffered')
})

// ── The stale-view overwrite (the observed data loss) ───────────────

test('a stale write is rejected and the merged result is adopted, not re-sent', async () => {
  const server = install(makeServer({ documents: [doc('shared')] }))
  await hydrateAll()

  // Another tab writes first. Our revision is now behind.
  server.state.documents = [doc('shared'), doc('from-other-tab')]
  server.state.__revision += 1

  // We push our pre-existing view. Without the revision check this deletes
  // `from-other-tab`; with it, the 409 forces a re-read and merge.
  await saveState('documents', [doc('shared')])

  const ids = server.state.documents.map(d => d.id)
  assert.ok(ids.includes('from-other-tab'), `the other tab's document survived: ${ids}`)
})

test('a 409-driven reconcile notifies subscribers even though the status never changed', async () => {
  const server = install(makeServer({ documents: [doc('shared')] }))
  await hydrateAll()

  let notified = 0
  subscribeToState(() => { notified += 1 })
  const revisionBefore = getStateRevision()

  server.state.documents = [doc('shared'), doc('from-other-tab')]
  server.state.__revision += 1

  await saveState('documents', [doc('shared')])

  // This is the fix for the silent-overwrite bug: re-adoption is driven by the
  // state revision, not by a status edge that never fires while already online.
  assert.ok(notified > 0, 'subscribers must be told the cache was replaced')
  assert.ok(getStateRevision() > revisionBefore)
  assert.ok(
    peekState('documents', []).some(d => d.id === 'from-other-tab'),
    'the merged list is visible to the UI',
  )
})

test('an empty documents payload is refused and the documents survive', async () => {
  const server = install(makeServer({ documents: [doc('a'), doc('b')] }))
  await hydrateAll()

  await saveState('documents', [])

  assert.equal(server.state.documents.length, 2)
})

// ── Reconcile merge semantics ───────────────────────────────────────

test('reconcile keeps server-only documents and lets local edits win per id', async () => {
  const server = install(makeServer({ documents: [doc('a', 'server-a'), doc('server-only')] }))
  server.offline = true
  await hydrateAll()

  await saveState('documents', [doc('a', 'local-a'), doc('local-only')])

  server.offline = false
  await reconcile()

  const byId = new Map(server.state.documents.map(d => [d.id, d]))
  assert.equal(byId.get('a').content, 'local-a', 'local edit wins for a shared id')
  assert.ok(byId.has('server-only'), 'a document only the server had is preserved')
  assert.ok(byId.has('local-only'), 'a document created offline is kept')
})

test('a document deleted offline is not resurrected by the merge', async () => {
  const server = install(makeServer({ documents: [doc('keep'), doc('drop')] }))
  server.offline = true
  await hydrateAll()

  markDeleted('drop')
  await saveState('documents', [doc('keep')])

  server.offline = false
  await reconcile()

  assert.deepEqual(server.state.documents.map(d => d.id), ['keep'])
})

// ── Tombstones ──────────────────────────────────────────────────────

test('closing a document while online records no tombstone', async () => {
  install(makeServer({ documents: [doc('a')] }))
  await hydrateAll()

  markDeleted('a')

  // An online delete is already persisted by the save that follows it. Tombstones
  // used to accumulate across a whole healthy session and then delete every one of
  // those ids from the server at the next reconcile.
  assert.equal(store.getItem('mdeditor:pending:deletedIds'), null)
})

test('a stale tombstone list from a previous session is purged on hydrate', async () => {
  const server = install(makeServer({ documents: [doc('a'), doc('b')] }))
  store.setItem('mdeditor:pending:deletedIds', JSON.stringify(['a', 'b']))

  await hydrateAll()

  assert.equal(store.getItem('mdeditor:pending:deletedIds'), null)
  assert.equal(server.state.documents.length, 2, 'no live document was deleted')
})

// ── Buffer lifecycle ────────────────────────────────────────────────

test('a successful write clears its buffered copy', async () => {
  install(makeServer({ documents: [doc('a')] }))
  await hydrateAll()

  await saveState('documents', [doc('a'), doc('b')])

  assert.equal(pendingKeys().includes('mdeditor:pending:documents'), false)
})

test('buffered offline work is flushed once the sidecar returns', async () => {
  const server = install(makeServer({ documents: [doc('a')] }))
  server.offline = true
  await hydrateAll()

  await saveState('documents', [doc('a'), doc('made-offline')])
  assert.equal(server.writes.length, 0)

  server.offline = false
  await reconcile()

  assert.ok(server.state.documents.some(d => d.id === 'made-offline'))
  assert.equal(pendingKeys().length, 0, 'the buffer is dropped once it is safely stored')
})
