#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import * as http from 'node:http'
import * as https from 'node:https'
import { homedir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ENV_FILE = resolve(PROJECT_ROOT, '.env')

if (existsSync(ENV_FILE) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(ENV_FILE)
}

const COMMAND_NAME = process.env.MDE_CLI_NAME ?? 'mde'
const LOCAL_DEV_PORT = 5250
const LOCAL_DEV_ORIGIN = `https://127.0.0.1:${LOCAL_DEV_PORT}`
const FORBIDDEN_LOCAL_PORTS = [5251, 5252, 5253, 5254]
const PROD_ORIGIN = normalizeOrigin(
  process.env.MDE_APP_ORIGIN ?? 'http://adagio.local:5200',
)
// Candidate origins probed (in order) to find a running MDE before sending
// files — first to answer /api/ping wins. Configured via MDE_CANDIDATE_ORIGINS
// (comma-separated full origins); defaults to local prod + dev. adagio.local is
// intentionally omitted here while its network path is unreliable.
const DEFAULT_CANDIDATE_ORIGINS = [
  `http://127.0.0.1:${process.env.MDE_APP_PORT ?? '5200'}`,
  `https://127.0.0.1:${process.env.MDE_DEV_PORT ?? String(LOCAL_DEV_PORT)}`,
]
function getCandidateOrigins() {
  const raw = (process.env.MDE_CANDIDATE_ORIGINS ?? '').trim()
  const list = raw
    ? raw.split(',').map(s => s.trim()).filter(Boolean)
    : DEFAULT_CANDIDATE_ORIGINS
  const origins = []
  for (const entry of list) {
    try {
      origins.push(new URL(entry).origin)
    } catch {
      console.warn(`Ignoring invalid MDE_CANDIDATE_ORIGINS entry: ${entry}`)
    }
  }
  return origins.length > 0 ? origins : DEFAULT_CANDIDATE_ORIGINS
}

const MAX_SERVER_ERRORS = 3
const DEV_HTTPS_DIR = resolve(homedir(), '.local', 'state', 'mdeditor', 'dev-https')
const DEV_HTTPS_REPO_DIR = resolve(PROJECT_ROOT, 'docker', 'dev-https')
const DEV_HTTPS_LOCK_FILE = resolve(homedir(), '.config', 'mdeditor', 'dev-https-ca.sha256')
const DEV_HTTPS_CA_CERT_FILE = resolve(DEV_HTTPS_DIR, 'ca.crt')
const DEV_HTTPS_CA_KEY_FILE = resolve(DEV_HTTPS_DIR, 'ca.key')
const DEV_HTTPS_SERVER_CERT_FILE = resolve(DEV_HTTPS_DIR, 'server.crt')
const DEV_HTTPS_SERVER_KEY_FILE = resolve(DEV_HTTPS_DIR, 'server.key')
const DEV_HTTPS_SERVER_CSR_FILE = resolve(DEV_HTTPS_DIR, 'server.csr')
const DEV_HTTPS_ROOT_OPENSSL_CONFIG = resolve(DEV_HTTPS_DIR, 'openssl-root.cnf')
const DEV_HTTPS_SERVER_OPENSSL_CONFIG = resolve(DEV_HTTPS_DIR, 'openssl-server.cnf')
const DEV_HTTPS_REPO_CA_CERT_FILE = resolve(DEV_HTTPS_REPO_DIR, 'ca.crt')
const DEV_HTTPS_REPO_CA_KEY_FILE = resolve(DEV_HTTPS_REPO_DIR, 'ca.key')
const DEV_HTTPS_REPO_SERVER_CERT_FILE = resolve(DEV_HTTPS_REPO_DIR, 'server.crt')
const DEV_HTTPS_REPO_SERVER_KEY_FILE = resolve(DEV_HTTPS_REPO_DIR, 'server.key')
const DEV_HTTPS_REPO_SERVER_CSR_FILE = resolve(DEV_HTTPS_REPO_DIR, 'server.csr')
const DEV_HTTPS_REPO_ROOT_OPENSSL_CONFIG = resolve(DEV_HTTPS_REPO_DIR, 'openssl-root.cnf')
const DEV_HTTPS_REPO_SERVER_OPENSSL_CONFIG = resolve(DEV_HTTPS_REPO_DIR, 'openssl-server.cnf')
const DEV_HTTPS_CA_COMMON_NAME = 'Adagio Local Dev CA'
const DEV_HTTPS_SERVER_COMMON_NAME = 'Adagio Local Dev HTTPS'
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

// SSoT hook: `--print-extensions` emits the canonical allowlist (one per line)
// so external launchers (e.g. open_in_mde) never hardcode a divergent copy.
if (args.includes('--print-extensions') || args.includes('-E')) {
  process.stdout.write(SUPPORTED_EXTENSIONS.join('\n') + '\n')
  process.exit(0)
}

if (args.length === 0) {
  console.error(`Usage: ${COMMAND_NAME} <file|folder> [file|folder] ...`)
  process.exit(1)
}

const filePaths = []
const seenPaths = new Set()
const errors = []
const DEV_SERVER_START_TIMEOUT_MS =
  Number.parseInt(process.env.MDE_DEV_START_TIMEOUT_MS ?? '', 10) || 60_000

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

function normalizeOrigin(origin) {
  try {
    const url = new URL(origin)
    if (
      url.hostname === 'adagio.local' &&
      url.port === String(LOCAL_DEV_PORT) &&
      url.protocol === 'http:'
    ) {
      url.protocol = 'https:'
    }
    return url.origin
  } catch {
    return null
  }
}

function getListeningPids(port) {
  if (process.platform === 'win32') return []

  const result = spawnSync('lsof', ['-t', `-iTCP:${port}`, '-sTCP:LISTEN'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.status !== 0 && !result.stdout) return []

  return [...new Set(
    result.stdout
      .split(/\s+/)
      .map(value => Number.parseInt(value, 10))
      .filter(pid => Number.isInteger(pid) && pid > 0),
  )]
}

function getProcessCommand(pid) {
  if (process.platform === 'win32') return ''

  const result = spawnSync('ps', ['-p', String(pid), '-o', 'command='], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  return result.stdout.trim()
}

function killPid(pid) {
  const signal = process.platform === 'win32' ? ['taskkill', ['/PID', String(pid), '/T', '/F']] : ['kill', ['-TERM', String(pid)]]
  const [cmd, args] = signal
  return spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
}

function cleanupForbiddenLocalPorts() {
  const killed = []

  for (const port of FORBIDDEN_LOCAL_PORTS) {
    for (const pid of getListeningPids(port)) {
      const commandLine = getProcessCommand(pid)
      console.warn(`Killing listener on forbidden port ${port} (pid ${pid})${commandLine ? `: ${commandLine}` : ''}`)
      killPid(pid)
      killed.push({ port, pid })
    }
  }

  return killed
}

function readStoredDevHttpsFingerprint() {
  if (!existsSync(DEV_HTTPS_LOCK_FILE)) return null

  const stored = readFileSync(DEV_HTTPS_LOCK_FILE, 'utf8').trim().toUpperCase()
  return stored.length > 0 ? stored : null
}

function writeStoredDevHttpsFingerprint(fingerprint) {
  mkdirSync(dirname(DEV_HTTPS_LOCK_FILE), { recursive: true })
  writeFileSync(DEV_HTTPS_LOCK_FILE, `${fingerprint}\n`)
}

function copyDevHttpsFile(sourcePath, targetPath) {
  if (!existsSync(sourcePath)) return false

  mkdirSync(dirname(targetPath), { recursive: true })
  copyFileSync(sourcePath, targetPath)
  return true
}

function mirrorDevHttpsMaterial() {
  const copies = [
    [DEV_HTTPS_CA_CERT_FILE, DEV_HTTPS_REPO_CA_CERT_FILE],
    [DEV_HTTPS_CA_KEY_FILE, DEV_HTTPS_REPO_CA_KEY_FILE],
    [DEV_HTTPS_SERVER_CERT_FILE, DEV_HTTPS_REPO_SERVER_CERT_FILE],
    [DEV_HTTPS_SERVER_KEY_FILE, DEV_HTTPS_REPO_SERVER_KEY_FILE],
    [DEV_HTTPS_SERVER_CSR_FILE, DEV_HTTPS_REPO_SERVER_CSR_FILE],
    [DEV_HTTPS_ROOT_OPENSSL_CONFIG, DEV_HTTPS_REPO_ROOT_OPENSSL_CONFIG],
    [DEV_HTTPS_SERVER_OPENSSL_CONFIG, DEV_HTTPS_REPO_SERVER_OPENSSL_CONFIG],
  ]

  for (const [sourcePath, targetPath] of copies) {
    if (!existsSync(sourcePath)) continue
    copyDevHttpsFile(sourcePath, targetPath)
  }
}

function restoreDevHttpsMaterialFromRepo() {
  const copies = [
    [DEV_HTTPS_REPO_CA_CERT_FILE, DEV_HTTPS_CA_CERT_FILE],
    [DEV_HTTPS_REPO_CA_KEY_FILE, DEV_HTTPS_CA_KEY_FILE],
    [DEV_HTTPS_REPO_SERVER_CERT_FILE, DEV_HTTPS_SERVER_CERT_FILE],
    [DEV_HTTPS_REPO_SERVER_KEY_FILE, DEV_HTTPS_SERVER_KEY_FILE],
    [DEV_HTTPS_REPO_SERVER_CSR_FILE, DEV_HTTPS_SERVER_CSR_FILE],
    [DEV_HTTPS_REPO_ROOT_OPENSSL_CONFIG, DEV_HTTPS_ROOT_OPENSSL_CONFIG],
    [DEV_HTTPS_REPO_SERVER_OPENSSL_CONFIG, DEV_HTTPS_SERVER_OPENSSL_CONFIG],
  ]

  for (const [sourcePath, targetPath] of copies) {
    if (!existsSync(sourcePath)) continue
    copyDevHttpsFile(sourcePath, targetPath)
  }
}

function hasTrustedDevHttpsCertificate() {
  const result = spawnSync('security', ['dump-trust-settings'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  if (result.status !== 0) return false

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  return output.includes(DEV_HTTPS_CA_COMMON_NAME) && output.includes('TrustRoot')
}

const STARTUP_ORIGINS = [LOCAL_DEV_ORIGIN]

function requestJson(origin, pathname, { method = 'GET', body = '' } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, origin)
    const transport = url.protocol === 'https:' ? https : http
    const payload = body ? Buffer.from(body) : null
    const isHttps = url.protocol === 'https:'
    const req = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method,
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            }
          : undefined,
        ca: isHttps ? readFileSync(DEV_HTTPS_CA_CERT_FILE) : undefined,
        rejectUnauthorized: isHttps ? true : undefined,
      },
      res => {
        const chunks = []
        res.setEncoding('utf8')
        res.on('data', chunk => chunks.push(chunk))
        res.on('end', () => {
          const text = chunks.join('')
          let json = null
          if (text.length > 0) {
            try {
              json = JSON.parse(text)
            } catch {
              json = null
            }
          }
          resolve({
            statusCode: res.statusCode ?? 0,
            ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
            text,
            json,
          })
        })
      },
    )

    req.on('error', reject)
    req.setTimeout(1000, () => req.destroy(new Error(`Request timed out for ${origin}`)))

    if (payload) req.write(payload)
    req.end()
  })
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

