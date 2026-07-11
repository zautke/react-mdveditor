import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { openKvStore } from './db.ts'

function readTables(dbPath) {
  const db = new DatabaseSync(dbPath)
  try {
    return db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map(row => row.name)
  } finally {
    db.close()
  }
}

function readColumns(dbPath, table) {
  const db = new DatabaseSync(dbPath)
  try {
    return db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name)
  } finally {
    db.close()
  }
}

function seedLegacyState(dbPath) {
  const db = new DatabaseSync(dbPath)
  try {
    db.exec('CREATE TABLE state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);')
    const insert = db.prepare('INSERT INTO state (key, value, updated_at) VALUES (?, ?, ?)')
    insert.run(
      'documents',
      JSON.stringify([
        {
          id: 'doc-1',
          title: 'Persisted Doc',
          content: '# Hello',
          kind: 'markdown',
          filePath: '/tmp/hello.md',
        },
        {
          id: 'doc-2',
          title: 'Scratch',
          content: 'scratch',
          kind: 'markdown',
        },
      ]),
      1000,
    )
    insert.run('activeDocId', JSON.stringify('doc-1'), 1001)
    insert.run('isExpanded', JSON.stringify(true), 1002)
    insert.run('userSettings', JSON.stringify({ theme: 'dark' }), 1003)
  } finally {
    db.close()
  }
}

function readRows(dbPath, sql) {
  const db = new DatabaseSync(dbPath)
  try {
    return db.prepare(sql).all().map(row => ({ ...row }))
  } finally {
    db.close()
  }
}

const tempDir = mkdtempSync(join(tmpdir(), 'mdeditor-schema-'))

try {
  const dbPath = join(tempDir, 'mdeditor.db')
  seedLegacyState(dbPath)

  const store = openKvStore(dbPath)
  try {
    const tables = readTables(dbPath)
    assert.deepEqual(tables, ['documents', 'state', 'ui_state', 'user_settings'])

    assert.deepEqual(readColumns(dbPath, 'documents'), [
      'id',
      'title',
      'persisted_to_file_system',
      'filepath',
      'kind',
      'content',
      'position',
      'updated_at',
    ])
    assert.deepEqual(readColumns(dbPath, 'ui_state'), ['id', 'active_doc_id', 'is_expanded', 'updated_at'])
    assert.deepEqual(readColumns(dbPath, 'user_settings'), ['id', 'value', 'updated_at'])

    const state = store.getAll()
    assert.equal(state.activeDocId, 'doc-1')
    assert.equal(state.isExpanded, true)
    assert.deepEqual(state.userSettings, { theme: 'dark' })
    assert.equal(state.documents.length, 2)
    assert.equal(state.documents[0].persistedToFileSystem, true)
    assert.equal(state.documents[0].filePath, '/tmp/hello.md')
    assert.equal(state.documents[1].persistedToFileSystem, false)

    assert.deepEqual(
      readRows(
        dbPath,
        'SELECT id, persisted_to_file_system, filepath, kind, content, position FROM documents ORDER BY position',
      ),
      [
        {
          id: 'doc-1',
          persisted_to_file_system: 1,
          filepath: '/tmp/hello.md',
          kind: 'markdown',
          content: '# Hello',
          position: 0,
        },
        {
          id: 'doc-2',
          persisted_to_file_system: 0,
          filepath: null,
          kind: 'markdown',
          content: 'scratch',
          position: 1,
        },
      ],
    )

    store.upsert('documents', [
      {
        id: 'doc-3',
        title: 'Saved',
        persistedToFileSystem: true,
        filePath: '/tmp/saved.md',
        kind: 'markdown',
        content: 'saved',
      },
    ])
    store.upsert('activeDocId', 'doc-3')
    store.upsert('isExpanded', false)
    store.upsert('userSettings', { fontSize: 16 })

    assert.deepEqual(store.getAll(), {
      documents: [
        {
          id: 'doc-3',
          title: 'Saved',
          persistedToFileSystem: true,
          filePath: '/tmp/saved.md',
          kind: 'markdown',
          content: 'saved',
        },
      ],
      activeDocId: 'doc-3',
      isExpanded: false,
      userSettings: { fontSize: 16 },
    })

    store.remove('activeDocId')
    assert.equal(store.getAll().activeDocId, '')
  } finally {
    store.close()
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
