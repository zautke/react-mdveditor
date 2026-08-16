/**
 * CDN module interop for the React preview.
 *
 * The preview transpiles user code to CommonJS, so `import x from 'pkg'`
 * becomes `_interopRequireDefault(require('pkg')).default`. That helper only
 * reads `.default` when the value is flagged `__esModule`. A namespace object
 * from a real `import()` has no such flag, so without normalization every
 * default import silently resolved to the namespace object instead of the
 * export — which surfaced as "_clsx2.default.call is not a function".
 *
 * Runs under plain `node --test`. Only the pure helpers are exercised; the
 * network paths are not.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { CDN_BASE, cdnUrl, pinnedCdnUrl, withEsModuleInterop } from './cdn.ts'

/** Stands in for a real module namespace: frozen, no __esModule, has default. */
function fakeNamespace(exports) {
  return Object.freeze(
    Object.defineProperty({ ...exports }, Symbol.toStringTag, { value: 'Module' }),
  )
}

test('withEsModuleInterop flags namespaces so default imports unwrap', () => {
  const clsx = (...args) => args.filter(Boolean).join(' ')
  const ns = fakeNamespace({ default: clsx, clsx })

  assert.equal('__esModule' in ns, false, 'precondition: namespaces lack the flag')

  const interop = withEsModuleInterop(ns)
  assert.equal(interop.__esModule, true)
  assert.equal(typeof interop.default, 'function')
  assert.equal(interop.default('a', 'b'), 'a b')
})

test('withEsModuleInterop preserves named exports', () => {
  const ns = fakeNamespace({ Camera: { $$typeof: 'component' }, Aperture: {} })
  const interop = withEsModuleInterop(ns)

  assert.deepEqual(Object.keys(interop).sort(), ['Aperture', 'Camera', '__esModule'])
  assert.equal(interop.Camera.$$typeof, 'component')
})

test('withEsModuleInterop copies rather than mutating a frozen namespace', () => {
  const ns = fakeNamespace({ default: 1 })
  const interop = withEsModuleInterop(ns)

  assert.notEqual(interop, ns, 'must not return the frozen namespace itself')
  assert.equal('__esModule' in ns, false, 'original must be untouched')
})

test('withEsModuleInterop passes non-objects through untouched', () => {
  assert.equal(withEsModuleInterop(null), null)
  assert.equal(withEsModuleInterop(undefined), undefined)
  assert.equal(withEsModuleInterop(42), 42)
})

test('pinnedCdnUrl externalizes nothing and pins React', () => {
  const url = pinnedCdnUrl('clsx')
  assert.ok(url.startsWith(`${CDN_BASE}/clsx`), url)
  assert.ok(!url.includes('external='), 'externals would require an import map')
  assert.ok(url.includes('deps=react@'), url)
})

test('cdnUrl externalizes react by default', () => {
  assert.equal(cdnUrl('lucide-react'), `${CDN_BASE}/lucide-react?external=react,react-dom`)
})
