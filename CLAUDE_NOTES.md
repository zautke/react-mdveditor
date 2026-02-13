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
