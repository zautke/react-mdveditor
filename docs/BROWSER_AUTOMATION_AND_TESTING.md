```yaml
# AGENT METAPROMPT — DO NOT REMOVE
# This header instructs agents on how to maintain this document as a living artifact.
# Based on ACE (Agentic Context Engineering, ICLR 2026) principles:
# - Treat this document as an evolving playbook
# - Prevent brevity bias: never drop domain insights for concise summaries
# - Prevent context collapse: structured incremental updates, never full rewrites
# - Generation → Reflection → Curation cycle on each update
#
# MAINTENANCE PROTOCOL:
# 1. After each browser testing session, APPEND findings to relevant sections
# 2. When a technique is proven wrong, move it to Anti-Patterns (never delete — context matters)
# 3. When adding new techniques, include: date discovered, test run reference, evidence path
# 4. Before modifying existing content, read CURATING_THE_BROWSER_AUTOMATION_DOC.md
# 5. Always preserve the session reference in browser-runs/ for each finding
#
# CURATION SCHEDULE:
# - After every browser test session: append new findings
# - Monthly: review for stale information, mark deprecated (don't delete)
# - Quarterly: restructure sections if they exceed 50 items
```

# Browser Automation and Testing — mdeditor

## Purpose

This document is the authoritative reference for browser-based testing of the mdeditor application. It captures proven patterns, anti-patterns, tool selection criteria, troubleshooting decision trees, and evidence-based testing methodology discovered across multiple test sessions.

**Target audience**: AI agents and human developers executing browser tests against `http://localhost:5200`.

**Relationship to other docs**:
- `CLAUDE.md` — project conventions, architecture, development commands
- `AGENT_TEST_EXECUTION_PROTOCOL.md` — step-by-step test execution protocol for individual markdown rendering tests
- `docs/multi-agent-team-manifest.md` — agent roles including Browser Test Engineer and QA Engineer
- `docs/browser-runs/` — per-session run logs with raw evidence (referenced throughout this document)

---

## Prerequisites

### Required Infrastructure
- Dev server running: `pnpm dev` (port **5200**, NOT 5173)
- Chrome browser with a page open to `http://localhost:5200`
- Chrome DevTools MCP server connected (REQUIRED — see Tool Hierarchy)
- `test-results/` directory for evidence storage (gitignored)

### Pre-Flight Checklist
Before ANY browser interaction:

