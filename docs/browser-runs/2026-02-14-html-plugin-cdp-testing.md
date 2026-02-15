# Browser Test Run: HTML Document Type Plugin — CDP Testing

- **Date**: 2026-02-14
- **Branch**: `feat/html-document-type`
- **Tester**: Claude Code (AI agent) via Chrome DevTools MCP
- **Status**: ALL PASS (10/10) + 1 bug found and fixed during testing

---

## Objective

Verify the HTML document type plugin — a 10-point test matrix covering: new tab creation, iframe preview rendering, paste auto-detection (positive and negative), tab icons, mermaid/markdown non-regression, empty state handling, console error check, and state persistence across reload.

---

## Tools Used

- **Chrome DevTools MCP**:
  - `take_snapshot()` — accessibility tree for element UIDs and state verification
  - `take_screenshot()` — visual evidence saved to `test-results/html-plugin/`
  - `click(uid)` — tab switching, dropdown menu interaction
  - `evaluate_script(fn, args)` — native setter manipulation, paste simulation, localStorage operations
  - `navigate_page(type)` — page reload for persistence testing
  - `list_console_messages(types)` — error/warning check
  - `press_key(key)` — Meta+A for select-all

---

## Pre-Flight Checks

| Step | Action | Result |
|------|--------|--------|
| 1 | Verify dev server: `curl http://localhost:5200` | HTTP 200 |
| 2 | User connected Chrome DevTools MCP | Confirmed |
| 3 | `list_pages()` | Connection verified, page listed |
| 4 | `navigate_page(url='http://localhost:5200')` | Page loaded |
| 5 | `sleep(3)` for full initialization | SPA hydrated |
| 6 | `take_snapshot()` — baseline | UIDs 1_0 through 1_115 mapped |

---

## Test Execution

### Test 1: New Tab Menu

**Steps**:
1. `take_snapshot()` — identified dropdown trigger: `uid=1_9` ("Open new tab menu", role=button, expandable, haspopup)
2. `click(uid='1_9')` — opened dropdown
3. `take_snapshot()` — revealed menu structure

**Observed Menu** (uid=2_0, role=menu):

| UID | Label | Icon | Priority | Order |
|-----|-------|------|----------|-------|
| `2_1` | "New Mermaid Diagram" | GitBranch | 10 | 1st |
| `2_2` | "New HTML" | Code (<>) | 5 | 2nd |
| `2_3` | "New Markdown" | FileText | 0 | 3rd |

**Evidence**: `test-results/html-plugin/01-new-tab-menu-open.png`

**Result**: **PASS** — Menu shows "New HTML" with Code (<>) icon. Priority ordering is correct: mermaid (10) > html (5) > markdown (0).

---

### Test 2: New HTML Tab Creation

**Steps**:
1. `click(uid='2_2')` — clicked "New HTML"
2. `sleep(2)` — waited for render
3. `take_snapshot()` — inspected new tab state

