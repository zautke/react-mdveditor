# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React-based markdown editor with live preview, syntax highlighting, and multiple styling themes. Built with React 18, Vite 6, TypeScript, and Tailwind CSS 4.1. The project focuses on real-time markdown rendering with GitHub Flavored Markdown support.

## Development Commands

### Setup and Development
```bash
# Install dependencies (uses pnpm)
pnpm install

# Start dev server on port 5200 with HMR
pnpm dev

# Preview production build locally
pnpm preview
```

### Code Quality
```bash
# TypeScript type checking (strict mode, no emit)
pnpm typecheck

# ESLint with zero-tolerance for warnings
pnpm lint

# Production build (creates dist/ with code splitting)
pnpm build
```

### Port Configuration
- Dev server: **http://localhost:5200** (configured in vite.config.ts)
- Note: README incorrectly mentions 5173; actual port is 5200

## Testing Approach

**Critical**: This project uses **browser automation testing**, NOT traditional unit tests.

### Test Execution Prerequisites
1. Dev server MUST be running on port 5200: `pnpm dev`
2. Wait 8 seconds after server start for full initialization
3. Verify server responds at http://localhost:5200

### Test Workflow Pattern
The AGENT_TEST_EXECUTION_PROTOCOL.md provides the exact step-by-step process. Key steps for each test:

1. **Update todo list** with current test status
2. **Take fresh snapshot** before ANY element interaction
3. **Clear textarea** using `evaluate_script` with event dispatch:
   ```javascript
   evaluate_script({
     function: "(el) => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); return 'Cleared'; }",
     args: [{"uid": "TEXTAREA_UID"}]
   })
   ```
4. **Fill textarea** with test content using `fill()`
5. **Verify rendering** in the snapshot response from fill()
6. **Take screenshot** for visual verification
7. **Document results** in test report

### Browser Tools Available
- Chrome DevTools MCP: `mcp__chrome-devtools__*`
- BrowserTools MCP: `mcp__BrowserTools__*`
- Key methods: `take_snapshot()`, `take_screenshot()`, `click()`, `fill()`, `evaluate_script()`, `wait_for()`

### Test Documentation
- **TESTING_PLAN.md** - 20 test scenarios covering all features
- **TEST_EXECUTION_GUIDE.md** - Step-by-step testing workflow
- **AGENT_TEST_EXECUTION_PROTOCOL.md** - Exact implementation patterns for autonomous testing
- Results go in: `test-results/` directory
- Final summary: `TEST_RESULTS.md`

### Test Categories
1. Basic Functionality (Tests 1-5): Text input, bold/italic, code blocks, lists, tables
2. Advanced Features (Tests 6-9): Links, blockquotes, horizontal rules, mixed content
3. Performance (Test 10): Responsiveness with rapid input, large documents
4. Edge Cases (Tests 11-14): Empty content, invalid markdown, large files, special characters
5. Styling (Test 15): Mexican theme verification
6. Quality Audits (Tests 16-17): Accessibility (>90%), Performance (>80%)
7. Components (Test 18): Multiple renderer component switching
8. Monitoring (Tests 19-20): Console errors, network requests

## Architecture

### Component Structure

Four independent markdown renderer implementations in `src/components/markdown/`:

| Component | Styling | Purpose |
|-----------|---------|---------|
| **EditorWithProview** | Inline CSS | Default split-pane editor (left: input, right: preview) |
| **MarkdownRenderer** | Inline + Tailwind | Mexican-themed styled preview |
| **MDRendererTW** | Tailwind utilities | Alternative styled version |
| **MarkdownRenderer_orig** | Inline CSS only | No Tailwind dependency |

### Entry Points
- `src/main.tsx` - Application entry point
- Default: Renders `EditorWithProview`
- To switch components: Import different App component in main.tsx

### Markdown Processing Pipeline
```
User Input → react-markdown → remark-gfm (GFM features)
          → rehype-raw (HTML support) → rehype-slug (heading IDs)
          → react-syntax-highlighter (code blocks) → DOM
```

### Build Configuration (vite.config.ts)
- **Dev server**: Port 5200, host enabled for network access
- **Build target**: ESNext with esbuild minification
- **Code splitting**:
  - `vendor` chunk: react, react-dom
  - `markdown` chunk: all markdown-related dependencies
- **Plugins**: React (automatic JSX runtime) + Tailwind CSS 4.1

### TypeScript Configuration
- **Strict mode enabled**: All strict flags on
- **Target**: ES2020 for app code, ES2022 for build tools
- **Module**: ESNext with bundler resolution
- **Project references**: Separate configs for app (`tsconfig.app.json`) and build tools (`tsconfig.node.json`)

### Styling System
- **Tailwind CSS 4.1** via @tailwindcss/vite plugin
- **Mexican theme colors** (in MarkdownRenderer):
  - H1: Orange-green gradient text
  - H2: Orange gradient with underline
  - H3: Green with left border
  - Tables: Orange header gradient
  - Blockquotes: Orange left border with decorative quote
  - Links: Brown with animated underline
  - Code blocks: oneDark theme via Prism

## Key Features and Implementation

### Live Preview Mechanism
- EditorWithProview uses React state to drive preview updates
- Textarea onChange → state update → preview re-renders
- No debouncing - updates on every keystroke

