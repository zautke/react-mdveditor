# Document Type Registry - Project Roadmap

## Vision

Transform mdeditor from a markdown-only editor into an extensible multi-document-type editor via a plugin registry architecture. Adding a new document type (HTML, JSON, CSV, SVG, LaTeX) should require creating 2 new files and modifying 1 barrel export -- zero changes to the editor shell.

---

## Milestones

### M0: Baseline Capture (Pre-requisite)
- [ ] Record current `pnpm build` output (chunk sizes)
- [ ] Capture screenshots of current markdown editing workflow
- [ ] Capture screenshots of current mermaid rendering (via code fences)
- [ ] Record `pnpm typecheck` and `pnpm lint` output
- [ ] Create feature branch `feature/document-type-registry`

### M1: Registry Core
- [ ] Create `src/lib/document-types/types.ts` with `DocumentTypePlugin` and `RendererProps` interfaces
- [ ] Create `src/lib/document-types/registry.ts` with singleton registry
- [ ] Create `src/lib/document-types/index.ts` barrel export (empty)
- [ ] Verify: `pnpm typecheck` passes

### M2: Plugin Definitions
- [ ] Create `src/lib/document-types/plugins/markdown.ts` with renderer wrapper
- [ ] Create `src/lib/document-types/plugins/mermaid.ts` with renderer wrapper and detection heuristic
- [ ] Register both plugins in `index.ts`
- [ ] Verify: `pnpm typecheck` + `pnpm lint` pass
- [ ] Verify: Detection logic correctly identifies mermaid content and falls back to markdown

### M3: Editor Integration
- [ ] Add `kind` field to document interface
- [ ] Implement localStorage migration (null-coalescing fallback)
- [ ] Replace hardcoded rendering with registry-based dispatch (CP-12)
- [ ] Replace hardcoded file I/O with registry-based config (CP-4, CP-5, CP-6, CP-7, CP-8, CP-9)
- [ ] Replace hardcoded content detection with registry pipeline (CP-10)
- [ ] Replace hardcoded new tab logic with registry menu generation (CP-3, CP-11)
- [ ] Replace hardcoded UI text with generic equivalents (CP-13)
- [ ] Verify: `pnpm typecheck` + `pnpm lint` + `pnpm build` all pass

### M4: Verification
- [ ] Execute 17-point manual test matrix
- [ ] Capture screenshot evidence for each test case
- [ ] Verify zero browser console errors
- [ ] Compare bundle sizes (before vs after)
- [ ] Verify localStorage round-trip (reload preservation)
- [ ] Verify backwards compatibility (clear localStorage, load app)

### M5: Documentation and Evidence Package
- [ ] Compile all screenshots into `docs/implementation-evidence/`
- [ ] Record bundle size comparison
- [ ] Generate git diff summary showing coupling point elimination
- [ ] Agent sign-off with evidence artifacts

---

## Timeline Estimate

| Milestone | Estimated Duration | Dependencies |
|-----------|-------------------|--------------|
| M0: Baseline | 30 min | None |
| M1: Registry Core | 1-2 hours | M0 |
| M2: Plugin Definitions | 2-3 hours | M1 |
| M3: Editor Integration | 3-4 hours | M2 |
| M4: Verification | 2-3 hours | M3 |
| M5: Documentation | 1 hour | M4 |
| **Total** | **10-14 hours** | Sequential |

---

## Architecture Decision Records

### ADR-1: Module-level singleton over class-based registry
**Decision**: Use ES module scope as natural singleton (no `getInstance()` ceremony).
**Rationale**: Vite/ESM evaluates modules once and caches them. Simpler API, zero boilerplate, idiomatic for the stack.

### ADR-2: Priority-based detection over registration-order detection
**Decision**: Plugins declare numeric `priority`. Registry sorts descending. First match wins.
**Rationale**: Deterministic regardless of registration order. Third-party plugins can declare priority. Markdown at 0 is always the fallback.

### ADR-3: `unknown` over `any` in all plugin interfaces
**Decision**: All generic parameters default to `unknown`. Zero `any` types permitted.
**Rationale**: TypeScript strict mode compliance. Forces type narrowing at boundaries. Project convention per CLAUDE.md.

