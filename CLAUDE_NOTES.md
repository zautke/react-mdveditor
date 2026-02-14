# Claude Notes

## 2026-02-13: Document Type Plugin Architecture & Metaprompt

### Context
User requested architectural analysis of the document detection system, mermaid diagrams, and an agentic instructional metaprompt for adding new document types.

### [SUCCESS] Architectural Analysis
- Identified 12 distinct coupling points in `EditorWithProview.tsx` for the current hardcoded 2-type system
- Mapped the full data flow: type definition, content detection, ingestion points, render dispatch, tab UI, and file I/O

### [SUCCESS] Documentation Artifacts Created
- `docs/document-type-architecture.md` — Current vs. proposed plugin architecture with 3 mermaid diagrams
- `docs/example-html-document-type-prompt.md` — Concrete worked example (HTML) for the plugin pattern
- `docs/metaprompt-add-document-type.md` — Generic, type-agnostic metaprompt for adding any document type

### [SUCCESS] Research Synthesis
Sources consulted for metaprompt design:
1. Suzgun & Kalai, "Meta-Prompting: Enhancing Language Models with Task-Agnostic Scaffolding" (2024) — task-agnostic scaffolding pattern
2. OpenAI Cookbook, "Enhance your prompts with meta prompting" — prompt-generates-prompt pattern
3. Anthropic, "Building Effective Agents" (2024) — simple composable patterns over complex frameworks
4. Anthropic, "Effective Harnesses for Long-Running Agents" (2025) — incremental artifact trail pattern
5. Anthropic prompt engineering docs — `{{variable}}` template slots, XML tag data separation
6. PromptHub, "A Complete Guide to Meta Prompting" — structural scaffold vs. content-driven prompts
7. Anthropic courses (Context7) — dynamic prompt construction from modular segments
8. Claude Code docs (Context7) — custom skills as reusable markdown prompt scaffolds

### Key Design Decision: Two-Variable Metaprompt
The metaprompt only requires TWO user-provided variables:
- `{{DOCUMENT_TYPE_NAME}}` — what the type is called
- `{{DOCUMENT_TYPE_DESCRIPTION}}` — what the user wants

All implementation details (kind, icon, priority, extensions, MIME type, detection heuristic, renderer approach, default template) are **derived by the agent** during Phase 0 (Discovery). This follows the meta-prompting principle of parameterizing intent, not implementation.

### User Preferences Observed
- Prefers thorough research before implementation (3+ disparate sources)
- Values architectural diagrams (mermaid) for system documentation
- Wants additive development — enhance codebase, don't simplify
- Prefers pnpm, `unknown` over `any`, Alpine Docker containers

## 2026-02-14: Document Type Registry - Multi-Agent Planning Phase

### Context
User requested full orchestration of the Document Type Registry Plugin Architecture implementation using a multi-agent team structure across 3 phases: Research, Acceptance Criteria, and Implementation.

### [SUCCESS] Research Phase (3 parallel agents)
- **Documentation Specialist**: Extracted all requirements from 3 reference docs, identified complete `DocumentTypePlugin` interface (11 properties including `priority` and `exportExtension` additions from metaprompt/example docs)
- **Architecture Analyst**: Found **16 coupling points** (not 12 as originally estimated). Additional 4: CP-14 (mermaid in renderers), CP-15 (FileUploadButton default), CP-16 (TabSystemDemo hardcoded menus), and more granular breakdown of existing CPs
- **Technical Researcher**: Evaluated 3 approaches per topic across 4 dimensions (registry patterns, TypeScript strict, React wrappers, testing). Recommended: priority-based module singleton + `unknown` everywhere + normalized wrapper + 3-layer testing pyramid

### [SUCCESS] Planning Documents Produced
- `docs/registry-implementation-plan.md` — Comprehensive architecture plan with phases, interfaces, risk assessment, rollback plan
- `PLANNING.md` — High-level roadmap with 6 milestones (M0-M5), 5 ADRs, timeline estimate (10-14 hours)
- `TASKS.md` — 42 granular tasks with dependencies, assignees, and estimates
- `docs/multi-agent-team-manifest.md` — 9 agent roles, work assignments, communication protocols, handoff templates
- `docs/Acceptance_Criteria.md` — 37 functional requirements, 16 quality gates, 17 manual test cases, 16 regression checks, evidence requirements

### Key Architectural Decisions
- ADR-1: Module-level singleton over class-based registry (ESM natural singleton)
- ADR-2: Priority-based detection over registration-order (deterministic regardless of import order)
- ADR-3: `unknown` over `any` in all plugin interfaces
- ADR-4: Thin wrapper components for renderer normalization (additive, no modification to existing code)
- ADR-5: Additive localStorage migration (null-coalescing fallback, no migration script)

### [NEEDS IMPROVEMENT] Pre-existing TypeScript Errors
The codebase has pre-existing LSP errors in:
- `vite.config.ts` — missing `path` module types (needs `@types/node`)
- `TabSystem.tsx` — `motion` library type incompatibility
- `expand-toggle-button.tsx`, `file-upload-button.tsx`, `TabSystemDemo.tsx` — unused `React` imports
These are NOT related to the registry work but should be noted for the implementation team.

### User Preferences Confirmed
- Multi-agent orchestration with explicit handoffs and evidence requirements
- Screenshot-based proof for every deliverable
- Quality gates enforced at every phase boundary
- Additive development: existing renderers wrapped, not modified