1. **Verify dev server**:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:5200
   ```
   Expected: `200`. If not, run `pnpm dev` and wait ~8 seconds.

2. **Verify Chrome DevTools MCP**: `list_pages` must return at least one page.
   If it fails, **stop** — ask the user to connect Chrome DevTools MCP before proceeding.

3. **Navigate to app**:
   ```javascript
   navigate_page({ url: "http://localhost:5200" })
   ```

4. **Wait for initialization**: Sleep 3 seconds minimum. Mermaid and MathJax lazy-load; the tab system hydrates from localStorage.

5. **Take baseline snapshot + screenshot**:
   ```javascript
   take_snapshot()
   take_screenshot({ filePath: "test-results/00-baseline.png" })
   ```

6. **Check console for errors**:
   ```javascript
   list_console_messages({ types: ["error", "warn"] })
   ```
   Document any baseline errors (e.g., favicon 404). These are excluded from test failure criteria.

---

## Tool Hierarchy and Selection

### Tier 1: Chrome DevTools MCP (REQUIRED)
The ONLY reliable method for browser testing. Provides:

| Tool | Purpose |
|------|---------|
| `take_snapshot()` | a11y tree with UIDs — preferred over screenshots for element identification |
| `take_screenshot(filePath)` | Visual evidence capture |
| `click(uid)` / `fill(uid, value)` | DOM interaction |
| `press_key(key)` | Keyboard input (e.g., `"Enter"`, `"Control+A"`) |
| `evaluate_script(function, args)` | JavaScript execution in page context |
| `navigate_page(url/reload/back)` | Navigation |
| `list_console_messages(types)` | Error monitoring |
| `wait_for(text)` | Wait for async content loading |
| `hover(uid)` | Trigger hover states |

### Tier 2: macOS screencapture (SUPPLEMENTARY ONLY)
```bash
screencapture -x <path>
```
- Captures the entire screen
- **Cannot** interact with page elements
- Useful ONLY when DevTools MCP is not connected, and only for visual evidence

### Tier 3: AppleScript System Events (LAST RESORT)
- Keyboard shortcuts and mouse clicks at screen coordinates
- **CANNOT** execute JavaScript in Chrome (blocked by default)
- Unreliable coordinate mapping on Retina displays
- Use ONLY for launching Chrome or opening DevTools panel

### NEVER USE
- Local Playwright/Puppeteer installations (not part of this project's test infrastructure)
- AppleScript `execute javascript` — blocked in modern Chrome without explicit user opt-in
- `osascript` for page content manipulation

### Why This Hierarchy Exists (Discovered 2026-02-14)

Run 2 (HTML Plugin Testing) attempted Tiers 2-3 before DevTools MCP was available. The progression of failures:

1. `screencapture` captured screenshots but couldn't interact with the page
2. AppleScript `execute javascript` was blocked:
   > "Executing JavaScript through AppleScript is turned off. To turn it on, from the menu bar, go to View > Developer > Allow JavaScript from Apple Events."
3. System Events keyboard shortcuts (`Cmd+Option+J`) could open DevTools but couldn't type into the console reliably
4. **Conclusion**: Without Chrome DevTools MCP, browser testing is effectively impossible for AI agents. The agent wasted ~15 minutes of a test session discovering this. This hierarchy exists so no agent wastes time on this again.

**Evidence**: `docs/browser-runs/2026-02-14-html-plugin-failed-approaches.md`

---

## Evidence-Based Testing Methodology

### The Atomic Action Pattern
Every test follows this cycle:

```
BEFORE → SNAPSHOT → ACTION → WAIT → SNAPSHOT → SCREENSHOT → VERIFY
```

| Step | Tool | Purpose |
|------|------|---------|
| 1. BEFORE | `take_screenshot(filePath)` | Evidence of starting state |
| 2. SNAPSHOT | `take_snapshot()` | Get current UIDs for interaction |
| 3. ACTION | `click` / `fill` / `evaluate_script` | Single interaction |
| 4. WAIT | `sleep 1-3s` or `wait_for(text)` | React re-render, async operations |
| 5. SNAPSHOT | `take_snapshot()` | Verify DOM changes |
| 6. SCREENSHOT | `take_screenshot(filePath)` | Visual evidence of result |
| 7. VERIFY | Examine snapshot content | Compare elements against expected state |

**Why single actions?** Combining multiple actions before verification makes failures impossible to diagnose. Each action must be independently verifiable.

### UID Ephemerality — The Most Critical Rule

UIDs from Chrome DevTools snapshots change after ANY DOM mutation:
- After clicking a button
- After React re-renders (triggered by state changes)
- After hover effects that change DOM structure
- After dropdown opens/closes
- After tab switches
- After HMR updates

**ALWAYS take a fresh snapshot immediately before using any UID.**

```javascript
// WRONG — stale UID
const snapshot1 = take_snapshot()  // uid=1_2
click({ uid: "1_2" })             // DOM changes
fill({ uid: "1_2", value: "x" })  // ERROR: stale UID!

