import { useState } from 'react'
import MarkdownRenderer from './MarkdownRenderer_orig'

const initialMarkdown = `# React Markdown Demo

This is a **comprehensive** markdown renderer with *full* features:

## Features
- [x] GitHub Flavored Markdown
- [x] Syntax highlighting
- [x] Tables
- [x] Task lists
- [x] Strikethrough ~~text~~
- [x] Auto-linking: https://github.com

## Code Highlighting

\`\`\`typescript
interface User {
  id: number
  name: string
  email?: string
}

const users: User[] = [
  { id: 1, name: 'John', email: 'john@example.com' },
  { id: 2, name: 'Jane' }
]

const getUser = (id: number): User | undefined =>
  users.find(user => user.id === id)
\`\`\`

## Table Example

| Feature | Supported | Notes |
|---------|-----------|-------|
| Basic Markdown | ✅ | Full CommonMark |
| GFM | ✅ | Tables, tasks, etc |
| Math | ❌ | Can be added |
| Custom Components | ✅ | Fully customizable |

## Blockquote

> This is a blockquote with **bold** and *italic* text.
>
> It can span multiple lines and include other markdown elements.

## Lists

1. Ordered list item
2. Another item
   - Nested unordered item
   - Another nested item

---

**Footnotes**[^1] and other advanced features work seamlessly.

[^1]: This is a footnote example.`

function App() {
  const [markdown, setMarkdown] = useState(initialMarkdown)

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ flex: 1, padding: '1rem', borderRight: '1px solid #e0e0e0' }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Markdown Input</h3>
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          style={{
            width: '100%',
            height: 'calc(100% - 3rem)',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '0.5rem',
            fontFamily: 'monospace',
            fontSize: '14px',
            resize: 'none'
          }}
          placeholder="Enter your markdown here..."
        />
      </div>
      <div style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Rendered Output</h3>
        <MarkdownRenderer>{markdown}</MarkdownRenderer>
      </div>
    </div>
  )
}

export default App
