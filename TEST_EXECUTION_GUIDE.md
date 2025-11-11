# Test Execution Guide

## Quick Start

This guide provides the commands and workflow for executing the autonomous browser tests.

## Prerequisites

1. **Server must be running**:
   ```bash
   cd /Volumes/FLOUNDER/dev/mdeditor
   pnpm dev
   ```
   Server will start on `http://localhost:5200`

2. **Browser tools available**: Chrome DevTools MCP and BrowserTools MCP

## Test Execution Workflow

### Step 1: Start the Development Server

```bash
# In the mdeditor directory
pnpm dev
```

Keep this running in the background during all tests.

### Step 2: Initialize Browser Session

Using Chrome DevTools MCP tools:
```
1. navigate_page({ url: "http://localhost:5200" })
2. wait_for({ text: "Markdown", timeout: 5000 })
3. take_snapshot() - Get initial UI structure
4. take_screenshot({ filePath: "./test-results/00-initial.png" })
5. list_console_messages() - Check for startup errors
```

### Step 3: Run Test Suite

Execute tests in order (see TESTING_PLAN.md for details):

#### Basic Tests (Critical Path)
1. **Test 1**: Basic Text Input
2. **Test 2**: Bold/Italic
3. **Test 3**: Code Blocks
4. **Test 4**: Lists
5. **Test 5**: Tables

#### Advanced Tests
6. **Test 6**: Links
7. **Test 7**: Blockquotes
8. **Test 8**: Horizontal Rules
9. **Test 9**: Mixed Content
10. **Test 10**: Performance

#### Edge Cases
11. **Test 11**: Empty Content
12. **Test 12**: Invalid Markdown
13. **Test 13**: Large Content
14. **Test 14**: Special Characters

#### Theme & Styling
15. **Test 15**: Mexican Theme Verification

#### Quality Audits
16. **Test 16**: Accessibility Audit
17. **Test 17**: Performance Audit

#### Component Testing
18. **Test 18**: Multiple Components

#### Monitoring
19. **Test 19**: Console Monitoring
20. **Test 20**: Network Monitoring

### Step 4: Collect Results

After each test:
1. Save screenshot to `./test-results/[test-id]-[name].png`
2. Log console messages
3. Document pass/fail status
4. Note any anomalies

### Step 5: Generate Report

Create summary with:
- Total tests: 20
- Passed: [count]
- Failed: [count]
- Skipped: [count]
- Console errors: [count]
- Screenshots: [paths]

## Test Template

For each test, follow this pattern:

```typescript
// Test [ID]: [Name]
// Goal: [Description]

// 1. Get current UI state
const snapshot = take_snapshot()

// 2. Find textarea element
const textareaUID = findInSnapshot(snapshot, "textarea")

// 3. Clear and input test content
click({ uid: textareaUID })
evaluate_script({
  function: "(el) => el.value = ''",
  args: [{ uid: textareaUID }]
})

// 4. Type test markdown
fill({ uid: textareaUID, value: "# Test Content" })

// 5. Wait for preview update
wait_for({ text: "Test Content", timeout: 3000 })

// 6. Capture results
take_screenshot({ filePath: "./test-results/test-[id].png" })

// 7. Verify no console errors
const errors = list_console_messages({ types: ["error"] })

// 8. Document result
// Status: PASS/FAIL
// Errors: [list]
// Notes: [observations]
```

## Critical Test Scenarios

### Scenario 1: First-Time User Experience
```
1. Navigate to app
2. See initial state
3. Click textarea
4. Type basic markdown
5. Observe live preview
6. Verify rendering
```

### Scenario 2: Power User Workflow
```
1. Type complex markdown rapidly
2. Use multiple formatting types
3. Add tables and code blocks
4. Verify everything renders
5. Check performance
```

### Scenario 3: Edge Case Handling
```
1. Type invalid markdown
2. Paste large content
3. Use special characters
4. Verify graceful handling
5. Check for errors
```

## Browser Tool Commands Reference

### Navigation
```javascript
navigate_page({ url: "http://localhost:5200" })
```

### Snapshots
```javascript
take_snapshot({ filePath: "./snapshot.txt" })
take_screenshot({ filePath: "./screenshot.png" })
```

### Interaction
```javascript
click({ uid: "element-uid" })
fill({ uid: "textarea-uid", value: "content" })
press_key({ key: "Enter" })
```