// CORRECT — fresh UID after each mutation
const snapshot1 = take_snapshot()  // uid=1_2
click({ uid: "1_2" })             // DOM changes
const snapshot2 = take_snapshot()  // uid=2_2 (new!)
fill({ uid: "2_2", value: "x" })  // Works
```

**Exception**: The `fill()` tool returns a new snapshot in its response. You can use UIDs from that response for verification without taking another snapshot — but you must take a fresh one before the NEXT interaction.

### React State Manipulation via evaluate_script

#### Setting textarea content (simulates typing)
```javascript
// CORRECT: Uses native setter to trigger React's onChange
evaluate_script({
  function: `(el) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    setter.call(el, 'new content here');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return 'Done';
  }`,
  args: [{"uid": "TEXTAREA_UID"}]
})
```

**Why the native setter?** React overrides the `value` property on controlled components. Setting `el.value` directly bypasses React's synthetic event system. Using `Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set` calls the native DOM setter, then the `input` event triggers React's `onChange` handler.

#### Clearing textarea content
```javascript
evaluate_script({
  function: `(el) => {
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return 'Cleared';
  }`,
  args: [{"uid": "TEXTAREA_UID"}]
})
```

**Note**: For clearing, the simpler `el.value = ''` approach works because React's synthetic event system sees the empty value through the `input` event regardless. The native setter approach is only strictly necessary when setting non-empty values.

#### Simulating paste with ClipboardEvent
```javascript
evaluate_script({
  function: `(el) => {
    el.focus();
    el.select();
    const dt = new DataTransfer();
    dt.setData('text/plain', 'content to paste');
    const evt = new ClipboardEvent('paste', {
      bubbles: true, cancelable: true, clipboardData: dt
    });
    el.dispatchEvent(evt);
    return 'Pasted';
  }`,
  args: [{"uid": "TEXTAREA_UID"}]
})
```

**When to use paste vs. native setter**: See "Auto-Detection Testing" below — the choice matters because they trigger different code paths.

### Console Error Monitoring
After every significant action:
```javascript
list_console_messages({ types: ["error", "warn"] })
```
Zero errors/warnings is the standard (beyond the baseline favicon 404). Any console output should be investigated and documented.

---

## Troubleshooting Decision Tree

### "Element not found" or click does nothing
```
1. Did you take a FRESH snapshot?
   → If no: take one now, use new UIDs
2. Is the element visible in the snapshot?
   → If no: scroll to element, or check if it's hidden behind a modal/overlay
3. Is the UID from the LATEST snapshot?
   → If using old UID: take new snapshot
4. Is the element behind a modal/overlay?
   → Close overlay first, then take fresh snapshot
5. Is there a timing issue?
   → Add sleep(2) before snapshot
6. Is the element interactive?
   → Check snapshot: does it say "focusable" or "clickable"?
   → Some elements need hover() before click()
```

### "Content didn't change after fill/paste"
```
1. Is this a React controlled component?
   → YES: Use evaluate_script with native setter + input event (see above)
   → NO: fill() should work; check UID freshness
2. Did you use the correct event type?
   → For simulating paste: ClipboardEvent with DataTransfer
   → For simulating input: Event('input', { bubbles: true })
   → CRITICAL: bubbles: true is required, otherwise React won't see it
3. Did React state actually update?
   → take_snapshot() and verify textarea value attribute in the response
4. Did the fill() time out?
   → Timeouts usually mean the content WAS filled but the MCP timed out waiting
   → Take a snapshot to verify actual state (content is usually there)
```

### "Preview doesn't match editor content"
```
1. Is the correct document kind active?
   → Check tab icon in snapshot: FileText = markdown, GitBranch = mermaid, Code = html
   → Check for iframe (html), graphics-document (mermaid), or heading/text nodes (markdown)
2. Is the renderer dispatching correctly?
   → If wrong renderer: check that document.kind is set correctly
   → localStorage may have stale kind values from previous sessions
3. Is there a timing issue with async rendering?
   → Mermaid renders asynchronously — wait 3s after content change
   → HTML iframe needs 1-2s for srcDoc to load
   → MathJax equations need 2-3s for rendering
4. Is the content valid for the detected kind?
   → Invalid mermaid syntax shows error message, not diagram
   → Malformed HTML may not render in iframe as expected
```

### "Auto-detection didn't switch document kind"
```
1. How was the content set?
   → evaluate_script with native setter:
     Goes through handleContentChange → NO detection (by design)
   → ClipboardEvent paste:
     Goes through handlePaste → HAS detection (fixed 2026-02-14)
   → File drop:
     Goes through handleDrop → HAS detection
   → fill() tool:
     Goes through React onChange → same as handleContentChange → NO detection

2. WHY handleContentChange does NOT re-detect:
   → Intentional design: prevents kind-switching on every keystroke
   → Detection only triggers on discrete events: paste, drop, file import
   → This is correct behavior, not a bug

3. To test auto-detection: use ClipboardEvent paste simulation (see code above)
4. To test rendering without detection: use fill() or native setter
```

### "Chrome DevTools MCP not connected"
```
1. Is Chrome running?
   → If no: launch Chrome, navigate to http://localhost:5200
