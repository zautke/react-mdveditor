/**
 * Shared harness for the db-sidecar test suites.
 *
 * Spawns a real sidecar process against a real SQLite file in a temp directory —
 * no mocks. `startSidecar({ directory })` lets a test reuse a directory across a
 * restart, which is what makes crash-durability testable.
 */

import { once } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

export async function unusedPort() {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address()
  server.close()
  return port
}

export function makeTempDir() {
  return mkdtempSync(join(tmpdir(), 'mdeditor-sidecar-'))
}

/**
 * Start a sidecar.
 *
 * @param {object}  [opts]
 * @param {string}  [opts.directory]  reuse an existing data dir (for restart tests)
 * @param {boolean} [opts.keepDir]    don't delete the dir on close
 */
export async function startSidecar(opts = {}) {
  const directory = opts.directory ?? makeTempDir()
  const keepDir = opts.keepDir ?? Boolean(opts.directory)
  const port = await unusedPort()

  const child = spawn(process.execPath, ['server.ts'], {
    cwd: new URL('.', import.meta.url),
    env: {
      ...process.env,
      MDE_DB_SIDECAR_INTERNAL_PORT: String(port),
      MDE_DB_PATH: join(directory, 'mdeditor.db'),
      MDE_DB_BACKUP_DIR: join(directory, 'backups'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let output = ''
  child.stdout.on('data', chunk => { output += String(chunk) })
  child.stderr.on('data', chunk => { output += String(chunk) })

  const deadline = Date.now() + 10_000
  while (!output.includes('listening')) {
    if (child.exitCode !== null) throw new Error(`sidecar exited: ${output}`)
    if (Date.now() > deadline) throw new Error(`sidecar did not start: ${output}`)
    await new Promise(resolve => setTimeout(resolve, 25))
  }

  const baseUrl = `http://127.0.0.1:${port}`

  return {
    baseUrl,
    directory,
    dbPath: join(directory, 'mdeditor.db'),
    backupDir: join(directory, 'backups'),
    get output() { return output },

    /** Read every persisted key. */
    async getState() {
      const response = await fetch(`${baseUrl}/state`)
      return { status: response.status, body: await response.json() }
    },

    /** Write one key. `revision` makes a documents write conditional. */
    async putState(key, value, revision) {
      const body = revision === undefined ? { value } : { value, revision }
      const response = await fetch(`${baseUrl}/state/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return { status: response.status, body: await response.json().catch(() => null) }
    },

    async deleteState(key) {
      const response = await fetch(`${baseUrl}/state/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      })
      return { status: response.status, body: await response.json().catch(() => null) }
    },

    /** Kill without any chance to clean up. The point of the durability test. */
    async kill(signal = 'SIGKILL') {
      child.kill(signal)
      await once(child, 'exit')
    },

    async close() {
      if (child.exitCode === null) {
        child.kill('SIGTERM')
        await once(child, 'exit')
      }
      if (!keepDir) rmSync(directory, { recursive: true, force: true })
    },
  }
}

export function cleanupDir(directory) {
  rmSync(directory, { recursive: true, force: true })
}

/** Minimal document factory so tests read as intent, not as object literals. */
export function doc(id, content = `content-${id}`, extra = {}) {
  return {
    id,
    title: `title-${id}`,
    content,
    kind: 'markdown',
    persistedToFileSystem: false,
    ...extra,
  }
}
