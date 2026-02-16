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
