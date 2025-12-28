import { useState, DragEvent, memo, useRef, useCallback, useEffect } from 'react'
import MarkdownRenderer from './MarkdownRenderer_orig'
import { FileUploadButton } from '@/components/ui/file-upload-button'
import { ExpandToggleButton } from '@/components/ui/expand-toggle-button'

const initialMarkdown = `# React Markdown Demo

This is a **comprehensive** markdown renderer with *full* features:

## Features
- [x] GitHub Flavored Markdown
- [x] Syntax highlighting
- [x] Tables & Task lists
- [x] Math equations (MathJax)
- [x] **Mermaid diagrams**

---

## Mermaid Diagrams

### Flowchart

\`\`\`mermaid
flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
\`\`\`

### Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello Bob!
    Bob-->>Alice: Hi Alice!
    Alice->>Bob: How are you?
    Bob-->>Alice: Great, thanks!
\`\`\`

### Class Diagram

\`\`\`mermaid
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    class Fish{
        -int sizeInFeet
        -canEat()
    }
\`\`\`

### State Diagram

\`\`\`mermaid
stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]
\`\`\`

### Pie Chart

\`\`\`mermaid
pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15
\`\`\`

### Git Graph

\`\`\`mermaid
gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit
\`\`\`

### Entity Relationship Diagram

\`\`\`mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string email
    }
    ORDER {
        int orderNumber
        date created
    }
\`\`\`

---

## Math Rendering

Inline: $E = mc^2$ | Block:

$$
\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)
$$

## Code Highlighting

\`\`\`typescript
interface User {
  id: number
  name: string
}

const getUser = (id: number): User | undefined =>
  users.find(user => user.id === id)
\`\`\`

## Table Example

| Feature | Supported | Notes |
|---------|-----------|-------|
| Markdown | ✅ | Full CommonMark |
| Mermaid | ✅ | 7 diagram types! |
| Math | ✅ | MathJax support |

> **Tip:** Drop a \`.md\` file onto this editor to load it!`

// Memoized InputPane - prevents rerenders during RP expand/collapse
const InputPane = memo(({
  markdown,
  onMarkdownChange,
  onPaste,
  onFileUpload,
  isExpanded
}: {
  markdown: string
  onMarkdownChange: (value: string) => void
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  onFileUpload: (content: string) => void
  isExpanded: boolean
}) => {
  return (
    <div style={{
      flex: isExpanded ? 0 : 1,
      padding: '1rem',
      borderRight: '1px solid #e0e0e0',
      overflow: isExpanded ? 'hidden' : 'visible',
      width: isExpanded ? '0' : 'auto',
      minWidth: isExpanded ? '0' : 'auto',
      opacity: isExpanded ? 0 : 1,
      transition: 'flex 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease',
      // GPU acceleration hints
      willChange: 'flex, opacity',
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden' as const,
      // Performance: contain layout calculations to this element
      contain: 'layout style' as const
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        margin: '0 0 1rem 0'
      }}>
        <h3 style={{ margin: 0 }}>Markdown Input</h3>
        <FileUploadButton onFileContent={onFileUpload} />
      </div>
      <textarea
        value={markdown}
        onChange={(e) => onMarkdownChange(e.target.value)}
        onPaste={onPaste}
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
  )
}, (prevProps, nextProps) => {
  // Rerender if markdown OR isExpanded changes
  // isExpanded drives inline style changes for animation
  return prevProps.markdown === nextProps.markdown &&
         prevProps.isExpanded === nextProps.isExpanded
})
InputPane.displayName = 'InputPane'

