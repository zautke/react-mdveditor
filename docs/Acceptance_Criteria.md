# Document Type Registry - Acceptance Criteria

## 1. Functional Requirements

### 1.1 Registry Core

- [ ] **FR-1**: `DocumentTypePlugin` interface is defined in `src/lib/document-types/types.ts` with all required properties: `kind`, `label`, `icon`, `detect`, `priority`, `renderer`, `fileExtensions`, `exportMimeType`, `exportExtension`, `defaultContent`, `defaultTitle`
- [ ] **FR-2**: `RendererProps` interface is defined with `{ content: string }` contract
- [ ] **FR-3**: All `DocumentTypePlugin` properties are `readonly`
- [ ] **FR-4**: `documentTypeRegistry.register(plugin)` adds a plugin to the registry
- [ ] **FR-5**: `documentTypeRegistry.get(kind)` retrieves a plugin by kind string
- [ ] **FR-6**: `documentTypeRegistry.get(unknownKind)` gracefully falls back to markdown plugin (not throw)
- [ ] **FR-7**: `documentTypeRegistry.detect(text)` iterates plugins by priority descending, returns first match's `kind`
- [ ] **FR-8**: `documentTypeRegistry.detect(text)` falls back to `'markdown'` when no plugin matches
- [ ] **FR-9**: `documentTypeRegistry.all()` returns all plugins sorted by priority descending
- [ ] **FR-10**: `documentTypeRegistry.allExtensions()` returns aggregated file extensions from all plugins
- [ ] **FR-11**: `documentTypeRegistry.getByExtension(ext)` finds the correct plugin for a file extension
- [ ] **FR-12**: Registry is a module-level singleton (no class instantiation required)

### 1.2 Plugin Definitions

- [ ] **FR-13**: Markdown plugin registered with `kind: 'markdown'`, `priority: 0`
- [ ] **FR-14**: Markdown plugin `detect()` returns `true` for all input (universal fallback)
- [ ] **FR-15**: Markdown plugin renderer wraps `MarkdownRenderer_orig` (adapts `children` prop to `content` prop)
- [ ] **FR-16**: Markdown plugin `fileExtensions`: `['.md', '.mdx', '.markdown']`
- [ ] **FR-17**: Markdown plugin `exportMimeType`: `'text/markdown'`, `exportExtension`: `'.md'`
- [ ] **FR-18**: Mermaid plugin registered with `kind: 'mermaid'`, `priority: 10`
- [ ] **FR-19**: Mermaid plugin `detect()` correctly identifies mermaid content (flowchart, sequenceDiagram, classDiagram, etc.)
- [ ] **FR-20**: Mermaid plugin `detect()` returns `false` for plain markdown (e.g., `# Hello World`)
- [ ] **FR-21**: Mermaid plugin renderer wraps `MermaidDiagram` (adapts `chart` prop to `content` prop)
- [ ] **FR-22**: Detection priority ordering: mermaid (10) checked before markdown (0)

### 1.3 Editor Integration

- [ ] **FR-23**: Document interface includes `kind: string` field
- [ ] **FR-24**: Existing localStorage documents without `kind` field are migrated on load via `doc.kind ?? registry.detect(doc.content)`
- [ ] **FR-25**: `RenderPane` dispatches to the correct renderer based on `doc.kind`
- [ ] **FR-26**: New tab dropdown menu is dynamically generated from `registry.all()`
- [ ] **FR-27**: Each document type has its own icon on the tab
- [ ] **FR-28**: New documents are initialized with `plugin.defaultContent`
- [ ] **FR-29**: New document titles use `plugin.defaultTitle(n)`
- [ ] **FR-30**: File save uses `plugin.exportMimeType` and `plugin.exportExtension`
- [ ] **FR-31**: File input `accept` attribute uses `registry.allExtensions()`
- [ ] **FR-32**: Drop handler detects file type via `registry.getByExtension()`
- [ ] **FR-33**: Content detection on paste/drop uses `registry.detect(text)`
- [ ] **FR-34**: `EditorWithProview.tsx` contains zero hardcoded references to specific document types

### 1.4 Extensibility

- [ ] **FR-35**: A new document type can be added by creating 2 new files (renderer + plugin definition) and modifying 1 file (barrel export)
- [ ] **FR-36**: `EditorWithProview.tsx` requires zero modifications to add a new document type
- [ ] **FR-37**: The HTML document type example from `docs/example-html-document-type-prompt.md` can be implemented as validation of the architecture

---

## 2. Quality Gates

### 2.1 TypeScript Strict Mode

- [ ] **QG-1**: `pnpm typecheck` completes with zero errors
- [ ] **QG-2**: No `any` types in new code (prefer `unknown`)
- [ ] **QG-3**: All `noUnusedLocals` violations resolved
- [ ] **QG-4**: All `noUnusedParameters` violations resolved
- [ ] **QG-5**: All `strictNullChecks` violations resolved

