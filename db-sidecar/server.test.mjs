import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import test from 'node:test'

async function unusedPort() {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  server.close()
  return address.port
}

async function startSidecar() {
  const directory = mkdtempSync(join(tmpdir(), 'mdeditor-sidecar-'))
  const port = await unusedPort()
  const child = spawn(process.execPath, ['--experimental-strip-types', 'server.ts'], {
    cwd: new URL('.', import.meta.url),
    env: {
      ...process.env,
      MDE_DB_SIDECAR_INTERNAL_PORT: String(port),
      MDE_DB_PATH: join(directory, 'mdeditor.db'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let output = ''
  child.stdout.on('data', chunk => { output += String(chunk) })
  child.stderr.on('data', chunk => { output += String(chunk) })

  const deadline = Date.now() + 5_000
  while (!output.includes('listening')) {
    if (Date.now() > deadline) throw new Error(`sidecar did not start: ${output}`)
    await new Promise(resolve => setTimeout(resolve, 25))
  }

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async close() {
      child.kill('SIGTERM')
      await once(child, 'exit')
      rmSync(directory, { recursive: true, force: true })
    },
  }
}

test('health verifies SQLite readiness and identifies the running sidecar', async () => {
  const sidecar = await startSidecar()
  try {
    const response = await fetch(`${sidecar.baseUrl}/health`)
    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.equal(payload.ok, true)
    assert.equal(payload.status, 'ready')
    assert.equal(payload.database, 'ready')
    assert.match(payload.instanceId, /^[0-9a-f-]{36}$/)
    assert.equal(typeof payload.startedAt, 'number')
  } finally {
    await sidecar.close()
  }
})

test('events emits readiness followed by a heartbeat', async () => {
  const sidecar = await startSidecar()
  try {
    const response = await fetch(`${sidecar.baseUrl}/events`)
    assert.equal(response.status, 200)
    const reader = response.body.getReader()
    const first = new TextDecoder().decode((await reader.read()).value)
    const second = new TextDecoder().decode((await reader.read()).value)
    assert.match(first + second, /event: ready/)
    assert.match(first + second, /event: heartbeat/)
    await reader.cancel()
  } finally {
    await sidecar.close()
  }
})
