/**
 * mdeditor persistence sidecar — a tiny HTTP server over a SQLite KV store.
 *
 * Runs on Node 22.13+ with zero dependencies: `node:http` + `node:sqlite`,
 * executed directly as TypeScript via Node's built-in type stripping
 * (`node server.ts`). The frontend reaches it through the `/api/db` proxy
 * (Vite dev proxy + nginx prod), so all calls are same-origin.
 *
 * Routes (after the proxy strips the `/api/db` prefix):
 *   GET    /health           → { ok: true }
 *   GET    /state            → { [key]: <parsed JSON value> }   (one-call hydration)
 *   PUT    /state/:key  body { value }  → { ok: true }          (upsert)
 *   DELETE /state/:key       → { ok: true }
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  DestructiveWriteError,
  InvalidPayloadError,
  StaleRevisionError,
  openKvStore,
} from './db.ts'
import { snapshotDir, startBackups } from './backup.ts'

const PORT = Number.parseInt(
  process.env.MDE_DB_SIDECAR_INTERNAL_PORT ?? process.env.MDE_DB_SIDECAR_PORT ?? '15280',
  10,
)
const HOST = process.env.MDE_DB_SIDECAR_HOST ?? '0.0.0.0'
const DB_PATH =
  process.env.MDE_DB_PATH ?? fileURLToPath(new URL('./data/mdeditor.db', import.meta.url))

const store = openKvStore(DB_PATH)
const instanceId = randomUUID()
const startedAt = Date.now()

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: unknown) => {
      body += String(chunk)
      if (body.length > 50 * 1024 * 1024) {
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function sendEvent(res: ServerResponse, event: string, body: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(body)}\n\n`)
}

function healthPayload() {
  store.health()
  // dbFileId is the host inode identity of the database. Two origins reporting the
  // same instanceId AND the same dbFileId is the proof that prod and dev are on one
  // shared persistence source rather than two look-alike databases.
  const stat = statSync(DB_PATH)
  return {
    ok: true,
    status: 'ready',
    database: 'ready',
    instanceId,
    startedAt,
    dbPath: DB_PATH,
    dbFileId: `${stat.dev}:${stat.ino}`,
    backupDir: snapshotDir(DB_PATH),
  }
}

function streamEvents(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write('retry: 250\n\n')
  sendEvent(res, 'ready', healthPayload())

  const heartbeat = setInterval(() => {
    try {
      sendEvent(res, 'heartbeat', healthPayload())
    } catch {
      clearInterval(heartbeat)
      res.end()
    }
  }, 1_000)

  req.on('close', () => clearInterval(heartbeat))
}

/** Extract a single state key from `/state/<key>`, URL-decoded. Null if not that shape. */
function stateKey(pathname: string): string | null {
  const match = pathname.match(/^\/state\/(.+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const method = req.method ?? 'GET'
    const url = new URL(req.url ?? '/', 'http://localhost')
    const pathname = url.pathname

    if (method === 'GET' && pathname === '/health') {
      try {
        sendJson(res, 200, healthPayload())
      } catch (err) {
        sendJson(res, 503, {
          ok: false,
          status: 'unavailable',
          database: 'unavailable',
          error: err instanceof Error ? err.message : 'Database unavailable',
        })
      }
      return
    }

    if (method === 'GET' && pathname === '/events') {
      streamEvents(req, res)
      return
    }

    if (method === 'GET' && pathname === '/state') {
      sendJson(res, 200, store.getAll())
      return
    }

    const key = stateKey(pathname)

    // POST is accepted as an alias for PUT: navigator.sendBeacon (used to flush the
    // last edits on page hide) can only issue POST.
    if ((method === 'PUT' || method === 'POST') && key !== null) {
      const raw = await readBody(req)
      let parsed: { value?: unknown; revision?: unknown }
      try {
        parsed = raw ? (JSON.parse(raw) as { value?: unknown; revision?: unknown }) : {}
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON body' })
        return
      }
      // `revision` is optional: when present the documents write is conditional on
      // nobody else having written since the client last read.
      const expectedRevision =
        typeof parsed.revision === 'number' ? parsed.revision : undefined
      store.upsert(key, parsed.value ?? null, expectedRevision)
      sendJson(res, 200, { ok: true, revision: (store.getAll() as { __revision: number }).__revision })
      return
    }

    if (method === 'DELETE' && key !== null) {
      store.remove(key)
      sendJson(res, 200, { ok: true })
      return
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (err) {
    if (err instanceof InvalidPayloadError) {
      sendJson(res, 400, { error: err.message, code: 'invalid_payload' })
      return
    }
    // A write rejected as unsafe is a client-correctable conflict, not a server fault.
    if (err instanceof DestructiveWriteError) {
      sendJson(res, 409, { error: err.message, code: 'destructive_write_rejected' })
      return
    }
    // Somebody else wrote first. The client re-reads and merges rather than retrying.
    if (err instanceof StaleRevisionError) {
      sendJson(res, 409, {
        error: err.message,
        code: 'stale_revision',
        revision: err.current,
      })
      return
    }
    sendJson(res, 500, { error: err instanceof Error ? err.message : 'Internal error' })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[db-sidecar] listening on http://${HOST}:${PORT} (db: ${DB_PATH})`)
  startBackups(DB_PATH)
})

function shutdown(): void {
  server.close(() => {
    store.close()
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
