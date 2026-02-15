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