### 2.2 Linting

- [ ] **QG-6**: `pnpm lint` completes with zero warnings (`--max-warnings 0`)
- [ ] **QG-7**: No disabled ESLint rules in new code
- [ ] **QG-8**: All imports are used

### 2.3 Build

- [ ] **QG-9**: `pnpm build` completes cleanly (exit code 0)
- [ ] **QG-10**: No new build warnings introduced
- [ ] **QG-11**: Bundle size increase is less than 2 KB over baseline (registry adds ~1.3 KB)

### 2.4 Code Quality

- [ ] **QG-12**: All renderer components are default exports (React Refresh/HMR)
- [ ] **QG-13**: No circular dependencies between new modules
- [ ] **QG-14**: Registry imported via barrel export (`src/lib/document-types/index.ts`), not directly
- [ ] **QG-15**: All `detect()` functions are pure, fast, deterministic, and never throw
- [ ] **QG-16**: All `detect()` functions return `boolean` (not truthy/falsy values)

---

## 3. Manual Test Matrix

### 3.1 Quality Gate Tests (3 tests)

| # | ID | Test | Action | Expected Result | Evidence |
|---|-----|------|--------|-----------------|----------|
| 1 | MT-01 | TypeScript | Run `pnpm typecheck` | Zero errors | Terminal screenshot |
| 2 | MT-02 | Lint | Run `pnpm lint` | Zero warnings | Terminal screenshot |
| 3 | MT-03 | Build | Run `pnpm build` | Clean production build, chunk sizes recorded | Terminal screenshot |

### 3.2 Document Creation Tests (3 tests)

| # | ID | Test | Action | Expected Result | Evidence |
|---|-----|------|--------|-----------------|----------|
| 4 | MT-04 | New tab menu | Click "+" dropdown button | Menu shows "New Markdown" and "New Mermaid Diagram" (and any other registered types) with correct icons | Browser screenshot |
| 5 | MT-05 | New markdown tab | Select "New Markdown" from dropdown | New tab opens with markdown default template, markdown icon on tab | Browser screenshot |
| 6 | MT-06 | New mermaid tab | Select "New Mermaid Diagram" from dropdown | New tab opens with mermaid default template, mermaid icon on tab, diagram renders in preview | Browser screenshot |

### 3.3 Content Detection Tests (3 tests)

| # | ID | Test | Action | Expected Result | Evidence |
|---|-----|------|--------|-----------------|----------|
| 7 | MT-07 | Mermaid detection (paste) | Paste `flowchart TD\n  A --> B` into empty doc | Auto-detects as `mermaid`, preview renders diagram | Browser screenshot |
| 8 | MT-08 | Markdown negative test | Paste `# Hello World\n\nSome paragraph text` into empty doc | Stays as `markdown`, NOT misdetected as mermaid | Browser screenshot |
| 9 | MT-09 | Content preservation | Type mixed content: heading + code block + list | All markdown features render correctly in preview | Browser screenshot |

### 3.4 Rendering Tests (2 tests)

| # | ID | Test | Action | Expected Result | Evidence |
|---|-----|------|--------|-----------------|----------|
| 10 | MT-10 | Markdown preview | Create markdown tab with headings, tables, code blocks, math | Full GFM rendering: tables, task lists, syntax highlighting, MathJax equations | Browser screenshot |
| 11 | MT-11 | Mermaid preview | Create mermaid tab with flowchart definition | Mermaid diagram renders as SVG in preview pane | Browser screenshot |

### 3.5 File I/O Tests (3 tests)

| # | ID | Test | Action | Expected Result | Evidence |
|---|-----|------|--------|-----------------|----------|
| 12 | MT-12 | File accept dialog | Click import/add file button | File picker shows all registered extensions (`.md`, `.mdx`, `.markdown`, mermaid extensions) | Browser screenshot |
| 13 | MT-13 | Save markdown | Click save on a markdown tab | Downloads file with `.md` extension and `text/markdown` MIME type | Browser screenshot (download bar) |
| 14 | MT-14 | File drop | Drop a `.md` file onto the editor | Opens as markdown document with correct preview rendering | Browser screenshot |

### 3.6 State Persistence Tests (2 tests)

| # | ID | Test | Action | Expected Result | Evidence |
|---|-----|------|--------|-----------------|----------|
| 15 | MT-15 | Reload preservation | Create documents of different types, reload page | All documents restored with correct `kind`, content, and rendering | Browser screenshot (before + after reload) |
| 16 | MT-16 | Clean start | Clear localStorage (`localStorage.clear()`), reload app | Default markdown document loads correctly with standard template | Browser screenshot |

### 3.7 Edge Case Tests (1 test)

