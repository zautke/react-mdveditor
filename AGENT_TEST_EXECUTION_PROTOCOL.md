# Agent Test Execution Protocol

## Overview

This document provides the **exact** step-by-step process for executing autonomous browser-based tests on the markdown editor. This protocol has been validated to produce flawless test execution and must be followed precisely for idempotent results.

## Critical Prerequisites

1. **Development server MUST be running on port 5200**
   ```bash
   cd /Volumes/FLOUNDER/dev/mdeditor
   pnpm dev
   ```

2. **Server must be verified as responsive**
   - Wait 8 seconds after starting
   - Verify http://localhost:5200 returns 200 OK

3. **Browser must be navigated to the application**
   ```javascript
   navigate_page({ url: "http://localhost:5200" })
   ```

## The Core Test Pattern (Execute for Each Test)

### Step 1: Update Todo List
```javascript
TodoWrite({
  todos: [
    {"content": "Test N: [Name]", "status": "completed", "activeForm": "..."},
    {"content": "Test N+1: [Name]", "status": "in_progress", "activeForm": "..."},
    {"content": "Remaining tests...", "status": "pending", "activeForm": "..."}
  ]
})
```

**Why**: Provides progress visibility and ensures systematic completion tracking.

### Step 2: Take Fresh Snapshot
```javascript
take_snapshot()
```

**Critical**: ALWAYS take a fresh snapshot before ANY interaction with elements. Snapshots become stale after DOM updates.

**Extract textarea UID from response**: Look for the textbox element, typically `uid=X_2`

### Step 3: Clear Textarea Content
```javascript
evaluate_script({
  function: "(el) => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); return 'Cleared'; }",
  args: [{"uid": "X_2"}]  // Use UID from Step 2
})
```

**Why this exact approach**:
- Direct `.value = ''` clears content
- `dispatchEvent(new Event('input', { bubbles: true }))` triggers React's onChange handler
- Returns 'Cleared' for confirmation
- Script should return `"Cleared"` in JSON format

**Expected response**:
```json
"Cleared"
```

### Step 4: Fill Textarea with Test Content
```javascript
fill({
  uid: "X_2",  // Same UID from Step 2
  value: "# Test Content\n\nYour markdown here..."
})
```

**Important**: The `fill` operation returns a **new snapshot** showing:
1. The textarea with new value
2. The rendered preview with updated content

**Handling Timeouts**: If `fill` times out after 5000ms:
- **DO NOT PANIC** - content was likely filled successfully
- Proceed immediately to Step 5 (take snapshot)
- Verify content in the snapshot response

**Expected response structure**:
```
# fill response
Successfully filled out the element
## Page content
uid=Y_0 RootWebArea "Markdown Editor with Live Preview" url="http://localhost:5200/"
  uid=Y_1 heading "Markdown Input" level="3"
  uid=Y_2 textbox "Enter your markdown here..." focusable focused multiline value="[YOUR TEST CONTENT]"
  uid=Y_3 heading "Rendered Output" level="3"
  uid=Y_4 [RENDERED PREVIEW ELEMENTS...]
```

### Step 5: Verify Rendering in Snapshot
**Critical Verification Step**: Examine the snapshot response from Step 4 and verify:
- Textarea value matches what you filled
- Preview pane (uid=Y_3 and below) contains expected rendered elements
- For headings: Look for `heading "..." level="N"`
- For bold/italic: Look for separate StaticText elements
- For code blocks: Look for individual token elements (keywords, operators, etc.)
- For lists: Look for proper list item elements
- For tables: Look for table cell StaticText elements
- For checkboxes: Look for `checkbox checked/unchecked`

**Do NOT skip this step** - visual verification alone is insufficient.

### Step 6: Capture Screenshot
```javascript
take_screenshot({
  filePath: "/Volumes/FLOUNDER/dev/mdeditor/test-results/XX-test-name.png"
})
```

**Naming convention**: `[two-digit-number]-[descriptive-name].png`
- 01-basic-text.png
- 02-bold-italic.png
- 03-code-blocks.png
- etc.

### Step 7: Check Console Errors
```javascript
list_console_messages({
  types: ["error"]
})
```

**Expected baseline**: One non-critical 404 error (missing favicon or similar)
```
msgid=4 [error] Failed to load resource: the server responded with a status of 404 (Not Found) (0 args)
```

**Action**: If additional errors appear, document but continue unless they are React errors or blocking issues.

