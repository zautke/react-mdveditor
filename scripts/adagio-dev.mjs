#!/usr/bin/env node

import { hostname as systemHostname } from 'node:os'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { assertSidecarHealthy } from './sidecar-health.mjs'

function Usage() {
  console.error('Usage: node scripts/adagio-dev.mjs [-- <vite options>]')
}

function run(command, ...args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', code => {
      if (code === 0) resolve()
      else reject(new Error(`${command} exited with code ${code ?? 'unknown'}`))
    })
  })
}

export async function ensureAdagioSidecar({
  hostname = systemHostname(),
  origin = process.env.MDE_DB_PROXY_ORIGIN,
  run: runCommand = run,
  health = assertSidecarHealthy,
} = {}) {
  const expectedHost = (process.env.MDE_RUNTIME_HOST ?? 'adagio').toLowerCase()
  if (hostname.toLowerCase() !== expectedHost) {
    throw new Error(`mdeditor dev must run on ${expectedHost}, not ${hostname}`)
  }
  if (!origin) throw new Error('MDE_DB_PROXY_ORIGIN must be configured')

  await runCommand('docker', 'compose', 'up', '--detach', '--wait', 'db-sidecar')
  await health(origin)
}

export function isEntrypoint(moduleUrl, scriptPath) {
  if (!scriptPath) return false
  const expectedUrl = /^[a-z]:[\\/]/i.test(scriptPath)
    ? `file:///${scriptPath.replaceAll('\\', '/')}`
    : pathToFileURL(scriptPath).href
  return moduleUrl === expectedUrl
}

export function startVite(args, { run: runCommand = run, platform = process.platform } = {}) {
  return runCommand(platform === 'win32' ? 'pnpm.cmd' : 'pnpm', 'exec', 'vite', ...args)
}

async function main() {
  try {
    await ensureAdagioSidecar()
    const viteArgs = process.argv.slice(2)
    if (viteArgs[0] === '--') viteArgs.shift()
    await startVite(viteArgs)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    Usage()
    process.exitCode = 1
  }
}

if (isEntrypoint(import.meta.url, process.argv[1])) {
  await main()
}
