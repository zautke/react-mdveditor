/**
 * React Preview — Scope Configuration
 *
 * Centralised definition of everything available to user code
 * executed by react-runner.  Two sections:
 *
 * 1. **Direct globals** — available as bare identifiers (e.g. `useState`).
 * 2. **Import map** — enables `import { useState } from 'react'` syntax.
 *
 * To make a new package available, add it to both the import map AND
 * (optionally) the direct globals section.
 */

import * as React from 'react'
import * as ReactJsxRuntime from 'react/jsx-runtime'
import type { Scope } from 'react-runner'
import { loadFromCdn } from './cdn'

// ── Direct globals ──────────────────────────────────────────────────
// These are available as bare identifiers inside user code,
// e.g. `const [x, setX] = useState(0)` without an import.

const reactGlobals: Record<string, unknown> = {
  React,
  useState: React.useState,
  useEffect: React.useEffect,
  useRef: React.useRef,
  useMemo: React.useMemo,
  useCallback: React.useCallback,
  useContext: React.useContext,
  useReducer: React.useReducer,
  useId: React.useId,
  Fragment: React.Fragment,
  createElement: React.createElement,
  createContext: React.createContext,
  forwardRef: React.forwardRef,
  memo: React.memo,
  lazy: React.lazy,
  Suspense: React.Suspense,
}

// ── Import map ──────────────────────────────────────────────────────
// Enables `import X from 'pkg'` / `import { X } from 'pkg'`.
// react-runner resolves import specifiers against this map.

export const REACT_PREVIEW_ALLOWED_IMPORTS = ['react', 'react/jsx-runtime'] as const

const importMap: Record<(typeof REACT_PREVIEW_ALLOWED_IMPORTS)[number], unknown> = {
  react: React,
  'react/jsx-runtime': ReactJsxRuntime,
}

// ── Assembled scope ─────────────────────────────────────────────────

export const defaultScope: Scope = {
  ...reactGlobals,
  import: importMap,
}

// ── Dynamic scope builder ───────────────────────────────────────────
// Extends the default scope with packages fetched from the CDN at runtime,
// so user code can `import { X } from 'some-npm-package'`.

/** Provided by the runtime itself — never fetched from the CDN. */
const NATIVE_PACKAGES = new Set<string>(REACT_PREVIEW_ALLOWED_IMPORTS)

export interface BuiltScope {
  scope: Scope
  /** Human-readable messages for packages that failed to load. */
  errors: string[]
}

/**
 * Builds a scope whose import map also contains the requested external
 * packages, each resolved from the CDN.
 *
 * Packages the runtime already provides are skipped. `loadFromCdn` caches
 * and de-duplicates, so repeat calls for the same package are cheap.
 *
 * A package that fails to load does not fail the whole scope — it is
 * reported in `errors` and simply stays absent from the import map, so the
 * rest of the preview still renders.
 */
export async function buildScope(packages: string[]): Promise<BuiltScope> {
  const toLoad = packages.filter((pkg) => !NATIVE_PACKAGES.has(pkg))
  if (toLoad.length === 0) return { scope: defaultScope, errors: [] }

  const externalImports: Record<string, unknown> = {}
  const errors: string[] = []

  const results = await Promise.allSettled(
    toLoad.map(async (pkg) => ({ pkg, mod: await loadFromCdn(pkg) })),
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      externalImports[result.value.pkg] = result.value.mod
    } else {
      errors.push(
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
      )
    }
  }

  return {
    scope: { ...reactGlobals, import: { ...importMap, ...externalImports } },
    errors,
  }
}
