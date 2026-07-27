/**
 * Storage schema and the legacy `state` KV → normalized tables migration.
 *
 * This was the richest persistence test in the repo and it ran nowhere: it used
 * bare top-level asserts (so the first failure aborted the file with no
 * attribution) and it was not listed in any package.json script, Makefile target
 * or CI job. It is now wrapped in `node:test` cases and wired into `pnpm test`.
 */

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test, { after, before } from 'node:test'
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

function readRows(dbPath, sql) {
  const db = new DatabaseSync(dbPath)
  try {
    return db.prepare(sql).all().map(row => ({ ...row }))
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

let tempDir
let dbPath
let store

before(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'mdeditor-schema-'))
  dbPath = join(tempDir, 'mdeditor.db')
  seedLegacyState(dbPath)
  store = openKvStore(dbPath)
})

after(() => {
  store?.close()
  rmSync(tempDir, { recursive: true, force: true })
})

test('opening a legacy database creates the normalized tables alongside it', () => {
  assert.deepEqual(readTables(dbPath), ['documents', 'meta', 'state', 'ui_state', 'user_settings'])
})

test('table shapes are stable', () => {
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
  assert.deepEqual(readColumns(dbPath, 'meta'), ['id', 'revision'])
})

test('legacy KV state is migrated into the normalized tables', () => {
  const state = store.getAll()
  assert.equal(state.activeDocId, 'doc-1')
  assert.equal(state.isExpanded, true)
  assert.deepEqual(state.userSettings, { theme: 'dark' })
  assert.equal(state.documents.length, 2)
})

test('persistedToFileSystem is derived from the presence of a file path', () => {
  const state = store.getAll()
  assert.equal(state.documents[0].persistedToFileSystem, true)
  assert.equal(state.documents[0].filePath, '/tmp/hello.md')
  assert.equal(state.documents[1].persistedToFileSystem, false)
})

test('migrated rows keep their order and null out an absent file path', () => {
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
})

test('upsert replaces the document set wholesale and round-trips every key', () => {
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

  const state = store.getAll()
  assert.equal(typeof state.__revision, 'number')
  delete state.__revision

  assert.deepEqual(state, {
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
})

test('the revision advances on every document write', () => {
  const before = store.getAll().__revision
  store.upsert('documents', [
    { id: 'doc-4', title: 'Next', kind: 'markdown', content: 'next' },
  ])
  assert.equal(store.getAll().__revision, before + 1)
})

test('a write built on a stale revision is rejected', () => {
  const current = store.getAll().__revision
  assert.throws(
    () => store.upsert('documents', [{ id: 'doc-5', title: 'X', kind: 'markdown', content: 'x' }], current - 1),
    /stale revision/,
  )
  // ...and the rejected write changed nothing.
  assert.deepEqual(store.getAll().documents.map(d => d.id), ['doc-4'])
})

test('removing the whole document set is refused while documents exist', () => {
  assert.throws(() => store.remove('documents'), /refusing to delete/)
  assert.equal(store.getAll().documents.length, 1)
})

test('remove clears a scalar key', () => {
  store.remove('activeDocId')
  assert.equal(store.getAll().activeDocId, '')
})
