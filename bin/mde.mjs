#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
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
const SUPPORTED_EXTENSIONS = [
  '.url.html',
  '.markdown',
  '.mermaid',
  '.html',
  '.htm',
  '.jsx',
  '.tsx',
  '.dot',
  '.gv',
  '.json',
  '.mmd',
  '.mdx',
  '.md',
]
const SKIP_DIRECTORIES = new Set([
  '.git',
  '.cache',
  '.pnpm-store',
  '.playwright-mcp',
  'dist',
  'build',
  'node_modules',
  'logs',
  'test-results',
])

// Resolve all CLI args to absolute paths, expanding folders to all supported
// document files they contain.
const args = process.argv.slice(2)
if (args.length === 0) {
  console.error(`Usage: ${COMMAND_NAME} <file|folder> [file|folder] ...`)
  process.exit(1)
}

const filePaths = []
const seenPaths = new Set()
const errors = []

function isSupportedDocumentFile(filename) {
  const lower = filename.toLowerCase()
  return SUPPORTED_EXTENSIONS.find(ext => lower.endsWith(ext)) ?? null
}

function shouldSkipDirectory(name) {
  return name.startsWith('.') || SKIP_DIRECTORIES.has(name)
}

function addFilePath(absPath) {
  if (seenPaths.has(absPath)) return
  seenPaths.add(absPath)
  filePaths.push(absPath)
}

function collectSupportedFiles(absPath) {
  const stats = statSync(absPath)
  if (stats.isFile()) {
    const ext = isSupportedDocumentFile(absPath)
    if (ext) {
      addFilePath(absPath)
      return 1
    }
    errors.push(`Unsupported file type: ${absPath}`)
    return 0
  }

  if (!stats.isDirectory()) {
    errors.push(`Unsupported path type: ${absPath}`)
    return 0
  }

  const entries = readdirSync(absPath, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))

  let foundAny = 0
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name)) continue
      const nested = resolve(absPath, entry.name)
      foundAny += collectSupportedFiles(nested)
      continue
    }

    if (!entry.isFile()) continue

    const ext = isSupportedDocumentFile(entry.name)
    if (!ext) continue

    foundAny += 1
    addFilePath(resolve(absPath, entry.name))
  }

  return foundAny
}

for (const arg of args) {
  const abs = resolve(arg)
  if (!existsSync(abs)) {
    console.error(`File not found: ${abs}`)
    process.exit(1)
  }
  const matchCount = collectSupportedFiles(abs)
  if (matchCount === 0 && statSync(abs).isDirectory()) {
    errors.push(`No supported document files found in directory: ${abs}`)
  }
}

if (filePaths.length === 0) {
  for (const err of errors) console.error(err)
  process.exit(1)
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
for (const err of errors) console.error(err)
console.log(`Opened ${data.opened ?? 0} file(s) in mdeditor`)