### JavaScript Execution
```javascript
evaluate_script({
  function: "() => document.querySelector('textarea').value",
  args: []
})
```

### Verification
```javascript
wait_for({ text: "Expected Text", timeout: 5000 })
list_console_messages({ types: ["error", "warn"] })
```

### Audits
```javascript
runAccessibilityAudit()
runPerformanceAudit()
```

## Expected Outcomes

### Test 1: Basic Text Input
- **Input**: `# Hello World`
- **Expected Preview**: H1 heading "Hello World" with gradient styling
- **Console**: No errors
- **Screenshot**: Shows heading in preview pane

### Test 2: Bold/Italic
- **Input**: `**bold** and *italic*`
- **Expected Preview**: Bold text in brown, italic in green
- **Console**: No errors

### Test 3: Code Blocks
- **Input**: TypeScript code block
- **Expected Preview**: Syntax-highlighted code with oneDark theme
- **Console**: No errors
- **Verify**: Prism classes applied

### Test 4: Lists
- **Input**: Bullet and numbered lists
- **Expected Preview**: Properly formatted lists
- **Console**: No errors
- **Verify**: Correct list markers

### Test 5: Tables
- **Input**: GFM table
- **Expected Preview**: Styled table with Mexican theme (orange headers)
- **Console**: No errors
- **Verify**: Table structure correct

## Troubleshooting

### Issue: Element UID Not Found
**Solution**: Re-take snapshot to get fresh UIDs

### Issue: Preview Not Updating
**Solution**:
1. Check if textarea received focus
2. Verify content was actually typed
3. Increase wait timeout
4. Check console for React errors

### Issue: Console Errors Present
**Solution**:
1. Document the error
2. Take screenshot of error state
3. Continue with next test
4. Report in final summary

### Issue: Screenshot Failed
**Solution**:
1. Verify file path is valid
2. Check write permissions
3. Retry screenshot
4. Continue without screenshot if necessary

## Success Metrics

### Critical (Must Pass)
- ✅ Live preview updates for all markdown types
- ✅ No fatal JavaScript errors
- ✅ Syntax highlighting works
- ✅ All GFM features render

### Important (Should Pass)
- ✅ Accessibility score > 90%
- ✅ Performance score > 80%
- ✅ Theme styling consistent
- ✅ Handles edge cases gracefully

### Nice to Have
- ✅ Zero console warnings
- ✅ 100% accessibility
- ✅ Perfect visual fidelity

## Post-Test Actions

After completing all tests:

1. **Stop development server**:
   ```bash
   # Kill the dev server process
   pkill -f "vite"
   ```

2. **Review results**:
   - Check all screenshots
   - Review console logs
   - Document failures
   - Note improvement areas

3. **Generate report**:
   - Create TEST_RESULTS.md
   - Include all metrics
   - Attach screenshots
   - List any issues found

4. **Fix issues** (if any):
   - Address console errors
   - Fix rendering bugs
   - Improve accessibility
   - Re-run failed tests

## File Organization

```
test-results/
├── 00-initial.png              # Initial state
├── 01-basic-text.png           # Test 1 result
├── 02-bold-italic.png          # Test 2 result
├── 03-code-blocks.png          # Test 3 result
├── 04-lists.png                # Test 4 result
├── 05-tables.png               # Test 5 result
├── 06-links.png                # Test 6 result
├── 07-blockquotes.png          # Test 7 result
├── 08-horizontal-rules.png     # Test 8 result
├── 09-mixed-content.png        # Test 9 result
├── 10-performance.png          # Test 10 result
├── 11-empty-content.png        # Test 11 result
├── 12-invalid-markdown.png     # Test 12 result
├── 13-large-content.png        # Test 13 result
├── 14-special-chars.png        # Test 14 result
├── 15-mexican-theme.png        # Test 15 result
├── console-logs.txt            # All console output
├── network-logs.txt            # Network requests
├── accessibility-report.json   # Lighthouse accessibility
├── performance-report.json     # Lighthouse performance
└── TEST_RESULTS.md            # Final summary
```

## Ready to Execute

Once the development server is running, you can begin test execution by following the workflow above. The autonomous testing will simulate real user interactions using only browser automation tools.

---

**Guide Version**: 1.0
**Created**: 2025-11-11
**Status**: Ready for execution
