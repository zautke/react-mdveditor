import { useState, useEffect, useId, DragEvent, memo, useRef, useCallback, createElement, useMemo, Suspense } from 'react'
import { FilePlus2, Download, Settings2 } from 'lucide-react'
import { ExpandToggleButton } from '@/components/ui/expand-toggle-button'
import { TabSystem, TabContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { loadState, saveState } from '@/lib/storage'
import { documentTypeRegistry } from '@/lib/document-types'
import { validateFile } from '@/lib/file-validation'
import { isHttpUrl } from '@/lib/url-validation'
import { UrlInputModal } from '@/components/markdown/UrlInputModal'
import { SettingsDialog } from '@/components/ui/settings-dialog'
import { useUserSettings } from '@/lib/user-settings'
import { fetchUrlContent } from '@/lib/url-fetch'
import type { FetchUrlResult } from '@/lib/url-fetch'
import type { TabItem, NewTabMenuItem } from '@/components/ui/tabs/types'
import { isExcalidrawContentValid } from '@/lib/excalidraw-file'

// ── ARIA: status announcement for preview updates ───────────────────
const PREVIEW_DEBOUNCE_MS = 1500

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
  editorId,
}: {
  content: string
  onContentChange: (value: string) => void
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  isExpanded: boolean
  editorId: string
}) => {
  const headingId = `${editorId}-heading`
  const helpId = `${editorId}-help`

  return (
    <section
      aria-label="Document source editor"
      className={cn(
        "p-4 border-r border-border transition-all duration-400 ease-out",
        "will-change-[flex,opacity] transform-gpu backface-hidden",
        isExpanded
          ? "flex-[0] w-0 min-w-0 opacity-0 overflow-hidden"
          : "flex-1 opacity-100"
      )}
    >
      <div className="flex items-center mb-4">
        <h3 id={headingId} className="m-0 text-lg font-semibold text-foreground">Editor</h3>
      </div>
      <textarea
        id={editorId}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        onPaste={onPaste}
        aria-labelledby={headingId}
        aria-describedby={helpId}
        aria-multiline="true"
        spellCheck
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
      <div id={helpId} className="sr-only">
        Write markdown here. The preview updates automatically in the adjacent panel.
      </div>
    </section>
  )
}, (prevProps, nextProps) => {
  return prevProps.content === nextProps.content &&
         prevProps.isExpanded === nextProps.isExpanded
})
InputPane.displayName = 'InputPane'

// Dynamic RenderPane — resolves renderer from the registry.
// Suspense boundary enables lazy-loaded plugin renderers (e.g. mermaid, react).
const RenderPane = memo(({
  content,
  kind,
  documentId,
  onContentChange,
}: {
  content: string
  kind: string
  documentId: string
  onContentChange?: (next: string) => void
}) => {
  const plugin = documentTypeRegistry.get(kind)
  return (
    <Suspense fallback={
      <div className="p-4 text-muted-foreground animate-pulse" role="status">
        <span className="sr-only">Loading renderer</span>
        Loading renderer…
      </div>
    }>
      <div
        className={cn(
          "transform-gpu",
          plugin.layout === 'canvas' ? "h-full overflow-hidden p-0" : "p-4",
        )}
        role="document"
        aria-label="Rendered preview content"
      >
        {createElement(plugin.renderer, {
          content,
          documentId,
          onContentChange,
          mode: plugin.layout === 'canvas' ? 'editor' : 'preview',
        })}
      </div>
    </Suspense>
  )
}, (prevProps, nextProps) => {
  return prevProps.content === nextProps.content &&
         prevProps.kind === nextProps.kind &&
         prevProps.documentId === nextProps.documentId &&
         prevProps.onContentChange === nextProps.onContentChange
})
RenderPane.displayName = 'RenderPane'

// ── External file injection (CLI: `mde file.md`) ─────────────────────