2. Is Chrome DevTools MCP server running?
   → User must configure and connect it — agents cannot do this
3. Check: list_pages
   → Should return at least one page
4. If no MCP available:
   → Fall back to screencapture for visual evidence ONLY (no interaction)
   → ASK THE USER to connect Chrome DevTools MCP before proceeding
   → Do NOT attempt AppleScript JavaScript execution (it will fail)
```

### "Dev server not responding"
```
1. Check if server process is running:
   → curl -s -o /dev/null -w "%{http_code}" http://localhost:5200
   → Expected: 200
2. If not 200:
   → Start server: pnpm dev (from project root)
   → Wait 8 seconds for full initialization
   → Verify again with curl
3. If server was running but crashed:
   → Check terminal output for error messages
   → Common cause: syntax error in source file (HMR failure)
   → Fix the error, server should auto-restart via Vite HMR
4. If port 5200 is occupied:
   → lsof -i :5200 to find the process
   → Kill it and restart
```

---

## Testing Patterns for mdeditor Specifics

### Testing New Document Type Plugins

When a new document type plugin is added (via the document type registry system), execute this complete matrix:

| # | Test | Method | Expected |
|---|------|--------|----------|
| 1 | Menu entry exists | Click "+" dropdown → take snapshot → verify menuitem text + icon | New menu item with correct icon and label |
| 2 | Tab creation | Click menu item → take snapshot | New tab with correct title, icon, default content in textarea |
| 3 | Preview rendering | Verify tabpanel content in snapshot | Correct renderer (iframe for html, svg for mermaid, prose for markdown) |
| 4 | Paste auto-detect (positive) | ClipboardEvent paste of type-specific content into markdown tab | Kind switches to new type, preview switches to correct renderer |
| 5 | Paste auto-detect (negative: markdown) | Paste plain markdown content into new type tab | Kind does NOT switch (markdown is priority 0, only wins when nothing else matches) |
| 6 | Paste auto-detect (negative: mermaid) | Paste mermaid content into new type tab | Detects as mermaid (if mermaid priority > new type priority) |
| 7 | Empty state | Clear textarea content | Placeholder text shown, no console errors |
| 8 | Console clean | `list_console_messages({ types: ["error", "warn"] })` | Zero new errors/warnings |
| 9 | State persistence | `navigate_page({ type: 'reload' })` → verify | Content + kind survive page reload (localStorage) |
| 10 | Existing types unaffected | Switch to markdown/mermaid tabs | Render correctly with their own renderers |

**Evidence path**: `test-results/plugin-[name]-[01-10].png`

### Testing Tab System Interactions

The tab system is central to the editor. Test matrix:

| Test | Steps | Verification |
|------|-------|--------------|
| Create tab | Click "+" → select type from dropdown | New tab appears in tablist, correct icon and title |
| Switch tabs | Click different tab | Tabpanel changes, textarea shows that tab's content |
| Close tab | Click "Close tab" button (× icon) | Tab removed from tablist, adjacent tab activates |
| Close last tab | Close all tabs one by one | At least one tab should remain (or empty state) |
| Tab icons | Take snapshot of tablist | Each tab shows icon matching its document kind |
| Tab rename | If supported: double-click tab title | Title becomes editable |
| Tab persistence | Reload page | All tabs, their content, and their kinds survive |

### Testing Paste Auto-Detection

The paste handler in `EditorWithProview.tsx` computes the full resulting text and detects kind:

**How it works**:
1. User pastes content into textarea
2. `handlePaste` fires, constructs the full document text (before-selection + pasted + after-selection)
3. Calls `registry.detect(fullText)` to determine document kind
4. If detected kind differs from current kind, updates the document's kind
5. Preview re-renders with the correct renderer

**Detection priority order** (higher number = checked first):
- Mermaid: priority 10 (checks for `graph`, `flowchart`, `sequenceDiagram`, etc.)
- HTML: priority 5 (checks for `<!doctype html` or `<html`)
- Markdown: priority 0 (fallback — always returns true)

**Testing auto-detection correctly**:
```javascript
// MUST use ClipboardEvent — fill() and native setter bypass detection
evaluate_script({
  function: `(el) => {
    el.focus();
    el.select();
    const dt = new DataTransfer();
    dt.setData('text/plain', '<!doctype html>\\n<html>\\n<body>Hello</body>\\n</html>');
    const evt = new ClipboardEvent('paste', {
      bubbles: true, cancelable: true, clipboardData: dt
    });
    el.dispatchEvent(evt);
    return 'Pasted HTML';
  }`,
  args: [{"uid": "TEXTAREA_UID"}]
})
```

Then verify:
1. Take snapshot → check that tab icon changed to the HTML icon
2. Check that preview shows an iframe (HTML renderer) instead of prose (markdown renderer)
3. Take screenshot for evidence

### Testing Markdown Rendering Features

Refer to `AGENT_TEST_EXECUTION_PROTOCOL.md` for the complete step-by-step protocol for testing individual markdown features (headings, bold/italic, code blocks, lists, tables, links, blockquotes, etc.).

Key additions beyond that protocol:

| Feature | What to verify in snapshot |
|---------|---------------------------|
| GFM Tables | `table`, `row`, `cell`, `columnheader` elements |
| Task lists | `checkbox checked` / `checkbox` (unchecked) elements |
| Mermaid diagrams | `graphics-document` element (SVG rendered by mermaid) |
| Math equations | MathJax-rendered elements (may appear as `img` with alt text or SVG) |
| Syntax highlighting | Individual `StaticText` elements for tokens (keywords, operators, strings) |
| Auto-linked URLs | `link` elements with `url` attribute matching the URL |

---

## Cherry-Picking from Previous Test Runs

**BEFORE reinventing the wheel**, agents MUST:
1. Read the `docs/browser-runs/` directory listing
2. Scan run summaries for similar test scenarios
3. Reuse working test sequences and `evaluate_script` snippets
4. Note anti-patterns that caused failures in prior runs

### Index of Test Runs

| Run | Date | Branch | Focus | Key Learnings |
|-----|------|--------|-------|---------------|
| `2026-02-14-registry-refactor.md` | 2026-02-14 | feature/document-type-registry | 17-point test matrix for registry refactor | Tab system basics, snapshot patterns, menu interaction, tab creation/switching |
| `2026-02-14-html-plugin-failed-approaches.md` | 2026-02-14 | feat/html-document-type | Tool hierarchy discovery | AppleScript blocked, screencapture limits, 15 min wasted on Tiers 2-3 |
| `2026-02-14-html-plugin-cdp-testing.md` | 2026-02-14 | feat/html-document-type | 10-point HTML plugin verification | Paste detection bug found + fixed, evaluate_script patterns for ClipboardEvent, iframe verification |

### Reusable Snippets Index

These snippets are proven to work. Copy them verbatim (only change UIDs):

| Snippet | Source Run | Description |
|---------|-----------|-------------|
| Clear textarea | registry-refactor | `el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true }));` |
| Native setter fill | registry-refactor | `Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set` |
| ClipboardEvent paste | html-plugin-cdp | `DataTransfer` + `ClipboardEvent('paste', ...)` |
| Clear localStorage | html-plugin-cdp | `localStorage.clear(); return 'Cleared';` |
| Check textarea value | registry-refactor | Take snapshot → look for `textbox` element → read `value` attribute |

---

## Anti-Patterns (What Fails)

### 1. Using AppleScript `execute javascript` (Discovered 2026-02-14)

**Source**: `docs/browser-runs/2026-02-14-html-plugin-failed-approaches.md`

Chrome blocks JavaScript execution via AppleScript by default. The error:
> "Executing JavaScript through AppleScript is turned off. To turn it on, from the menu bar, go to View > Developer > Allow JavaScript from Apple Events."

This requires manual user action in Chrome's menu bar and is not something an agent can enable programmatically. **Never attempt this.** Use Chrome DevTools MCP `evaluate_script` instead.

### 2. Using evaluate_script native setter for auto-detection testing (Discovered 2026-02-14)

**Source**: `docs/browser-runs/2026-02-14-html-plugin-cdp-testing.md`

`Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set` + `new Event('input')` goes through React's `handleContentChange`, which does **NOT** re-detect document kind. This is by design — the editor intentionally doesn't re-detect on every keystroke.

**For detection testing**: Use `ClipboardEvent` paste simulation. This routes through `handlePaste`, which does run detection.

**For rendering testing**: Using the native setter is fine — you just need to set the document kind separately if it matters.

### 3. Assuming fresh page state after HMR (Discovered 2026-02-14)

After code changes, HMR may preserve React state (including localStorage-hydrated state). If you need a clean slate:

```javascript
evaluate_script({ function: `() => { localStorage.clear(); return 'Cleared'; }` })
// Then reload
navigate_page({ type: 'reload' })
// Then wait 3s for re-initialization
```

Without this, tests may pass or fail depending on leftover state from prior sessions. **Always clear localStorage for a fresh baseline** when testing state-dependent behavior.

### 4. Escaped newlines in DataTransfer content (Discovered 2026-02-14)

When using `DataTransfer.setData()` inside `evaluate_script`, be careful with string escaping:

```javascript
// WRONG — produces literal \n characters in the string
dt.setData('text/plain', 'line1\\nline2');