### GitHub Flavored Markdown Support
Via `remark-gfm` plugin:
- Tables with alignment
- Task lists (checkboxes)
- Strikethrough (`~~text~~`)
- Auto-linking URLs
- Footnotes

### Syntax Highlighting
- Library: `react-syntax-highlighter` (Prism-based)
- Theme: oneDark
- Automatic language detection from code fence info string
- Inline code vs. code blocks handled separately

### Code Splitting Strategy
Manual chunks configured in vite.config.ts:
1. **vendor**: Core React libraries (stable, rarely changes)
2. **markdown**: All markdown processing libraries (feature-specific)
3. Automatic chunk for application code

Benefits: Efficient caching, faster subsequent loads

## Common Development Tasks

### Adding a New Markdown Plugin
1. Install the plugin: `pnpm add remark-plugin-name` or `pnpm add rehype-plugin-name`
2. Import in the renderer component
3. Add to `remarkPlugins` or `rehypePlugins` array in ReactMarkdown component
4. Update type definitions if needed

### Switching Default Component
Edit `src/main.tsx`:
```tsx
// Option 1: Editor with preview (current default)
import App from './components/markdown/EditorWithProview'

// Option 2: Demo app with inline styles
import App from './App'

// Option 3: Demo app with Tailwind styles
import App from './AppTW'
```

### Modifying the Mexican Theme
Colors defined in `src/components/markdown/MarkdownRenderer.tsx` as inline styles and Tailwind classes. Key elements:
- Gradient definitions use CSS `background-image`
- Tailwind utilities for spacing, typography
- Border colors and widths for visual hierarchy

### Adding Type Definitions
- Application types: `src/index.d.ts`
- Key interfaces: `MarkdownRendererProps`, `CodeProps`
- Vite environment types: `src/vite-env.d.ts`

## Code Quality Standards

### TypeScript Requirements
- Strict mode enforced (tsconfig.app.json)
- `noUnusedLocals: true` - No unused variables
- `noUnusedParameters: true` - No unused function parameters
- All code must pass `pnpm typecheck` with zero errors

### ESLint Rules
- Max warnings: **0** (zero-tolerance)
- React Hooks dependency validation enforced
- React Refresh rules for HMR safety
- No unused disable directives allowed
- Run `pnpm lint` before committing

### Browser Automation Testing Protocol
When executing tests:
1. **Always take fresh snapshots** before interacting with elements (UIDs become stale after DOM updates)
2. **Use evaluate_script** for textarea clearing to properly trigger React's onChange
3. **Handle fill() timeouts gracefully** - content usually filled successfully, verify with snapshot
4. **Document all results** with screenshots and detailed observations
5. **Follow exact patterns** in AGENT_TEST_EXECUTION_PROTOCOL.md for idempotent results

## Dependencies and Versions

### Core Framework
- React 18.3.1, React DOM 18.3.1
- Vite 6.0.1

### Markdown Processing
- react-markdown 10.1.0
- react-syntax-highlighter 15.6.1
- remark-gfm 4.0.1 (GFM features)
- rehype-raw 7.0.0 (HTML support)
- rehype-slug 6.0.0 (heading IDs)

### Build and Development
- TypeScript 5.6.2
- Tailwind CSS 4.1.11
- ESLint 9.15.0
- pnpm 10.11.0 (pinned via packageManager field)

### Version Requirements
- Node.js >= 20.0.0
- pnpm >= 9.0.0

## Browser Support
- Chrome >= 111
- Firefox >= 128
- Safari >= 16.4
- Edge >= 111

## Project Conventions

### Avoid Over-Engineering
- Don't add features beyond what's requested
- Keep solutions simple and focused
- No premature abstractions for one-time operations
- No backwards-compatibility hacks for unused code

### File Organization
- Components in `src/components/markdown/`
- Styles in `src/styles/`
- Type definitions in `src/index.d.ts`
- Build configuration at root level
- Test results in `test-results/` (not tracked in git)

### Import Patterns
- Use ES modules (type: "module" in package.json)
- Relative imports for local files
- Named imports preferred over default where available
- Auto-imports via editor for dependencies

## Common Pitfalls

### Testing-Related
1. **Stale UIDs**: Always take fresh snapshot before element interaction
2. **fill() Timeouts**: Don't panic on timeout - verify content in next snapshot
3. **Server Not Ready**: Wait 8 seconds after `pnpm dev` before testing
4. **Wrong Port**: Use 5200, not 5173 (common Vite default)

### Development-Related
1. **Lint Failures**: Zero warnings allowed - fix before committing
2. **Type Errors**: Strict mode catches everything - no type assertions as workarounds
3. **HMR Issues**: React Refresh requires components as default exports
4. **Tailwind Not Working**: Ensure `@tailwindcss/vite` plugin in vite.config.ts

## Roadmap (Future Enhancements)
- Dark mode toggle
- Additional markdown themes
- PDF export functionality
- Markdown templates
- Keyboard shortcuts
- Collaborative editing

---

**Note**: Always refer to AGENT_TEST_EXECUTION_PROTOCOL.md for exact testing procedures. The protocol has been validated for flawless autonomous test execution.