async function isServerReady(baseUrl) {
  // Canonical heartbeat first: GET /api/ping -> { ok: true, service: 'mde' }.
  // Guards against an unrelated server occupying the same port.
  try {
    const beat = await requestJson(baseUrl, '/api/ping')
    if (beat.ok && beat.json && beat.json.ok === true && beat.json.service === 'mde') {
      return true
    }
  } catch {
    // Fall through to legacy probes for older servers.
  }

  try {
    const ping = await requestJson(baseUrl, '/ping')
    if (ping.ok && (ping.text.trim().length === 0 || ping.text.trim().toLowerCase() === 'pong')) {
      return true
    }
  } catch {
    // Fall through to the legacy status endpoint for older servers.
  }

  try {
    const res = await requestJson(baseUrl, '/api/mde-status')
    return res.ok
  } catch {
    return false
  }
}

async function resolveReadyOrigin(origins, timeoutMs = 0) {
  const deadline = timeoutMs > 0 ? Date.now() + timeoutMs : 0

  while (timeoutMs === 0 || Date.now() < deadline) {
    for (const origin of origins) {
      if (await isServerReady(origin)) return origin
    }
    if (timeoutMs === 0) break
    await new Promise(r => setTimeout(r, 500))
  }

  return null
}

async function waitForServer(origins, timeoutMs = DEV_SERVER_START_TIMEOUT_MS) {
  return resolveReadyOrigin(origins, timeoutMs)
}

