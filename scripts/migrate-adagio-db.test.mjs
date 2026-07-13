import assert from 'node:assert/strict'
import test from 'node:test'
import { parseOptions } from './migrate-adagio-db.mjs'

test('requires named migration arguments and supports short and long forms', () => {
  assert.deepEqual(
    parseOptions(['--source', '/tmp/mdeditor.db', '--host', 'adagio', '--destination', 'C:/data/mdeditor.db']),
    { source: '/tmp/mdeditor.db', host: 'adagio', destination: 'C:/data/mdeditor.db' },
  )
  assert.deepEqual(
    parseOptions(['-s', '/tmp/mdeditor.db', '-r', 'adagio', '-d', 'C:/data/mdeditor.db']),
    { source: '/tmp/mdeditor.db', host: 'adagio', destination: 'C:/data/mdeditor.db' },
  )
  assert.throws(() => parseOptions(['unexpected']), /Unknown argument/)
})
