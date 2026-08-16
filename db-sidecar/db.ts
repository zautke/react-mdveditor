/**
 * SQLite persistence store for the mdeditor sidecar.
 *
 * The HTTP API stays compatible with the former localStorage-shaped keys, but
 * the database is normalized into app-owned tables:
 *   documents(id, title, persisted_to_file_system, filepath, kind, content, ...)
 *   ui_state(active_doc_id, is_expanded)
 *   user_settings(value)
 *
 * A legacy `state` KV table is still created/read for one-time migration from
 * older installs.
 */

import { DatabaseSync } from 'node:sqlite'
import { dirname } from 'node:path'
import { mkdirSync } from 'node:fs'

/**
 * Thrown when a write would destroy existing data in a way no legitimate user
 * action produces (today: an empty `documents` payload against a non-empty
 * table). The HTTP layer maps this to 409 so the client can tell the difference
 * between "rejected as unsafe" and a generic failure.
 */
export class DestructiveWriteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DestructiveWriteError'
  }
}

export interface KvStore {
  /** Every persisted key mapped to its app-facing value. */
  getAll(): Record<string, unknown>
  /** Insert or replace one app-facing key. */
  upsert(key: string, value: unknown): void
  /** Delete one app-facing key (no-op if absent). */
  remove(key: string): void
  /** Verify the underlying SQLite connection is usable. */
  health(): void
  /** Close the underlying database handle. */
  close(): void
}

interface LegacyStateRow {
  key: string
  value: string
}

interface DocumentInput {
  id: string
  title?: string
  persistedToFileSystem?: boolean
  filePath?: string
  filepath?: string
  kind?: string
  content?: string
}

interface DocumentRow {
  id: string
  title: string
  persisted_to_file_system: number
  filepath: string | null
  kind: string
  content: string
}

interface UiStateRow {
  active_doc_id: string
  is_expanded: number
}

interface UserSettingsRow {
  value: string
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function normalizeDocument(value: unknown, position: number): DocumentInput | null {
  const doc = asRecord(value)
  if (!doc) return null

  const id = asString(doc.id, '')
  if (!id) return null

  const filePath = asString(doc.filePath, asString(doc.filepath, ''))
  const persistedToFileSystem =
    typeof doc.persistedToFileSystem === 'boolean' ? doc.persistedToFileSystem : filePath.length > 0

  return {
    id,
    title: asString(doc.title, `Untitled-${position + 1}`),
    persistedToFileSystem,
    filePath: filePath || undefined,
    kind: asString(doc.kind, 'markdown'),
    content: asString(doc.content, ''),
  }
}

function documentToJson(row: DocumentRow): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: row.id,
    title: row.title,
    persistedToFileSystem: row.persisted_to_file_system === 1,
    kind: row.kind,
    content: row.content,
  }
  if (row.filepath) out.filePath = row.filepath
  return out
}

function createSchema(db: DatabaseSync): void {
  db.exec(
    'CREATE TABLE IF NOT EXISTS documents (' +
      'id TEXT PRIMARY KEY, ' +
      'title TEXT NOT NULL, ' +
      'persisted_to_file_system INTEGER NOT NULL CHECK (persisted_to_file_system IN (0, 1)), ' +
      'filepath TEXT, ' +
      'kind TEXT NOT NULL, ' +
      'content TEXT NOT NULL, ' +
      'position INTEGER NOT NULL, ' +
      'updated_at INTEGER NOT NULL' +
      ');',
  )
  db.exec('CREATE INDEX IF NOT EXISTS documents_position_idx ON documents(position);')
  db.exec(
    'CREATE TABLE IF NOT EXISTS ui_state (' +
      'id INTEGER PRIMARY KEY CHECK (id = 1), ' +
      'active_doc_id TEXT NOT NULL DEFAULT \'\', ' +
      'is_expanded INTEGER NOT NULL DEFAULT 0 CHECK (is_expanded IN (0, 1)), ' +
      'updated_at INTEGER NOT NULL' +
      ');',
  )
  db.exec(
    'CREATE TABLE IF NOT EXISTS user_settings (' +
      'id INTEGER PRIMARY KEY CHECK (id = 1), ' +
      'value TEXT NOT NULL, ' +
      'updated_at INTEGER NOT NULL' +
      ');',
  )
  db.exec(
    'CREATE TABLE IF NOT EXISTS state (' +
      'key TEXT PRIMARY KEY, ' +
      'value TEXT NOT NULL, ' +
      'updated_at INTEGER NOT NULL' +
      ');',
  )
}