### ADR-4: Renderer normalization via thin wrapper components
**Decision**: Existing renderers (`MarkdownRenderer_orig` uses `children`, `MermaidDiagram` uses `chart`) are not modified. Thin wrapper components adapt them to the `{ content: string }` contract.
**Rationale**: Additive development -- no modification to proven, working code. Wrappers are 3-5 lines each.

### ADR-5: Additive localStorage migration
**Decision**: New `kind` field is optional on load (`doc.kind ?? registry.detect(doc.content)`).
**Rationale**: Zero data loss. Old sessions without `kind` are auto-detected on load. No migration script needed.

---

## Constraints

- **TypeScript strict mode**: `noUnusedLocals`, `noUnusedParameters`, `strictNullChecks`
- **ESLint zero warnings**: `--max-warnings 0`
- **React Refresh**: All components must be default exports
- **Package manager**: pnpm only
- **Icons**: `lucide-react` (preferred) or `react-feather` (already in project)
- **No new runtime dependencies** for the registry core
- **Additive development**: Never simplify or regress existing functionality

---

## React Component Document Type Plugin (feat/react-document-type)

### Vision

Add a React/JSX/TSX document type to the editor, allowing users to write React components in the textarea and see them rendered live in the preview pane. Two rendering modes: **shared** (in-tree, inherits Tailwind) and **isolated** (sandboxed iframe).

### Architectural Decisions

#### ADR-6: react-runner over react-live
**Decision**: Use `react-runner` (v1.0.5, ~38KB) instead of `react-live` (~50-60KB).
**Rationale**: Native `import` statement support via scope-mapped import resolution. Same Sucrase transpiler internally. BYO editor model fits our existing textarea. `useRunner` hook is the right abstraction — returns `{ element, error }`.

#### ADR-7: Dual rendering modes with UI toggle
**Decision**: ReactPreview supports two modes switchable via a toggle button:
- **Shared mode** (default): `useRunner()` renders the component in the same React tree. Component inherits Tailwind classes, design tokens, and app CSS.
- **Isolated mode**: Sandboxed iframe (`sandbox="allow-scripts"`) with React loaded from CDN. Component renders in complete CSS/JS isolation.
**Rationale**: User wants both. Shared mode is fast and lightweight; isolated mode prevents CSS bleed for testing standalone components.

#### ADR-8: Centralized scope configuration
**Decision**: All import-mappable packages defined in a single `src/lib/react-preview/scope.ts` file.
**Rationale**: Single extension point. Want framer-motion available? Add one line. No code changes to the renderer or plugin — just the scope map.

#### ADR-9: Priority 8 with multi-signal detection
**Decision**: React plugin at priority 8 (above HTML=5, below Mermaid=10). Detection requires ≥1 strong signal OR ≥2 medium signals.
**Rationale**: JSX is syntactically similar to HTML — must avoid false positives on HTML documents. Import statements and PascalCase components are unambiguous React signals that HTML lacks.

#### ADR-10: .tsx as default export extension
**Decision**: Export as `.tsx` (not `.jsx`), MIME `text/javascript`.
**Rationale**: TypeScript is the project standard. Sucrase strips types transparently — no cost to defaulting to TSX.

### Detection Heuristic

| Signal | Weight | Pattern |
|--------|--------|---------|
| `import ... from 'react'` | Strong | `/import\s+.*from\s+['"]react['"]/` |
| `import ... from` (any) + JSX | Strong | Import statement + angle-bracket JSX |
| `export default function` | Medium | `/export\s+default\s+function/` |
| `export default () =>` | Medium | `/export\s+default\s+\(?\)\s*=>/` |
| PascalCase JSX component | Medium | `/<[A-Z][a-zA-Z0-9]+[\s/>]/` |
| React hooks | Medium | `/(useState|useEffect|useRef|useMemo|useCallback|useContext)\s*\(/` |
| Arrow function returning JSX | Weak | `/=>\s*\(?<[a-z]/` |

**Rule**: ≥1 strong OR ≥2 medium signals → detected as React.

### File Manifest

