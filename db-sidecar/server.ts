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
import { fileURLToPath } from 'node:url'
import { openKvStore } from './db.ts'

const PORT = Number.parseInt(
  process.env.MDE_DB_SIDECAR_INTERNAL_PORT ?? process.env.MDE_DB_SIDECAR_PORT ?? '15280',
  10,
)
const HOST = process.env.MDE_DB_SIDECAR_HOST ?? '0.0.0.0'
const DB_PATH =
  process.env.MDE_DB_PATH ?? fileURLToPath(new URL('./data/mdeditor.db', import.meta.url))

const store = openKvStore(DB_PATH)

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
      sendJson(res, 200, { ok: true })
      return
    }

    if (method === 'GET' && pathname === '/state') {
      sendJson(res, 200, store.getAll())
      return
    }

    const key = stateKey(pathname)

    if (method === 'PUT' && key !== null) {
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
    sendJson(res, 500, { error: err instanceof Error ? err.message : 'Internal error' })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[db-sidecar] listening on http://${HOST}:${PORT} (db: ${DB_PATH})`)
})

function shutdown(): void {
  server.close(() => {
    store.close()
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
