# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React-based markdown editor with live preview, syntax highlighting, and multiple styling themes. Built with React 18, Vite 7, TypeScript, and Tailwind CSS 4.1. Features GitHub Flavored Markdown, Mermaid diagrams, and MathJax equations.

## Development Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Start dev server on port 5200 with HMR
pnpm dev

# TypeScript type checking (strict mode)
pnpm typecheck

# ESLint with zero-tolerance for warnings
pnpm lint

# Production build
pnpm build
```

**Port**: Dev server runs at **http://localhost:5200** (not the default 5173)

## Architecture

### Component Structure

Five markdown-related components in `src/components/markdown/`:

| Component | Description |
|-----------|-------------|
| **EditorWithProview** | Default split-pane editor (left: textarea, right: live preview) |
| **MarkdownRenderer** | Mexican-themed styled preview with Tailwind |
| **MarkdownRenderer_orig** | Clean renderer with inline styles only |
| **MDRendererTW** | Alternative Tailwind-styled renderer |
| **MermaidDiagram** | Mermaid diagram renderer with validation and error handling |

### Markdown Processing Pipeline
```
User Input → react-markdown → remark-gfm (GFM)
                            → remark-math (equations)
          → rehype-raw (HTML) → rehype-slug (heading IDs)
                              → rehype-mathjax (render math)
          → react-syntax-highlighter (code blocks)
          → MermaidDiagram (mermaid blocks) → DOM
```

### Entry Point Configuration
Edit `src/main.tsx` to switch the default component:
```tsx
// Current default
import App from './components/markdown/EditorWithProview'

// Alternatives
import App from './App'    // Demo with inline styles
import App from './AppTW'  // Demo with Tailwind styles
```

### Build Configuration (vite.config.ts)
- **Code splitting**: `vendor` chunk (react, react-dom) and `markdown` chunk (all markdown deps)
- **Dev server**: Port 5200, host enabled for network access
- **Plugins**: React (automatic JSX runtime) + Tailwind CSS

## Key Features

### GitHub Flavored Markdown
Via `remark-gfm`: tables, task lists, strikethrough, auto-linking URLs, footnotes

### Mermaid Diagrams
The `MermaidDiagram` component renders flowcharts, sequence diagrams, class diagrams, etc. Uses async rendering with validation and displays syntax errors inline.

### Math Equations
Via `remark-math` + `rehype-mathjax`: inline math with `$...$` and display math with `$$...$$`

### Syntax Highlighting
`react-syntax-highlighter` with Prism and oneDark theme. Automatic language detection from code fence info string.

## Testing Approach

**Critical**: This project uses **browser automation testing**, NOT traditional unit tests.

### Prerequisites
1. Dev server MUST be running: `pnpm dev`
2. Wait ~8 seconds for full initialization
3. Verify server responds at http://localhost:5200

### Browser Tools
- Chrome DevTools MCP: `mcp__chrome-devtools__*`
- BrowserTools MCP: `mcp__BrowserTools__*`
- Key methods: `take_snapshot()`, `take_screenshot()`, `click()`, `fill()`, `evaluate_script()`

### Key Testing Pattern
```javascript
// Clear textarea properly (triggers React onChange)
evaluate_script({
  function: "(el) => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); return 'Cleared'; }",
  args: [{"uid": "TEXTAREA_UID"}]
})
```

See `AGENT_TEST_EXECUTION_PROTOCOL.md` for complete testing procedures.

## Code Quality Standards

- **TypeScript**: Strict mode, `noUnusedLocals`, `noUnusedParameters`
- **ESLint**: Zero warnings allowed (`--max-warnings 0`)
- **React Refresh**: Components must be default exports for HMR

## Common Pitfalls

### Testing
- **Stale UIDs**: Always take fresh snapshot before element interaction
- **fill() Timeouts**: Usually succeeds despite timeout - verify with next snapshot
- **Wrong Port**: Use 5200, not 5173

### Development
- **Lint Failures**: Zero warnings enforced - fix before committing
- **HMR Issues**: React Refresh requires default exports
- **Tailwind Not Working**: Ensure `@tailwindcss/vite` plugin in vite.config.ts

## Project Conventions

- Keep solutions simple - don't add features beyond what's requested
- No premature abstractions for one-time operations
- Components in `src/components/markdown/`
- Type definitions in `src/index.d.ts`
- Test results in `test-results/` (not tracked in git)
