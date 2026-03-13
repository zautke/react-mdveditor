# Gemini Context: React Markdown Editor

## Project Overview

**React Markdown Editor** is a feature-rich markdown editor built with React 18, Vite 7, and Tailwind CSS 4. It features a real-time split-pane preview, support for GitHub Flavored Markdown (GFM), Mermaid diagrams, and MathJax equations.

**Tech Stack:**
*   **Core:** React 18.3, TypeScript 5.9, Vite 7.2
*   **Styling:** Tailwind CSS 4.1, Radix UI, Framer Motion
*   **Markdown:** `react-markdown`, `remark-gfm`, `remark-math`, `rehype-raw`, `rehype-mathjax`
*   **Diagrams:** Mermaid 11.12
*   **Package Manager:** pnpm 10.28.0+

## Development Workflow

### Commands

| Command | Description |
| :--- | :--- |
| `pnpm install` | Install dependencies. |
| `pnpm dev` | Start the dev server on **port 5200**. |
| `pnpm build` | Production build (code-split into `vendor`, `markdown`, `app`). |
| `pnpm preview` | Serve the production build locally. |
| `pnpm typecheck` | Run TypeScript strict mode checks. |
| `pnpm lint` | Run ESLint with **zero tolerance** for warnings. |

### Architecture

*   **Entry Point:** `src/main.tsx` - Change the imported `App` component here to switch between renderers.
*   **Key Components** (`src/components/markdown/`):
    *   `EditorWithProview.tsx`: The main split-pane editor.
    *   `MarkdownRenderer.tsx`: Tailwind-styled preview (Mexican theme).
    *   `MermaidDiagram.tsx`: Async Mermaid renderer with error handling.
*   **Styles:** `src/styles/index.css` contains Tailwind 4 config and theme variables.

**Markdown Pipeline:**
User Input → `react-markdown` → `remark-gfm` & `remark-math` → `rehype-raw`, `rehype-slug`, `rehype-mathjax` → `react-syntax-highlighter` & `MermaidDiagram` → DOM.

## Testing Strategy

**CRITICAL:** This project relies on **autonomous browser-based testing**, not traditional unit tests.

**Protocol:**
Refer to `AGENT_TEST_EXECUTION_PROTOCOL.md` for the exact steps. The general pattern is:

1.  **Ensure Server Running:** `pnpm dev` must be running on port **5200**.
2.  **Navigate:** Use browser tools to go to `http://localhost:5200`.
3.  **Snapshot:** Always take a *fresh* snapshot (`take_snapshot()`) before interacting.
4.  **Interact:**
    *   **Clear:** Use `evaluate_script` to clear the textarea and dispatch an `input` event.
    *   **Fill:** Use `fill()` with the textarea's **current** UID.
    *   **Verify:** Check the snapshot returned by `fill()` to ensure the preview rendered correctly (look for `heading`, `StaticText`, etc.).
5.  **Screenshot:** Capture the result (`take_screenshot()`) to `test-results/`.

**Do not** rely solely on visual inspection; verify the accessibility tree in the snapshot.

## Conventions

*   **Linting:** Zero warnings allowed. Fix issues before committing.
*   **HMR:** Components must be default exports to work with React Refresh.
*   **Text Expansion Protocol:**
    *   `:wc:` → Web search using `context7` tool.
*   **Directories:**
    *   `src/components/markdown`: Markdown-specific logic.
    *   `src/components/ui`: Generic UI components (buttons, tabs).
    *   `test-results`: Stores artifacts from browser tests (git-ignored).
