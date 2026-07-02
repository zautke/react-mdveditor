/**
 * SQLite key-value store for the mdeditor persistence sidecar.
 *
 * Uses Node's built-in `node:sqlite` (DatabaseSync) — no native build, no
 * third-party dependency. One table, `state(key, value, updated_at)`, where
 * `value` is a JSON string. This mirrors the former localStorage layout 1:1
 * (keys: documents, activeDocId, isExpanded, userSettings).
 */

import { DatabaseSync } from 'node:sqlite'
import { dirname } from 'node:path'
import { mkdirSync } from 'node:fs'

export interface KvStore {
  /** Every persisted key mapped to its JSON-parsed value. */
  getAll(): Record<string, unknown>
  /** Insert or replace one key. */
  upsert(key: string, value: unknown): void
  /** Delete one key (no-op if absent). */
  remove(key: string): void
  /** Close the underlying database handle. */
  close(): void
}

interface StateRow {
  key: string
  value: string
}

export function openKvStore(dbPath: string): KvStore {
  mkdirSync(dirname(dbPath), { recursive: true })

  // `timeout` waits on a locked database instead of failing immediately.
  const db = new DatabaseSync(dbPath, { timeout: 5000 })
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA busy_timeout = 5000;')
  db.exec(
    'CREATE TABLE IF NOT EXISTS state (' +
      'key TEXT PRIMARY KEY, ' +
      'value TEXT NOT NULL, ' +
      'updated_at INTEGER NOT NULL' +
      ');',
  )

  const selectAll = db.prepare('SELECT key, value FROM state')
  const upsertStmt = db.prepare(
    'INSERT INTO state (key, value, updated_at) VALUES (?, ?, ?) ' +
      'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
  )
  const deleteStmt = db.prepare('DELETE FROM state WHERE key = ?')

  return {
    getAll() {
      const rows = selectAll.all() as unknown as StateRow[]
      const out: Record<string, unknown> = {}
      for (const row of rows) {
        try {
          out[row.key] = JSON.parse(row.value)
        } catch {
          out[row.key] = null
        }
      }
      return out
    },

    upsert(key, value) {
      upsertStmt.run(key, JSON.stringify(value), Date.now())
    },

    remove(key) {
      deleteStmt.run(key)
    },

    close() {
      db.close()
    },
  }
}