// CORRECT — produces actual newline characters
dt.setData('text/plain', 'line1\nline2');
```

In the `evaluate_script` function string, `\n` becomes a real newline. `\\n` becomes a literal backslash-n. This matters for content that spans multiple lines (which is most markdown/mermaid/HTML content).

### 5. Testing without clearing stale localStorage (Discovered 2026-02-14)

Previous test sessions leave state in localStorage. The migration code only fills in `kind` when it's missing — it won't re-detect kind for documents that already have one.

**Impact**: A document saved as "markdown" in a previous session will stay "markdown" even if you paste HTML content via the native setter (because the setter doesn't trigger detection, and the stored kind is already set).

**Solution**: Always clear localStorage when testing kind detection or state persistence.

### 6. Using fill() for large content (Discovered 2026-02-14)

The `fill()` tool may time out after 5000ms for large content. This does NOT mean the fill failed — content is usually set successfully.

**Solution**: After a timeout, take a snapshot to verify the content was actually set. Don't retry the fill — that would append or cause other issues.

### 7. Attempting to interact with iframe content via parent UIDs

HTML document type renders in an iframe. UIDs from the parent page snapshot cannot reference elements inside the iframe. To verify iframe content:

```javascript
// Check that iframe exists in snapshot (look for 'Iframe' element)
// Then use evaluate_script to inspect iframe content:
evaluate_script({
  function: `() => {
    const iframe = document.querySelector('iframe');
    return iframe ? iframe.srcdoc.substring(0, 200) : 'No iframe found';
  }`
})
```

---

## Quality Gates (Run After Every Test Session)

```bash
pnpm typecheck   # zero errors (TypeScript strict mode)
pnpm lint        # zero warnings (--max-warnings 0)
pnpm build       # clean production build
```

All three MUST pass. If a code fix was applied during testing (e.g., fixing a bug discovered by browser tests), re-run all three gates before declaring the test session complete.

**Evidence**: Save gate outputs to `test-results/quality-gates.txt`:
```bash
pnpm typecheck 2>&1 | tee test-results/quality-gates.txt
pnpm lint 2>&1 | tee -a test-results/quality-gates.txt
pnpm build 2>&1 | tee -a test-results/quality-gates.txt
```

---

## Test Session Workflow (End-to-End)

This is the complete workflow an agent should follow for a browser test session:

### Phase 1: Setup
1. Verify dev server is running (`curl` check)
2. Verify Chrome DevTools MCP (`list_pages`)
3. Navigate to `http://localhost:5200`
4. Wait 3s
5. Clear localStorage if testing state-dependent behavior
6. Take baseline snapshot + screenshot
7. Document baseline console errors

