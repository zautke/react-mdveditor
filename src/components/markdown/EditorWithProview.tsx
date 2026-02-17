import { useState, useEffect, DragEvent, memo, useRef, useCallback, createElement } from 'react'
import { FilePlus2, Download } from 'lucide-react'
import { ExpandToggleButton } from '@/components/ui/expand-toggle-button'
import { TabSystem, TabContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { loadState, saveState } from '@/lib/storage'
import { documentTypeRegistry } from '@/lib/document-types'
import type { TabItem, NewTabMenuItem } from '@/components/ui/tabs/types'

// ── Document model ──────────────────────────────────────────────────
// `kind` links each document to a registered plugin via the registry.

interface EditorDocument {
  id: string
  title: string
  content: string
  kind: string
}

// ── Initial content ─────────────────────────────────────────────────
// Used only on first launch (no localStorage).  Delegates to the
// markdown plugin's default content if the registry is loaded;
// otherwise uses a hard-wired fallback (shouldn't happen in practice).

const initialContent = `# React Markdown Demo

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

> **Tip:** Drop a file onto this editor to load it!`

// ── Memoized sub-components ─────────────────────────────────────────

const InputPane = memo(({
  content,
  onContentChange,
  onPaste,
  isExpanded,
}: {
  content: string
  onContentChange: (value: string) => void
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
        <h3 className="m-0 text-lg font-semibold text-foreground">Editor</h3>
      </div>
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        onPaste={onPaste}
        className={cn(
          "w-full h-[calc(100%-3rem)] p-2",
          "border border-input rounded-md",
          "font-mono text-sm",
          "bg-background text-foreground",
          "resize-none",
          "focus:outline-none focus:ring-2 focus:ring-ring"
        )}
        placeholder="Start typing..."
      />
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.content === nextProps.content &&
         prevProps.isExpanded === nextProps.isExpanded
})
InputPane.displayName = 'InputPane'

// Dynamic RenderPane — resolves renderer from the registry
const RenderPane = memo(({
  content,
  kind,
}: {
  content: string
  kind: string
}) => {
  const plugin = documentTypeRegistry.get(kind)
  return (
    <div className="p-4 transform-gpu">
      {createElement(plugin.renderer, { content })}
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.content === nextProps.content &&
         prevProps.kind === nextProps.kind
})
RenderPane.displayName = 'RenderPane'

// ── Helpers ─────────────────────────────────────────────────────────

let docCounter = 1
const generateDocId = () => `doc-${Date.now()}-${docCounter++}`

/**
 * Detect LaTeX delimiters and convert to markdown-compatible math.
 * Pure function — no side effects.
 */
function convertLatexDelimiters(text: string): string {
  const hasInline = /\\\(.+?\\\)/.test(text)
  const hasBlock = /\\\[.+?\\\]/s.test(text)
  if (!hasInline && !hasBlock) return text

  let converted = text
  converted = converted.replace(/\\\((.+?)\\\)/g, (_, eq: string) => '$' + eq.trim() + '$')
  converted = converted.replace(/\\\[(.+?)\\\]/gs, (_, eq: string) => '\n$$\n' + eq.trim() + '\n$$\n')
  return converted
}

// ── Main component ──────────────────────────────────────────────────

function App() {
  // Multi-document state — restored from localStorage
  const [documents, setDocuments] = useState<EditorDocument[]>(() => {
    const saved = loadState<EditorDocument[]>('documents', [])
    if (saved.length > 0) {
      // Migration: add `kind` to documents saved before the registry existed
      return saved.map(doc => ({
        ...doc,
        kind: doc.kind ?? documentTypeRegistry.detect(doc.content),
      }))
    }
    return [{ id: 'doc-1', title: 'Untitled-1', content: initialContent, kind: 'markdown' }]
  })
  const [activeDocId, setActiveDocId] = useState(() => {
    const saved = loadState<string>('activeDocId', '')
    return saved || 'doc-1'
  })
  const [isExpanded, setIsExpanded] = useState(() =>
    loadState<boolean>('isExpanded', false)
  )
  const [arrowOpacity, setArrowOpacity] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Persistence ─────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => saveState('documents', documents), 500)
    return () => clearTimeout(timer)
  }, [documents])

  useEffect(() => {
    saveState('activeDocId', activeDocId)
  }, [activeDocId])

  useEffect(() => {
    saveState('isExpanded', isExpanded)
  }, [isExpanded])

  // ── Derived values ──────────────────────────────────────────────

  const activeDoc = documents.find(d => d.id === activeDocId) || documents[0]
  const activeContent = activeDoc?.content || ''
  const activeKind = activeDoc?.kind || 'markdown'

  // Tabs — include plugin icon for each document
  const tabs: TabItem[] = documents.map(doc => {
    const plugin = documentTypeRegistry.get(doc.kind)
    return {
      id: doc.id,
      label: doc.title,
      icon: createElement(plugin.icon, { className: 'h-3.5 w-3.5' } as Record<string, unknown>),
      closable: documents.length > 1,
      color: plugin.tabColor,
    }
  })

  // New-tab dropdown menu — one item per registered document type
  const newTabMenuItems: NewTabMenuItem[] = documentTypeRegistry.all().map(plugin => ({
    id: `new-${plugin.kind}`,
    label: `New ${plugin.label}`,
    icon: createElement(plugin.icon, { className: 'h-4 w-4' } as Record<string, unknown>),
    onSelect: () => handleNewTab(plugin.kind),
  }))

  // ── Event handlers ──────────────────────────────────────────────

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

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text/plain')
    const converted = convertLatexDelimiters(pastedText)

    // Always compute the resulting full text and detect document kind.
    // This enables auto-detection when pasting HTML/mermaid into an empty doc.
    const textarea = e.currentTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const resultingText = activeContent.substring(0, start) + converted + activeContent.substring(end)
    const detectedKind = documentTypeRegistry.detect(resultingText)

    if (converted !== pastedText || detectedKind !== activeKind) {
      // Either LaTeX was converted OR document kind changed — handle manually
      e.preventDefault()
      setDocuments(docs => docs.map(d =>
        d.id === activeDocId ? { ...d, content: resultingText, kind: detectedKind } : d
      ))
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + converted.length
        textarea.focus()
      }, 0)
    }
    // Otherwise: no LaTeX and same kind — let browser handle paste normally
  }, [activeContent, activeDocId, activeKind])

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    // Plain text drop
    const text = e.dataTransfer.getData('text/plain')
    if (text) {
      const converted = convertLatexDelimiters(text)
      const detectedKind = documentTypeRegistry.detect(converted)
      setDocuments(docs => docs.map(d =>
        d.id === activeDocId ? { ...d, content: converted, kind: detectedKind } : d
      ))
      return
    }

    // File drop
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      const ext = file.name.includes('.') ? `.${file.name.split('.').pop() ?? ''}` : ''
      const pluginByExt = documentTypeRegistry.getByExtension(ext)
      if (pluginByExt || file.type.startsWith('text/')) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const content = event.target?.result as string
          if (content) {
            const converted = convertLatexDelimiters(content)
            const kind = pluginByExt?.kind ?? documentTypeRegistry.detect(converted)
            const title = documentTypeRegistry.stripExtension(file.name)
            setDocuments(docs => docs.map(d =>
              d.id === activeDocId ? { ...d, content: converted, kind, title } : d
            ))
          }
        }
        reader.readAsText(file)
      }
    }
  }, [activeDocId])

  const handleContentChange = useCallback((value: string) => {
    setDocuments(docs => docs.map(d =>
      d.id === activeDocId ? { ...d, content: value } : d
    ))
  }, [activeDocId])

  const handleTabChange = useCallback((tabId: string) => {
    setActiveDocId(tabId)
  }, [])

  const handleNewTab = useCallback((kind: string = 'markdown') => {
    const plugin = documentTypeRegistry.get(kind)
    const newId = generateDocId()
    const newDoc: EditorDocument = {
      id: newId,
      title: plugin.defaultTitle(documents.length + 1),
      content: plugin.defaultContent,
      kind: plugin.kind,
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

  const handleReorderTabs = useCallback((newOrder: string[]) => {
    setDocuments(docs => {
      const docMap = new Map(docs.map(d => [d.id, d]))
      return newOrder.map(id => docMap.get(id)!).filter(Boolean)
    })
  }, [])

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
        const converted = convertLatexDelimiters(content)
        const ext = file.name.includes('.') ? `.${file.name.split('.').pop() ?? ''}` : ''
        const pluginByExt = documentTypeRegistry.getByExtension(ext)
        const kind = pluginByExt?.kind ?? documentTypeRegistry.detect(converted)
        const newId = generateDocId()
        const newDoc: EditorDocument = {
          id: newId,
          title: documentTypeRegistry.stripExtension(file.name),
          content: converted,
          kind,
        }
        setDocuments(docs => [...docs, newDoc])
        setActiveDocId(newId)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const handleSave = useCallback(() => {
    const plugin = documentTypeRegistry.get(activeKind)
    const blob = new Blob([activeContent], { type: plugin.exportMimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeDoc?.title || 'document'}${plugin.exportExtension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [activeContent, activeKind, activeDoc?.title])

  // ── Render ──────────────────────────────────────────────────────

  // Build the file-accept string from all registered extensions
  const acceptExtensions = documentTypeRegistry.allExtensions().join(',')

  return (
    <div
      className="flex flex-col h-screen font-sans relative bg-background text-foreground"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input — accepts all registered extensions */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptExtensions}
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <InputPane
          content={activeContent}
          onContentChange={handleContentChange}
          onPaste={handlePaste}
          isExpanded={isExpanded}
        />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Gutter with toggle button */}
          <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center bg-gradient-to-r from-black/[0.02] to-transparent z-10">
            <ExpandToggleButton
              isExpanded={isExpanded}
              onClick={toggleExpanded}
              opacity={arrowOpacity}
            />
          </div>

          {/* File toolbar + Tab System */}
          <div className="flex-1 pl-8 flex flex-col overflow-hidden">
            {/* File toolbar row */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleAddFile}
                    className="h-7 w-7"
                    aria-label="Add file"
                  >
                    <FilePlus2 className="h-3.5 w-3.5" />
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
                    className="h-7 w-7"
                    aria-label="Download file"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download file</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <TabSystem
              tabs={tabs}
              activeTab={activeDocId}
              onTabChange={handleTabChange}
              onNewTab={() => handleNewTab('markdown')}
              newTabMenuItems={newTabMenuItems}
              onDeleteTab={handleDeleteTab}
              onReorderTabs={handleReorderTabs}
              variant="capsule"
              showNewButton
              showCloseButtons
              className="flex-1"
            >
              {documents.map(doc => (
                <TabContent key={doc.id} value={doc.id}>
                  <RenderPane content={doc.content} kind={doc.kind} />
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
            <div className="text-xl font-bold mb-2">Drop File Here</div>
            <div className="text-sm text-muted-foreground">
              Drop a text file to open it
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