| # | ID | Test | Action | Expected Result | Evidence |
|---|-----|------|--------|-----------------|----------|
| 17 | MT-17 | Graceful degradation | Test with empty content, whitespace-only content, unknown kind in localStorage | No crashes, no blank screens, graceful fallbacks | Browser screenshot + console screenshot |

---

## 4. Evidence Requirements

### 4.1 Screenshot Proof

Each manual test case (MT-01 through MT-17) requires:
- [ ] Screenshot saved to `docs/implementation-evidence/MT-XX-description.png`
- [ ] Screenshot clearly shows the expected result
- [ ] For browser tests: full browser viewport including address bar (to confirm port 5200)
- [ ] For terminal tests: full terminal output showing command and result

### 4.2 Before/After Comparison

- [ ] **EV-01**: Baseline `pnpm build` output saved to `docs/implementation-evidence/baseline-build.txt`
- [ ] **EV-02**: Final `pnpm build` output saved to `docs/implementation-evidence/final-build.txt`
- [ ] **EV-03**: Bundle size comparison table (baseline vs final, per chunk)
- [ ] **EV-04**: Screenshot of markdown editing (before refactor) vs (after refactor) -- identical appearance
- [ ] **EV-05**: Screenshot of mermaid rendering (before refactor) vs (after refactor) -- identical appearance

### 4.3 Performance Metrics

- [ ] **EV-06**: Bundle size per chunk (vendor, markdown, main) -- before and after
- [ ] **EV-07**: Total bundle size -- before and after
- [ ] **EV-08**: Build time -- before and after

### 4.4 Code Quality Evidence

- [ ] **EV-09**: Git diff summary showing all 16 coupling points eliminated from `EditorWithProview.tsx`
- [ ] **EV-10**: `grep -c` for hardcoded document type references in `EditorWithProview.tsx` (target: 0)
- [ ] **EV-11**: Browser console screenshot showing zero errors and zero warnings
- [ ] **EV-12**: `pnpm typecheck` output screenshot (zero errors)
- [ ] **EV-13**: `pnpm lint` output screenshot (zero warnings)

---

## 5. Implementation Team Assignment

### 5.1 Registry Engineer

| Attribute | Detail |
|-----------|--------|
| **Role** | Implement `src/lib/document-types/registry.ts` and `types.ts` |
| **Expertise** | Singleton patterns, TypeScript generics, plugin interfaces |
| **SOW** | Registry core, plugin interface, barrel exports |
| **Deliverables** | `types.ts`, `registry.ts`, `index.ts` |
| **DoD** | Registry passes `pnpm typecheck`. Documented API. All types exported. |
| **Evidence** | Screenshot of TypeScript compiler output (zero errors) |
| **Phase** | M1 (Registry Core) |

### 5.2 Plugin Migration Engineer

| Attribute | Detail |
|-----------|--------|
| **Role** | Create `markdownPlugin.ts` and `mermaidPlugin.ts` |
| **Expertise** | React component patterns, markdown rendering, detection heuristics |
| **SOW** | Extract existing logic into plugin definitions, create renderer wrappers |
| **Deliverables** | `plugins/markdown.ts`, `plugins/mermaid.ts`, updated `index.ts` |
| **DoD** | Both plugins registered, existing functionality preserved, zero regressions |
| **Evidence** | Screenshots of markdown and mermaid rendering (before/after) |
| **Phase** | M2 (Plugin Definitions) |

### 5.3 Integration Engineer

| Attribute | Detail |
|-----------|--------|
| **Role** | Refactor `EditorWithProview.tsx` to use registry |
| **Expertise** | React state management, file I/O, event handling |
| **SOW** | Remove hardcoded type logic, replace with registry calls |
| **Deliverables** | Refactored `EditorWithProview.tsx` |
| **DoD** | All 16 coupling points eliminated, `pnpm typecheck` + `pnpm lint` + `pnpm build` pass |
| **Evidence** | Screenshot of simplified `EditorWithProview.tsx` diff |
| **Phase** | M3 (Editor Integration) |

### 5.4 QA Engineer

| Attribute | Detail |
|-----------|--------|
| **Role** | Execute manual test matrix, capture evidence |
| **Expertise** | Build tooling, CLI output capture, regression testing |
| **SOW** | Run all 17 verification points, document failures, verify fixes |
| **Deliverables** | Quality gate outputs, bundle comparison, evidence compilation |
| **DoD** | All quality gates pass, evidence package complete |
| **Evidence** | Terminal screenshots for MT-01, MT-02, MT-03; bundle comparison table |
| **Phase** | M4 (Verification) |

### 5.5 Browser Test Engineer

