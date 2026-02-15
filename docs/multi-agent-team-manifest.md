# Multi-Agent Team Manifest

## Team Composition

### Research Phase Agents

| Agent | Role | Expertise | Status |
|-------|------|-----------|--------|
| **Architecture Analyst** | Analyze coupling points and integration requirements | React component architecture, state management patterns, dependency analysis | Completed |
| **Documentation Specialist** | Extract requirements from reference documents | Technical documentation parsing, interface specification, constraint extraction | Completed |
| **Technical Researcher** | Research external patterns and best practices | Plugin architecture patterns, TypeScript strict mode, React component wrappers | Completed |

### Implementation Phase Agents

| Agent | Role | Expertise | Phase |
|-------|------|-----------|-------|
| **Registry Engineer** | Build registry core (`types.ts`, `registry.ts`, `index.ts`) | TypeScript generics, singleton patterns, module-level state, strict mode compliance | M1 |
| **Plugin Migration Engineer** | Create `markdown.ts` and `mermaid.ts` plugin definitions | React component wrapping, detection heuristics, markdown/mermaid rendering pipeline | M2 |
| **Integration Engineer** | Refactor `EditorWithProview.tsx` to use registry | React state management, file I/O, event handling, localStorage migration | M3 |
| **QA Engineer** | Execute test matrix, capture evidence, verify quality gates | Build tooling, CLI output capture, regression testing | M4 |
| **Browser Test Engineer** | Live browser testing at `http://localhost:5200` | Chrome DevTools MCP, BrowserTools MCP, screenshot capture, DOM interaction | M4 |
| **Code Reviewer** | Review all changes, enforce quality standards | TypeScript best practices, React patterns, bundle analysis, security review | M5 |

---

## Work Assignments per Phase

### Phase M0: Baseline Capture

| Task | Primary | Secondary |
|------|---------|-----------|
| Record build output | QA Engineer | - |
| Capture workflow screenshots | Browser Test Engineer | - |
| Create feature branch | Registry Engineer | - |

### Phase M1: Registry Core

| Task | Primary | Reviewer |
|------|---------|----------|
| `types.ts` -- interfaces | Registry Engineer | Code Reviewer |
| `registry.ts` -- singleton API | Registry Engineer | Code Reviewer |
| `index.ts` -- barrel export | Registry Engineer | Code Reviewer |
| TypeScript verification | Registry Engineer | - |

### Phase M2: Plugin Definitions

| Task | Primary | Reviewer |
|------|---------|----------|
| `plugins/markdown.ts` + renderer wrapper | Plugin Migration Engineer | Code Reviewer |
| `plugins/mermaid.ts` + renderer wrapper + detection | Plugin Migration Engineer | Code Reviewer |
| Plugin registration in `index.ts` | Plugin Migration Engineer | Registry Engineer |
| Lint + typecheck verification | Plugin Migration Engineer | - |

### Phase M3: Editor Integration

| Task | Primary | Reviewer |
|------|---------|----------|
| Document interface refactor | Integration Engineer | Registry Engineer |
| localStorage migration | Integration Engineer | Code Reviewer |
| Rendering dispatch refactor | Integration Engineer | Plugin Migration Engineer |
| File I/O refactor | Integration Engineer | Code Reviewer |
| Content detection refactor | Integration Engineer | Plugin Migration Engineer |
| UI text + final quality gates | Integration Engineer | Code Reviewer |

### Phase M4: Verification

| Task | Primary | Secondary |
|------|---------|-----------|
| Quality gate execution (typecheck, lint, build) | QA Engineer | - |
| Manual test matrix (17 cases) | Browser Test Engineer | QA Engineer |
| Console error monitoring | Browser Test Engineer | - |
| Evidence compilation | QA Engineer | Browser Test Engineer |

### Phase M5: Documentation and Sign-off

| Task | Primary | Secondary |
|------|---------|-----------|
| Evidence package assembly | QA Engineer | - |
| Bundle size comparison | QA Engineer | - |
| Code review + git diff analysis | Code Reviewer | - |
| Final sign-off | All agents | - |

---

## Communication Protocols

### Handoff Protocol

Each phase handoff includes a structured message:

```
## Handoff: [Source Agent] → [Target Agent]
**Phase completed**: M[n]
**Artifacts produced**: [list of files created/modified]
**Quality gates passed**: [typecheck/lint/build status]
**Known issues**: [any unresolved items]
**Blocking concerns**: [anything that could block the next phase]
**Next steps**: [what the target agent should do first]
```