**Observed State**:
- New tab in tab bar: `uid=3_1` — "Page-2 Close tab" (selected=true)
- Tab icon: Code (<>) visible adjacent to tab label
- Textarea (`uid=1_4`): contains full HTML default template:
  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>New Page</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 2rem; }
    </style>
  </head>
  <body>
    <h1>Hello World</h1>
    <p>Start editing your HTML here...</p>
  </body>
  </html>
  ```
- Tabpanel (`uid=3_3`) contains:
  - `uid=3_4` StaticText: **"HTML PREVIEW"** (badge indicator)
  - `uid=3_5` Iframe: "HTML Preview" with `sandbox` attribute
  - `uid=3_6` RootWebArea: "New Page" (iframe document `<title>`)
  - `uid=3_7` heading level 1: "Hello World" (rendered `<h1>`)
  - `uid=3_8` StaticText: "Start editing your HTML here..." (rendered `<p>`)

**Evidence**: `test-results/html-plugin/02-new-html-tab-created.png`

**Result**: **PASS** — Default HTML template renders in a sandboxed iframe. "HTML PREVIEW" badge distinguishes it from markdown preview. Iframe document title matches `<title>` from template.

---

### Test 3: Paste Auto-Detection (HTML Content)

**Steps**:
1. Switched to Untitled-1 markdown tab (`uid=1_7`)
2. Cleared localStorage:
   ```javascript
   evaluate_script(() => { localStorage.clear(); return 'Cleared'; })
   ```
3. Reloaded page: `navigate_page(type='reload')`
4. `sleep(3)` — waited for full SPA load
5. `take_snapshot()` — confirmed single "Untitled-1" tab with markdown demo content
6. `click(uid=7_4)` — focused textarea
7. `press_key('Meta+A')` — selected all text
8. Simulated HTML paste via `evaluate_script`:
   ```javascript
   (el) => {
     el.focus();
     el.select();
     const htmlContent = '<!DOCTYPE html>\n<html>\n<head>\n' +
       '<title>Paste Test</title>\n</head>\n<body>\n' +
       '<h1>Pasted HTML</h1>\n<p>This was pasted</p>\n' +
       '</body>\n</html>';
     const dt = new DataTransfer();
     dt.setData('text/plain', htmlContent);
     const pasteEvent = new ClipboardEvent('paste', {
       bubbles: true,
       cancelable: true,
       clipboardData: dt
     });
     el.dispatchEvent(pasteEvent);
     return 'Paste event dispatched';
   }
   ```
9. `sleep(2)` — waited for React re-render and detection
10. `take_snapshot()` — inspected result

**Observed State**:
- Tab icon changed from FileText to **Code (<>)** — auto-detection triggered
- `uid=8_0` StaticText: **"HTML PREVIEW"** — badge appeared
- `uid=8_1` Iframe: "HTML Preview" — iframe renderer activated
- `uid=8_2` RootWebArea: "Paste Test" — iframe title from pasted `<title>`

**Note**: Literal `\n` characters appeared in the rendered preview because `DataTransfer` received escaped newlines from the JavaScript string within `evaluate_script`. This is a **test artifact** (string escaping in the automation layer), not a code bug. Real user paste operations use actual newline characters from the clipboard.

**Evidence**: `test-results/html-plugin/03-paste-html-autodetect.png`

**Result**: **PASS** — Auto-detection correctly switched `kind` from `"markdown"` to `"html"` when HTML content (starting with `<!DOCTYPE` or `<html`) was pasted.

---

### Test 4: Paste Negative (Markdown Stays Markdown)

**Steps**:
1. Simulated paste of markdown content:
   ```
   # Hello World\n\nThis is **markdown** with some <div>inline HTML</div>
   ```
2. `sleep(2)` — waited for React re-render
3. `take_snapshot()` — inspected result

**Observed State**:
- Tab icon remains **FileText** (not Code) — no false positive detection
- No "HTML PREVIEW" badge present
- Preview renders as markdown: heading, bold text, inline HTML rendered via `rehype-raw`

**Evidence**: `test-results/html-plugin/04-paste-markdown-stays-md.png`

**Result**: **PASS** — Content starting with `#` (markdown heading) correctly remains as markdown. The detection heuristic does not falsely trigger on markdown content that happens to contain inline HTML tags.

---

### Test 5: Tab Icon Verification

Already comprehensively verified across Tests 1, 2, and 3:

| Context | Icon | Verified In |
|---------|------|-------------|
| HTML tab label in tab bar | Code (<>) | Test 2 |
| "New HTML" in dropdown menu | Code (<>) | Test 1 |
| Auto-detected HTML tab | Code (<>) | Test 3 |
| Markdown tab label | FileText | Tests 3, 4 |
| Mermaid in dropdown | GitBranch | Test 1 |

**Result**: **PASS** — Combined evidence from Tests 1, 2, 3 confirms correct icon rendering for all document types.

---

### Test 6: Mermaid Rendering Unaffected

**Steps**:
1. `click(uid=7_9)` — opened dropdown menu
2. `click(uid=10_1)` — clicked "New Mermaid Diagram"
3. `sleep(3)` — waited for mermaid async render
4. `take_snapshot()` — inspected mermaid output

**Observed State**:
- Tab: "Diagram-2" with GitBranch icon
- Preview contains `graphics-document` with `roledescription="flowchart-v2"`
- SVG elements present:
  - "Start" (rounded rectangle)
  - "Decision" (diamond)
  - "Action 1", "Action 2" (rectangles)
  - "End" (rounded rectangle)
  - "Yes", "No" (edge labels)

**Evidence**: `test-results/html-plugin/05-mermaid-still-works.png`

**Result**: **PASS** — Mermaid flowchart rendering is completely unaffected by the HTML plugin addition. The registry correctly dispatches mermaid content to the `MermaidDiagram` renderer.

