/**
 * Rotating SQLite snapshots — the safety net under the persistence layer.
 *
 * Uses `VACUUM INTO`, not a file copy: the database runs in WAL mode, so a bare
 * `cp` of the .db captures a stale page image and silently loses everything still
 * living in the -wal file. `VACUUM INTO` writes a consistent, fully-checkpointed
 * snapshot in one statement.
 *
 * Snapshots land next to the database in `<dbdir>/backups/` (inside the named
 * docker volume, so they survive container recreate). The newest MAX_SNAPSHOTS
 * are kept; older ones are pruned.
 */

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'

const MAX_SNAPSHOTS = 10
const INTERVAL_MS = 6 * 60 * 60 * 1000 // every 6 hours
const PREFIX = 'mdeditor-'
const SUFFIX = '.db'

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

/** Write one consistent snapshot. Returns its path, or null if it could not be taken. */
export function takeSnapshot(dbPath: string): string | null {
  const dir = join(dirname(dbPath), 'backups')
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