| File | Action | Description |
|------|--------|-------------|
| `src/lib/react-preview/scope.ts` | **Create** | Scope config — React globals + import map |
| `src/components/markdown/ReactPreview.tsx` | **Create** | Dual-mode renderer (shared + isolated) |
| `src/lib/document-types/plugins/react-component.ts` | **Create** | Plugin definition (kind='react', priority=8) |
| `src/lib/document-types/index.ts` | **Modify** | +2 lines (import + register) |
| `vite.config.ts` | **Modify** | +1 chunk entry ('react-preview': ['react-runner']) |

### Dependency

```
pnpm add react-runner
```

- react-runner v1.0.5 — ~38KB min+gzip
- Transitive: sucrase (JSX/TS transpiler)
- MIT license

### Test Matrix (17 points)

| # | Test | Evidence |
|---|------|----------|
| 1 | New React tab via "+" menu | Screenshot |
| 2 | Default content renders in shared mode | Screenshot |
| 3 | Toggle to isolated mode — same content renders in iframe | Screenshot |
| 4 | Toggle back to shared mode | Screenshot |
| 5 | Paste JSX → auto-detects as `react` kind | Screenshot |
| 6 | Paste plain markdown → stays `markdown` kind | Screenshot |
| 7 | Paste HTML → stays `html` kind | Screenshot |
| 8 | Mermaid diagram → still detected as `mermaid` | Screenshot |
| 9 | Syntax error in JSX → error panel shown (not crash) | Screenshot |
| 10 | Import statement works (e.g. `import { useState } from 'react'`) | Screenshot |
| 11 | Hooks work (useState counter increments) | Screenshot |
| 12 | Empty content → placeholder shown | Screenshot |
| 13 | Tab icon shows Atom icon | Screenshot |
| 14 | Persistence after reload (localStorage) | Screenshot |
| 15 | File drop `.tsx` → opens as React tab | Screenshot |
| 16 | Save/export produces `.tsx` file | Screenshot |
| 17 | Existing markdown/mermaid/HTML tabs unaffected | Screenshot |

### Risks

| Risk | Mitigation |
|------|------------|
| react-runner Sucrase uses classic JSX runtime; Vite uses automatic | Ensure `React` is in scope as a global for classic `React.createElement` calls |
| Isolated mode requires network (CDN) | Graceful fallback — show message if CDN unreachable; shared mode works offline |
| Detection false-positives on HTML with `<Component>` | Require import statement OR multiple medium signals; HTML lacks imports |
| Bundle size increase (~38KB) | Code-split into `react-preview` chunk via manualChunks |

---

## GraphViz Document Type Plugin (feat/graphviz-doctype)

### Vision

Add DOT language (Graphviz) as a first-class document type. Users can author and preview directed/undirected graphs and pipeline diagrams using the Graphviz DOT syntax, with WASM-based rendering in the preview pane.

### Architectural Decisions

#### ADR-11: @hpcc-js/wasm-graphviz over d3-graphviz
**Decision**: Use `@hpcc-js/wasm-graphviz` directly (v1.21.2) rather than `d3-graphviz` (which wraps it).
**Rationale**: No D3 dependency needed for a preview pane. Returns an SVG string via `gviz.dot(content, 'svg')` — we inject it directly, making width responsive via attribute manipulation. D3's animations and pan/zoom are deferred to a future iteration.

#### ADR-12: Priority 11 with brace heuristic
**Decision**: GraphViz plugin at priority 11 (above mermaid=10). Detection requires an opening `{` in the DOT header.
**Rationale**: Mermaid's detection fires on the first word `'graph'`. An undirected GraphViz `graph { ... }` would be misdetected as mermaid if GraphViz ran at priority 9 or lower. Priority 11 + brace heuristic (`/^(strict\s+)?(di)?graph(\s+[\w"]+)?\s*\{/is`) prevents false positives: mermaid's `graph TD/LR` syntax never has a brace on the header line.

#### ADR-13: WASM module-level singleton
**Decision**: Cache `Graphviz.load()` in a module-level promise variable inside `GraphvizPreview.tsx`.
**Rationale**: `Graphviz.load()` fetches the WASM binary (~650KB). Called once, reused across all content changes and re-renders. Since the file is itself lazy-loaded via `React.lazy()`, the WASM is not fetched until the first GraphViz tab is opened.

