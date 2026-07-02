# Chief Technology Officer Code Review Demo

This is a code-first walkthrough for presenting mdeditor to the Chief Technology Officer (CTO). The path is intentionally sequential: start at the runtime entrypoint, follow state into the editor shell, then trace the extension points, tab system, ingestion, rendering, and verification surfaces.

## Demo Goal

Show that mdeditor is organized around a small set of reusable contracts:

- The app shell owns document state and orchestration.
- Document rendering is plugin-driven rather than hardcoded per type.
- Tabs are a reusable component contract, with a local implementation and a packageable design-system implementation.
- Riskier boundaries, such as file import, URL extraction, iframe rendering, and motion/drag behavior, are explicit in code.

## Research Provenance

Evidence was gathered from:

- CodeGraph source traces against `/Volumes/FLOUNDER/dev/mdeditor/.codegraph/codegraph.db`.
- codemunch routing and ranked context after indexing 115 files and 6,920 symbols with AI summaries disabled.
- code-graph-mcp quick analysis, which reported the project ready for analysis tools. Its deeper statistics, dependency, and complexity calls timed out and are not used as evidence.

Co-agent coverage gap: `claudine.Agent` returned an empty agent list, and `codex` timed out after 120 seconds in read-only mode. `claudette` did not expose an agent-launch tool in this session.

## Five-Minute Executive Thread

1. `src/main.tsx` boots the real app, not the old sample app.
2. `EditorWithProview` owns the multi-document model and maps each document to a registered renderer through `kind`.
3. `documentTypeRegistry` turns document types into data: detection, renderer, icon, default title, export metadata, and tab color.
4. `TabSystem` is a reusable UI orchestrator over Radix tabs, dnd-kit drag, motion animation, overflow handling, and slot-based styling.
5. Import/export and URL extraction are explicit boundary layers with validation, timeout, and storage formats.
6. Contract files and Playwright smoke coverage preserve tab-system API and visual behavior during the ongoing design-system extraction.

## Sequential Walkthrough

### 1. Runtime Entry

Open: `src/main.tsx`

Evidence:

- `src/main.tsx:4` imports `./components/markdown/EditorWithProview` as `App`.
- `src/main.tsx:11-18` renders inside `React.StrictMode`, `UserSettingsProvider`, and `TooltipProvider`.
- `src/main.tsx:5-6` keeps alternate demo apps commented out, which is useful for local component isolation but not the production path.

Point to make:

The active app is the editor shell. Global concerns are intentionally thin: user settings and tooltip behavior are providers, while editor behavior stays in the feature component.

### 2. Document Model And Persistence

Open: `src/components/markdown/EditorWithProview.tsx`

Evidence:

- `EditorDocument` is the whole document model: `id`, `title`, `content`, `kind`, and optional `filePath` at `src/components/markdown/EditorWithProview.tsx:25-31`.
- Documents restore from local storage at `src/components/markdown/EditorWithProview.tsx:268-278`.
- Old documents are migrated by deriving missing `kind` through `documentTypeRegistry.detect()` at `src/components/markdown/EditorWithProview.tsx:271-275`.
- Persistence is debounced for documents at `src/components/markdown/EditorWithProview.tsx:298-301`, while active tab and expanded state persist immediately at `src/components/markdown/EditorWithProview.tsx:303-309`.
- The storage helper namespaces keys with `mdeditor:` and fails closed on unavailable storage at `src/lib/storage.ts:1-18`.

Point to make:

The app keeps the document model deliberately small. Extensibility is not stored as component state; it is encoded by `kind`, which lets the registry own type-specific behavior.

### 3. Registry As Extension Boundary

Open: `src/lib/document-types/types.ts`, `src/lib/document-types/registry.ts`, and `src/lib/document-types/index.ts`

Evidence:

- `DocumentTypePlugin` defines immutable plugin fields at `src/lib/document-types/types.ts:22-75`.
- Detection must be pure, fast, deterministic, and non-throwing at `src/lib/document-types/types.ts:32-40`.
- Registry state is a module-level singleton at `src/lib/document-types/registry.ts:1-13`.
- `register()` stores plugins and rebuilds priority order at `src/lib/document-types/registry.ts:29-37`.
- `detect()` checks plugins by priority and falls back to markdown at `src/lib/document-types/registry.ts:46-53`.
- `get()` gracefully falls back to markdown for stale persisted kinds at `src/lib/document-types/registry.ts:62-72`.
- The barrel registers built-ins in one place at `src/lib/document-types/index.ts:17-32`.

Point to make:

The registry removes document-type branching from the editor. Adding a type means adding a plugin and registering it, not editing paste, drop, file import, tab icon, renderer, and export logic separately.

### 4. Plugin Examples

Open: `src/lib/document-types/plugins/markdown.ts` and `src/lib/document-types/plugins/url.ts`

Evidence:

- Markdown is the universal fallback: `detect: () => true`, priority `0`, and markdown export metadata at `src/lib/document-types/plugins/markdown.ts:41-54`.
- The markdown plugin adapts the old renderer from `{ children }` to the registry's `{ content }` contract at `src/lib/document-types/plugins/markdown.ts:13-20`.
- URL has priority `6`, above HTML, because stored URL article content begins with an HTML comment at `src/lib/document-types/plugins/url.ts:1-10`.
- URL rendering is lazy-loaded at `src/lib/document-types/plugins/url.ts:16-34`.
- URL export is `text/html` with `.url.html` at `src/lib/document-types/plugins/url.ts:64-77`.

Point to make:

This is the architectural payoff: each document type carries its own detection, renderer, defaults, export format, icon, and tab accent. The editor consumes those fields generically.

### 5. New Tab And Tab Metadata Flow

Open: `src/components/markdown/EditorWithProview.tsx`

Evidence:

- `handleNewTab()` looks up a plugin, generates a document from `defaultTitle`, `defaultContent`, and `plugin.kind`, then activates it at `src/components/markdown/EditorWithProview.tsx:320-333`.
- Tab metadata is derived from documents and plugins at `src/components/markdown/EditorWithProview.tsx:373-390`.
- New-tab menu items are generated from `documentTypeRegistry.all()` at `src/components/markdown/EditorWithProview.tsx:393-403`.
- The rendered `TabSystem` receives tabs, active tab, rename, delete, reorder, new-tab menu, and visual controls at `src/components/markdown/EditorWithProview.tsx:799-814`.
- Each document renders as a `TabContent` whose body is `RenderPane` at `src/components/markdown/EditorWithProview.tsx:815-819`.

Point to make:

Document type metadata is reused by tabs without special cases. The same plugin object drives tab label defaults, icon, color, content template, renderer, and export.

### 6. Dynamic Render Pane

Open: `src/components/markdown/EditorWithProview.tsx` and `src/components/markdown/MarkdownRenderer_orig.tsx`

Evidence:

- `RenderPane` resolves the plugin by `kind` and renders `plugin.renderer` with `content` and `documentId` at `src/components/markdown/EditorWithProview.tsx:170-199`.
- The render path is wrapped in `Suspense` for lazy plugin renderers at `src/components/markdown/EditorWithProview.tsx:181-192`.
- Markdown rendering uses module-level component and plugin arrays to avoid rebuilding the React Markdown pipeline on each keystroke at `src/components/markdown/MarkdownRenderer_orig.tsx:85-90` and `src/components/markdown/MarkdownRenderer_orig.tsx:232-235`.
- Mermaid is lazy-loaded only when a mermaid code fence appears at `src/components/markdown/MarkdownRenderer_orig.tsx:13-15` and `src/components/markdown/MarkdownRenderer_orig.tsx:96-106`.

Point to make:

The render pipeline is optimized for frequent typing. Stable renderer configuration and lazy heavy renderers are practical performance decisions.

### 7. Ingestion Boundaries

Open: `src/components/markdown/EditorWithProview.tsx`, `src/lib/file-validation.ts`, and `src/lib/url-fetch.ts`

Evidence:

- Paste converts LaTeX delimiters and can update document kind after detection at `src/components/markdown/EditorWithProview.tsx:434-458`.
- Text drop detects URLs first, then either auto-fetches or opens the URL modal based on settings at `src/components/markdown/EditorWithProview.tsx:472-512`.
- File drop validates before reading text at `src/components/markdown/EditorWithProview.tsx:514-543`.
- File picker import follows the same validation and extension/detection path at `src/components/markdown/EditorWithProview.tsx:586-619`.
- File validation combines an extension blacklist with first-8-KB binary detection at `src/lib/file-validation.ts:1-10` and `src/lib/file-validation.ts:126-145`.
- URL extraction calls `/api/extract` with a 30-second timeout at `src/lib/url-fetch.ts:38-56`.
- URL content is packed as metadata comment plus article HTML at `src/lib/url-fetch.ts:75-79`.

Point to make:

The app has several input channels, but they converge on the same document model and plugin detection. That keeps behavior coherent across paste, drop, file picker, command-line injection, and URL extraction.