| Attribute | Detail |
|-----------|--------|
| **Role** | Execute live browser testing at `http://localhost:5200` |
| **Expertise** | Chrome DevTools MCP, BrowserTools MCP, screenshot capture |
| **SOW** | Test all user workflows in real browser, capture evidence |
| **Deliverables** | Screenshots for MT-04 through MT-17, console log capture |
| **DoD** | Screenshot proof of all expected behaviors, zero console errors |
| **Evidence** | Full-page screenshots of each workflow step |
| **Phase** | M4 (Verification) |

### 5.6 Code Reviewer

| Attribute | Detail |
|-----------|--------|
| **Role** | Review all changes, enforce quality gates |
| **Expertise** | TypeScript best practices, React patterns, security |
| **SOW** | Review registry implementation, plugin definitions, integration changes |
| **Deliverables** | Code review summary, coupling points diff, sign-off |
| **DoD** | All code reviewed, quality gates passed, no technical debt introduced |
| **Evidence** | Code review summary with approved status |
| **Phase** | M5 (Documentation) |

---

## 6. Coordination Protocol

```
M0: Baseline ──────────────────────────────────────────────────────────────
  │  QA Engineer captures baseline build
  │  Browser Test Engineer captures baseline screenshots
  │  Registry Engineer creates feature branch
  ▼
M1: Registry Core ─────────────────────────────────────────────────────────
  │  Registry Engineer builds types.ts, registry.ts, index.ts
  │  Code Reviewer reviews interfaces
  │  Gate: pnpm typecheck passes
  ▼
M2: Plugin Definitions ─────────────────────────────────────────────────────
  │  Plugin Migration Engineer creates markdown.ts, mermaid.ts
  │  Code Reviewer reviews plugins
  │  Gate: pnpm typecheck + pnpm lint pass
  ▼
M3: Editor Integration ─────────────────────────────────────────────────────
  │  Integration Engineer refactors EditorWithProview.tsx
  │  Code Reviewer reviews integration
  │  Gate: pnpm typecheck + pnpm lint + pnpm build pass
  ▼
M4: Verification ───────────────────────────────────────────────────────────
  │  QA Engineer runs quality gates (MT-01, MT-02, MT-03)
  │  Browser Test Engineer runs manual tests (MT-04 through MT-17)
  │  ┌─ Failures? ──→ Loop back to responsible engineer
  │  └─ All pass? ──→ Continue
  ▼
M5: Documentation and Sign-off ────────────────────────────────────────────
  │  QA Engineer compiles evidence package
  │  Code Reviewer produces code review summary
  │  All agents sign off
  ▼
  DONE
```

### Handoff Template

```markdown
## Handoff: [Source Agent] -> [Target Agent]

**Phase completed**: M[n]
**Artifacts produced**:
- [file path 1]
- [file path 2]

**Quality gates passed**:
- [ ] pnpm typecheck
- [ ] pnpm lint
- [ ] pnpm build

**Known issues**: [none | description]
**Blocking concerns**: [none | description]
**Next steps**: [what target agent should do first]
```

---

## 7. Regression Checklist

Before final sign-off, verify these existing features are unaffected:

- [ ] **RC-1**: Markdown headings (H1-H6) render with correct styling and `id` attributes
- [ ] **RC-2**: GFM tables render with borders and alignment
- [ ] **RC-3**: Task lists render with checkboxes
- [ ] **RC-4**: Code blocks render with syntax highlighting (Prism + oneDark theme)
- [ ] **RC-5**: Mermaid code fences in markdown documents render as diagrams (not code)
- [ ] **RC-6**: MathJax equations render (`$...$` inline, `$$...$$` display)
- [ ] **RC-7**: LaTeX paste detection and conversion works (`\(...\)` to `$...$`)
- [ ] **RC-8**: Multiple tabs work (create, switch, close, reorder)
- [ ] **RC-9**: Drag-and-drop file loading works
- [ ] **RC-10**: Copy-paste into editor works
- [ ] **RC-11**: Editor expand/collapse toggle works
- [ ] **RC-12**: localStorage persistence survives page reload
- [ ] **RC-13**: Debounced saving (500ms) still functions
- [ ] **RC-14**: Auto-linking URLs in markdown
- [ ] **RC-15**: Strikethrough (`~~text~~`) in markdown
- [ ] **RC-16**: Raw HTML pass-through in markdown (via rehype-raw)

---

## 8. Acceptance Sign-off

| Agent | Status | Date | Evidence Location |
|-------|--------|------|-------------------|
| Registry Engineer | Pending | | `docs/implementation-evidence/` |
| Plugin Migration Engineer | Pending | | `docs/implementation-evidence/` |
| Integration Engineer | Pending | | `docs/implementation-evidence/` |
| QA Engineer | Pending | | `docs/implementation-evidence/` |
| Browser Test Engineer | Pending | | `docs/implementation-evidence/` |
| Code Reviewer | Pending | | `docs/implementation-evidence/` |
| **Architect (Final)** | **Pending** | | All evidence verified |