// Memoized RenderPane - debounces content updates during animation
const RenderPane = memo(({
  markdown,
  isExpanded,
  isAnimating,
  arrowOpacity,
  onToggleExpanded
}: {
  markdown: string
  isExpanded: boolean
  isAnimating: boolean
  arrowOpacity: number
  onToggleExpanded: () => void
}) => {
  const [displayMarkdown, setDisplayMarkdown] = useState(markdown)
  const updateTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Debounce markdown updates during animation to prevent expensive rerenders
    if (isAnimating) {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      updateTimeoutRef.current = setTimeout(() => {
        setDisplayMarkdown(markdown)
      }, 420) // Slightly longer than animation (400ms)
    } else {
      // Not animating, update immediately
      setDisplayMarkdown(markdown)
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [markdown, isAnimating])

  return (
    <div style={{
      flex: isExpanded ? 1 : 1,
      transition: 'flex 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      position: 'relative',
      display: 'flex',
      // GPU acceleration
      willChange: 'flex',
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden' as const,
      // Performance: contain layout calculations
      contain: 'layout style' as const
    }}>
      {/* Gutter with toggle button - static, doesn't scroll */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(90deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0) 100%)',
        zIndex: 10,
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}>
        <ExpandToggleButton
          isExpanded={isExpanded}
          onClick={onToggleExpanded}
          opacity={arrowOpacity}
        />
      </div>

      {/* Scrollable render pane */}
      <div style={{
        flex: 1,
        padding: '1rem',
        paddingLeft: 'calc(1rem + 32px)',
        overflow: 'auto',
        // GPU acceleration for scrolling
        transform: 'translateZ(0)',
        willChange: 'scroll-position',
        // Smooth scrolling on supported browsers
        WebkitOverflowScrolling: 'touch' as const
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Rendered Output</h3>
        <MarkdownRenderer>{displayMarkdown}</MarkdownRenderer>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Rerender if markdown changes, animation state changes, or arrow opacity changes
  return prevProps.markdown === nextProps.markdown &&
         prevProps.isAnimating === nextProps.isAnimating &&
         prevProps.arrowOpacity === nextProps.arrowOpacity &&
         prevProps.isExpanded === nextProps.isExpanded
})
RenderPane.displayName = 'RenderPane'

function App() {
  const [markdown, setMarkdown] = useState(initialMarkdown)
  const [isExpanded, setIsExpanded] = useState(false)
  const [arrowOpacity, setArrowOpacity] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const toggleExpanded = useCallback(() => {
    // Start animation state
    setIsAnimating(true)
    setArrowOpacity(0)

    // After fade out, toggle expansion and fade in new arrow
    setTimeout(() => {
      setIsExpanded(prev => !prev)
      setArrowOpacity(1)

      // End animation after transition completes
      setTimeout(() => {
        setIsAnimating(false)
      }, 400) // Match transition duration
    }, 150)
  }, [])

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    // Only hide overlay if leaving the main container
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }, [])

  const detectAndConvertLatex = useCallback((text: string): string => {
    // Check for LaTeX-style equations: \(...\) or \[...\]
    const hasLatexInline = /\\\(.+?\\\)/.test(text)
    const hasLatexBlock = /\\\[.+?\\\]/s.test(text)

    if (hasLatexInline || hasLatexBlock) {
      let converted = text
      // Convert inline LaTeX \(...\) to $...$ (trim whitespace)
      converted = converted.replace(/\\\((.+?)\\\)/g, (match, equation) => {
        return '$' + equation.trim() + '$'
      })
      // Convert block LaTeX \[...\] to $$...$$ (trim whitespace)
      converted = converted.replace(/\\\[(.+?)\\\]/gs, (match, equation) => {
        return '\n$$\n' + equation.trim() + '\n$$\n'
      })
      return converted
    }

    return text
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text/plain')

    // Check if pasted text contains LaTeX equations
    const hasLatexInline = /\\\(.+?\\\)/.test(pastedText)
    const hasLatexBlock = /\\\[.+?\\\]/s.test(pastedText)

    if (hasLatexInline || hasLatexBlock) {
      e.preventDefault()

      const convertedText = detectAndConvertLatex(pastedText)

      // Insert at cursor position
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentText = markdown

      const newText = currentText.substring(0, start) + convertedText + currentText.substring(end)
      setMarkdown(newText)

      // Restore cursor position after the pasted content
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + convertedText.length
        textarea.focus()
      }, 0)
    }
  }, [markdown, detectAndConvertLatex])

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    // Handle text drop
    const text = e.dataTransfer.getData('text/plain')
    if (text) {
      const convertedText = detectAndConvertLatex(text)
      setMarkdown(convertedText)
      return
    }

    // Handle file drop
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]

      // Only accept markdown files
      if (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.type === 'text/markdown') {
        const reader = new FileReader()
        reader.onload = (event) => {
          const content = event.target?.result as string
          if (content) {
            const convertedContent = detectAndConvertLatex(content)
            setMarkdown(convertedContent)
          }
        }
        reader.readAsText(file)
      }
    }
  }, [detectAndConvertLatex])

  const handleMarkdownChange = useCallback((value: string) => {
    setMarkdown(value)
  }, [])

  const handleFileUpload = useCallback((content: string) => {
    const convertedContent = detectAndConvertLatex(content)
    setMarkdown(convertedContent)
  }, [detectAndConvertLatex])

  return (
    <div
      style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui', position: 'relative' }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <InputPane
        markdown={markdown}
        onMarkdownChange={handleMarkdownChange}
        onPaste={handlePaste}
        onFileUpload={handleFileUpload}
        isExpanded={isExpanded}
      />
      <RenderPane
        markdown={markdown}
        isExpanded={isExpanded}
        isAnimating={isAnimating}
        arrowOpacity={arrowOpacity}
        onToggleExpanded={toggleExpanded}
      />

      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '3px dashed #3b82f6',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem 3rem',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📄</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Drop Markdown Here
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Drop markdown text or .md file
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