### 8. URL Preview Security And Update Flow

Open: `src/components/markdown/UrlPreview.tsx`

Evidence:

- The component documents its sandbox strategy: iframe with `sandbox="allow-scripts"` and no `allow-same-origin` at `src/components/markdown/UrlPreview.tsx:14-16`.
- Metadata and body are parsed from the packed URL content at `src/components/markdown/UrlPreview.tsx:209-211`.
- Empty URL documents show an inline fetch form at `src/components/markdown/UrlPreview.tsx:114-188`.
- A fetched article dispatches a custom event that `EditorWithProview` listens for at `src/components/markdown/UrlPreview.tsx:213-220` and `src/components/markdown/EditorWithProview.tsx:657-670`.

Point to make:

URL extraction is intentionally decoupled: the renderer can fetch from its empty state, but the editor remains the owner of document mutation.

### 9. Tab System Orchestration

Open: `src/components/ui/tabs/TabSystem.tsx`

Evidence:

- `TabSystem` composes Radix tabs, dnd-kit, motion, overflow, new-tab controls, scroll arrows, and content panels at `src/components/ui/tabs/TabSystem.tsx:34-39`.
- Variant slots are memoized from props at `src/components/ui/tabs/TabSystem.tsx:71-88`.
- Drag reorder is enabled only when `onReorderTabs` exists at `src/components/ui/tabs/TabSystem.tsx:114-130`.
- Overflow and wheel scroll are hook-based at `src/components/ui/tabs/TabSystem.tsx:141-153`.
- Drag announcements replace generic defaults with position-based screen reader messages at `src/components/ui/tabs/TabSystem.tsx:196-230`.
- The root writes `data-tab-skin`, `data-density`, and `data-motion` for token-scoped styling at `src/components/ui/tabs/TabSystem.tsx:240-250`.
- The tab bar keeps new-tab actions pinned outside the scroll container at `src/components/ui/tabs/TabSystem.tsx:338-351`.

Point to make:

The tab component is not just visual. It is the integration point for accessibility, motion policy, drag reorder, overflow, and design tokens.

### 10. Per-Tab Drag And Rename Surface

Open: `src/components/ui/tabs/draggable-tab.tsx`

Evidence:

- The component explains the role conflict between dnd-kit and Radix and sets the outer wrapper to `role="presentation"` at `src/components/ui/tabs/draggable-tab.tsx:78-89` and `src/components/ui/tabs/draggable-tab.tsx:169-188`.
- It disables layout animation during active sorting to avoid transform conflicts at `src/components/ui/tabs/draggable-tab.tsx:83-89`.
- It uses `CSS.Translate.toString(transform)`, not a generic transform, to avoid overlay scale jumps at `src/components/ui/tabs/draggable-tab.tsx:154-158`.
- Tab accent color becomes a custom property and visible marker at `src/components/ui/tabs/draggable-tab.tsx:203-209`.
- Rename and close are delegated through `TabName` and `TabCloseButton` at `src/components/ui/tabs/draggable-tab.tsx:211-235`.

Point to make:

This is a good code-review stop because it shows concrete tradeoffs: accessibility semantics, drag physics, animation coordination, and theming are handled locally where the constraints are visible.

### 11. Styling Architecture

Open: `src/components/ui/tabs/tab-system.variants.ts`

Evidence:

- A single `tailwind-variants` definition replaces separate variant schemas at `src/components/ui/tabs/tab-system.variants.ts:1-9`.
- Slots are declared centrally at `src/components/ui/tabs/tab-system.variants.ts:13-52`.
- Variants cover chrome, capsule, underline, pills, boxed, and minimal at `src/components/ui/tabs/tab-system.variants.ts:53-132`.
- Orientation, close button position, shape, and visibility are variants too at `src/components/ui/tabs/tab-system.variants.ts:133-166`.
- Compound variants handle cross-product cases such as chrome-horizontal, chrome-vertical, capsule-horizontal, and underline-vertical at `src/components/ui/tabs/tab-system.variants.ts:167-218`.

Point to make:

The styling layer is declarative and slot-based. That is what makes the same behavioral component portable across editor, demos, and the design-system package.

### 12. Design-System Extraction And Parity

Open: `design-system/ui/src/components/tab-system/tab-system.tsx`, `src/components/ui/tabs/tab-system-contract.typecheck.tsx`, and `design-system/ui/src/components/tab-system/tab-system-contract.typecheck.tsx`

Evidence:

- The packageable design-system tab component has the same core prop shape: orientation, variant, skin, density, motion, tabs, active tab, callbacks, classNames, and children at `design-system/ui/src/components/tab-system/tab-system.tsx:31-58`.
- It uses the same behavioral foundations: Radix tabs, dnd-kit, motion, overflow, wheel scroll, and drag reorder at `design-system/ui/src/components/tab-system/tab-system.tsx:3-27`.
- Local contract fixture exercises `skin`, `density`, `motion`, slot classNames, new-tab support, and close buttons at `src/components/ui/tabs/tab-system-contract.typecheck.tsx:24-44`.
- Packaged contract fixture mirrors the same expectations at `design-system/ui/src/components/tab-system/tab-system-contract.typecheck.tsx:24-44`.

Point to make:

The branch is moving toward reuse: local editor needs are being captured as a package-level tab contract. The contract files are the reviewable guardrail for that extraction.

### 13. Verification Surface

Open: `scripts/test-tab-skin-contract.mjs` and `package.json`

Evidence:

- The Playwright script has named arguments and usage help at `scripts/test-tab-skin-contract.mjs:5-57`.
- It verifies tab skin, density, motion, active tab count, overflow behavior, and focus-ring token resolution at `scripts/test-tab-skin-contract.mjs:90-113`.
- It verifies new-tab behavior and per-tab accent markers at `scripts/test-tab-skin-contract.mjs:114-124`.
- It verifies keyboard tab movement at `scripts/test-tab-skin-contract.mjs:125-134`.
- It verifies mobile overflow constraints at `scripts/test-tab-skin-contract.mjs:140-154`.
- It verifies reduced-motion and forced-colors tokens at `scripts/test-tab-skin-contract.mjs:159-175`.
- Core package scripts are `build`, `typecheck`, and `lint` in `package.json`.

Point to make:

The tab work is not only type-level. It has runtime checks for responsive layout, accessibility-adjacent behavior, keyboard behavior, motion policy, and forced-color support.

## Architectural Highlights To Emphasize

### Extension By Data, Not Branches

The document plugin contract keeps the editor generic. A plugin contributes detection, renderer, icon, export format, default content, title, and tab color. The editor consumes those through the registry.

### State Ownership Is Clear

`EditorWithProview` owns document mutations. Renderers can request updates indirectly, as the URL renderer does with a custom event, but the editor remains the single document-state owner.

### Reusable Tab Surface

Tabs are a component system, not a one-off layout. Props expose behavior and appearance without leaking implementation details, while slot classNames let embedding apps customize locally.

### Accessibility Is In The Implementation Path

Accessible Rich Internet Applications (ARIA) labels, live regions, screen-reader drag announcements, keyboard tab behavior, and forced-color checks are part of the component code and tests.

### Performance Choices Are Local And Explainable

The code uses memoized panes, stable markdown plugin arrays, lazy renderers, debounced persistence, and motion policies where they directly address typing, rendering, or interaction costs.

## Risks And Review Questions

- `EditorWithProview.tsx` is the highest concentration point at 871 lines. It is understandable as an app shell, but future extraction candidates are ingestion handlers, document lifecycle reducers, and toolbar composition.
- `src/App.tsx` is an old sample renderer and is not the active app. That should be called out to avoid reviewing the wrong entrypoint.
- `docs/document-type-architecture.md` still describes the plugin architecture as proposed in places, while the code now implements it. That doc likely needs a follow-up refresh.
- code-graph-mcp deeper metrics timed out, so no quantified complexity or dependency-cycle claims should be made in the CTO demo.
- The local and package tab-system implementations are similar but not identical. Treat the contract fixtures as the source for intended parity, not proof of byte-for-byte parity.

## Suggested Live Code Path

Use this order during the presentation:

1. `src/main.tsx`
2. `src/components/markdown/EditorWithProview.tsx:25`
3. `src/components/markdown/EditorWithProview.tsx:266`
4. `src/lib/document-types/types.ts:22`
5. `src/lib/document-types/registry.ts:46`
6. `src/lib/document-types/index.ts:17`
7. `src/components/markdown/EditorWithProview.tsx:320`
8. `src/components/markdown/EditorWithProview.tsx:799`
9. `src/components/ui/tabs/TabSystem.tsx:39`
10. `src/components/ui/tabs/draggable-tab.tsx:111`
11. `src/components/ui/tabs/tab-system.variants.ts:13`
12. `src/lib/file-validation.ts:126`
13. `src/lib/url-fetch.ts:46`
14. `src/components/markdown/UrlPreview.tsx:192`
15. `scripts/test-tab-skin-contract.mjs:90`

