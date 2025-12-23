# Autonomous User-Impersonation Testing Plan

## Overview

This document outlines a comprehensive testing strategy for the markdown editor using browser automation tools exclusively. The testing will simulate real user interactions to validate all functionality.

## Available Browser Tools

### Chrome DevTools MCP Tools
- `mcp__chrome-devtools__navigate_page` - Navigate to URLs
- `mcp__chrome-devtools__take_snapshot` - Take accessibility tree snapshots
- `mcp__chrome-devtools__take_screenshot` - Visual verification
- `mcp__chrome-devtools__click` - Click elements by UID
- `mcp__chrome-devtools__fill` - Fill input/textarea elements
- `mcp__chrome-devtools__evaluate_script` - Execute JavaScript
- `mcp__chrome-devtools__list_console_messages` - Check console errors
- `mcp__chrome-devtools__list_network_requests` - Monitor network activity
- `mcp__chrome-devtools__wait_for` - Wait for text to appear

### Browser Tools MCP
- `mcp__BrowserTools__getConsoleLogs` - Check console logs
- `mcp__BrowserTools__getConsoleErrors` - Check console errors
- `mcp__BrowserTools__takeScreenshot` - Take screenshots
- `mcp__BrowserTools__runAccessibilityAudit` - Lighthouse accessibility audit
- `mcp__BrowserTools__runPerformanceAudit` - Lighthouse performance audit

## Testing Strategy

### Phase 1: Environment Setup & Initialization
1. Start the development server (port 5200)
2. Navigate to `http://localhost:5200`
3. Take initial snapshot and screenshot
4. Verify page loads without console errors
5. Verify network requests succeed

### Phase 2: UI Component Verification
1. **Snapshot Analysis**: Take accessibility tree snapshot
2. **Identify Elements**:
   - Locate markdown textarea (left pane)
   - Locate preview pane (right pane)
   - Identify any buttons/controls
3. **Visual Verification**: Take screenshot for baseline

### Phase 3: Core Functionality Testing

#### Test 1: Basic Text Input & Preview
**Goal**: Verify live preview updates as user types

**Steps**:
1. Take snapshot to get textarea UID
2. Click textarea to focus
3. Clear any existing content
4. Type basic markdown: `# Hello World`
5. Wait for preview to update
6. Take screenshot of result
7. Verify preview contains "Hello World" heading
8. Check console for errors

**Expected Result**: Preview shows rendered H1 heading

#### Test 2: Bold and Italic Text
**Goal**: Verify inline formatting renders correctly

**Steps**:
1. Clear textarea
2. Type: `This is **bold** and *italic* text`
3. Wait for preview update
4. Take snapshot and screenshot
5. Verify bold and italic rendering
6. Check console logs

**Expected Result**: Text renders with proper formatting

#### Test 3: Code Blocks with Syntax Highlighting
**Goal**: Verify syntax highlighting works

**Steps**:
1. Clear textarea
2. Type markdown code block:
   ```
   ```typescript
   const greeting: string = "Hello";
   console.log(greeting);
   ```
   ```
3. Wait for preview update
4. Take screenshot
5. Verify syntax highlighting applied
6. Check for Prism/SyntaxHighlighter elements in DOM

**Expected Result**: Code block displays with TypeScript syntax highlighting

#### Test 4: Lists (Ordered and Unordered)
**Goal**: Verify list rendering

**Steps**:
1. Clear textarea
2. Type:
   ```
   ## Lists
   - Item 1
   - Item 2

   1. First
   2. Second
   ```
3. Wait for preview
4. Take snapshot
5. Verify both list types render correctly
6. Check list structure in accessibility tree

**Expected Result**: Both bullet and numbered lists render correctly

#### Test 5: Tables (GFM)
**Goal**: Verify GitHub Flavored Markdown tables work

**Steps**:
1. Clear textarea
2. Type markdown table:
   ```
   | Header 1 | Header 2 |
   |----------|----------|
   | Cell 1   | Cell 2   |
   | Cell 3   | Cell 4   |
   ```
