import assert from 'node:assert/strict'
import test from 'node:test'
import { ensureAdagioSidecar, isEntrypoint } from './adagio-dev.mjs'

test('recognizes a Windows script path as the active entrypoint', () => {
  assert.equal(
    isEntrypoint('file:///C:/Users/me/dev/mdeditor/scripts/adagio-dev.mjs', 'C:\\Users\\me\\dev\\mdeditor\\scripts\\adagio-dev.mjs'),
    true,
  )
})

test('refuses to run the development server away from adagio', async () => {
  await assert.rejects(
    () => ensureAdagioSidecar({ hostname: 'largo', run: async () => undefined }),
    /must run on adagio/,
  )
})

test('starts and health-verifies only the db-sidecar service', async () => {
  const calls = []
  await ensureAdagioSidecar({
    hostname: 'adagio',
    origin: 'http://127.0.0.1:15280',
    run: async (...args) => { calls.push(args) },
    health: async () => undefined,
  })
  assert.deepEqual(calls, [[
    'docker',
    'compose',
    'up',
    '--detach',
    '--wait',
    'db-sidecar',
  ]])
})
