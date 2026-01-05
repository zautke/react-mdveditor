import { useState, DragEvent, memo, useRef, useCallback } from 'react'
import { FilePlus2, Download } from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer_orig'
import { ExpandToggleButton } from '@/components/ui/expand-toggle-button'
import { TabSystem, TabContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'
import type { TabItem } from '@/components/ui/tabs/types'

// Document type for multi-tab editing
interface MarkdownDocument {
  id: string
  title: string
  content: string
}

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

// Memoized InputPane with Tailwind classes
const InputPane = memo(({
  markdown,
  onMarkdownChange,
  onPaste,
  isExpanded
}: {
  markdown: string
  onMarkdownChange: (value: string) => void
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  isExpanded: boolean
}) => {
  return (
    <div
      className={cn(
        "p-4 border-r border-border transition-all duration-400 ease-out",
        "will-change-[flex,opacity] transform-gpu backface-hidden",
        isExpanded
          ? "flex-[0] w-0 min-w-0 opacity-0 overflow-hidden"
          : "flex-1 opacity-100"
      )}
    >
      <div className="flex items-center mb-4">
        <h3 className="m-0 text-lg font-semibold text-foreground">Markdown Input</h3>
      </div>
      <textarea
        value={markdown}
        onChange={(e) => onMarkdownChange(e.target.value)}
        onPaste={onPaste}
        className={cn(
          "w-full h-[calc(100%-3rem)] p-2",
          "border border-input rounded-md",
          "font-mono text-sm",
          "bg-background text-foreground",
          "resize-none",
          "focus:outline-none focus:ring-2 focus:ring-ring"
        )}
        placeholder="Enter your markdown here..."
      />
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.markdown === nextProps.markdown &&
         prevProps.isExpanded === nextProps.isExpanded
})
InputPane.displayName = 'InputPane'

// Memoized RenderPane with Tailwind classes
const RenderPane = memo(({
  markdown,
}: {
  markdown: string
}) => {
  return (
    <div className="p-4 transform-gpu">
      <MarkdownRenderer>{markdown}</MarkdownRenderer>
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.markdown === nextProps.markdown
})
RenderPane.displayName = 'RenderPane'

// Generate unique ID for new documents
let docCounter = 1
const generateDocId = () => `doc-${Date.now()}-${docCounter++}`

function App() {
  // Multi-document state
  const [documents, setDocuments] = useState<MarkdownDocument[]>([
    { id: 'doc-1', title: 'Untitled-1', content: initialMarkdown }
  ])
  const [activeDocId, setActiveDocId] = useState('doc-1')
  const [isExpanded, setIsExpanded] = useState(false)
  const [arrowOpacity, setArrowOpacity] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get active document
  const activeDoc = documents.find(d => d.id === activeDocId) || documents[0]
  const markdown = activeDoc?.content || ''

  // Convert documents to TabItems
  const tabs: TabItem[] = documents.map(doc => ({
    id: doc.id,
    label: doc.title,
    closable: documents.length > 1
  }))

  const toggleExpanded = useCallback(() => {
    setArrowOpacity(0)
    setTimeout(() => {
      setIsExpanded(prev => !prev)
      setArrowOpacity(1)
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
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }, [])

  const detectAndConvertLatex = useCallback((text: string): string => {
    const hasLatexInline = /\\\(.+?\\\)/.test(text)
    const hasLatexBlock = /\\\[.+?\\\]/s.test(text)
    if (hasLatexInline || hasLatexBlock) {
      let converted = text
      converted = converted.replace(/\\\((.+?)\\\)/g, (_, eq) => '$' + eq.trim() + '$')
      converted = converted.replace(/\\\[(.+?)\\\]/gs, (_, eq) => '\n$$\n' + eq.trim() + '\n$$\n')
      return converted
    }
    return text
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text/plain')
    const hasLatexInline = /\\\(.+?\\\)/.test(pastedText)
    const hasLatexBlock = /\\\[.+?\\\]/s.test(pastedText)
    if (hasLatexInline || hasLatexBlock) {
      e.preventDefault()
      const convertedText = detectAndConvertLatex(pastedText)
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newText = markdown.substring(0, start) + convertedText + markdown.substring(end)
      setDocuments(docs => docs.map(d =>
        d.id === activeDocId ? { ...d, content: newText } : d
      ))
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + convertedText.length
        textarea.focus()
      }, 0)
    }
  }, [markdown, activeDocId, detectAndConvertLatex])

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const text = e.dataTransfer.getData('text/plain')
    if (text) {
      const convertedText = detectAndConvertLatex(text)
      setDocuments(docs => docs.map(d =>
        d.id === activeDocId ? { ...d, content: convertedText } : d
      ))
      return
    }
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.type === 'text/markdown') {
        const reader = new FileReader()
        reader.onload = (event) => {
          const content = event.target?.result as string
          if (content) {
            const convertedContent = detectAndConvertLatex(content)
            setDocuments(docs => docs.map(d =>
              d.id === activeDocId ? { ...d, content: convertedContent, title: file.name.replace(/\.(md|markdown)$/, '') } : d
            ))
          }
        }
        reader.readAsText(file)
      }
    }
  }, [activeDocId, detectAndConvertLatex])

  const handleMarkdownChange = useCallback((value: string) => {
    setDocuments(docs => docs.map(d =>
      d.id === activeDocId ? { ...d, content: value } : d
    ))
  }, [activeDocId])

  // Tab handlers
  const handleTabChange = useCallback((tabId: string) => {
    setActiveDocId(tabId)
  }, [])

  const handleNewTab = useCallback(() => {
    const newId = generateDocId()
    const newDoc: MarkdownDocument = {
      id: newId,
      title: `Untitled-${documents.length + 1}`,
      content: '# New Document\n\nStart writing...'
    }
    setDocuments(docs => [...docs, newDoc])
    setActiveDocId(newId)
  }, [documents.length])

  const handleDeleteTab = useCallback((tabId: string) => {
    if (documents.length <= 1) return
    const idx = documents.findIndex(d => d.id === tabId)
    const newDocs = documents.filter(d => d.id !== tabId)
    setDocuments(newDocs)
    if (activeDocId === tabId) {
      const newActiveIdx = Math.min(idx, newDocs.length - 1)
      setActiveDocId(newDocs[newActiveIdx].id)
    }
  }, [documents, activeDocId])

  // Control bar handlers
  const handleAddFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        const convertedContent = detectAndConvertLatex(content)
        const newId = generateDocId()
        const newDoc: MarkdownDocument = {
          id: newId,
          title: file.name.replace(/\.(md|markdown)$/, ''),
          content: convertedContent
        }
        setDocuments(docs => [...docs, newDoc])
        setActiveDocId(newId)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [detectAndConvertLatex])

  const handleSave = useCallback(() => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeDoc?.title || 'document'}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [markdown, activeDoc?.title])

  return (
    <div
      className="flex flex-col h-screen font-sans relative bg-background text-foreground"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input for Add File */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.mdx,.markdown"
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Control Bar - top right */}
      <div className="absolute top-2 right-4 z-50 flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleAddFile}
              className="h-8 w-8"
              aria-label="Add file"
            >
              <FilePlus2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add file</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSave}
              className="h-8 w-8"
              aria-label="Save file"
            >
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Save file</p>
          </TooltipContent>
        </Tooltip>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Input Pane */}
        <InputPane
          markdown={markdown}
          onMarkdownChange={handleMarkdownChange}
          onPaste={handlePaste}
          isExpanded={isExpanded}
        />

        {/* Render Pane with Tabs */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Gutter with toggle button */}
          <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center bg-gradient-to-r from-black/[0.02] to-transparent z-10">
            <ExpandToggleButton
              isExpanded={isExpanded}
              onClick={toggleExpanded}
              opacity={arrowOpacity}
            />
          </div>

          {/* Tab System */}
          <div className="flex-1 pl-8 flex flex-col overflow-hidden">
            <TabSystem
              tabs={tabs}
              activeTab={activeDocId}
              onTabChange={handleTabChange}
              onNewTab={handleNewTab}
              onDeleteTab={handleDeleteTab}
              variant="chrome"
              showNewButton
              showCloseButtons
              className="flex-1"
            >
              {documents.map(doc => (
                <TabContent key={doc.id} value={doc.id}>
                  <RenderPane markdown={doc.content} />
                </TabContent>
              ))}
            </TabSystem>
          </div>
        </div>
      </div>

      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-3 border-dashed border-primary rounded-lg flex items-center justify-center z-[1000] pointer-events-none">
          <div className="bg-background p-8 rounded-lg shadow-xl text-center">
            <div className="text-5xl mb-4">📄</div>
            <div className="text-xl font-bold mb-2">Drop Markdown Here</div>
            <div className="text-sm text-muted-foreground">
              Drop markdown text or .md file
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