3. Wait for preview
4. Take screenshot
5. Verify table structure
6. Check for proper table HTML elements

**Expected Result**: Table renders with proper styling

#### Test 6: Links and Auto-linking
**Goal**: Verify links are clickable and auto-linked

**Steps**:
1. Clear textarea
2. Type:
   ```
   [Link Text](https://example.com)

   Auto-link: https://github.com
   ```
3. Wait for preview
4. Take snapshot
5. Verify links are rendered as anchor tags
6. Check href attributes

**Expected Result**: Links are properly rendered and formatted

#### Test 7: Blockquotes
**Goal**: Verify blockquote styling

**Steps**:
1. Clear textarea
2. Type:
   ```
   > This is a blockquote
   > with multiple lines
   ```
3. Wait for preview
4. Take screenshot
5. Verify blockquote styling (border, background)

**Expected Result**: Blockquote displays with Mexican theme styling

#### Test 8: Horizontal Rules
**Goal**: Verify HR rendering

**Steps**:
1. Clear textarea
2. Type:
   ```
   Text above

   ---

   Text below
   ```
3. Wait for preview
4. Take screenshot
5. Verify horizontal rule appears with gradient styling

**Expected Result**: HR displays with Mexican theme gradient

#### Test 9: Mixed Content
**Goal**: Verify complex markdown with multiple elements

**Steps**:
1. Clear textarea
2. Type comprehensive markdown:
   ```
   # Main Title

   ## Subtitle

   This is **bold** and *italic*.

   - List item 1
   - List item 2

   ```javascript
   console.log("code");
   ```

   > Quote text

   | Col1 | Col2 |
   |------|------|
   | A    | B    |
   ```
3. Wait for preview
4. Take screenshot
5. Verify all elements render correctly
6. Check console for any errors

**Expected Result**: All markdown elements render without conflicts

#### Test 10: Performance & Responsiveness
**Goal**: Verify editor handles rapid input without lag

**Steps**:
1. Clear textarea
2. Type long text rapidly using JavaScript
3. Monitor performance
4. Check for any lag or rendering issues
5. Verify preview updates smoothly
6. Run performance audit

**Expected Result**: Editor remains responsive, no lag

### Phase 4: Edge Cases & Error Handling

#### Test 11: Empty Content
**Steps**:
1. Clear textarea completely
2. Verify preview is empty or shows placeholder
3. Check console for errors

#### Test 12: Invalid Markdown
**Steps**:
1. Type malformed markdown
2. Verify graceful handling
3. Check console for errors

#### Test 13: Large Content
**Steps**:
1. Paste or generate large markdown document (5000+ lines)
2. Verify editor handles it
3. Monitor memory usage
4. Check performance

#### Test 14: Special Characters
**Steps**:
1. Type markdown with special characters: `<`, `>`, `&`, quotes
2. Verify proper escaping/rendering
3. Check for XSS vulnerabilities

### Phase 5: Styling & Theme Verification

#### Test 15: Mexican Theme Elements
**Goal**: Verify all custom styling applies correctly

**Steps**:
1. Clear textarea
2. Type content that uses theme styles:
   - Headings (gradient text)
   - Tables (colored borders)
   - Blockquotes (orange border)
   - Code blocks (oneDark theme)
3. Take detailed screenshot
4. Verify decorative corners visible
5. Check color scheme matches theme

**Expected Result**: All Mexican theme elements display correctly

### Phase 6: Accessibility & Best Practices

#### Test 16: Accessibility Audit
**Steps**:
1. Run `runAccessibilityAudit`
2. Check for ARIA labels
3. Verify keyboard navigation works
4. Check color contrast ratios
5. Verify screen reader compatibility

**Expected Result**: Accessibility score > 90%

#### Test 17: Performance Audit
**Steps**:
1. Run `runPerformanceAudit`
2. Check bundle size impact
3. Verify rendering performance
4. Check for memory leaks