### Phase 2: Test Execution
For each test case:
1. Update todo list (mark current test as `in_progress`)
2. Take fresh snapshot
3. Execute test action(s) following Atomic Action Pattern
4. Take post-action snapshot
5. Take screenshot with descriptive filename
6. Check console for new errors
7. Record PASS/FAIL with evidence
8. Update todo list (mark test as `completed`)

### Phase 3: Evidence & Quality
1. Run quality gates (`typecheck`, `lint`, `build`)
2. Compile test results summary
3. Save all evidence to `test-results/`
4. Append new findings to this document (see Maintenance Protocol in YAML header)
5. Create/update session log in `docs/browser-runs/`

### File Organization
```
test-results/
├── 00-baseline.png                # Initial visual state
├── 00-baseline-snapshot.txt       # Initial a11y tree
├── 01-[test-name].png             # Test 1 screenshot
├── 02-[test-name].png             # Test 2 screenshot
├── ...
├── quality-gates.txt              # typecheck + lint + build output
└── TEST_RESULTS.md                # Session summary report

docs/browser-runs/
├── YYYY-MM-DD-[branch-or-focus].md  # Per-session run logs
└── ...
```

### Test Results Report Template

```markdown
# Test Results — [Session Description]

**Date**: YYYY-MM-DD
**Branch**: [branch name]
**Agent**: Browser Test Engineer
**Total Tests**: [N]
**Passed**: [N] | **Failed**: [N] | **Skipped**: [N]

## Quality Gates
- typecheck: [PASS/FAIL]
- lint: [PASS/FAIL]
- build: [PASS/FAIL]

## Test Details

| # | Test | Status | Screenshot | Console Errors | Notes |
|---|------|--------|------------|----------------|-------|
| 1 | [name] | PASS/FAIL | test-results/01-name.png | 0 | [notes] |
| ... | ... | ... | ... | ... | ... |

## Bugs Found
- [List any bugs discovered during testing, with steps to reproduce]

## Anti-Patterns Discovered
- [Any new anti-patterns to add to the main document]

## Recommendations
- [Improvements or follow-up work needed]
```

