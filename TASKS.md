# Rewind Tasks - 2026-04-13

## Restore Checkpoint

| ID | Task | Status |
|----|------|--------|
| RW-1 | Restore the pre-GSAP media zoom implementation with the original zoom/collapse backdrop experience | In Progress |
| RW-2 | Remove the later media-panel expansion (`Copy + Zoom/Collapse`) and restore the single zoom toggle baseline | In Progress |
| RW-3 | Remove the later Mermaid/Graphviz modal pan/zoom control cluster from the restored checkpoint | In Progress |
| RW-4 | Remove the later URL fetch hardening layer that was introduced after the "too fast" feedback | In Progress |

## Verify The Rewind

| ID | Task | Status |
|----|------|--------|
| RW-V-1 | Verify on `http://127.0.0.1:5200` that hover reveals `Zoom media` on eligible assets | In Progress |
| RW-V-2 | Verify in the live browser that clicking `Zoom media` opens a modal with a blurred backdrop | In Progress |
| RW-V-3 | Verify in the live browser that `Collapse media` returns the asset back to inline state | In Progress |
| RW-V-4 | Verify `pnpm typecheck` | Done |
| RW-V-5 | Verify `pnpm lint` | Done |

## Handoff

| ID | Task | Status |
|----|------|--------|
| RW-H-1 | Write the failure account, expected behavior, and exact timeline to `HANDOFF.md` | Pending |
| RW-H-2 | Update `PLANNING.md`, `TASKS.md`, and `SESSION_HISTORY.md` with the rewind record | In Progress |
| RW-H-3 | Mirror the rewind record and failure entry into Basic Memory, including `HOW-AGENTS-GET-FIRED` | Pending |

# Recovery Tasks - 2026-04-12

## Codeblock Recovery

| ID | Task | Status |
|----|------|--------|
| RCV-CB-1 | Add and keep a failing regression check for codeblock readability, gutter artifact removal, and line-number/code alignment | Pending |
| RCV-CB-2 | Restore block-code DOM/CSS isolation so inline-code rules no longer affect syntax-highlighted blocks | Pending |
| RCV-CB-3 | Simplify codeblock visuals to a single readable surface with transparent controls and no outline artifacts | Pending |
| RCV-CB-4 | Verify line-number gutter animation expands and collapses smoothly without baseline drift | Pending |

## Media Toolbar and Modal

| ID | Task | Status |
|----|------|--------|
| RCV-MD-1 | Add and keep a failing regression check for media hover controls, modal controls, and transition timing | Pending |
| RCV-MD-2 | Replace the current media transition implementation with GSAP-based transform/opacity choreography | Pending |
| RCV-MD-3 | Standardize media controls to `Copy + Zoom/Collapse` in the upper-right panel | Pending |
| RCV-MD-4 | Keep Radix modal semantics intact while locking repeated toggles during active transitions | Pending |
| RCV-MD-5 | Validate reduced-motion fallback and synchronized 400ms overlay timing | Pending |

## Diagram Interaction Controls

| ID | Task | Status |
|----|------|--------|
| RCV-DG-1 | Add and keep a failing regression check for modal Mermaid/Graphviz navigation controls | Pending |
| RCV-DG-2 | Implement shared modal SVG viewport plumbing with drag-to-pan and wheel-to-zoom | Pending |
| RCV-DG-3 | Add lower-right controls for pan up/down/left/right, zoom in/out, reset, and reload | Pending |
| RCV-DG-4 | Re-render Mermaid and Graphviz diagrams on reload and restore the initial fitted view | Pending |

## URL Fetch Hardening

| ID | Task | Status |
|----|------|--------|
| RCV-FE-1 | Add and keep a failing regression check for extractor success and extractor-unavailable messaging | Pending |
| RCV-FE-2 | Implement extractor endpoint probing and health caching in `url-fetch.ts` | Pending |
| RCV-FE-3 | Add explicit preview messaging when no healthy extractor backend exists | Pending |
| RCV-FE-4 | Verify sidecar fallback via `VITE_MDE_URL_SIDECAR_ORIGIN` and local direct-origin probing | Pending |

