#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ENV_FILE = resolve(PROJECT_ROOT, '.env')

if (existsSync(ENV_FILE) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(ENV_FILE)
}

const BASE_URL =
  process.env.MDE_DEV_ORIGIN ??
  process.env.MDE_APP_ORIGIN ??
  process.env.VITE_MDE_APP_ORIGIN ??
  'http://localhost:5250'
const STATUS_URL = `${BASE_URL}/api/mde-status`
const OPEN_URL = `${BASE_URL}/api/mde-open`
const COMMAND_NAME = process.env.MDE_CLI_NAME ?? 'mde'

// Resolve all CLI args to absolute paths, exit early if any missing
const args = process.argv.slice(2)
if (args.length === 0) {
  console.error(`Usage: ${COMMAND_NAME} <file1> [file2] ...`)
  process.exit(1)
}

const filePaths = []
for (const arg of args) {
  const abs = resolve(arg)
  if (!existsSync(abs)) {
    console.error(`File not found: ${abs}`)
    process.exit(1)
  }
  filePaths.push(abs)
}

async function isServerReady() {
  try {
    const res = await fetch(STATUS_URL, { signal: AbortSignal.timeout(1000) })
    return res.ok
  } catch {
    return false
  }
}

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await isServerReady()) return true
    await new Promise(r => setTimeout(r, 500))
  }
  return false
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function openBrowser(url) {
  if (process.platform === 'darwin') {
    return spawnSync('open', [url], { stdio: 'ignore' })
  }

  if (process.platform === 'win32') {
    return spawnSync('cmd', ['/c', 'start', '', url], {
      stdio: 'ignore',
      windowsHide: true,
    })
  }

  return spawnSync('xdg-open', [url], { stdio: 'ignore' })
}

const serverWasRunning = await isServerReady()

if (!serverWasRunning) {
  console.log('Starting dev server...')
  const child = spawn('pnpm', ['dev'], {
    cwd: PROJECT_ROOT,
    detached: true,
    stdio: 'ignore',
  })
  child.unref()

  const ready = await waitForServer(30_000)
  if (!ready) {
    console.error('Dev server did not start within 30s')
    process.exit(1)
  }

  console.log('Opening browser...')
  const browserResult = openBrowser(BASE_URL)
  if (browserResult.status !== 0) {
    console.warn(`Could not open browser automatically for ${BASE_URL}`)
  }
  // Give the browser time to connect HMR before we POST
  await sleep(800)
}

const res = await fetch(OPEN_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ filePaths }),
})

const data = await res.json()
if (data.errors && data.errors.length > 0) {
  for (const err of data.errors) console.error(err)
}
console.log(`Opened ${data.opened ?? 0} file(s) in mdeditor`)
