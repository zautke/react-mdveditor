import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { ensureAdagioSidecar, isEntrypoint, startVite } from './adagio-dev.mjs'

test('recognizes a Windows script path as the active entrypoint', () => {
  assert.equal(
    isEntrypoint('file:///C:/Users/me/dev/mdeditor/scripts/adagio-dev.mjs', 'C:\\Users\\me\\dev\\mdeditor\\scripts\\adagio-dev.mjs'),
    true,
  )
})

test('loads the environment source of truth before starting the supervisor', () => {
  const packageJson = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'))
  assert.match(packageJson.scripts.dev, /^node --env-file=\.env scripts\/adagio-dev\.mjs$/)
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

test('starts Vite through the platform-specific pnpm executable', async () => {
  const calls = []
  await startVite(['--host', '0.0.0.0'], {
    platform: 'win32',
    run: async (...args) => { calls.push(args) },
  })
  assert.deepEqual(calls, [['pnpm.cmd', 'exec', 'vite', '--host', '0.0.0.0']])
})