### Step 8: Document Test Result
After completing Steps 1-7, determine test status:
- ✅ **PASSED**: Preview updated correctly, no new console errors
- ❌ **FAILED**: Preview incorrect, new console errors, or functionality broken
- ⏭️ **SKIPPED**: Test could not execute due to blocker

## Exact Test Implementations

### Test 1: Basic Text Input & Preview

**Goal**: Verify live preview updates as user types basic markdown.

**Test Content**:
```markdown
# Hello World

This is a test of the markdown editor!
```

**Verification Criteria**:
- Preview shows `heading "Hello World" level="1"`
- Preview shows `StaticText "This is a test of the markdown editor!"`
- Live update occurs immediately (visible in fill response)

**Expected Outcome**: PASSED ✅

---

### Test 2: Bold and Italic Text

**Goal**: Verify inline formatting renders correctly.

**Test Content**:
```markdown
This is **bold text** and this is *italic text*.

You can also use __bold__ and _italic_ syntax.

Combined: ***bold and italic*** text!
```

**Verification Criteria**:
- Bold text appears as separate StaticText elements with bold styling
- Italic text appears as separate StaticText elements
- Both `**` and `__` syntax work for bold
- Both `*` and `_` syntax work for italic
- Combined `***` renders as both bold and italic

**Expected Outcome**: PASSED ✅

---

### Test 3: Code Blocks with Syntax Highlighting

**Goal**: Verify syntax highlighting works for code blocks.

**Test Content**:
```markdown
## Code Block Test

Here's a TypeScript code example:

```typescript
interface User {
  id: number;
  name: string;
  email?: string;
}

const greeting = (user: User): string => {
  return `Hello, ${user.name}!`;
};

const user: User = { id: 1, name: 'John' };
console.log(greeting(user));
```

And here's some JavaScript:

```javascript
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```
```

**Verification Criteria**:
- TypeScript code block renders with individual tokens as StaticText elements
- Keywords like `interface`, `const`, `return` are separate elements
- Operators like `:`, `=>`, `=` are separate elements
- JavaScript code block also shows token separation
- Language detection works for both `typescript` and `javascript` tags

**Expected Outcome**: PASSED ✅

**Note**: This test may timeout during fill, but content will be filled successfully. Verify in snapshot.

---

### Test 4: Lists (Ordered and Unordered)

**Goal**: Verify list rendering including nested lists and GFM task lists.

**Test Content**:
```markdown
## Lists Test

### Unordered List
- First item
- Second item
- Third item
  - Nested item 1
  - Nested item 2
- Fourth item

### Ordered List
1. First step
2. Second step
3. Third step
   1. Sub-step A
   2. Sub-step B
4. Fourth step

### Task List (GFM)
- [x] Completed task
- [x] Another done task
- [ ] Pending task
- [ ] Another pending task
```

**Verification Criteria**:
- Unordered list items render as StaticText elements
- Nested unordered items appear with proper hierarchy
- Ordered list items render with numbering
- Nested ordered items appear with sub-numbering
- Task list items render with `checkbox` elements
- Checked tasks show `checkbox checked disableable disabled`
- Unchecked tasks show `checkbox disableable disabled` (without checked)

**Expected Outcome**: PASSED ✅

---

### Test 5: Tables (GFM)

**Goal**: Verify GitHub Flavored Markdown table rendering.

**Test Content**:
```markdown
## Table Test

### Simple Table

| Feature | Supported | Notes |
|---------|-----------|-------|
| Basic Markdown | ✅ | Full CommonMark |
| GFM | ✅ | Tables, tasks, etc |
| Math | ❌ | Can be added |
| Custom Components | ✅ | Fully customizable |

### Alignment Test

| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Left text    | Center text    | Right text    |
| More left    | More center    | More right    |
| Data 1       | Data 2         | Data 3        |
```

**Verification Criteria**:
- Table headers render as StaticText elements
- All table cells render as separate StaticText elements
- First table has 4 rows of data plus headers
- Second table has 3 rows of data plus headers
- Alignment syntax (`:---`, `:---:`, `---:`) is parsed correctly
- No table structure errors in snapshot

**Expected Outcome**: PASSED ✅

**Note**: This test may timeout during fill, but content will be filled successfully. Verify in snapshot.

---

## Critical Success Patterns

### Pattern 1: The Snapshot Lifecycle
1. **Fresh Snapshot** → Interact with element → **Stale Snapshot**
2. After ANY interaction (click, fill, etc.), UIDs become stale
3. ALWAYS call `take_snapshot()` again before next interaction
4. The `fill` operation returns a new snapshot automatically - use those UIDs for verification