interface MdeFilePayload { title: string; content: string; filePath: string }

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
  const [urlModalOpen, setUrlModalOpen] = useState(false)
  const [urlModalPrefill, setUrlModalPrefill] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── User settings ───────────────────────────────────────────────
  const { settings } = useUserSettings()

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
  const activePlugin = documentTypeRegistry.get(activeKind)
  const activeUsesCanvasLayout = useMemo(() => {
    if (activePlugin.layout !== 'canvas') return false
    if (activePlugin.kind === 'excalidraw') return isExcalidrawContentValid(activeContent)
    return true
  }, [activeContent, activePlugin])

  // handleNewTab — placed before tabs/menu so useMemo closures can capture it safely.
  // Uses functional updater to read docs.length inside setState, removing the
  // dependency on `documents.length` and making this callback fully stable.
  const handleNewTab = useCallback((kind: string = 'markdown') => {
    const plugin = documentTypeRegistry.get(kind)
    const newId = generateDocId()
    setDocuments(docs => {
      const newDoc: EditorDocument = {
        id: newId,
        title: plugin.defaultTitle(docs.length + 1),
        content: plugin.defaultContent,
        kind: plugin.kind,
      }
      return [...docs, newDoc]
    })
    setActiveDocId(newId)
  }, [])

  // openExternalFiles — stable callback for CLI file injection via /api/mde-open or HMR
  const openExternalFiles = useCallback((files: MdeFilePayload[]) => {
    if (files.length === 0) return
    let lastId = ''
    setDocuments(docs => {
      let next = [...docs]
      for (const file of files) {
        const ext = file.filePath.includes('.')
          ? `.${file.filePath.split('.').pop() ?? ''}`
          : ''
        const kind = documentTypeRegistry.getByExtension(ext)?.kind
          ?? documentTypeRegistry.detect(file.content)
        const newId = generateDocId()
        lastId = newId
        next = [...next, { id: newId, title: file.title, content: file.content, kind }]
      }
      return next
    })
    if (lastId) setActiveDocId(lastId)
  }, [])

  // Mount: fetch queued files; HMR: receive live files from CLI
  useEffect(() => {
    fetch('/api/mde-pending')
      .then(r => r.json() as Promise<{ files: MdeFilePayload[] }>)
      .then(({ files }) => { if (files.length > 0) openExternalFiles(files) })
      .catch(() => { /* not in dev mode or no server — ignore */ })

    if (import.meta.hot) {
      import.meta.hot.on('mde:open-files', (data: { files: MdeFilePayload[] }) => openExternalFiles(data.files))
    }
  }, [openExternalFiles])

  // Tabs — include plugin icon for each document.
  // Memoized with a metadata fingerprint so content edits (which update `documents`)
  // don't recreate tab items — only id/title/kind/count changes matter for tabs.
  const docMetaKey = documents.map(d => `${d.id}\0${d.title}\0${d.kind}`).join('\n')

  const tabs: TabItem[] = useMemo(() =>
    documents.map(doc => {
      const plugin = documentTypeRegistry.get(doc.kind)
      return {
        id: doc.id,
        label: doc.title,
        icon: createElement(plugin.icon, { className: 'h-3.5 w-3.5' } as Record<string, unknown>),
        closable: documents.length > 1,
        color: plugin.tabColor,
      }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [docMetaKey]
  )

  // New-tab dropdown menu — one item per registered document type.
  // Memoized because the registry is static and handleNewTab is fully stable ([] deps).
  const newTabMenuItems: NewTabMenuItem[] = useMemo(() =>
    documentTypeRegistry.all().map(plugin => ({
      id: `new-${plugin.kind}`,
      label: `New ${plugin.label}`,
      icon: createElement(plugin.icon, { className: 'h-4 w-4' } as Record<string, unknown>),
      onSelect: () => handleNewTab(plugin.kind),
    })),
    [handleNewTab]
  )

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

  // ── URL modal success handler ────────────────────────────────────
  // Defined before handleDrop because auto-fetch mode calls it directly.
  const handleUrlModalSuccess = useCallback((result: FetchUrlResult) => {
    const newId = generateDocId()
    const title = result.meta.title ?? result.meta.siteName ?? 'Web Article'
    setDocuments(docs => [
      ...docs,
      { id: newId, title, content: result.content, kind: 'url' },
    ])
    setActiveDocId(newId)
  }, [])

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    // Plain text drop — check for URL first, then open as new tab
    const text = e.dataTransfer.getData('text/plain')
    if (text) {
      // URL drop → auto-fetch or open modal depending on user setting
      if (isHttpUrl(text)) {
        const trimmedUrl = text.trim()
        if (settings.urlDragAutoFetch) {
          // Auto-fetch: skip modal, create document directly.
          // On failure, fall back to the confirmation modal.
          fetchUrlContent(trimmedUrl)
            .then(handleUrlModalSuccess)
            .catch(() => {
              setUrlModalPrefill(trimmedUrl)
              setUrlModalOpen(true)
            })
        } else {
          setUrlModalPrefill(trimmedUrl)
          setUrlModalOpen(true)
        }
        return
      }
      const converted = convertLatexDelimiters(text)
      const detectedKind = documentTypeRegistry.detect(converted)
      const newId = generateDocId()
      setDocuments(docs => {
        const newDoc: EditorDocument = {
          id: newId,
          title: documentTypeRegistry.get(detectedKind).defaultTitle(docs.length + 1),
          content: converted,
          kind: detectedKind,
        }
        return [...docs, newDoc]
      })
      setActiveDocId(newId)
      return
    }

    // File drop — validate with blacklist + binary check, then open in new tab
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      const result = await validateFile(file)
      if (!result.safe) {
        console.warn(`[FileDrop] Rejected "${file.name}": ${result.reason}`)
        return
      }
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
    }
  }, [settings.urlDragAutoFetch, handleUrlModalSuccess])

  const handleDocumentContentChange = useCallback((documentId: string, value: string) => {
    setDocuments(docs => docs.map(d =>
      d.id === documentId ? { ...d, content: value } : d
    ))
  }, [])

  const handleContentChange = useCallback((value: string) => {
    handleDocumentContentChange(activeDocId, value)
  }, [activeDocId, handleDocumentContentChange])

  const handleTabChange = useCallback((tabId: string) => {
    setActiveDocId(tabId)
  }, [])

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

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate with blacklist + binary check before reading
    const result = await validateFile(file)
    if (!result.safe) {
      console.warn(`[FileInput] Rejected "${file.name}": ${result.reason}`)
      e.target.value = ''
      return
    }

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

  // ── URL preview inline-fetch event listener ──────────────────────
  // UrlPreview's EmptyState dispatches 'url-preview-fetched' when a
  // user fetches a URL from within the empty-state form.
  useEffect(() => {
    const handler = (e: Event) => {
      const { documentId, result } = (e as CustomEvent<{ documentId: string; result: FetchUrlResult }>).detail
      const nextTitle = result.meta.title ?? result.meta.siteName ?? 'Web Article'
      setDocuments(docs => docs.map(d =>
        d.id === documentId ? { ...d, title: nextTitle, content: result.content, kind: 'url' } : d
      ))
    }
    window.addEventListener('url-preview-fetched', handler)
    return () => window.removeEventListener('url-preview-fetched', handler)
  }, [])

  // ── ARIA: unique IDs and live-region state ───────────────────────
  const editorId = useId()
  const previewStatusId = `${editorId}-preview-status`
  const [previewStatus, setPreviewStatus] = useState('')
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Announce preview updates after a pause in typing
  useEffect(() => {
    clearTimeout(previewDebounceRef.current)
    previewDebounceRef.current = setTimeout(() => {
      setPreviewStatus('Preview updated')
      // Clear after brief announcement window
      setTimeout(() => setPreviewStatus(''), 500)
    }, PREVIEW_DEBOUNCE_MS)
    return () => clearTimeout(previewDebounceRef.current)
  }, [activeContent])

  // ── Render ──────────────────────────────────────────────────────

  return (
    <main
      id="main-content"
      aria-label="Markdown editor application"
      className="flex flex-col h-screen font-sans relative bg-background text-foreground"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input — accepts all text formats (runtime blacklist validates) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="text/*,.md,.mdx,.markdown,.mmd,.mermaid,.jsx,.tsx,.html,.htm,.json,.excalidraw,.yaml,.yml,.toml,.xml,.csv,.tsv,.log,.cfg,.ini,.conf,.sh,.bash,.zsh,.fish,.py,.rb,.rs,.go,.java,.kt,.swift,.c,.cpp,.h,.hpp,.css,.scss,.sass,.less,.sql,.graphql,.gql,.env,.gitignore,.editorconfig,.prettierrc,.eslintrc"
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden" role="group" aria-label="Editor and preview panes">
        {!activeUsesCanvasLayout && (
          <InputPane
            content={activeContent}
            onContentChange={handleContentChange}
            onPaste={handlePaste}
            isExpanded={isExpanded}
            editorId={`${editorId}-textarea`}
          />
        )}

        <div className="flex-1 flex flex-col relative overflow-hidden">
          {!activeUsesCanvasLayout && (
            <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center bg-gradient-to-r from-black/[0.02] to-transparent z-10">
              <ExpandToggleButton
                isExpanded={isExpanded}
                onClick={toggleExpanded}
                opacity={arrowOpacity}
              />
            </div>
          )}

          {/* File toolbar + Tab System */}
          <div className={cn(
            "flex-1 flex flex-col overflow-hidden",
            activeUsesCanvasLayout ? "pl-0" : "pl-8",
          )}>
            {/* File toolbar row — right-justified icon control panel */}
            <div
              role="toolbar"
              aria-label="Document actions"
              aria-orientation="horizontal"
              className="flex items-center justify-end gap-1 px-2 py-1.5 border-b border-border"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleAddFile}
                    className={cn(
                      "app-icon-button app-icon-button-surface icon-button-unified cursor-pointer",
                    )}
                    aria-label="Upload file to new tab"
                  >
                    <FilePlus2 aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upload file</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSave}
                    className={cn(
                      "app-icon-button app-icon-button-surface icon-button-unified cursor-pointer",
                    )}
                    aria-label={`Download ${activeDoc?.title || 'document'} as file`}
                  >
                    <Download aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download file</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSettingsOpen(true)}
                    className={cn(
                      "app-icon-button app-icon-button-surface icon-button-unified cursor-pointer",
                    )}
                    aria-label="Open settings"
                  >
                    <Settings2 aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
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
                  <RenderPane
                    content={doc.content}
                    kind={doc.kind}
                    documentId={doc.id}
                    onContentChange={(next) => handleDocumentContentChange(doc.id, next)}
                  />
                </TabContent>
              ))}
            </TabSystem>
          </div>
        </div>
      </div>

      {/* ARIA: Live region for preview status announcements */}
      <div
        id={previewStatusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {previewStatus}
      </div>

      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 bg-primary/10 border-3 border-dashed border-primary rounded-lg flex items-center justify-center z-[1000] pointer-events-none"
          role="status"
          aria-live="assertive"
        >
          <div className="bg-background p-8 rounded-lg shadow-xl text-center">
            <div className="text-5xl mb-4" aria-hidden="true">📄</div>
            <div className="text-xl font-bold mb-2">Drop File Here</div>
            <div className="text-sm text-muted-foreground">
              Drop a text file to open it in a new tab
            </div>
          </div>
        </div>
      )}

      {/* URL fetch modal — opened by URL drop or menu action */}
      <UrlInputModal
        open={urlModalOpen}
        onOpenChange={setUrlModalOpen}
        prefillUrl={urlModalPrefill}
        onSuccess={handleUrlModalSuccess}
      />

      {/* Settings modal */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </main>
  )
}

export default App
