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

const importMap: Record<string, unknown> = {
  react: React,
}

// ── Assembled scope ─────────────────────────────────────────────────

export const defaultScope: Scope = {
  ...reactGlobals,
  import: importMap,
}

// ── Dynamic scope builder ───────────────────────────────────────────
// Extends the default scope with CDN-loaded external packages.

const NATIVE_PACKAGES = new Set(['react', 'react-dom'])

/**
 * Builds a scope that includes dynamically loaded external packages.
 *
 * Packages already in the default scope (react) are skipped.
 * CDN results are cached in `cdn.ts`, so repeated calls are cheap.
 *
 * @returns Extended scope with external packages in the import map,
 *          plus an array of any packages that failed to load.
 */
export async function buildScope(
  packages: string[],
): Promise<{ scope: Scope; errors: string[] }> {
  const externalImports: Record<string, unknown> = {}
  const errors: string[] = []

  const toLoad = packages.filter((p) => !NATIVE_PACKAGES.has(p))
  if (toLoad.length === 0) return { scope: defaultScope, errors }

  const results = await Promise.allSettled(
    toLoad.map(async (pkg) => {
      const mod = await loadFromCdn(pkg)
      return { pkg, mod }
    }),
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
    scope: {
      ...reactGlobals,
      import: { ...importMap, ...externalImports },
    },
    errors,
  }
}
