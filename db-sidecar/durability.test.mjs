/**
 * Crash durability and backup placement.
 *
 * These lock the two infrastructure defects that made the persistence layer's
 * safety net imaginary:
 *
 *  - the database directory (not the .db file alone) must hold everything, so the
 *    rollback journal is recoverable after a hard kill;
 *  - snapshots must land in the configured backup directory, which is inside the
 *    host bind mount. They used to default into the container's writable layer,
 *    where every `docker compose down` destroyed them.
 */

import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { cleanupDir, doc, makeTempDir, startSidecar } from './test-helpers.mjs'

function readDb(dbPath, fn) {
  const db = new DatabaseSync(dbPath, { readOnly: true })
  try {
    return fn(db)
  } finally {
    db.close()
  }
}

test('committed documents survive SIGKILL and a restart on the same directory', async () => {
  const directory = makeTempDir()
  const documents = Array.from({ length: 10 }, (_, i) => doc(`doc-${i}`, `body-${i}`))

  try {
    const first = await startSidecar({ directory })
    const write = await first.putState('documents', documents)
    assert.equal(write.status, 200)
    await first.putState('activeDocId', 'doc-7')

    // SIGKILL, not SIGTERM: the point is that durability must not depend on the
    // shutdown handler getting a chance to run.
    await first.kill('SIGKILL')

    const second = await startSidecar({ directory })
    try {
      const { body } = await second.getState()
      assert.equal(body.documents.length, 10)
      assert.deepEqual(body.documents.map(d => d.id), documents.map(d => d.id))
      assert.deepEqual(body.documents.map(d => d.content), documents.map(d => d.content))
      assert.equal(body.activeDocId, 'doc-7')

      const integrity = readDb(
        second.dbPath,
        db => db.prepare('PRAGMA integrity_check').get().integrity_check,
      )
      assert.equal(integrity, 'ok')

      // A rollback journal left behind means the previous process died mid
      // transaction and nothing rolled it back — the exact state that corrupts.
      assert.equal(
        existsSync(`${second.dbPath}-journal`),
        false,
        'a hot journal must not survive a clean reopen',
      )
    } finally {
      await second.close()
    }
  } finally {
    cleanupDir(directory)
  }
})

test('journal mode stays DELETE and synchronous stays FULL', async () => {
  const sidecar = await startSidecar()
  try {
    await sidecar.putState('documents', [doc('a')])
    const pragmas = readDb(sidecar.dbPath, db => ({
      journal: db.prepare('PRAGMA journal_mode').get().journal_mode,
      sync: db.prepare('PRAGMA synchronous').get().synchronous,
    }))
    // WAL is the tempting "upgrade" and it is wrong here: its -shm shared-memory
    // mmap is precisely what breaks over a Docker Desktop bind mount.
    assert.equal(pragmas.journal, 'delete')
    assert.equal(pragmas.sync, 2, 'synchronous must be FULL for crash durability')
  } finally {
    await sidecar.close()
  }
})

test('a startup snapshot lands in the configured backup directory and is readable', async () => {
  const directory = makeTempDir()
  try {
    const first = await startSidecar({ directory })
    await first.putState('documents', [doc('kept'), doc('also-kept')])
    await first.close()

    // Restarting takes a fresh snapshot, which must contain the documents written
    // by the previous process.
    const second = await startSidecar({ directory })
    try {
      assert.match(second.output, /backup written/)

      const snapshots = readdirSync(second.backupDir).filter(n => n.endsWith('.db'))
      assert.ok(snapshots.length >= 1, `expected a snapshot in ${second.backupDir}`)

      const newest = snapshots.sort().at(-1)
      const ids = readDb(join(second.backupDir, newest), db =>
        db.prepare('SELECT id FROM documents ORDER BY position').all().map(r => r.id),
      )
      assert.deepEqual(ids, ['kept', 'also-kept'])
    } finally {
      await second.close()
    }
  } finally {
    cleanupDir(directory)
  }
})

test('snapshots live beside the database, not in a disposable location', async () => {
  const sidecar = await startSidecar()
  try {
    const health = await (await fetch(`${sidecar.baseUrl}/health`)).json()
    assert.equal(health.backupDir, sidecar.backupDir)
    assert.equal(health.dbPath, sidecar.dbPath)
    assert.ok(health.dbFileId, 'health must expose the database file identity')
  } finally {
    await sidecar.close()
  }
})