## Validation

| ID | Task | Status |
|----|------|--------|
| RCV-V-1 | Run `pnpm typecheck` | Pending |
| RCV-V-2 | Run `pnpm lint` | Pending |
| RCV-V-3 | Run `pnpm build` | Pending |
| RCV-V-4 | Run `node scripts/test-recovery-regressions.mjs` | Pending |

# Document Type Registry - Task Breakdown

## Task Dependency Graph

```
M0-1 ─┐
M0-2 ─┤
M0-3 ─┼─→ M1-1 → M1-2 → M1-3 → M1-4 ─→ M2-1 ─┐
M0-4 ─┤                                   M2-2 ─┼→ M2-3 → M2-4 ─→ M3-1 → M3-2 → M3-3 → M3-4 → M3-5 → M3-6 ─→ M4-* ─→ M5-*
M0-5 ─┘
```

---

## M0: Baseline Capture

| ID | Task | Assignee | Est. | Status | Depends |
|----|------|----------|------|--------|---------|
| M0-1 | Run `pnpm build` and record chunk sizes to `docs/implementation-evidence/baseline-build.txt` | QA Engineer | 5 min | Pending | - |
| M0-2 | Capture screenshots of markdown editing (new tab, typing, preview) | Browser Test Engineer | 10 min | Pending | - |
| M0-3 | Capture screenshots of mermaid rendering (code fence with mermaid diagram) | Browser Test Engineer | 10 min | Pending | - |
| M0-4 | Run `pnpm typecheck` and `pnpm lint`, record output | QA Engineer | 5 min | Pending | - |
| M0-5 | Create feature branch `feature/document-type-registry` | Registry Engineer | 2 min | Pending | - |

---

## M1: Registry Core

| ID | Task | Assignee | Est. | Status | Depends |
|----|------|----------|------|--------|---------|
| M1-1 | Create `src/lib/document-types/types.ts` with `DocumentTypePlugin` interface and `RendererProps` type | Registry Engineer | 30 min | Pending | M0-5 |
| M1-2 | Create `src/lib/document-types/registry.ts` with: `register()`, `detect()`, `get()`, `all()`, `allExtensions()`, `getByExtension()`, `_reset()` | Registry Engineer | 45 min | Pending | M1-1 |
| M1-3 | Create `src/lib/document-types/index.ts` barrel export (no plugins registered yet) | Registry Engineer | 10 min | Pending | M1-2 |
| M1-4 | Run `pnpm typecheck` -- verify zero errors | Registry Engineer | 5 min | Pending | M1-3 |

---

## M2: Plugin Definitions

| ID | Task | Assignee | Est. | Status | Depends |
|----|------|----------|------|--------|---------|
| M2-1 | Create `src/lib/document-types/plugins/markdown.ts`: plugin definition + renderer wrapper adapting `MarkdownRenderer_orig` (`children` prop) to `RendererProps` (`content` prop) | Plugin Migration Engineer | 60 min | Pending | M1-4 |
| M2-2 | Create `src/lib/document-types/plugins/mermaid.ts`: plugin definition + renderer wrapper adapting `MermaidDiagram` (`chart` prop) to `RendererProps` (`content` prop) + extract `isMermaidText()` detection heuristic | Plugin Migration Engineer | 90 min | Pending | M1-4 |
| M2-3 | Update `src/lib/document-types/index.ts`: import and register markdown + mermaid plugins | Plugin Migration Engineer | 15 min | Pending | M2-1, M2-2 |
| M2-4 | Run `pnpm typecheck` + `pnpm lint` -- verify zero errors/warnings | Plugin Migration Engineer | 10 min | Pending | M2-3 |

---

## M3: Editor Integration