#### ADR-14: Dedicated orange tab color
**Decision**: `tabColor: 'oklch(0.65 0.18 45)'` — vibrant orange.
**Rationale**: All existing plugins have distinct hues: markdown=250 (blue), mermaid=155 (green), json=100 (yellow-green). Orange/hue 45 is the only unoccupied warm tone and immediately distinguishes GraphViz tabs.

### Detection Heuristic

```
/^(strict\s+)?(di)?graph(\s+[\w"]+)?\s*\{/is
```

Applied to `text.trimStart().slice(0, 100)`.

| Input | Detects as |
|-------|-----------|
| `digraph Pipeline {` | ✅ graphviz |
| `graph { a -> b }` | ✅ graphviz |
| `strict digraph { }` | ✅ graphviz |
| `graph TD\n  A --> B` | ❌ mermaid (no brace) |
| `graph LR` | ❌ mermaid (no brace) |
| `{ "hello": "world" }` | ❌ json |

### File Manifest

| File | Action | Description |
|------|--------|-------------|
| `src/components/markdown/GraphvizPreview.tsx` | **Create** | WASM renderer: empty/error/SVG states |
| `src/lib/document-types/plugins/graphviz.ts` | **Create** | Plugin: kind=graphviz, priority=11, Workflow icon |
| `src/lib/document-types/index.ts` | **Modify** | +2 lines (import + register) |
| `vite.config.ts` | **Conditional** | `optimizeDeps.exclude` only if build fails |

### Dependency

```
pnpm add @hpcc-js/wasm-graphviz   # installed v1.21.2
```

- ~650 KB WASM binary (gzip ~165 KB), lazy-loaded only when a `.dot` tab opens
- No D3, no React version constraint

### Test Matrix (10 points)

| # | Test | Evidence |
|---|------|----------|
| 1 | New GraphViz tab — Workflow icon, orange color | Browser |
| 2 | Default Pipeline digraph renders | Browser |
| 3 | Paste `digraph { A -> B }` → auto-detects as graphviz | Browser |
| 4 | Paste `graph TD` → still detects as mermaid | Browser |
| 5 | Invalid DOT → red error badge, no crash | Browser |
| 6 | Empty content → placeholder | Browser |
| 7 | Drop `.dot`/`.gv` file → opens as graphviz | Browser |
| 8 | Export produces `.dot` with `text/plain` | Browser |
| 9 | Existing types (markdown/mermaid/json/html) unaffected | Browser |
| 10 | Network tab: WASM not loaded on initial page load | Browser DevTools |

### Risks

| Risk | Mitigation |
|------|------------|
| Vite optimizer inlines WASM worker incorrectly | Add `exclude: ['@hpcc-js/wasm-graphviz']` to `optimizeDeps` (conditional, only if build fails) |
| `graph { }` undirected graphs still grabbed by mermaid | Priority 11 runs before mermaid; brace heuristic covers this |
| SVG has fixed width/height attributes from Graphviz | Post-process: `svgEl.setAttribute('width', '100%'); svgEl.removeAttribute('height')` |

### Implementation Status (2026-03-28)

**CODE COMPLETE — pending manual browser verification**

3 commits on `feat/graphviz-doctype`:
- `9cdb2b8` — chore: add @hpcc-js/wasm-graphviz dependency
- `7a4fe93` — feat: add GraphViz document type plugin
- `5d7ae5c` — fix: graphviz doctype review fixes

Automated gates verified:
- `pnpm typecheck` → EXIT:0 ✅
- `pnpm lint` → EXIT:0 ✅
- `pnpm build` → ✓ built in 9.62s, `GraphvizPreview` chunk 797 KB / 623 KB gzip ✅
- No `vite.config.ts` change needed (WASM bundled without `optimizeDeps.exclude`)

Review fixes applied:
- Cancellation token guards (`let cancelled = false`) against stale async renders
- WASM singleton retry-on-failure (`_graphvizPromise = null` in catch)
- `setError(null)` placed after `gviz.dot()` (success-only)
- `export default GraphvizRendererWrapper` added (mermaid convention)
- Regex extended to `(sub|di)?graph` for top-level `subgraph` blocks
- `types.ts` priority convention updated

Pending: G5 manual verification checklist at `localhost:5200` (see TASKS.md)
