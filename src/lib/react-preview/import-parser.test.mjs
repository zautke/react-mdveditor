/**
 * Import specifier extraction for the React preview.
 *
 * This is the gate that decides which packages get fetched from the CDN, and
 * (via `isBareSpecifier`) which imports the compiler still refuses. Getting it
 * wrong either silently drops a package the user imported or resurrects the
 * blanket "only React imports are supported" refusal.
 *
 * Runs under plain `node --test`. `import-parser.ts` imports nothing.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { extractImportSpecifiers, isBareSpecifier } from './import-parser.ts'

test('extracts bare package names from every import form', () => {
  const code = [
    "import React from 'react'",
    "import confetti from 'canvas-confetti'",
    "import { Camera } from 'lucide-react'",
    "import * as d3 from 'd3'",
    "import 'some-side-effect-pkg'",
    "export { Thing } from 're-exported-pkg'",
    "export * from 'star-exported-pkg'",
  ].join('\n')

  assert.deepEqual(extractImportSpecifiers(code).sort(), [
    'canvas-confetti',
    'd3',
    'lucide-react',
    're-exported-pkg',
    'some-side-effect-pkg',
    'star-exported-pkg',
  ])
})

test('normalizes deep and scoped specifiers to the package root', () => {
  const code = [
    "import { X } from '@radix-ui/react-icons'",
    "import { Y } from '@scope/pkg/deep/path'",
    "import { Z } from 'pkg/deep/path'",
  ].join('\n')

  assert.deepEqual(extractImportSpecifiers(code).sort(), [
    '@radix-ui/react-icons',
    '@scope/pkg',
    'pkg',
  ])
})

test('excludes runtime built-ins and non-package specifiers', () => {
  const code = [
    "import React from 'react'",
    "import ReactDOM from 'react-dom'",
    "import { createRoot } from 'react-dom/client'",
    "import { local } from './local-file'",
    "import { up } from '../parent'",
    "import { abs } from '/absolute'",
    "import data from 'data:text/javascript,export default 1'",
    "import remote from 'https://example.com/mod.js'",
  ].join('\n')

  assert.deepEqual(extractImportSpecifiers(code), [])
})

test('deduplicates repeated imports of the same package', () => {
  const code = [
    "import { A } from 'lucide-react'",
    "import { B } from 'lucide-react/icons'",
    "import { C } from 'lucide-react'",
  ].join('\n')

  assert.deepEqual(extractImportSpecifiers(code), ['lucide-react'])
})

test('is not confused by repeated calls (global regex lastIndex is reset)', () => {
  const code = "import confetti from 'canvas-confetti'"
  assert.deepEqual(extractImportSpecifiers(code), ['canvas-confetti'])
  assert.deepEqual(extractImportSpecifiers(code), ['canvas-confetti'])
  assert.deepEqual(extractImportSpecifiers(code), ['canvas-confetti'])
})

test('a side-effect import does not swallow the statement after it', () => {
  // Regression: with a greedy optional clause group the engine crossed the
  // newline looking for `from`, consumed both statements as one match, and
  // dropped the side-effect package entirely.
  const code = ["import 'side-effect-pkg'", "import { Thing } from 'next-pkg'"].join('\n')
  assert.deepEqual(extractImportSpecifiers(code).sort(), ['next-pkg', 'side-effect-pkg'])
})

test('handles multi-line import clauses', () => {
  const code = [
    'import {',
    '  Camera,',
    '  Aperture,',
    "} from 'lucide-react'",
    'import {',
    '  scaleLinear,',
    "} from 'd3-scale'",
  ].join('\n')
  assert.deepEqual(extractImportSpecifiers(code).sort(), ['d3-scale', 'lucide-react'])
})

test('ignores dynamic import(), which is not statically resolvable', () => {
  const code = "const mod = await import('lazy-pkg')"
  assert.deepEqual(extractImportSpecifiers(code), [])
})

test('isBareSpecifier separates npm packages from paths and built-ins', () => {
  for (const bare of ['lucide-react', '@scope/pkg', 'd3']) {
    assert.equal(isBareSpecifier(bare), true, `${bare} should be bare`)
  }
  for (const notBare of [
    './local',
    '../parent',
    '/absolute',
    'data:text/javascript,1',
    'https://example.com/m.js',
    'react',
    'react-dom',
    'react-dom/client',
  ]) {
    assert.equal(isBareSpecifier(notBare), false, `${notBare} should not be bare`)
  }
})