| ID | Task | Assignee | Est. | Status | Depends |
|----|------|----------|------|--------|---------|
| M3-1 | Refactor document interface: rename `MarkdownDocument` to `EditorDocument`, add `kind: string` field | Integration Engineer | 30 min | Pending | M2-4 |
| M3-2 | Implement localStorage migration: load-time `kind` field population via `doc.kind ?? registry.detect(doc.content)` | Integration Engineer | 30 min | Pending | M3-1 |
| M3-3 | Replace rendering coupling points (CP-12): new `RenderPane` uses `registry.get(kind).renderer` for dynamic dispatch | Integration Engineer | 45 min | Pending | M3-2 |
| M3-4 | Replace file I/O coupling points (CP-4, CP-5, CP-6, CP-7, CP-8, CP-9): use `registry.allExtensions()`, `registry.getByExtension()`, `plugin.exportMimeType`, `plugin.exportExtension` | Integration Engineer | 60 min | Pending | M3-3 |
| M3-5 | Replace content detection (CP-10) and new tab logic (CP-3, CP-11): use `registry.detect()` pipeline, `registry.all()` for menu generation, `plugin.defaultContent` for templates | Integration Engineer | 45 min | Pending | M3-4 |
| M3-6 | Replace UI text (CP-13): generic drag overlay, generic input label. Run `pnpm typecheck` + `pnpm lint` + `pnpm build` | Integration Engineer | 30 min | Pending | M3-5 |

---

## M4: Verification

| ID | Task | Assignee | Est. | Status | Depends |
|----|------|----------|------|--------|---------|
| M4-1 | Run `pnpm typecheck` -- screenshot of zero errors | QA Engineer | 5 min | Pending | M3-6 |
| M4-2 | Run `pnpm lint` -- screenshot of zero warnings | QA Engineer | 5 min | Pending | M3-6 |
| M4-3 | Run `pnpm build` -- screenshot of clean build + record chunk sizes | QA Engineer | 5 min | Pending | M3-6 |
| M4-4 | Test: New tab menu shows all registered types with correct icons | Browser Test Engineer | 10 min | Pending | M3-6 |
| M4-5 | Test: Creating new markdown tab shows default markdown template | Browser Test Engineer | 10 min | Pending | M3-6 |
| M4-6 | Test: Creating new mermaid tab shows default mermaid template | Browser Test Engineer | 10 min | Pending | M3-6 |
| M4-7 | Test: Preview pane renders markdown correctly (headings, lists, code, tables) | Browser Test Engineer | 15 min | Pending | M3-6 |
| M4-8 | Test: Preview pane renders mermaid diagrams correctly | Browser Test Engineer | 10 min | Pending | M3-6 |
| M4-9 | Test: Paste mermaid content into empty doc -- auto-detects as mermaid | Browser Test Engineer | 10 min | Pending | M3-6 |
| M4-10 | Test: Paste markdown content -- stays as markdown (negative detection) | Browser Test Engineer | 10 min | Pending | M3-6 |
| M4-11 | Test: Drop `.md` file -- opens as markdown | Browser Test Engineer | 10 min | Pending | M3-6 |
| M4-12 | Test: File accept dialog includes all registered extensions | Browser Test Engineer | 10 min | Pending | M3-6 |
| M4-13 | Test: Save/export markdown tab -- `.md` extension, `text/markdown` MIME | Browser Test Engineer | 10 min | Pending | M3-6 |
| M4-14 | Test: Tab icons match document type | Browser Test Engineer | 10 min | Pending | M3-6 |
| M4-15 | Test: Page reload preserves document kind and content (localStorage) | Browser Test Engineer | 15 min | Pending | M3-6 |
| M4-16 | Test: Clear localStorage + reload -- default markdown loads correctly | Browser Test Engineer | 10 min | Pending | M3-6 |
| M4-17 | Test: Empty content, malformed input -- graceful handling | Browser Test Engineer | 10 min | Pending | M3-6 |
| M4-18 | Verify zero browser console errors/warnings across all tests | Browser Test Engineer | 5 min | Pending | M4-4..M4-17 |

---

## M5: Documentation and Evidence

