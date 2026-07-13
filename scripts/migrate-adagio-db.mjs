#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { spawnSync } from 'node:child_process'

export function Usage() {
  return 'Usage: node scripts/migrate-adagio-db.mjs --source <path> --host <ssh-host> --destination <remote-path>'
}

export function parseOptions(args) {
  const options = { source: '', host: '', destination: '' }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    const value = args[index + 1]
    if (argument === '-s' || argument === '--source') options.source = value ?? ''
    else if (argument === '-r' || argument === '--host') options.host = value ?? ''
    else if (argument === '-d' || argument === '--destination') options.destination = value ?? ''
    else if (argument === '-h' || argument === '--help') throw new Error(Usage())
    else throw new Error(`Unknown argument: ${argument}`)
    index += 1
  }

  if (!options.source || !options.host || !options.destination) throw new Error(Usage())
  return options
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr || result.stdout}`.trim())
  }
  return result.stdout.trim()
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function ps(command) {
  return Buffer.from(command, 'utf16le').toString('base64')
}

function remoteCommand(host, command) {
  return run('ssh', [host, 'powershell', '-NoProfile', '-EncodedCommand', ps(command)])
}

function quotePowerShell(value) {
  return `'${value.replaceAll("'", "''")}'`
}

function main() {
  try {
    const { source, host, destination } = parseOptions(process.argv.slice(2))
    if (!existsSync(source)) throw new Error(`Source database does not exist: ${source}`)

    const incoming = `${destination}.incoming`
    const sourceHash = sha256(source)
    remoteCommand(host, `New-Item -ItemType Directory -Force -Path ${quotePowerShell(dirname(destination))} | Out-Null`)
    run('scp', [source, `${host}:${incoming}`])

    const remoteHash = remoteCommand(
      host,
      `(Get-FileHash -Algorithm SHA256 -LiteralPath ${quotePowerShell(incoming)}).Hash.ToLowerInvariant()`,
    ).toLowerCase()
    if (remoteHash !== sourceHash) {
      remoteCommand(host, `Remove-Item -Force -ErrorAction SilentlyContinue -LiteralPath ${quotePowerShell(incoming)}`)
      throw new Error(`Checksum mismatch: expected ${sourceHash}, received ${remoteHash}`)
    }

    const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
    remoteCommand(host, [
      `$target = ${quotePowerShell(destination)}`,
      `$incoming = ${quotePowerShell(incoming)}`,
      `if (Test-Path -LiteralPath $target) { Copy-Item -LiteralPath $target -Destination ($target + '.backup-${timestamp}') }`,
      'Move-Item -Force -LiteralPath $incoming -Destination $target',
    ].join('; '))
    console.log(JSON.stringify({ source, destination, sha256: sourceHash }))
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    console.error(Usage())
    process.exitCode = 1
  }
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) main()