export function openKvStore(dbPath: string): KvStore {
  mkdirSync(dirname(dbPath), { recursive: true })

  // `timeout` waits on a locked database instead of failing immediately.
  const db = new DatabaseSync(dbPath, { timeout: 5000 })
  // The sidecar binds the exact database file into Docker. DELETE mode keeps all
  // durable state in that file rather than a container-local WAL sibling.
  db.exec('PRAGMA journal_mode = DELETE;')
  db.exec('PRAGMA busy_timeout = 5000;')
  createSchema(db)

  const documentCountStmt = db.prepare('SELECT COUNT(*) AS count FROM documents')
  const selectLegacyState = db.prepare('SELECT key, value FROM state')
  const selectDocuments = db.prepare(
    'SELECT id, title, persisted_to_file_system, filepath, kind, content FROM documents ORDER BY position, id',
  )
  const selectUiState = db.prepare(
    'SELECT active_doc_id, is_expanded FROM ui_state WHERE id = 1',
  )
  const selectUserSettings = db.prepare('SELECT value FROM user_settings WHERE id = 1')
  const deleteDocuments = db.prepare('DELETE FROM documents')
  const insertDocument = db.prepare(
    'INSERT INTO documents ' +
      '(id, title, persisted_to_file_system, filepath, kind, content, position, updated_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
      'ON CONFLICT(id) DO UPDATE SET ' +
      'title = excluded.title, ' +
      'persisted_to_file_system = excluded.persisted_to_file_system, ' +
      'filepath = excluded.filepath, ' +
      'kind = excluded.kind, ' +
      'content = excluded.content, ' +
      'position = excluded.position, ' +
      'updated_at = excluded.updated_at',
  )
  const upsertUiState = db.prepare(
    'INSERT INTO ui_state (id, active_doc_id, is_expanded, updated_at) VALUES (1, ?, ?, ?) ' +
      'ON CONFLICT(id) DO UPDATE SET ' +
      'active_doc_id = excluded.active_doc_id, ' +
      'is_expanded = excluded.is_expanded, ' +
      'updated_at = excluded.updated_at',
  )
  const upsertUserSettings = db.prepare(
    'INSERT INTO user_settings (id, value, updated_at) VALUES (1, ?, ?) ' +
      'ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
  )
  const deleteUserSettings = db.prepare('DELETE FROM user_settings WHERE id = 1')

  function writeDocuments(value: unknown): void {
    if (!Array.isArray(value)) return

    // Destructive-write guard. Persisting documents is a DELETE-then-INSERT, so an
    // empty payload would wipe every document. A client that lost its state (e.g. it
    // failed to hydrate because this sidecar was briefly unreachable) must never be
    // able to destroy the database that way — clearing every document is not a real
    // user action. Refuse it; the route turns this into a 409.
    if (value.length === 0) {
      const { count } = documentCountStmt.get() as { count: number }
      if (count > 0) {
        throw new DestructiveWriteError(
          `refusing to delete ${count} document(s) for an empty payload`,
        )
      }
    }

    const now = Date.now()
    db.exec('BEGIN')
    try {
      deleteDocuments.run()
      value.forEach((candidate, position) => {
        const doc = normalizeDocument(candidate, position)
        if (!doc) return
        const filePath = doc.filePath ?? null
        insertDocument.run(
          doc.id,
          doc.title ?? `Untitled-${position + 1}`,
          doc.persistedToFileSystem ? 1 : 0,
          filePath,
          doc.kind ?? 'markdown',
          doc.content ?? '',
          position,
          now,
        )
      })
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
  }

  function readLegacyState(): Record<string, unknown> {
    const rows = selectLegacyState.all() as unknown as LegacyStateRow[]
    const out: Record<string, unknown> = {}
    for (const row of rows) out[row.key] = parseJson(row.value)
    return out
  }

  function migrateLegacyState(): void {
    const countRow = documentCountStmt.get() as { count: number }
    const legacy = readLegacyState()

    if (countRow.count === 0 && Array.isArray(legacy.documents)) {
      writeDocuments(legacy.documents)
    }

    const existingUi = selectUiState.get() as unknown as UiStateRow | undefined
    if (!existingUi && ('activeDocId' in legacy || 'isExpanded' in legacy)) {
      upsertUiState.run(
        asString(legacy.activeDocId, ''),
        legacy.isExpanded === true ? 1 : 0,
        Date.now(),
      )
    }

    const existingSettings = selectUserSettings.get() as unknown as UserSettingsRow | undefined
    if (!existingSettings && legacy.userSettings !== undefined) {
      upsertUserSettings.run(JSON.stringify(legacy.userSettings), Date.now())
    }
  }

  migrateLegacyState()

  return {
    getAll() {
      const documents = (selectDocuments.all() as unknown as DocumentRow[]).map(documentToJson)
      const out: Record<string, unknown> = {}
      if (documents.length > 0) out.documents = documents

      const ui = selectUiState.get() as unknown as UiStateRow | undefined
      if (ui) {
        out.activeDocId = ui.active_doc_id
        out.isExpanded = ui.is_expanded === 1
      }

      const settings = selectUserSettings.get() as unknown as UserSettingsRow | undefined
      if (settings) out.userSettings = parseJson(settings.value)

      return out
    },

    upsert(key, value) {
      const now = Date.now()
      switch (key) {
        case 'documents':
          writeDocuments(value)
          return
        case 'activeDocId': {
          const ui = selectUiState.get() as unknown as UiStateRow | undefined
          upsertUiState.run(asString(value, ''), ui?.is_expanded ?? 0, now)
          return
        }
        case 'isExpanded': {
          const ui = selectUiState.get() as unknown as UiStateRow | undefined
          upsertUiState.run(ui?.active_doc_id ?? '', value === true ? 1 : 0, now)
          return
        }
        case 'userSettings':
          upsertUserSettings.run(JSON.stringify(value ?? {}), now)
          return
        default:
          return
      }
    },

    remove(key) {
      switch (key) {
        case 'documents':
          deleteDocuments.run()
          return
        case 'activeDocId': {
          const ui = selectUiState.get() as unknown as UiStateRow | undefined
          upsertUiState.run('', ui?.is_expanded ?? 0, Date.now())
          return
        }
        case 'isExpanded': {
          const ui = selectUiState.get() as unknown as UiStateRow | undefined
          upsertUiState.run(ui?.active_doc_id ?? '', 0, Date.now())
          return
        }
        case 'userSettings':
          deleteUserSettings.run()
          return
        default:
          return
      }
    },

    health() {
      db.prepare('SELECT 1').get()
    },

    close() {
      db.close()
    },
  }
}