| ID | Task | Assignee | Est. | Status | Depends |
|----|------|----------|------|--------|---------|
| M5-1 | Compile all screenshots into `docs/implementation-evidence/` | QA Engineer | 15 min | Pending | M4-18 |
| M5-2 | Record before/after bundle size comparison | QA Engineer | 10 min | Pending | M4-3 |
| M5-3 | Generate git diff summary: coupling points eliminated | Code Reviewer | 15 min | Pending | M4-18 |
| M5-4 | Code review: registry implementation, plugin definitions, integration | Code Reviewer | 60 min | Pending | M3-6 |
| M5-5 | Agent sign-off with evidence artifacts | All | 15 min | Pending | M5-1..M5-4 |

---

## Summary

| Phase | Tasks | Estimated Total |
|-------|-------|----------------|
| M0: Baseline | 5 | 32 min |
| M1: Registry Core | 4 | 90 min |
| M2: Plugin Definitions | 4 | 175 min |
| M3: Editor Integration | 6 | 240 min |
| M4: Verification | 18 | 175 min |
| M5: Documentation | 5 | 115 min |
| **Total** | **42 tasks** | **~14 hours** |

---
---

# React Component Document Type Plugin — Task Breakdown

## Task Dependency Graph

```
R0-1 → R0-2 → R1-1 → R1-2 → R1-3 → R1-4 → R1-5 → R1-6 → R2-1 → R2-2 → R2-3 → R3-*
```

---

## R0: Setup

| ID | Task | Est. | Status | Depends |
|----|------|------|--------|---------|
| R0-1 | Create feature branch `feat/react-document-type` from `development` | 2 min | Pending | — |
| R0-2 | Install `react-runner` via `pnpm add react-runner` | 3 min | Pending | R0-1 |

---

## R1: Implementation

| ID | Task | Est. | Status | Depends |
|----|------|------|--------|---------|
| R1-1 | Create `src/lib/react-preview/scope.ts` — React globals + import map for react-runner | 15 min | Pending | R0-2 |
| R1-2 | Create `src/components/markdown/ReactPreview.tsx` — dual-mode renderer (shared via useRunner + isolated via sandboxed iframe) with mode toggle UI | 60 min | Pending | R1-1 |
| R1-3 | Create `src/lib/document-types/plugins/react-component.ts` — plugin definition with `isReactText()` detection heuristic, priority=8, Atom icon | 30 min | Pending | R1-2 |
| R1-4 | Update `src/lib/document-types/index.ts` — import + register reactComponentPlugin | 5 min | Pending | R1-3 |
| R1-5 | Update `vite.config.ts` — add `'react-preview': ['react-runner']` to manualChunks | 5 min | Pending | R1-4 |
| R1-6 | Run quality gates: `pnpm typecheck` + `pnpm lint` + `pnpm build` — all must pass | 10 min | Pending | R1-5 |

---

## R2: Verification (Browser Testing)

| ID | Test Case | Est. | Status | Depends |
|----|-----------|------|--------|---------|
| R2-1 | Pre-flight: verify dev server running, navigate to localhost:5200, take baseline screenshot | 5 min | Pending | R1-6 |
| R2-2 | Clear localStorage + reload for clean baseline | 3 min | Pending | R2-1 |
| R2-3 | Test 1: New React tab via "+" menu — verify Atom icon, default content | 5 min | Pending | R2-2 |
| R2-4 | Test 2: Default content renders in shared mode (useState counter visible) | 5 min | Pending | R2-3 |
| R2-5 | Test 3: Toggle to isolated mode — content renders in iframe | 5 min | Pending | R2-4 |
| R2-6 | Test 4: Toggle back to shared mode — component re-renders correctly | 3 min | Pending | R2-5 |
| R2-7 | Test 5: Paste JSX → auto-detects as `react` kind | 5 min | Pending | R2-6 |
| R2-8 | Test 6: Paste plain markdown → stays `markdown` kind | 3 min | Pending | R2-7 |
| R2-9 | Test 7: Paste HTML → stays `html` kind | 3 min | Pending | R2-8 |
| R2-10 | Test 8: Mermaid diagram → still detected as `mermaid` | 3 min | Pending | R2-9 |
| R2-11 | Test 9: Syntax error in JSX → error panel shown, no crash | 5 min | Pending | R2-10 |
| R2-12 | Test 10: Import statement works (`import { useState } from 'react'`) | 5 min | Pending | R2-11 |
| R2-13 | Test 11: Hooks work — useState counter increments on click | 5 min | Pending | R2-12 |
| R2-14 | Test 12: Empty content → placeholder shown | 3 min | Pending | R2-13 |
| R2-15 | Test 13: Tab icon shows Atom icon from lucide-react | 3 min | Pending | R2-14 |
| R2-16 | Test 14: Reload page → React tab preserved (localStorage persistence) | 5 min | Pending | R2-15 |
| R2-17 | Test 15: File drop `.tsx` → opens as React tab | 5 min | Pending | R2-16 |
| R2-18 | Test 16: Save/export produces `.tsx` file with correct MIME | 5 min | Pending | R2-17 |
| R2-19 | Test 17: Existing markdown/mermaid/HTML tabs all still work | 5 min | Pending | R2-18 |