### Pattern 2: Event Dispatching
React applications require proper event dispatching:
```javascript
// ✅ CORRECT - Triggers React onChange
el.dispatchEvent(new Event('input', { bubbles: true }))

// ❌ WRONG - React doesn't see the change
el.value = ''
```

### Pattern 3: Timeout Handling
```javascript
// If fill times out:
fill({ uid: "X_2", value: "content" })
// Returns: "Timed out after waiting 5000ms"

// IMMEDIATELY take snapshot to verify:
take_snapshot()
// Content is usually filled successfully despite timeout
```

### Pattern 4: Verification Through Accessibility Tree
The accessibility tree snapshot is the **source of truth**:
- Visual screenshots are for human review only
- Programmatic verification happens via snapshot parsing
- Look for specific element types: heading, StaticText, checkbox, link, etc.
- Verify text content matches expected output
- Check element hierarchy and nesting

### Pattern 5: Progressive Todo Management
Update todos after EACH test completion:
```javascript
// After Test N completes:
TodoWrite({
  todos: [
    {"content": "Test N", "status": "completed", ...},
    {"content": "Test N+1", "status": "in_progress", ...},
    {"content": "Test N+2", "status": "pending", ...},
    // ... remaining tests
  ]
})
```

This provides:
- Clear progress tracking
- Easy resumption if interrupted
- User visibility into test execution

## Common Pitfalls and Solutions

### Pitfall 1: Using Stale UIDs
**Symptom**: Error message "This uid is coming from a stale snapshot"

**Solution**: Take a fresh snapshot before using any UID:
```javascript
// ❌ WRONG
const snapshot1 = take_snapshot()  // uid=1_2
click({ uid: "1_2" })
fill({ uid: "1_2", value: "..." })  // ERROR: Stale UID!

// ✅ CORRECT
const snapshot1 = take_snapshot()  // uid=1_2
click({ uid: "1_2" })
const snapshot2 = take_snapshot()  // uid=2_2
fill({ uid: "2_2", value: "..." })  // Works!
```

### Pitfall 2: Ignoring Fill Response
**Symptom**: Not verifying that content was actually rendered

**Solution**: Always examine the snapshot returned by `fill`:
```javascript
const fillResponse = fill({ uid: "X_2", value: "# Test" })
// fillResponse contains new snapshot with:
// - Textarea value
// - Rendered preview elements
// VERIFY THESE BEFORE TAKING SCREENSHOT
```

### Pitfall 3: Skipping Console Error Checks
**Symptom**: Tests pass but application has runtime errors

**Solution**: ALWAYS check console after each test:
```javascript
list_console_messages({ types: ["error"] })
// Document any NEW errors (beyond the baseline 404)
```

### Pitfall 4: Not Handling Timeouts
**Symptom**: Stopping test execution when fill times out

**Solution**: Timeouts don't mean failure:
```javascript
fill({ uid: "X_2", value: "..." })
// May return: "Timed out after waiting 5000ms"
// BUT: Content is usually filled successfully
// ALWAYS check snapshot to verify actual state
take_snapshot()  // Verify content here
```

### Pitfall 5: Forgetting to Clear Content
**Symptom**: New test content appends to old content

**Solution**: Always clear before filling:
```javascript
// Step 1: Clear with event dispatch
evaluate_script({
  function: "(el) => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); return 'Cleared'; }",
  args: [{"uid": "X_2"}]
})

// Step 2: Fill with new content
fill({ uid: "X_2", value: "new content" })
```

## Test Execution Checklist

Before starting ANY test:
- [ ] Development server running on port 5200
- [ ] Browser navigated to http://localhost:5200
- [ ] Initial snapshot and screenshot taken
- [ ] Baseline console errors documented (one 404 expected)

For EACH test:
- [ ] Todo list updated with current test as "in_progress"
- [ ] Fresh snapshot taken
- [ ] Textarea UID extracted from snapshot
- [ ] Content cleared using evaluate_script with event dispatch
- [ ] Content filled using fill with correct UID
- [ ] Rendering verified in fill response snapshot
- [ ] Screenshot captured with proper naming
- [ ] Console errors checked and documented
- [ ] Test result determined (PASS/FAIL)
- [ ] Todo list updated with test as "completed"

## File Organization

All test artifacts go in `/Volumes/FLOUNDER/dev/mdeditor/test-results/`:

```
test-results/
├── 00-initial-snapshot.txt        # Initial accessibility tree
├── 00-initial.png                 # Initial visual state
├── 01-basic-text.png              # Test 1 screenshot
├── 02-bold-italic.png             # Test 2 screenshot
├── 03-code-blocks.png             # Test 3 screenshot
├── 04-lists.png                   # Test 4 screenshot
├── 05-tables.png                  # Test 5 screenshot
├── 06-links.png                   # Test 6 screenshot
└── ... (continue for all tests)
```

