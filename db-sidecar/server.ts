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
import { fileURLToPath } from 'node:url'
import { DestructiveWriteError, openKvStore } from './db.ts'
import { startBackups } from './backup.ts'

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
  return {
    ok: true,
    status: 'ready',
    database: 'ready',
    instanceId,
    startedAt,
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
      let parsed: { value?: unknown }
      try {
        parsed = raw ? (JSON.parse(raw) as { value?: unknown }) : {}
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON body' })
        return
      }
      store.upsert(key, parsed.value ?? null)
      sendJson(res, 200, { ok: true })
      return
    }

    if (method === 'DELETE' && key !== null) {
      store.remove(key)
      sendJson(res, 200, { ok: true })
      return
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (err) {
    // A write rejected as unsafe is a client-correctable conflict, not a server fault.
    if (err instanceof DestructiveWriteError) {
      sendJson(res, 409, { error: err.message, code: 'destructive_write_rejected' })
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