---

## R3: Finalize

| ID | Task | Est. | Status | Depends |
|----|------|------|--------|---------|
| R3-1 | Compile all screenshots into `test-results/react-plugin/` | 10 min | Pending | R2-19 |
| R3-2 | Commit feature code + test evidence | 5 min | Pending | R3-1 |
| R3-3 | Push `feat/react-document-type` to origin | 2 min | Pending | R3-2 |
| R3-4 | Merge into `development` and push | 5 min | Pending | R3-3 |

---

## Summary

| Phase | Tasks | Estimated Total |
|-------|-------|----------------|
| R0: Setup | 2 | 5 min |
| R1: Implementation | 6 | 125 min |
| R2: Verification | 19 | 84 min |
| R3: Finalize | 4 | 22 min |
| **Total** | **31 tasks** | **~4 hours** |

---
---

# GraphViz Document Type Plugin — Task Breakdown

**Branch:** `feat/graphviz-doctype`
**Spec:** `docs/superpowers/specs/2026-03-28-graphviz-doctype-design.md`
**Plan:** `docs/superpowers/plans/2026-03-28-graphviz-doctype.md`

## Task Dependency Graph

```
G0 → G1 → G2 → G3 → G4-* → G5-*
```

---

## G0: Install Library

| ID | Task | Est. | Status | Depends |
|----|------|------|--------|---------|
| G0-1 | `pnpm add @hpcc-js/wasm-graphviz` — installed v1.21.2 | 5 min | ✅ **Done** (commit `9cdb2b8`) | — |

---

## G1: Create Renderer

| ID | Task | Est. | Status | Depends |
|----|------|------|--------|---------|
| G1-1 | Create `src/components/markdown/GraphvizPreview.tsx` — WASM singleton, cancellation token, empty/error/SVG states | 20 min | ✅ **Done** | G0-1 |
| G1-2 | Run `pnpm typecheck` — EXIT:0 ✓ | 2 min | ✅ **Done** | G1-1 |
| G1-3 | Committed as part of feat commit `7a4fe93` | 1 min | ✅ **Done** | G1-2 |

---

## G2: Create Plugin

| ID | Task | Est. | Status | Depends |
|----|------|------|--------|---------|
| G2-1 | Create `src/lib/document-types/plugins/graphviz.ts` — `isGraphvizText()`, lazy wrapper, plugin definition | 15 min | ✅ **Done** | G1-3 |
| G2-2 | Run `pnpm typecheck` — EXIT:0 ✓ | 2 min | ✅ **Done** | G2-1 |
| G2-3 | Committed in feat commit `7a4fe93` | 1 min | ✅ **Done** | G2-2 |

---

## G3: Register in Barrel

| ID | Task | Est. | Status | Depends |
|----|------|------|--------|---------|
| G3-1 | Update `src/lib/document-types/index.ts` — added import + `register(graphvizPlugin)` at lines 23, 30 | 2 min | ✅ **Done** | G2-3 |
| G3-2 | `pnpm typecheck` EXIT:0, `pnpm lint` EXIT:0 ✓ | 3 min | ✅ **Done** | G3-1 |
| G3-3 | Committed in feat commit `7a4fe93` | 1 min | ✅ **Done** | G3-2 |