---

## Agent Role Integration

Per `docs/multi-agent-team-manifest.md`, two agents are responsible for browser testing:

### Browser Test Engineer
- Executes live browser tests at `http://localhost:5200`
- Uses Chrome DevTools MCP for all interactions
- Produces screenshot evidence per test case
- Monitors for zero console errors/warnings
- Definition of Done: All user workflows verified, full-page screenshots, zero console errors

### QA Engineer
- Executes quality gates (`typecheck`, `lint`, `build`)
- Compiles evidence packages
- Runs the 17-point (or expanded) test matrix
- Produces before/after bundle comparisons

### Handoff Protocol
When Browser Test Engineer completes a session:
```
## Handoff: Browser Test Engineer → QA Engineer
**Phase completed**: M4 (Browser Testing)
**Artifacts produced**: test-results/*.png, test-results/TEST_RESULTS.md
**Quality gates passed**: [typecheck/lint/build status]
**Known issues**: [any bugs found]
**Console errors**: [count and descriptions]
**Next steps**: Compile evidence package, verify quality gates independently
```

---

## Research Foundations

This document synthesizes findings from:

1. **ACE — Agentic Context Engineering** (Microsoft/Stanford, ICLR 2026): Treats this document as an evolving playbook. Structured incremental updates prevent brevity bias (losing domain insights during summarization) and context collapse (iterative rewrites eroding accumulated details). The YAML metaprompt header enforces this discipline.

2. **Anthropic Context Engineering** (Sep 2025): The full context stack matters — not just the prompt, but tool definitions, memory, retrieved knowledge, and execution state. Browser testing context must include tool availability, page state, and prior run knowledge. This is why the Pre-Flight Checklist verifies all layers before testing begins.

3. **MetaAgent / Self-Evolving Agents** (BAAI/OpenAI, 2025): Learning-by-doing with continual self-reflection. Each test session distills actionable experience into this document. Past failures and successes are equally valuable — hence the Anti-Patterns section preserves failures rather than deleting them.

4. **Browser Automation Protocol** (basic-memory, agentic-kb): Evidence-first atomic actions, UID ephemerality, React controlled component handling, pre-flight checklists. These patterns were validated across three test runs and codified in the Atomic Action Pattern and React State Manipulation sections above.

---

*Last updated: 2026-02-14*
*Document version: 1.0*
*Based on: 3 completed browser test sessions across 2 branches*