---

### Test 7: Markdown Rendering Unaffected

**Steps**:
1. `click(uid=7_7)` — switched to Untitled-1 tab
2. `take_screenshot()` — captured markdown preview

**Observed State**:
- Markdown content renders correctly: heading, bold text, inline HTML via `rehype-raw`
- No interference from HTML plugin — the renderer dispatch correctly routes `kind: "markdown"` to `MarkdownRenderer`

**Evidence**: `test-results/html-plugin/06-markdown-still-works.png`

**Result**: **PASS** — Markdown rendering completely unaffected by the HTML plugin.

---

### Test 8: Empty HTML Content Shows Placeholder

**Steps**:
1. Created new HTML tab via dropdown
2. Cleared content using `evaluate_script` with native setter:
   ```javascript
   (el) => {
     const setter = Object.getOwnPropertyDescriptor(
       HTMLTextAreaElement.prototype, 'value'
     ).set;
     setter.call(el, '');
     el.dispatchEvent(new Event('input', { bubbles: true }));
     return 'Cleared';
   }
   ```
3. `take_snapshot()` — inspected empty state

**Observed State**:
- `uid=14_3` StaticText: **"HTML PREVIEW"** — badge still present (document kind is still HTML)
- `uid=15_0` StaticText: **"Enter HTML to see a live preview"** — placeholder text
- **No iframe element** — the empty state uses a `<div>` with centered italic placeholder text instead of rendering an empty iframe

**Evidence**: `test-results/html-plugin/07-empty-html-placeholder.png`

**Result**: **PASS** — Graceful empty state. The `HtmlPreview` component conditionally renders either the iframe (when content is non-empty) or a styled placeholder div (when content is empty/whitespace).

---

### Test 9: Console Errors Check

**Steps**:
1. `list_console_messages(types=["error", "warn"])` — queried for errors and warnings

**Result**: "no console messages found"

**Result**: **PASS** — Zero console errors or warnings. The HTML plugin, iframe sandboxing, paste detection, and registry dispatch produce no runtime errors.

---

### Test 10: State Persistence Across Reload

**Steps**:
1. Set HTML content in Page-3 tab via `evaluate_script` native setter:
   ```html
   <!DOCTYPE html>
   <html>
   <head><title>Persist Test</title></head>
   <body>
     <h1>Persistence Test</h1>
     <p>This should survive a reload</p>
   </body>
   </html>
   ```
2. `sleep(2)` — waited for localStorage debounce (500ms save timer + buffer)
3. `navigate_page(type='reload')` — full page reload
4. `sleep(4)` — waited for SPA hydration and localStorage restore
5. `take_snapshot()` — inspected post-reload state

**Observed State**:
- **All 3 tabs survived reload**:
  - Untitled-1 (FileText icon) — markdown
  - Diagram-2 (GitBranch icon) — mermaid
  - Page-3 (Code icon) — HTML (active)
- Page-3 is active with **"HTML PREVIEW"** badge
- Iframe rendering persisted content:
  - `uid=16_18` RootWebArea: "Persist Test" — correct `<title>`
  - `uid=16_19` heading level 1: "Persistence Test" — content survived
  - `uid=16_20` StaticText: "This should survive a reload" — body text intact
- Tab order preserved: Untitled-1, Diagram-2, Page-3

**Evidence**: `test-results/html-plugin/08-persistence-after-reload.png`

**Result**: **PASS** — Full state persistence including `kind` field, content, tab order, and active tab selection. The localStorage serialization correctly stores and restores `kind: "html"` which the registry uses to dispatch to `HtmlPreview` on reload.

---

## Bug Found and Fixed During Testing

### Issue
`handlePaste` in `EditorWithProview.tsx` only ran kind detection when LaTeX delimiters were converted. Regular pastes (without LaTeX) went through the browser's default paste behavior → `onChange` → `handleContentChange`, which **never** calls `detectKind()`.

### Root Cause
The paste handler at approximately line 280 had this structure:
```typescript
const handlePaste = (e: React.ClipboardEvent) => {
  const pastedText = e.clipboardData.getData('text/plain');
  const converted = convertLatexDelimiters(pastedText);
  if (converted !== pastedText) {
    // Only this branch ran detection
    e.preventDefault();
    // ... insert converted text, detect kind
  }
  // else: browser default paste → onChange → handleContentChange → NO detection
};
```