---

## G4: Quality Gates

| ID | Task | Est. | Status | Depends |
|----|------|------|--------|---------|
| G4-1 | `pnpm build` — ✓ built in 9.62s (no WASM errors, no Vite config change needed) | 5 min | ✅ **Done** | G3-3 |
| G4-2 | `dist/assets/GraphvizPreview-DR46ybnv.js` 797 KB / 623 KB gzip confirmed ✓ | 2 min | ✅ **Done** | G4-1 |
| G4-3 | N/A — build succeeded without `optimizeDeps.exclude` | — | ✅ **N/A** | — |

---

## G4b: Code Review Fixes (3-reviewer code review, 2026-03-28)

| ID | Fix | Status |
|----|-----|--------|
| CR-1 | Cancellation token (`let cancelled = false`) prevents stale renders on rapid typing | ✅ **Done** (commit `5d7ae5c`) |
| CR-2 | WASM singleton clears `_graphvizPromise = null` on load failure — allows retry | ✅ **Done** |
| CR-3 | `setError(null)` moved to after `gviz.dot()` call — success-only | ✅ **Done** |
| CR-4 | `export default GraphvizRendererWrapper` added (mermaid convention) | ✅ **Done** |
| CR-5 | Detection regex extended: `(sub|di)?graph` covers top-level subgraph blocks | ✅ **Done** |
| CR-6 | `types.ts` priority convention comment updated to document > 10 for diagram types | ✅ **Done** |

---

## G5: Manual Verification (10 checkpoints at localhost:5201)

> Verified 2026-03-28 via Playwright browser automation (stagehand MCP)

| ID | Test | Est. | Status | Evidence |
|----|------|------|--------|---------|
| G5-1 | GraphViz tab in New Tab menu — `Workflow` icon, orange color | 3 min | ✅ PASS | Menu shows "New GraphViz Diagram" first (priority 11); orange tab confirmed in screenshot |
| G5-2 | Default Pipeline digraph renders correctly | 3 min | ✅ PASS | All 15 nodes confirmed in accessibility tree; orange "Graph-2" tab |
| G5-3 | Pasting `digraph { A -> B }` auto-detects as graphviz | 3 min | ✅ PASS | Paste event → orange tab, SVG renders A→B graph |
| G5-4 | Pasting `graph TD` still detects as mermaid (brace heuristic works) | 3 min | ✅ PASS | Paste event → green mermaid tab, mermaid A→B flowchart |
| G5-5 | Invalid DOT shows error message, no crash | 3 min | ✅ PASS | DOM: `syntax error in line 1 near '!'` in preview; no crash |
| G5-6 | Empty content shows placeholder | 2 min | ✅ PASS | "Enter DOT language to see a live preview" italic text visible |
| G5-7 | Dropping `.dot`/`.gv` file opens as graphviz | 3 min | ✅ PASS | `test-graph.dot` upload → orange tab, A→B→C renders |
| G5-8 | Export produces `.dot` with `text/plain` MIME | 3 min | ✅ PASS | Download: `test-graph.dot`, MIME `text/plain`, size 33 bytes |
| G5-9 | Existing markdown/mermaid/json/html tabs unaffected | 3 min | ✅ PASS | Untitled-1 markdown fully renders (headings, mermaid, code, tables, math) |
| G5-10 | Network tab: WASM only loads when graphviz tab opens | 3 min | ✅ PASS | `GraphvizPreview.tsx` + `@hpcc-js_wasm-graphviz.js` appear last in network log, not at startup |

---

## Summary

| Phase | Tasks | Estimated Total |
|-------|-------|----------------|
| G0: Install | 1 | 5 min (done) |
| G1: Renderer | 3 | 23 min |
| G2: Plugin | 3 | 18 min |
| G3: Register | 3 | 6 min |
| G4: Build | 2-3 | 7 min |
| G5: Verify | 10 | 29 min |
| **Total** | **22 tasks** | **~1.5 hours** |
