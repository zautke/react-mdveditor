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