The `if (converted !== pastedText)` gate meant that when no LaTeX delimiters were found (the common case for HTML paste), the entire detection logic was skipped.

### Fix
Refactored `handlePaste` to:
1. Always compute the full resulting text (prefix + pasted + suffix)
2. Always run `detectKind()` on the resulting text
3. Intercept the paste (call `e.preventDefault()` and manually set content) if **either** the kind changes **or** LaTeX was converted
4. Added `activeKind` to the `useCallback` dependency array

### Verification
- `pnpm typecheck`: zero errors
- `pnpm lint`: zero warnings
- `pnpm build`: clean build
- Re-ran Tests 3 and 4 to confirm fix works

---

## Evidence File Manifest

| File | Test | Content |
|------|------|---------|
| `test-results/html-plugin/00-initial-load.png` | Pre-flight | Fresh app with markdown demo (from screencapture before MCP connected) |
| `test-results/html-plugin/01-new-tab-menu-open.png` | Test 1 | Dropdown showing 3 document types with icons and priority ordering |
| `test-results/html-plugin/02-new-html-tab-created.png` | Test 2 | HTML tab with sandboxed iframe preview rendering default template |
| `test-results/html-plugin/03-paste-html-autodetect.png` | Test 3 | Auto-detected HTML after paste — Code icon, HTML PREVIEW badge, iframe |
| `test-results/html-plugin/04-paste-markdown-stays-md.png` | Test 4 | Markdown not falsely detected as HTML — FileText icon, no badge |
| `test-results/html-plugin/05-mermaid-still-works.png` | Test 6 | Mermaid flowchart SVG rendering correctly |
| `test-results/html-plugin/06-markdown-still-works.png` | Test 7 | Markdown rendering with heading, bold, inline HTML |
| `test-results/html-plugin/07-empty-html-placeholder.png` | Test 8 | Empty state with "Enter HTML to see a live preview" placeholder |
| `test-results/html-plugin/08-persistence-after-reload.png` | Test 10 | All 3 tabs survived reload with correct content and icons |

---

## Final Quality Gates

| Gate | Result | Notes |
|------|--------|-------|
| `pnpm typecheck` | zero errors | Strict mode, noUnusedLocals, noUnusedParameters |
| `pnpm lint` | zero warnings | `--max-warnings 0` enforced |
| `pnpm build` | clean build (1m 19s) | Vendor + markdown chunk splitting |

---

## Reusable Patterns for Future Agents

### 1. ClipboardEvent Paste Simulation
```javascript
(el) => {
  el.focus();
  el.select();
  const dt = new DataTransfer();
  dt.setData('text/plain', content);
  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true, cancelable: true, clipboardData: dt
  });
  el.dispatchEvent(pasteEvent);
  return 'Paste event dispatched';
}
```
Use this to test paste auto-detection. Note: newlines in the string will be literal `\n` due to JavaScript string escaping in `evaluate_script`. This is a test artifact, not a rendering bug.

### 2. Clean Test Baseline
```javascript
evaluate_script(() => { localStorage.clear(); return 'Cleared'; })
navigate_page(type='reload')
sleep(3000)  // wait for full SPA hydration
```
Always clear localStorage and reload before tests that depend on a known initial state.

### 3. Native Setter for Content Manipulation
```javascript
(el) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype, 'value'
  ).set;
  setter.call(el, newContent);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return 'Content set';
}
```
Use this for setting textarea content in React-controlled inputs. **Important**: This triggers `onChange` → `handleContentChange`, which does NOT run kind detection. For testing auto-detection, use the ClipboardEvent paste simulation (Pattern 1) instead.

### 4. Zero-Error Console Verification
```javascript
list_console_messages(types=["error", "warn"])
```
Run this at the end of every test session. Any errors or warnings indicate a regression.

### 5. Renderer Type Verification via Snapshot
- **Markdown**: Look for heading, paragraph, emphasis elements directly in the tabpanel
- **Mermaid**: Look for `graphics-document` with `roledescription="flowchart-v2"` or similar
- **HTML**: Look for `Iframe` with name "HTML Preview" + `RootWebArea` inside it
- **Empty HTML**: Look for StaticText "Enter HTML to see a live preview" (no iframe)

The accessibility tree snapshot reliably distinguishes between renderer types without needing screenshots.
