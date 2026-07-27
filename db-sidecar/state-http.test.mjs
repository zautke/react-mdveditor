/**
 * HTTP contract for the `/state` surface — the routes that actually move the
 * user's documents. These were entirely untested; `server.test.mjs` only covered
 * `/health` and `/events`.
 *
 * The two 409 cases are the regression tests that matter. Both encode the same
 * rule: a client whose view of the world is behind must never be allowed to
 * delete documents it cannot see.
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { doc, startSidecar } from './test-helpers.mjs'

test('GET /state on a fresh database returns only the revision', async () => {
  const sidecar = await startSidecar()
  try {
    const { status, body } = await sidecar.getState()
    assert.equal(status, 200)
    assert.deepEqual(body, { __revision: 0 })
  } finally {
    await sidecar.close()
  }
})

test('PUT /state/documents persists documents in order and bumps the revision', async () => {
  const sidecar = await startSidecar()
  try {
    const put = await sidecar.putState('documents', [doc('a'), doc('b')])
    assert.equal(put.status, 200)
    assert.equal(put.body.revision, 1)

    const { body } = await sidecar.getState()
    assert.equal(body.__revision, 1)
    assert.deepEqual(body.documents.map(d => d.id), ['a', 'b'])
    assert.equal(body.documents[0].content, 'content-a')
  } finally {
    await sidecar.close()
  }
})

test('PUT /state/documents with an empty payload is refused against a non-empty table', async () => {
  const sidecar = await startSidecar()
  try {
    await sidecar.putState('documents', [doc('a'), doc('b')])

    const wipe = await sidecar.putState('documents', [])
    assert.equal(wipe.status, 409)
    assert.equal(wipe.body.code, 'destructive_write_rejected')

    const { body } = await sidecar.getState()
    assert.equal(body.documents.length, 2, 'documents must survive a refused wipe')
  } finally {
    await sidecar.close()
  }
})

test('PUT /state/documents with an empty payload is allowed against an empty table', async () => {
  const sidecar = await startSidecar()
  try {
    // The guard must not over-fire: legitimately having zero documents is fine.
    const { status } = await sidecar.putState('documents', [])
    assert.equal(status, 200)
  } finally {
    await sidecar.close()
  }
})

test('a write built on a stale revision is refused instead of deleting the other writer', async () => {
  const sidecar = await startSidecar()
  try {
    // Client A and client B both read revision 1.
    await sidecar.putState('documents', [doc('shared')])
    const { body: read } = await sidecar.getState()
    const staleRevision = read.__revision

    // Client A appends and writes first.
    const first = await sidecar.putState(
      'documents',
      [doc('shared'), doc('written-by-a')],
      staleRevision,
    )
    assert.equal(first.status, 200)

    // Client B still holds the pre-A view and tries to write it back. Without the
    // revision check this succeeds and silently deletes `written-by-a`.
    const second = await sidecar.putState(
      'documents',
      [doc('shared'), doc('written-by-b')],
      staleRevision,
    )
    assert.equal(second.status, 409)
    assert.equal(second.body.code, 'stale_revision')
    assert.equal(second.body.revision, first.body.revision)

    const { body } = await sidecar.getState()
    assert.deepEqual(body.documents.map(d => d.id), ['shared', 'written-by-a'])
  } finally {
    await sidecar.close()
  }
})

test('a write carrying the current revision is accepted', async () => {
  const sidecar = await startSidecar()
  try {
    await sidecar.putState('documents', [doc('a')])
    const { body: read } = await sidecar.getState()

    const ok = await sidecar.putState('documents', [doc('a'), doc('b')], read.__revision)
    assert.equal(ok.status, 200)
    assert.equal(ok.body.revision, read.__revision + 1)
  } finally {
    await sidecar.close()
  }
})

test('a write with no revision is unconditional', async () => {
  const sidecar = await startSidecar()
  try {
    await sidecar.putState('documents', [doc('a')])
    // Omitting the revision keeps the pre-existing unconditional behaviour, which
    // migrations and the sendBeacon flush still rely on.
    const { status } = await sidecar.putState('documents', [doc('a'), doc('b')])
    assert.equal(status, 200)
  } finally {
    await sidecar.close()
  }
})

test('POST is accepted as a PUT alias for sendBeacon', async () => {
  const sidecar = await startSidecar()
  try {
    // navigator.sendBeacon can only issue POST, and it is how the last edits are
    // flushed on page hide.
    const response = await fetch(`${sidecar.baseUrl}/state/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: [doc('beaconed')] }),
    })
    assert.equal(response.status, 200)

    const { body } = await sidecar.getState()
    assert.deepEqual(body.documents.map(d => d.id), ['beaconed'])
  } finally {
    await sidecar.close()
  }
})

test('DELETE /state/documents is refused while documents exist', async () => {
  const sidecar = await startSidecar()
  try {
    await sidecar.putState('documents', [doc('a')])

    const removed = await sidecar.deleteState('documents')
    assert.equal(removed.status, 409)
    assert.equal(removed.body.code, 'destructive_write_rejected')

    const { body } = await sidecar.getState()
    assert.equal(body.documents.length, 1)
  } finally {
    await sidecar.close()
  }
})

test('scalar keys round-trip and DELETE clears them', async () => {
  const sidecar = await startSidecar()
  try {
    await sidecar.putState('activeDocId', 'doc-42')
    await sidecar.putState('isExpanded', true)
    await sidecar.putState('userSettings', { theme: 'dark' })

    let { body } = await sidecar.getState()
    assert.equal(body.activeDocId, 'doc-42')
    assert.equal(body.isExpanded, true)
    assert.deepEqual(body.userSettings, { theme: 'dark' })

    assert.equal((await sidecar.deleteState('activeDocId')).status, 200)
    ;({ body } = await sidecar.getState())
    assert.equal(body.activeDocId, '')
  } finally {
    await sidecar.close()
  }
})

test('a non-array documents payload is a 400, not a silent success', async () => {
  const sidecar = await startSidecar()
  try {
    // This used to return 200 and write nothing, so a client with a malformed body
    // believed its documents were saved.
    const bad = await sidecar.putState('documents', { not: 'an array' })
    assert.equal(bad.status, 400)
    assert.equal(bad.body.code, 'invalid_payload')
  } finally {
    await sidecar.close()
  }
})

test('a malformed JSON body is a 400, not a 500', async () => {
  const sidecar = await startSidecar()
  try {
    const response = await fetch(`${sidecar.baseUrl}/state/documents`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    })
    assert.equal(response.status, 400)
  } finally {
    await sidecar.close()
  }
})

test('an unknown state key is accepted but not persisted', async () => {
  const sidecar = await startSidecar()
  try {
    // Pins the current silent-ignore contract so a future change is a deliberate one.
    assert.equal((await sidecar.putState('bogusKey', 'x')).status, 200)
    const { body } = await sidecar.getState()
    assert.equal('bogusKey' in body, false)
  } finally {
    await sidecar.close()
  }
})

test('an unknown route is a 404', async () => {
  const sidecar = await startSidecar()
  try {
    const response = await fetch(`${sidecar.baseUrl}/nope`)
    assert.equal(response.status, 404)
  } finally {
    await sidecar.close()
  }
})
