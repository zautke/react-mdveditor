<div align="center">

# ✏️ React Markdown Editor

**A feature-rich markdown editor with live preview, built with React 18, Vite 7, and Tailwind CSS 4.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Features](#features) · [Quick Start](#quick-start) · [Architecture](#architecture) · [Customization](#customization) · [Contributing](#contributing)

</div>

---

## Features

| Feature | Description |
|---------|-------------|
| 📝 **Live Preview** | Real-time split-pane rendering as you type |
| 📑 **Multi-Document Tabs** | Open, create, and switch between multiple documents with smooth animations |
| 📊 **GitHub Flavored Markdown** | Tables, task lists, strikethrough, footnotes, and auto-linking |
| 💻 **Syntax Highlighting** | Prism-based code blocks with the oneDark theme and language detection |
| 📈 **Mermaid Diagrams** | Flowcharts, sequence diagrams, class diagrams, and more — rendered inline |
| 🧮 **Math Equations** | MathJax support for inline `$...$` and display `$$...$$` math |
| 📂 **File I/O** | Upload `.md` files via drag-and-drop or button; download your work as `.md` |
| 🎨 **Multiple Themes** | Three built-in renderers including a Mexican-inspired Tailwind theme |
| ♿ **Accessible** | Built on Radix UI primitives for keyboard navigation and screen readers |
| ⚡ **Fast** | Vite HMR, optimized chunking, memoized components |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20.0.0
- [pnpm](https://pnpm.io/) >= 10.28.0

### Installation

```bash
# Clone the repository
git clone https://github.com/zautke/react-mdveditor.git
cd react-mdveditor

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Open **http://localhost:5200** to see the editor.

For secure-context features like `showSaveFilePicker()`, use `https://adagio.local:5250`. On macOS, install the trust profile from `public/dev-ca/adagio-local-dev-ca.mobileconfig` once on the machine you are using.

See [docs/dockerized-web-app-container-lockdown-runbook.md](docs/dockerized-web-app-container-lockdown-runbook.md) for the project-agnostic HTTPS, trust, Docker access, and verification pattern.

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server on port **5200** with HMR |
| `pnpm build` | Production build with code splitting |
| `pnpm preview` | Serve the production build locally |
| `pnpm typecheck` | TypeScript strict-mode type checking |
| `pnpm lint` | ESLint with zero-warning tolerance |

## Architecture

### Markdown Processing Pipeline

```
User Input → react-markdown → remark-gfm (GFM)
                             → remark-math (equations)
           → rehype-raw (HTML) → rehype-slug (heading IDs)
                               → rehype-mathjax (render math)
           → react-syntax-highlighter (code blocks)
           → MermaidDiagram (mermaid fenced blocks) → DOM
```

### Project Structure

```
src/
├── components/
│   ├── markdown/
│   │   ├── EditorWithProview.tsx   # Main split-pane editor with tabs & file I/O
│   │   ├── MarkdownRenderer.tsx    # Tailwind renderer (Mexican theme)
│   │   ├── MarkdownRenderer_orig.tsx # Clean inline-styled renderer
│   │   ├── MDRendererTW.tsx        # Alternative Tailwind renderer
│   │   └── MermaidDiagram.tsx      # Mermaid diagram renderer with validation
│   └── ui/
│       ├── tabs/                   # Animated tab system (Radix UI + Motion)
│       ├── alert.tsx               # Error alerts
│       ├── button.tsx              # Button variants
│       ├── tooltip.tsx             # Accessible tooltips
│       ├── expand-toggle-button.tsx
│       └── file-upload-button.tsx
├── styles/
│   └── index.css                   # Tailwind 4 + design tokens + Mexican theme
├── lib/
│   └── utils.ts                    # cn() merge utility (clsx + tailwind-merge)
├── main.tsx                        # Entry point
└── index.d.ts                      # Global type definitions
```

### Build Configuration

Vite is configured with intelligent code splitting for optimal loading:

| Chunk | Contents |
|-------|----------|
| `vendor` | `react`, `react-dom` |
| `markdown` | `react-markdown`, `react-syntax-highlighter`, `remark-gfm`, `rehype-raw`, `rehype-slug` |
| `app` | Application code |

## Customization

### Switching Renderers

Edit `src/main.tsx` to change the default component:

```tsx
// Split-pane editor with tabs (default)
import App from './components/markdown/EditorWithProview'

// Demo with inline styles
import App from './App'

// Demo with Tailwind styles
import App from './AppTW'
```

### Theming

The design system is defined in `src/styles/index.css` using CSS custom properties:

```css
--brand-orange: #ff6b35;
--brand-green:  #228b22;
--brand-brown:  #d2691e;
--brand-gold:   #ffd700;
```

Override these variables or modify the Tailwind utility classes in any renderer component to create your own theme.

### Adding Markdown Plugins

Extend the processing pipeline in any renderer:

```tsx
import remarkPlugin from 'remark-your-plugin'

<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkMath, remarkPlugin]}
  rehypePlugins={[rehypeRaw, rehypeSlug, rehypeMathjax]}
>
  {markdown}
</ReactMarkdown>
```

### Code Theme

Syntax highlighting uses `react-syntax-highlighter` with the Prism `oneDark` theme. Swap themes by importing a different style:

```tsx
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
```

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **UI** | React | 18.3 |
| **Build** | Vite | 7.2 |
| **Language** | TypeScript | 5.9 |
| **Styling** | Tailwind CSS | 4.1 |
| **Components** | Radix UI | latest |
| **Animation** | Motion (Framer) | 12.x |
| **Icons** | Lucide React | 0.562 |
| **Markdown** | react-markdown | 10.1 |
| **Diagrams** | Mermaid | 11.12 |
| **Math** | MathJax (rehype) | 7.1 |
| **Highlighting** | react-syntax-highlighter | 16.1 |

## Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 111+ |
| Edge | 111+ |
| Firefox | 128+ |
| Safari | 16.4+ |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Ensure code quality passes:
   ```bash
   pnpm typecheck && pnpm lint
   ```
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).