function ensureDevHttpsMaterial() {
  mkdirSync(DEV_HTTPS_DIR, { recursive: true })
  mkdirSync(DEV_HTTPS_REPO_DIR, { recursive: true })

  const storedFingerprint = readStoredDevHttpsFingerprint()
  const stateHasRoot = existsSync(DEV_HTTPS_CA_CERT_FILE) && existsSync(DEV_HTTPS_CA_KEY_FILE)
  const repoHasRoot = existsSync(DEV_HTTPS_REPO_CA_CERT_FILE) && existsSync(DEV_HTTPS_REPO_CA_KEY_FILE)

  if (!stateHasRoot) {
    if (repoHasRoot) {
      const repoFingerprint = certificateFingerprint(DEV_HTTPS_REPO_CA_CERT_FILE)
      if (storedFingerprint && storedFingerprint !== repoFingerprint) {
        console.error(`Dev HTTPS CA drift detected. Locked fingerprint ${storedFingerprint} does not match the repo mirror fingerprint ${repoFingerprint}. Restore the canonical state at ${DEV_HTTPS_DIR} instead of rotating the trust anchor.`)
        process.exit(1)
      }
      restoreDevHttpsMaterialFromRepo()
    } else if (storedFingerprint) {
      console.error(`Missing canonical dev HTTPS CA material in ${DEV_HTTPS_DIR}, but a locked fingerprint ${storedFingerprint} exists in ${DEV_HTTPS_LOCK_FILE}. Restore the state files before launching mdeo.`)
      process.exit(1)
    } else {
      writeFileSync(DEV_HTTPS_ROOT_OPENSSL_CONFIG, `
[req]
prompt = no
default_md = sha256
distinguished_name = req_distinguished_name
x509_extensions = v3_ca

[req_distinguished_name]
CN = ${DEV_HTTPS_CA_COMMON_NAME}

[v3_ca]
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, digitalSignature, keyCertSign, cRLSign
subjectKeyIdentifier = hash
`)

      writeFileSync(DEV_HTTPS_SERVER_OPENSSL_CONFIG, `
[req]
prompt = no
default_md = sha256
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]
CN = ${DEV_HTTPS_SERVER_COMMON_NAME}

[v3_req]
basicConstraints = critical, CA:false
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectKeyIdentifier = hash
subjectAltName = @alt_names

[alt_names]
DNS.1 = adagio.local
DNS.2 = localhost
IP.1 = 127.0.0.1
`)

      const rootResult = spawnSync('openssl', [
        'req',
        '-x509',
        '-nodes',
        '-newkey',
        'rsa:4096',
        '-days',
        '3650',
        '-keyout',
        DEV_HTTPS_CA_KEY_FILE,
        '-out',
        DEV_HTTPS_CA_CERT_FILE,
        '-config',
        DEV_HTTPS_ROOT_OPENSSL_CONFIG,
        '-extensions',
        'v3_ca',
      ], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      })

      if (rootResult.status !== 0) {
        const stderr = rootResult.stderr?.toString().trim()
        if (stderr) {
          console.error(stderr)
        }
        console.error('Failed to generate the dev HTTPS root CA')
        process.exit(1)
      }
    }
  }

  const rootFingerprint = certificateFingerprint(DEV_HTTPS_CA_CERT_FILE)
  const rootMatchesExpectedName = certificateContainsCommonName(DEV_HTTPS_CA_CERT_FILE, DEV_HTTPS_CA_COMMON_NAME)

  if (storedFingerprint && storedFingerprint !== rootFingerprint) {
    console.error(`Dev HTTPS CA drift detected. Locked fingerprint ${storedFingerprint} does not match the current canonical fingerprint ${rootFingerprint}. Restore the canonical state files instead of rotating the trust anchor.`)
    process.exit(1)
  }

  if (!rootMatchesExpectedName) {
    console.error(`Dev HTTPS CA subject mismatch for ${DEV_HTTPS_CA_CERT_FILE}. Expected CN=${DEV_HTTPS_CA_COMMON_NAME}.`)
    process.exit(1)
  }

  if (!storedFingerprint) {
    writeStoredDevHttpsFingerprint(rootFingerprint)
  }

  writeFileSync(DEV_HTTPS_ROOT_OPENSSL_CONFIG, `
[req]
prompt = no
default_md = sha256
distinguished_name = req_distinguished_name
x509_extensions = v3_ca

[req_distinguished_name]
CN = ${DEV_HTTPS_CA_COMMON_NAME}

[v3_ca]
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, digitalSignature, keyCertSign, cRLSign
subjectKeyIdentifier = hash
`)

  writeFileSync(DEV_HTTPS_SERVER_OPENSSL_CONFIG, `
[req]
prompt = no
default_md = sha256
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]
CN = ${DEV_HTTPS_SERVER_COMMON_NAME}

[v3_req]
basicConstraints = critical, CA:false
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectKeyIdentifier = hash
subjectAltName = @alt_names

[alt_names]
DNS.1 = adagio.local
DNS.2 = localhost
IP.1 = 127.0.0.1
`)

  const hasServerCert = existsSync(DEV_HTTPS_SERVER_CERT_FILE) && existsSync(DEV_HTTPS_SERVER_KEY_FILE)
  const serverMatchesExpectedName = hasServerCert
    ? certificateContainsCommonName(DEV_HTTPS_SERVER_CERT_FILE, DEV_HTTPS_SERVER_COMMON_NAME)
    : false
  const serverMatchesRoot = hasServerCert && serverMatchesExpectedName
    ? isCertificateSignedByCa(DEV_HTTPS_SERVER_CERT_FILE, DEV_HTTPS_CA_CERT_FILE)
    : false

  if (!serverMatchesRoot) {
    const csrResult = spawnSync('openssl', [
      'req',
      '-new',
      '-nodes',
      '-newkey',
      'rsa:2048',
      '-keyout',
      DEV_HTTPS_SERVER_KEY_FILE,
      '-out',
      DEV_HTTPS_SERVER_CSR_FILE,
      '-config',
      DEV_HTTPS_SERVER_OPENSSL_CONFIG,
      '-reqexts',
      'v3_req',
    ], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    if (csrResult.status !== 0) {
      const stderr = csrResult.stderr?.toString().trim()
      if (stderr) {
        console.error(stderr)
      }
      console.error('Failed to generate the dev HTTPS certificate request')
      process.exit(1)
    }

    const signResult = spawnSync('openssl', [
      'x509',
      '-req',
      '-in',
      DEV_HTTPS_SERVER_CSR_FILE,
      '-CA',
      DEV_HTTPS_CA_CERT_FILE,
      '-CAkey',
      DEV_HTTPS_CA_KEY_FILE,
      '-CAcreateserial',
      '-out',
      DEV_HTTPS_SERVER_CERT_FILE,
      '-days',
      '825',
      '-sha256',
      '-extfile',
      DEV_HTTPS_SERVER_OPENSSL_CONFIG,
      '-extensions',
      'v3_req',
    ], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    if (signResult.status !== 0) {
      const stderr = signResult.stderr?.toString().trim()
      if (stderr) {
        console.error(stderr)
      }
      console.error('Failed to sign the dev HTTPS certificate')
      process.exit(1)
    }

    try {
      if (existsSync(DEV_HTTPS_SERVER_CSR_FILE)) unlinkSync(DEV_HTTPS_SERVER_CSR_FILE)
      const serialFile = `${DEV_HTTPS_CA_CERT_FILE.replace(/\.crt$/i, '')}.srl`
      if (existsSync(serialFile)) unlinkSync(serialFile)
    } catch {
      // Ignore cleanup failures in the state cert directory.
    }
  }

  mirrorDevHttpsMaterial()

  if (process.platform === 'darwin') {
    trustDevHttpsCertificate(DEV_HTTPS_CA_CERT_FILE)
  }
}

function isCertificateSignedByCa(certPath, caPath) {
  const result = spawnSync('openssl', [
    'verify',
    '-CAfile',
    caPath,
    certPath,
  ], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  return result.status === 0
}

function trustDevHttpsCertificate(certPath) {
  const keychain = resolve(homedir(), 'Library', 'Keychains', 'login.keychain-db')
  if (hasTrustedDevHttpsCertificate()) {
    return
  }

  const result = spawnSync('security', [
    'add-trusted-cert',
    '-d',
    '-r',
    'trustRoot',
    '-p',
    'ssl',
    '-k',
    keychain,
    certPath,
  ], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  if (result.status !== 0) {
    const stderr = result.stderr?.toString().trim()
    if (stderr) {
      console.error(stderr)
    }
    console.error('Failed to trust the dev HTTPS certificate in the login keychain')
    process.exit(1)
  }

  if (!hasTrustedDevHttpsCertificate()) {
    console.error(`The dev HTTPS certificate is present in the login keychain but is not trusted yet. Open the trust profile or rerun the trust install flow for ${certPath}.`)
    process.exit(1)
  }
}

function certificateFingerprint(certPath) {
  const result = spawnSync('openssl', [
    'x509',
    '-noout',
    '-fingerprint',
    '-sha256',
    '-in',
    certPath,
  ], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  if (result.status !== 0) {
    const stderr = result.stderr?.toString().trim()
    if (stderr) {
      console.error(stderr)
    }
    console.error(`Failed to inspect certificate fingerprint for ${certPath}`)
    process.exit(1)
  }

  const match = result.stdout.match(/Fingerprint=([A-F0-9:]+)/i)
  if (!match) {
    console.error(`Could not parse certificate fingerprint for ${certPath}`)
    process.exit(1)
  }

  return match[1].replaceAll(':', '').toUpperCase()
}

function certificateContainsCommonName(certPath, commonName) {
  const result = spawnSync('openssl', [
    'x509',
    '-noout',
    '-subject',
    '-in',
    certPath,
  ], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  if (result.status !== 0) {
    const stderr = result.stderr?.toString().trim()
    if (stderr) {
      console.error(stderr)
    }
    console.error(`Failed to inspect certificate subject for ${certPath}`)
    process.exit(1)
  }

  return result.stdout.includes(`CN=${commonName}`) || result.stdout.includes(`CN = ${commonName}`)
}

function dockerEnv() {
  const env = { ...process.env }
  delete env.DOCKER_HOST
  delete env.DOCKER_CONTEXT
  return env
}

function spawnAdagioCompose(args) {
  return spawnSync('docker', ['--context', 'adagio-ssh', 'compose', ...args], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: dockerEnv(),
  })
}

function isSuccessfulOpen(data) {
  return (data?.opened ?? 0) > 0 && (!Array.isArray(data?.errors) || data.errors.length === 0)
}

function getOriginHostname(origin) {
  try {
    return new URL(origin).hostname
  } catch {
    return ''
  }
}

function getOriginPort(origin) {
  try {
    return new URL(origin).port
  } catch {
    return ''
  }
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

ensureDevHttpsMaterial()

cleanupForbiddenLocalPorts()

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

async function openFilesAt(origin) {
  const response = await requestJson(origin, '/api/mde-open', {
    method: 'POST',
    body: JSON.stringify({ filePaths }),
  })
  return response.json ?? {}
}

async function launchLocalDevServer() {
  cleanupForbiddenLocalPorts()

  console.log('Starting dev server...')
  if (process.env.MDE_DEV_PORT && process.env.MDE_DEV_PORT !== String(LOCAL_DEV_PORT)) {
    console.warn(`Ignoring MDE_DEV_PORT=${process.env.MDE_DEV_PORT}; mdeo only uses port ${LOCAL_DEV_PORT}`)
  }

  const child = spawn('pnpm', ['dev'], {
    cwd: PROJECT_ROOT,
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      MDE_DEV_PORT: String(LOCAL_DEV_PORT),
      MDE_DEV_ORIGIN: LOCAL_DEV_ORIGIN,
    },
  })
  child.unref()

  const ready = await waitForServer(STARTUP_ORIGINS)
  if (!ready) {
    console.error(`Dev server did not start within ${Math.round(DEV_SERVER_START_TIMEOUT_MS / 1000)}s`)
    process.exit(1)
  }
}

function restartRemoteDevServer() {
  console.log('Restarting remote dev server on adagio:5250...')
  const result = spawnAdagioCompose([
    '-f',
    'compose.yml',
    '-f',
    'compose.dev.yml',
    'up',
    '-d',
    '--build',
    '--force-recreate',
    'frontend-dev',
  ])

  if (result.status !== 0) {
    const stderr = result.stderr?.toString().trim()
    if (stderr) {
      console.warn(stderr)
    }
    return false
  }

  return true
}

function restartRemoteProdServer() {
  console.log('Restarting remote prod server on adagio:5200...')
  const result = spawnAdagioCompose([
    'up',
    '-d',
    '--build',
    '--force-recreate',
    'frontend-prod',
  ])

  if (result.status !== 0) {
    const stderr = result.stderr?.toString().trim()
    if (stderr) {
      console.warn(stderr)
    }
    return false
  }

  return true
}

async function restartServerFor(origin) {
  const hostname = getOriginHostname(origin)
  const port = getOriginPort(origin)

  if (hostname === 'adagio.local' && port === String(LOCAL_DEV_PORT)) {
    return restartRemoteDevServer()
  }

  if (hostname === 'adagio.local' && port === getOriginPort(PROD_ORIGIN)) {
    return restartRemoteProdServer()
  }

  if (hostname === '127.0.0.1' || hostname === 'localhost') {
    cleanupForbiddenLocalPorts()
    await launchLocalDevServer()
    return true
  }

  return false
}

async function openFilesWithRecovery(origin) {
  let currentOrigin = origin
  let lastData = { opened: 0, errors: [] }
  let errorCount = 0

  while (errorCount < MAX_SERVER_ERRORS) {
    const healthy = await isServerReady(currentOrigin)
    if (!healthy) {
      const restarted = await restartServerFor(currentOrigin)
      if (restarted) {
        const ready = await waitForServer([currentOrigin])
        if (!ready) {
          errorCount += 1
          lastData = { opened: 0, errors: [`Healthcheck failed for ${currentOrigin}`] }
          continue
        }
      } else {
        errorCount += 1
        lastData = { opened: 0, errors: [`Server unavailable: ${currentOrigin}`] }
        continue
      }
    }

    const data = await openFilesAt(currentOrigin)
    lastData = data

    if (isSuccessfulOpen(data)) {
      return { ok: true, origin: currentOrigin, data }
    }

    errorCount += 1
    if (errorCount >= MAX_SERVER_ERRORS) {
      break
    }

    const restarted = await restartServerFor(currentOrigin)
    if (restarted) {
      await waitForServer([currentOrigin])
    }
  }

  return { ok: false, origin: currentOrigin, data: lastData, errorCount }
}

// Probe candidate origins (in order) via the /api/ping heartbeat and send to
// the first live MDE. If none respond, cold-start a local dev server so a
// right-click still works (preserves the mdeo cold-open behaviour).
const candidateOrigins = getCandidateOrigins()
let activeBaseUrl = await resolveReadyOrigin(candidateOrigins)

if (!activeBaseUrl) {
  console.log(
    `No running MDE on candidate origins (${candidateOrigins.join(', ')}); starting local dev server...`,
  )
  await launchLocalDevServer()
  activeBaseUrl = await resolveReadyOrigin([LOCAL_DEV_ORIGIN]) ?? LOCAL_DEV_ORIGIN
}

let result = await openFilesWithRecovery(activeBaseUrl)

const data = result.data
activeBaseUrl = result.origin

const browserResult = openBrowser(activeBaseUrl)
if (browserResult.status !== 0) {
  console.warn(`Could not open browser automatically for ${activeBaseUrl}`)
}

if (!result.ok) {
  for (const err of data.errors ?? []) console.error(err)
  for (const err of errors) console.error(err)
  console.error(`Failed to open files after ${result.errorCount ?? MAX_SERVER_ERRORS} error(s)`)
  process.exit(1)
}

if (data.errors && data.errors.length > 0) {
  for (const err of data.errors) console.error(err)
}
for (const err of errors) console.error(err)
console.log(`Opened ${data.opened ?? 0} file(s) in mdeditor`)
