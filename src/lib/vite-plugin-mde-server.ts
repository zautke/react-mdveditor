import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

export interface MdeFileData {
  title: string
  content: string
  filePath: string
}

const pendingFiles: MdeFileData[] = []

/**
 * Heartbeat payload — the single source of truth for what a live MDE server
 * answers on its ping endpoints. Decoupled + reusable: any probe (the mde CLI
 * candidate-origin loop, a healthcheck, a load balancer) can rely on this exact
 * shape. `service: 'mde'` lets a prober distinguish MDE from an unrelated
 * server that happens to occupy the same port.
 */
export function mdeHeartbeat(): { ok: true; service: 'mde' } {
  return { ok: true, service: 'mde' }
}

function readFileSafe(filePath: string): MdeFileData | { error: string } {
  const abs = path.resolve(filePath)
  if (!fs.existsSync(abs)) return { error: `File not found: ${abs}` }
  const content = fs.readFileSync(abs, 'utf-8')
  const base = path.basename(abs)
  const dot = base.lastIndexOf('.')
  const title = dot > 0 ? base.slice(0, dot) : base
  return { title, content, filePath: abs }
}

export function mdeServerPlugin(): Plugin {
  return {
    name: 'mde-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url ?? ''

        if (req.method === 'GET' && url === '/ping') {
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('pong')
          return
        }

        // Heartbeat: the canonical endpoint the mde CLI probes across candidate
        // origins to find a live MDE before sending files.
        if (req.method === 'GET' && url === '/api/ping') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(mdeHeartbeat()))
          return
        }

        if (req.method === 'GET' && url === '/api/mde-status') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true }))
          return
        }

        if (req.method === 'GET' && url === '/api/mde-pending') {
          const files = pendingFiles.splice(0)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ files }))
          return
        }

        if (req.method === 'POST' && url === '/api/mde-open') {
          let body = ''
          req.on('data', (chunk: unknown) => { body += String(chunk) })
          req.on('end', () => {
            let filePaths: string[] = []
            try {
              const parsed = JSON.parse(body) as { filePaths?: unknown }
              if (Array.isArray(parsed.filePaths)) {
                filePaths = parsed.filePaths.filter((x): x is string => typeof x === 'string')
              }
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Invalid JSON' }))
              return
            }

            const files: MdeFileData[] = []
            const errors: string[] = []

            for (const fp of filePaths) {
              const result = readFileSafe(fp)
              if ('error' in result) {
                errors.push(result.error)
              } else {
                files.push(result)
                pendingFiles.push(result)
              }
            }

            if (files.length > 0) {
              server.ws.send({ type: 'custom', event: 'mde:open-files', data: { files } })
            }

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, opened: files.length, errors }))
          })
          return
        }

        next()
      })
    },
  }
}
