# Browser Test Run: Document Type Registry Refactor

- **Date**: 2026-02-14
- **Branch**: `feature/document-type-registry`
- **Tester**: Claude Code (AI agent) via Chrome DevTools MCP
- **Status**: ALL PASS

---

## Objective

Verify the document type registry refactor — a 17-point test matrix ensuring `EditorWithProview.tsx` works correctly with plugin-based dispatch. The registry replaces hardcoded document type logic with a dynamic plugin system where each document type (markdown, mermaid, etc.) registers itself and the editor dispatches rendering, icons, default content, and detection through the registry API.

---

## Tools Used

- **Chrome DevTools MCP**:
  - `take_snapshot()` — accessibility tree for element identification and state verification
  - `take_screenshot()` — visual evidence saved to `test-results/`
  - `click(uid)` — tab switching, dropdown menu interaction
  - `fill(uid, value)` — text input into textarea
  - `evaluate_script(fn, args)` — native setter manipulation, localStorage inspection, DOM queries

---

## Test Matrix (17 Points)

| # | Test Case | Result | Evidence |
|---|-----------|--------|----------|
| 01 | Initial load — app renders with default markdown tab | PASS | `test-results/01-initial-load.png` |
| 02 | Default tab content — markdown demo text present in textarea | PASS | `test-results/02-default-content.png` |
| 03 | Live preview — markdown renders headings, bold, lists | PASS | `test-results/03-live-preview.png` |
| 04 | New tab dropdown — menu opens with registered document types | PASS | `test-results/04-new-tab-dropdown.png` |
| 05 | New Markdown tab — creates tab with FileText icon | PASS | `test-results/05-new-markdown-tab.png` |
| 06 | New Mermaid tab — creates tab with GitBranch icon | PASS | `test-results/06-new-mermaid-tab.png` |
| 07 | Tab switching — clicking tabs swaps textarea and preview content | PASS | `test-results/07-tab-switching.png` |
| 08 | Content editing — typing in textarea updates preview in real time | PASS | `test-results/08-content-editing.png` |
| 09 | Tab closing — close button removes tab and activates adjacent | PASS | `test-results/09-tab-close.png` |
| 10 | Last tab protection — cannot close the only remaining tab | PASS | `test-results/10-last-tab-protection.png` |
| 11 | Mermaid rendering — flowchart SVG renders in preview pane | PASS | `test-results/11-mermaid-render.png` |
| 12 | Mermaid error — invalid syntax shows error message, not crash | PASS | `test-results/12-mermaid-error.png` |
| 13 | State persistence — reload preserves tabs, content, active tab | PASS | `test-results/13-state-persistence.png` |
| 14 | localStorage `kind` field — migration from old format works | PASS | `test-results/14-kind-migration.png` |
| 15 | Registry `all()` — dropdown dynamically populated from registry | PASS | `test-results/15-registry-all.png` |
| 16 | File drop zone — drag area appears on file hover | PASS | `test-results/16-file-drop.png` |
| 17 | Save/export — content can be exported as file | PASS | `test-results/17-final.png` |

### Round 3 Regression Tests

| # | Test Case | Result | Evidence |
|---|-----------|--------|----------|
| r3-01 | Fresh load after localStorage clear | PASS | `test-results/r3-01-initial.png` |
| r3-02 | Create multiple tabs of different types | PASS | `test-results/r3-02-multi-tab.png` |
| r3-03 | Rapid tab switching does not lose content | PASS | `test-results/r3-03-rapid-switch.png` |
| r3-04 | Edit markdown, switch to mermaid, switch back — content intact | PASS | `test-results/r3-04-content-intact.png` |
| r3-05 | Close middle tab — correct adjacent tab activates | PASS | `test-results/r3-05-close-middle.png` |
| r3-06 | Registry icons render correctly per type | PASS | `test-results/r3-06-icons.png` |
| r3-07 | Mermaid 3-second async render completes | PASS | `test-results/r3-07-mermaid-async.png` |
| r3-08 | Full reload — all tabs and content survive | PASS | `test-results/r3-08-reload.png` |
| r3-09 | Final state screenshot | PASS | `test-results/r3-09-final.png` |

---

## Key Findings

1. **Tab system works with dynamically generated tabs from registry** — The tab bar renders tabs based on the document instances in state, and each tab's icon is resolved via `registry.get(kind).icon`. No hardcoded icon mapping exists in the editor component.

2. **Icons correctly display per document type** — `FileText` for markdown, `GitBranch` for mermaid. Icons are defined in each plugin's registration and passed through as Lucide React components.

3. **New tab dropdown menu dynamically populated from `registry.all()`** — The dropdown iterates over all registered document types, displaying each type's `label`, `icon`, and respecting `priority` for sort order. Adding a new document type plugin automatically adds it to the menu.

4. **localStorage persistence works with `kind` field migration** — Old tab data without a `kind` field defaults to `"markdown"`. New tab data includes `kind` which is used by the registry to resolve the correct renderer, icon, and default content on reload.

5. **Mermaid async rendering requires 3-second wait time** — The `MermaidDiagram` component renders asynchronously via `mermaid.render()`. Test automation must `sleep(3)` after setting mermaid content before taking a snapshot or screenshot, otherwise the SVG may not be present in the DOM yet.

---

## Reusable Patterns for Future Test Runs

### Tab Interaction Pattern
```
1. take_snapshot() → identify tab UIDs from accessibility tree
2. click(uid) → activate target tab
3. take_snapshot() → verify tabpanel content changed
4. take_screenshot() → capture evidence
```

### Textarea Content Manipulation (React-compatible)
```javascript
// evaluate_script to clear textarea using native setter + input event
(el) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype, 'value'
  ).set;
  setter.call(el, '');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return 'Cleared';
}
```
This pattern is necessary because React controls the textarea via synthetic events. Direct `.value = ''` assignment does not trigger React's `onChange` handler. The native setter + `input` event dispatch correctly propagates through React's event system.

### Mermaid Render Wait
```
fill(uid, mermaidContent)
sleep(3000)  // mermaid.render() is async
take_snapshot()  // now SVG is in DOM
```

---

## Quality Gates

| Gate | Result |
|------|--------|
| `pnpm typecheck` | zero errors |
| `pnpm lint` | zero warnings |
| `pnpm build` | clean production build |

---

## Evidence File Manifest

All evidence files are located in `test-results/` at the project root:

```
test-results/
  01-initial-load.png
  02-default-content.png
  03-live-preview.png
  04-new-tab-dropdown.png
  05-new-markdown-tab.png
  06-new-mermaid-tab.png
  07-tab-switching.png
  08-content-editing.png
  09-tab-close.png
  10-last-tab-protection.png
  11-mermaid-render.png
  12-mermaid-error.png
  13-state-persistence.png
  14-kind-migration.png
  15-registry-all.png
  16-file-drop.png
  17-final.png
  r3-01-initial.png
  r3-02-multi-tab.png
  r3-03-rapid-switch.png
  r3-04-content-intact.png
  r3-05-close-middle.png
  r3-06-icons.png
  r3-07-mermaid-async.png
  r3-08-reload.png
  r3-09-final.png
```