**Expected Result**: Performance score > 80%

### Phase 7: Multi-Component Testing

#### Test 18: Component Switching
**Goal**: Test different renderer components

**Steps**:
1. Stop server
2. Modify `main.tsx` to use `MarkdownRenderer_orig`
3. Restart server
4. Run basic tests again
5. Repeat for `MDRendererTW`
6. Verify each component works independently

### Phase 8: Browser Console & Network Monitoring

#### Test 19: Console Error Detection
**Steps**:
1. Run all tests
2. Continuously monitor console
3. Log any errors, warnings
4. Verify no React errors
5. Check for deprecation warnings

#### Test 20: Network Request Monitoring
**Steps**:
1. Monitor all network requests
2. Verify only expected resources load
3. Check for failed requests
4. Verify no CORS errors
5. Check resource loading order

## Test Execution Flow

### Setup Phase
```
1. Navigate to http://localhost:5200
2. Wait for page load
3. Take initial snapshot
4. Verify no console errors
5. Take baseline screenshot
```

### Execution Phase
```
For each test:
  1. Clear previous state
  2. Execute test steps
  3. Capture results (snapshot/screenshot)
  4. Verify expected outcomes
  5. Check console logs
  6. Document any failures
  7. Take recovery actions if needed
```

### Teardown Phase
```
1. Collect all test results
2. Generate summary report
3. Save all screenshots
4. Log all console messages
5. Stop development server
```

## Success Criteria

### Must Pass
- ✅ All 20 tests execute without fatal errors
- ✅ Live preview updates correctly for all markdown elements
- ✅ No console errors during normal operation
- ✅ All GFM features work (tables, task lists, strikethrough)
- ✅ Syntax highlighting works for code blocks
- ✅ Mexican theme styling applies correctly

### Should Pass
- ✅ Accessibility score > 90%
- ✅ Performance score > 80%
- ✅ No memory leaks during extended use
- ✅ Handles large documents (5000+ lines)
- ✅ Responsive to rapid input

### Nice to Have
- ✅ Zero warnings in console
- ✅ Perfect accessibility score (100%)
- ✅ Sub-second rendering for all operations

## Reporting Format

For each test, document:
```
Test ID: [Number]
Test Name: [Name]
Status: [PASS/FAIL/SKIP]
Execution Time: [ms]
Console Errors: [Count]
Screenshot: [Path]
Notes: [Any observations]
```

## Tools Usage Pattern

### Standard Test Pattern
```typescript
// 1. Setup
navigate_page({ url: "http://localhost:5200" })
wait_for({ text: "Markdown" })

// 2. Get UI elements
const snapshot = take_snapshot()
const textareaUID = findElement(snapshot, "textarea")

// 3. Interact
click({ uid: textareaUID })
fill({ uid: textareaUID, value: "# Test" })

// 4. Verify
wait_for({ text: "Test" })
take_screenshot({ filePath: "./test-result.png" })

// 5. Check console
const errors = getConsoleErrors()
assert(errors.length === 0)
```

## Risk Mitigation

### Potential Issues
1. **Timing Issues**: Use `wait_for` to ensure elements load
2. **UID Changes**: Re-snapshot if UIDs become stale
3. **Network Delays**: Add appropriate timeouts
4. **State Pollution**: Clear textarea between tests
5. **Browser Cache**: May need to clear between tests

### Retry Strategy
- If test fails, retry up to 3 times
- If element not found, re-snapshot and retry
- If timeout, increase wait time and retry
- Log all retry attempts

## Next Steps

1. ✅ Plan created
2. ⏳ Start development server
3. ⏳ Execute Phase 1: Environment Setup
4. ⏳ Execute Phase 2-7: Functional Tests
5. ⏳ Generate comprehensive test report
6. ⏳ Fix any identified issues
7. ⏳ Re-run failed tests
8. ⏳ Final validation

---

**Document Version**: 1.0
**Created**: 2025-11-11
**Status**: Ready for execution
