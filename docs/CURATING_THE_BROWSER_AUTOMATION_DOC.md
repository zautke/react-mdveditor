```yaml
# META-INSTRUCTIONS FOR DOCUMENT CURATION
# This document itself follows the ACE (Agentic Context Engineering) framework.
# It should be updated when new curation patterns are discovered.
# Last structural review: 2026-02-14
```

# Curating the Browser Automation Document

## Purpose

This document provides instructions for AI agents and human developers on how to maintain, update, enhance, and deprecate information in `docs/BROWSER_AUTOMATION_AND_TESTING.md` as a living artifact.

The main document is not a static reference — it evolves with each browser testing session. This curation guide ensures that evolution is structured, preserves institutional knowledge, and prevents the document from degrading over time.

## Theoretical Foundation

This curation protocol is based on three research frameworks:

### 1. ACE — Agentic Context Engineering (ICLR 2026)
- **Brevity bias**: The tendency to drop domain-specific insights when summarizing. NEVER summarize away specific technical details (tool names, UIDs, exact error messages, timing values).
- **Context collapse**: Iterative rewrites gradually erode nuance. NEVER rewrite existing sections wholesale. Use structured incremental updates (append, annotate, deprecate).
- **Evolving playbook**: The document accumulates knowledge through generation (new findings) → reflection (assessing what works) → curation (organizing for retrieval).

### 2. Anthropic Context Engineering (2025)
- The full context stack matters. Browser testing context includes: tool availability, page state, React component behavior, prior run knowledge.
- Optimize for the agent's inference window. Structure information so the most actionable content appears first in each section.

### 3. MetaAgent / Self-Evolving Agents (BAAI, 2025)
- Learning-by-doing: Each test session produces raw experience.
- Self-reflection: After each session, distill what worked and what failed.
- Knowledge integration: Feed distilled learnings back into the document for future sessions.

## Curation Operations

### 1. APPEND — Adding New Information

**When**: After every browser testing session that produces new findings.

**How**:
1. Identify the appropriate section in the main doc
2. Add the new finding with metadata:
   ```markdown
   ### [Technique/Finding Name] (Discovered YYYY-MM-DD)
   **Run**: `browser-runs/[session-file].md`
   **Evidence**: `test-results/[path]`
   
   [Description of the finding]
   ```
3. If no appropriate section exists, create one following the existing heading hierarchy
4. Cross-reference the browser-runs/ session document

**Rules**:
- Include the exact date of discovery
- Reference the specific test run where it was found
- Include evidence file paths when visual proof exists
- Never add a finding without testing it first

### 2. DEPRECATE — Marking Outdated Information

**When**: A technique no longer works due to tool changes, dependency updates, or architectural refactors.

**How**:
1. Do NOT delete the content
2. Wrap it in a deprecation notice:
   ```markdown
   > **DEPRECATED (YYYY-MM-DD)**: [Reason]. See [replacement section/technique].
   > Original content preserved below for historical context.
   ```
3. Move the deprecated content to the Anti-Patterns section if it's now harmful
4. Update any cross-references that pointed to the deprecated content

**Why not delete?**:
- Future agents may encounter the same approach and need to understand why it doesn't work
- The deprecation reason itself is valuable knowledge
- ACE principle: context collapse happens when details are removed

### 3. ENHANCE — Improving Existing Content

**When**: A technique works but needs clarification, additional examples, or edge case documentation.

**How**:
1. Read the existing content carefully
2. Add the enhancement inline with a marker:
   ```markdown
   **Enhancement (YYYY-MM-DD)**: [Additional detail or example]
   ```
3. For code examples, add the new example below the existing one (don't replace)
4. For decision trees, add new branches rather than restructuring

**Rules**:
- Never change the meaning of existing content
- Never simplify existing examples (brevity bias prevention)
- Add context for WHY the enhancement was needed

### 4. RESTRUCTURE — Reorganizing Sections

**When**: A section exceeds ~50 items or becomes difficult to navigate.

**How**:
1. Create sub-sections to group related items
2. Add a table of contents or index at the section top
3. Preserve all content — restructuring is about organization, not reduction
4. Note the restructure in the document's change log

**Rules**:
- Only restructure during quarterly reviews or when explicitly requested
- Never restructure and add new content in the same update
- Ensure all cross-references still work after restructuring

## Browser Runs Management

### Creating a New Run Document

After each browser testing session, create `docs/browser-runs/YYYY-MM-DD-[description].md` with:

```markdown
# Browser Test Run: [Description]

## Metadata
- **Date**: YYYY-MM-DD
- **Branch**: [git branch name]
- **Objective**: [what was being tested]
- **Tools Used**: [list of MCP tools and their roles]
- **Duration**: [approximate time]
- **Result**: [PASS/FAIL/PARTIAL]

## Pre-Flight State
[Page state before testing began]

## Test Execution
[Step-by-step with UIDs, actions, results]

## Evidence Files
[Table mapping screenshots to test cases]

## Findings
### What Worked
[Techniques that succeeded]

### What Failed
[Techniques that failed and WHY]

### Bugs Found
[Any code bugs discovered during testing]

## Reusable Patterns
[Specific code snippets and sequences future agents should reuse]
```

### Naming Convention
- Format: `YYYY-MM-DD-[kebab-case-description].md`
- Examples:
  - `2026-02-14-html-plugin-cdp-testing.md`
  - `2026-03-01-csv-plugin-verification.md`
  - `2026-03-15-tab-system-regression.md`

### When to Reference Previous Runs

Agents MUST check `docs/browser-runs/` BEFORE starting a new test session:
1. List the directory contents
2. Read summaries of runs with similar objectives
3. Identify reusable patterns (evaluate_script snippets, timing values, UID navigation strategies)
4. Note anti-patterns that caused failures
5. Only then begin the new test session

This "cherry-pick before reinvent" principle saves significant time and prevents repeating known failures.

## Quality Checklist for Document Updates

Before committing any update to the main document:

- [ ] New findings include date and run reference
- [ ] No existing content was deleted (only deprecated with reason)
- [ ] Code examples are tested and working
- [ ] Anti-patterns include the error message or failure mode
- [ ] Cross-references to browser-runs/ are valid
- [ ] Evidence file paths point to real files
- [ ] The document still reads coherently top-to-bottom
- [ ] No brevity bias: specific details (UIDs, timing values, error text) preserved

## Change Log

| Date | Author | Change | Run Reference |
|------|--------|--------|---------------|
| 2026-02-14 | Claude (initial) | Created document with 3 test runs' worth of findings | All 2026-02-14 runs |
