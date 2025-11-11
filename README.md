# Markdown Editor with Live Preview

A React-based markdown editor with live preview, syntax highlighting, and multiple styling themes.

## Features

- 📝 **Live Preview** - Real-time markdown rendering as you type
- 🎨 **Multiple Themes** - Choose from different styling options
- 💻 **Syntax Highlighting** - Code blocks with syntax highlighting using Prism
- 📊 **GitHub Flavored Markdown** - Tables, task lists, strikethrough, and more
- 🔗 **Auto-linking** - Automatic URL detection and linking
- ⚡ **Fast** - Built with Vite for lightning-fast HMR

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Project Structure

```
mdeditor/
├── src/
│   ├── components/
│   │   └── markdown/
│   │       ├── EditorWithProview.tsx      # Main editor with split-pane view
│   │       ├── MarkdownRenderer.tsx       # Tailwind-styled renderer (Mexican theme)
│   │       ├── MDRendererTW.tsx          # Alternative Tailwind renderer
│   │       └── MarkdownRenderer_orig.tsx  # Original inline-styled renderer
│   ├── styles/
│   │   └── index.css                      # Styles and Tailwind imports
│   ├── App.tsx                            # Demo app (inline styles)
│   ├── AppTW.tsx                         # Demo app (Tailwind styles)
│   ├── main.tsx                          # Entry point
│   ├── index.d.ts                        # Type definitions
│   └── vite-env.d.ts                     # Vite type definitions
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## Available Components

### EditorWithProview

The main editor component with split-pane view (editor on left, preview on right).

```tsx
import EditorWithProview from './components/markdown/EditorWithProview'

function App() {
  return <EditorWithProview />
}
```

### MarkdownRenderer (Tailwind - Mexican Theme)

A Tailwind-styled markdown renderer with a colorful Mexican-inspired theme.

```tsx
import MarkdownRenderer from './components/markdown/MarkdownRenderer'

function App() {
  const markdown = `# Hello World\n\nThis is **bold** text.`

  return <MarkdownRenderer>{markdown}</MarkdownRenderer>
}
```

### MDRendererTW (Tailwind - Alternative)

Another Tailwind-styled renderer with utility classes.

```tsx
import MDRendererTW from './components/markdown/MDRendererTW'

function App() {
  const markdown = `# Hello World`

  return <MDRendererTW>{markdown}</MDRendererTW>
}
```

### MarkdownRenderer_orig (Inline Styles)

A clean renderer using inline styles (no Tailwind dependency).

```tsx
import MarkdownRenderer from './components/markdown/MarkdownRenderer_orig'

function App() {
  const markdown = `# Hello World`

  return <MarkdownRenderer>{markdown}</MarkdownRenderer>
}
```

## Switching Between Components

By default, the app uses `EditorWithProview`. To use a different component:

1. Open `src/main.tsx`
2. Change the import and component:

```tsx
// Option 1: Editor with preview (default)
import App from './components/markdown/EditorWithProview'

// Option 2: Demo with inline styles
import App from './App'

// Option 3: Demo with Tailwind styles
import App from './AppTW'
```

## Customization

### Styling

The project uses Tailwind CSS 4.1. To customize styles:

1. Edit `src/styles/index.css` for custom CSS
2. Modify the Tailwind utility classes in the component files
3. The Mexican theme colors can be customized in the CSS custom properties

### Markdown Plugins

The renderers use the following plugins:

- **remark-gfm**: GitHub Flavored Markdown support
- **rehype-raw**: HTML in markdown support
- **rehype-slug**: Auto-generate heading IDs

To add more plugins, install them and add to the renderer components:

```tsx
import remarkPlugin from 'remark-plugin-name'

<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkPlugin]}
  // ...
>
```

### Code Syntax Highlighting

Syntax highlighting uses `react-syntax-highlighter` with the `oneDark` theme. To change the theme:

```tsx
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

// In the code component
<SyntaxHighlighter style={atomDark} language={match[1]} PreTag="div">
```

## Scripts

```bash
# Development
pnpm dev              # Start dev server on port 5173

# Building
pnpm build            # Production build
pnpm preview          # Preview production build

# Code Quality
pnpm typecheck        # Run TypeScript type checking
pnpm lint             # Run ESLint
```

## Dependencies

### Core
- React 18.3.1
- React DOM 18.3.1
- Vite 6.0.1

### Markdown
- react-markdown 10.1.0
- react-syntax-highlighter 15.6.1
- remark-gfm 4.0.1
- rehype-raw 7.0.0
- rehype-slug 6.0.0

### Styling
- Tailwind CSS 4.1.11
- @tailwindcss/vite 4.1.8

### Development
- TypeScript 5.6.2
- ESLint 9.15.0
- Vite React Plugin 4.3.4

## Browser Support

- Chrome >= 111
- Firefox >= 128
- Safari >= 16.4
- Edge >= 111

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Roadmap

- [ ] Add dark mode toggle
- [ ] Add more markdown themes
- [ ] Export markdown as PDF
- [ ] Add markdown templates
- [ ] Add keyboard shortcuts
- [ ] Add collaborative editing