### Escalation Protocol

1. **Blocking issue**: Agent documents the problem, tags the responsible agent, pauses work
2. **Quality gate failure**: Agent provides exact error output, tags Code Reviewer for guidance
3. **Design decision needed**: Agent presents options with pros/cons, tags Architect (coordinator)
4. **Scope expansion**: Any change beyond the defined SOW requires Architect approval

### Definition of Done (per Agent)

| Agent | Definition of Done |
|-------|-------------------|
| **Registry Engineer** | `pnpm typecheck` passes. Registry API documented. Types exported. |
| **Plugin Migration Engineer** | Both plugins registered. `pnpm typecheck` + `pnpm lint` pass. Detection tests documented. |
| **Integration Engineer** | All 16 coupling points eliminated. `pnpm typecheck` + `pnpm lint` + `pnpm build` pass. Zero references to specific document types in `EditorWithProview.tsx`. |
| **QA Engineer** | All 17 test cases executed. Screenshot evidence for each. Before/after bundle comparison. |
| **Browser Test Engineer** | All user workflows verified in live browser. Full-page screenshots. Zero console errors. |
| **Code Reviewer** | All code reviewed. Quality gates verified. No technical debt introduced. Git diff summary produced. |

---

## Verification Responsibilities

### Registry Engineer Verifies:
- [ ] `DocumentTypePlugin` interface is complete and correct
- [ ] Registry `detect()` iterates by priority descending
- [ ] Registry `get()` falls back to markdown for unknown kinds
- [ ] `allExtensions()` aggregates from all plugins
- [ ] `getByExtension()` finds the correct plugin
- [ ] `_reset()` clears all state (for testing)

### Plugin Migration Engineer Verifies:
- [ ] Markdown renderer wrapper correctly passes `content` as `children`
- [ ] Mermaid renderer wrapper correctly passes `content` as `chart`
- [ ] `isMermaidText()` detection returns `false` for plain markdown
- [ ] `isMermaidText()` detection returns `true` for all mermaid diagram types
- [ ] Markdown plugin has `priority: 0` (fallback)
- [ ] Mermaid plugin has `priority: 10` (highest)
- [ ] Both plugins use `readonly` properties

### Integration Engineer Verifies:
- [ ] `EditorDocument` interface includes `kind: string`
- [ ] localStorage migration handles documents without `kind` field
- [ ] `RenderPane` dispatches to correct renderer based on `kind`
- [ ] New tab menu is dynamically generated from `registry.all()`
- [ ] File save uses `plugin.exportMimeType` and `plugin.exportExtension`
- [ ] File input `accept` uses `registry.allExtensions()`
- [ ] Drop handler detects file type via `registry.getByExtension()`
- [ ] Content detection uses `registry.detect(text)`
- [ ] Tab icons use `plugin.icon`
- [ ] No hardcoded document type references remain

### QA Engineer Verifies:
- [ ] `pnpm typecheck` -- zero errors
- [ ] `pnpm lint` -- zero warnings
- [ ] `pnpm build` -- clean build
- [ ] Bundle size within 2 KB of baseline
- [ ] All 17 test cases pass

### Browser Test Engineer Verifies:
- [ ] Dev server at `http://localhost:5200` loads correctly
- [ ] Each test case has screenshot proof
- [ ] Zero browser console errors
- [ ] Zero browser console warnings
- [ ] All UI interactions work (click, paste, drop, save)

### Code Reviewer Verifies:
- [ ] No `any` types in new code
- [ ] All renderer components are default exports
- [ ] No unused imports or variables
- [ ] Registry is imported from barrel export, not directly
- [ ] No circular dependencies
- [ ] Error handling is present for all edge cases
- [ ] Git history is clean (one logical commit per milestone)

---

## Evidence Artifacts

Each agent produces specific artifacts stored in `docs/implementation-evidence/`:

| Agent | Artifacts |
|-------|-----------|
| Registry Engineer | `typecheck-m1.txt` -- TypeScript compiler output |
| Plugin Migration Engineer | `typecheck-m2.txt`, `lint-m2.txt` -- compiler/linter output |
| Integration Engineer | `typecheck-m3.txt`, `lint-m3.txt`, `build-m3.txt` -- all quality gates |
| QA Engineer | `baseline-build.txt`, `final-build.txt`, `bundle-comparison.md` |
| Browser Test Engineer | `test-01-*.png` through `test-17-*.png` -- screenshots per test case |
| Code Reviewer | `code-review-summary.md`, `coupling-points-diff.md` |
