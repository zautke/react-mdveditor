import assert from 'node:assert/strict'
import test from 'node:test'
import { assertSidecarHealthy } from './sidecar-health.mjs'

test('accepts only a ready SQLite sidecar response', async () => {
  await assert.doesNotReject(() => assertSidecarHealthy('http://127.0.0.1:15280', {
    fetchImpl: async () => new Response(JSON.stringify({
      ok: true,
      status: 'ready',
      database: 'ready',
    }), { status: 200 }),
  }))

  await assert.rejects(
    () => assertSidecarHealthy('http://127.0.0.1:15280', {
      fetchImpl: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    }),
    /not ready/,
  )
})
