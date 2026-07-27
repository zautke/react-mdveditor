/**
 * Rotating SQLite snapshots — the safety net under the persistence layer.
 *
 * Uses `VACUUM INTO`, not a file copy. The database runs in `DELETE` journal mode
 * (see db.ts), so a bare `cp` can capture the file mid-transaction, with the
 * rollback journal's uncommitted pages still pending. `VACUUM INTO` writes a
 * transactionally consistent snapshot in one statement, without depending on
 * journal state or holding a long read lock.
 *
 * Snapshots land in `MDE_DB_BACKUP_DIR` (default `<dbdir>/backups/`), which is
 * inside the bind-mounted host directory `MDE_DB_DIR`. They are therefore visible
 * on the host, survive `docker compose down`/rebuild, and are untouched by
 * `down -v` — bind mounts are immune to volume pruning.
 *
 * They previously defaulted into the container's writable layer, so every
 * snapshot was destroyed by the next container recreate. Keep the directory
 * configurable and keep it under the bind.
 */

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'

function intFromEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const MAX_SNAPSHOTS = intFromEnv('MDE_DB_BACKUP_MAX', 10)
const INTERVAL_MS = intFromEnv('MDE_DB_BACKUP_INTERVAL_MS', 6 * 60 * 60 * 1000)
const PREFIX = 'mdeditor-'
const SUFFIX = '.db'

/** Where snapshots for `dbPath` are written. Exported so tests can assert placement. */
export function snapshotDir(dbPath: string): string {
  return process.env.MDE_DB_BACKUP_DIR ?? join(dirname(dbPath), 'backups')
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

/** Write one consistent snapshot. Returns its path, or null if it could not be taken. */
export function takeSnapshot(dbPath: string): string | null {
  const dir = snapshotDir(dbPath)
  const target = join(dir, `${PREFIX}${timestamp()}${SUFFIX}`)

  try {
    mkdirSync(dir, { recursive: true })
    const db = new DatabaseSync(dbPath, { readOnly: true })
    try {
      // Single-quote escaping: SQLite string literal.
      db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`)
    } finally {
      db.close()
    }
    prune(dir)
    return target
  } catch (err) {
    // A failed backup must never take the sidecar down — log and carry on.
    console.error(`[db-sidecar] backup failed: ${err instanceof Error ? err.message : err}`)
    return null
  }
}

/** Keep the newest MAX_SNAPSHOTS snapshots; delete the rest. */
function prune(dir: string): void {
  const snapshots = readdirSync(dir)
    .filter(name => name.startsWith(PREFIX) && name.endsWith(SUFFIX))
    .map(name => {
      const full = join(dir, name)
      return { full, mtime: statSync(full).mtimeMs }
    })
    .sort((a, b) => b.mtime - a.mtime)

  for (const stale of snapshots.slice(MAX_SNAPSHOTS)) {
    rmSync(stale.full, { force: true })
  }
}

/**
 * Snapshot on startup, then on a fixed interval. The timer is unref'd so it never
 * holds the process open on shutdown.
 */
export function startBackups(dbPath: string): void {
  const first = takeSnapshot(dbPath)
  if (first) console.log(`[db-sidecar] backup written: ${first}`)

  const timer = setInterval(() => takeSnapshot(dbPath), INTERVAL_MS)
  timer.unref()
}