## Expected Test Results Summary

After completing Tests 1-5, expected state:
- **Total Tests Executed**: 5
- **Passed**: 5
- **Failed**: 0
- **Console Errors**: 1 (non-critical 404)
- **Screenshots Captured**: 6 (initial + 5 tests)

All tests should PASS with:
- ✅ Live preview updating correctly
- ✅ Proper markdown rendering
- ✅ Syntax highlighting functional
- ✅ No React errors
- ✅ No new console errors beyond baseline

## Advanced Test Scenarios (Tests 6-20)

Following the same core pattern, implement:

**Test 6: Links and Auto-linking**
- Markdown links: `[text](url)`
- Auto-linked URLs: `https://example.com`
- Verify anchor elements in snapshot

**Test 7: Blockquotes**
- Single and multi-line blockquotes
- Nested blockquotes
- Verify blockquote styling

**Test 8: Horizontal Rules**
- Different HR syntaxes: `---`, `***`, `___`
- Verify separator rendering

**Test 9: Mixed Content**
- Combine multiple markdown elements
- Verify no rendering conflicts

**Test 10: Performance & Responsiveness**
- Large content input
- Rapid typing simulation
- Memory usage monitoring

**Tests 11-14: Edge Cases**
- Empty content
- Invalid markdown
- Large documents (5000+ lines)
- Special characters and escaping

**Test 15: Mexican Theme Verification**
- Gradient headings
- Colored table borders
- Blockquote orange borders
- Decorative corners

**Tests 16-17: Quality Audits**
- Accessibility audit (target >90%)
- Performance audit (target >80%)

**Test 18: Component Switching**
- Test different renderer components
- Verify each works independently

**Tests 19-20: Monitoring**
- Console error detection throughout
- Network request monitoring

## Recovery Procedures

### If Test Fails
1. Document failure details
2. Take screenshot of failure state
3. Check console for specific errors
4. Note in todo list as failed
5. Continue with next test
6. Return to failed test after completing others

### If Server Crashes
1. Check background bash output
2. Restart server: `cd /Volumes/FLOUNDER/dev/mdeditor && pnpm dev`
3. Wait 8 seconds for startup
4. Navigate to http://localhost:5200
5. Resume from last completed test

### If Browser Becomes Unresponsive
1. Take snapshot to verify state
2. If snapshot fails, restart browser session
3. Navigate to http://localhost:5200
4. Resume from last completed test

## Final Report Generation

After completing all tests, create `TEST_RESULTS.md`:

```markdown
# Test Results Summary

**Date**: [timestamp]
**Total Tests**: 20
**Passed**: [count]
**Failed**: [count]
**Skipped**: [count]

## Test Details

### Test 1: Basic Text Input
- Status: PASSED ✅
- Screenshot: test-results/01-basic-text.png
- Console Errors: 1 (baseline 404)
- Notes: Live preview updated correctly

[... continue for all tests ...]

## Console Errors
- Baseline 404: Non-critical, missing favicon
- [List any additional errors]

## Performance Metrics
- Average test execution time: [time]
- Total execution time: [time]
- Memory usage: [if monitored]

## Recommendations
[Any issues discovered or improvements suggested]
```

## Success Criteria

### Must Pass (Critical)
- ✅ All 20 tests execute without fatal errors
- ✅ Live preview updates correctly for all markdown elements
- ✅ No console errors during normal operation (beyond baseline)
- ✅ All GFM features work (tables, task lists, strikethrough)
- ✅ Syntax highlighting works for code blocks
- ✅ Mexican theme styling applies correctly

### Should Pass (Important)
- ✅ Accessibility score > 90%
- ✅ Performance score > 80%
- ✅ No memory leaks during extended use
- ✅ Handles large documents (5000+ lines)
- ✅ Responsive to rapid input

### Nice to Have
- ✅ Zero warnings in console
- ✅ Perfect accessibility score (100%)
- ✅ Sub-second rendering for all operations

---

## Document Maintenance

**Version**: 1.0
**Created**: 2025-11-11
**Last Validated**: 2025-11-11
**Validation Result**: 5/5 tests passed flawlessly

**Validation Signature**: Tests 1-5 executed successfully with zero deviations from protocol.

This protocol represents the **exact** execution path that produced perfect test results. Follow it precisely for idempotent test execution.
