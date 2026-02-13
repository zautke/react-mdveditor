# Document Type System Architecture

## Overview

The mdeditor application supports multiple document types (Markdown, Mermaid, and extensible to others) through a plugin-based document type registry. This document describes the current monolithic architecture, the proposed plugin architecture, and the flow for adding new document types.

## Current Architecture (Monolithic)

All document type awareness is hardcoded into `EditorWithProview.tsx` across 12 distinct coupling points:

| Concern | Location | Mechanism |
|---|---|---|
| **Type definition** | Line 14 | `type MarkdownDocumentKind = 'markdown' \| 'mermaid'` — union literal |
| **Content detection** | Lines 98-125 | `mermaidStarters[]` + `isMermaidText()` — inline heuristic |
| **Render dispatch** | Lines 176-195 | `RenderPane` ternary: `kind === 'mermaid' ? <MermaidDiagram> : <MarkdownRenderer>` |
| **Tab icon dispatch** | Line 255 | Inline ternary on `doc.kind` |
| **New tab factory** | Lines 389-411 | Separate `handleNewTab` / `handleNewMermaidTab` callbacks |
| **New tab menu** | Lines 477-503 | Hardcoded menu items array |
| **Paste detection** | Lines 298-316 | `isMermaidText()` in paste handler |
| **Drop detection** | Lines 336-376 | `isMermaidText()` in drop handler |
| **File import detection** | Lines 441-463 | `isMermaidText()` in file input handler |
| **File accept attr** | Line 518 | Hardcoded `.md,.mdx,.markdown` |
| **Save/export** | Lines 465-475 | Always `text/markdown` with `.md` extension |
| **State restoration** | Lines 206-209 | Fallback: `doc.kind ?? (isMermaidText(...) ? 'mermaid' : 'markdown')` |

### Diagram: Current Monolithic Architecture

```mermaid
flowchart TB
    subgraph CurrentArch["Current Architecture (Monolithic)"]
        direction TB
        
        TypeDef["type MarkdownDocumentKind<br/>= 'markdown' | 'mermaid'"]
        
        subgraph Detection["Content Detection Layer"]
            direction LR
            MermaidStarters["mermaidStarters[]<br/>keyword array"]
            IsMermaid["isMermaidText()<br/>first-line heuristic"]
            MermaidStarters --> IsMermaid
        end
        
        subgraph Ingestion["Ingestion Points (all call isMermaidText)"]
            direction LR
            Paste["handlePaste()"]
            Drop["handleDrop()"]
            FileInput["handleFileInputChange()"]
            StateRestore["loadState() fallback"]
        end
        
        subgraph DocModel["Document Model"]
            MarkdownDocument["interface MarkdownDocument<br/>{id, title, content, kind}"]
        end
        
        subgraph RenderDispatch["Render Dispatch (ternary)"]
            RenderPane["RenderPane"]
            MermaidRenderer["MermaidDiagram"]
            MarkdownRendererComp["MarkdownRenderer"]
            RenderPane -->|"kind === 'mermaid'"| MermaidRenderer
            RenderPane -->|"else (markdown)"| MarkdownRendererComp
        end
        
        subgraph TabUI["Tab UI Layer"]
            TabIcon["Tab icon ternary"]
            NewTabMenu["Hardcoded menu items"]
            NewMD["handleNewTab()"]
            NewMermaid["handleNewMermaidTab()"]
        end
        
        subgraph FileIO["File I/O"]
            AcceptAttr["accept='.md,.mdx,.markdown'"]
            SaveAs["Always .md export"]
        end
        
        TypeDef --> DocModel
        Detection --> Ingestion
        Ingestion --> DocModel
        DocModel --> RenderDispatch
        DocModel --> TabUI
        DocModel --> FileIO
    end
    
    style CurrentArch fill:#1a1a2e,stroke:#e94560,color:#eee
    style Detection fill:#16213e,stroke:#0f3460,color:#eee
    style Ingestion fill:#16213e,stroke:#0f3460,color:#eee
    style RenderDispatch fill:#16213e,stroke:#e94560,color:#eee
    style TabUI fill:#16213e,stroke:#0f3460,color:#eee
    style FileIO fill:#16213e,stroke:#0f3460,color:#eee
```

## Proposed Plugin Architecture

### Diagram: Plugin-Based Document Type Registry

```mermaid
flowchart TB
    subgraph PluginArch["Proposed Plugin Architecture"]
        direction TB
        
        subgraph Registry["DocumentTypeRegistry (new module)"]
            direction TB
            RegInterface["interface DocumentTypePlugin {<br/>  kind: string<br/>  label: string<br/>  icon: ComponentType<br/>  detect: (text: string) => boolean<br/>  renderer: ComponentType&lt;{content: string}&gt;<br/>  fileExtensions: string[]<br/>  exportMimeType: string<br/>  defaultContent: string<br/>  defaultTitle: (n: number) => string<br/>}"]
            RegMap["Map&lt;string, DocumentTypePlugin&gt;"]
            RegInterface --> RegMap
        end
        
        subgraph BuiltIns["Built-in Plugins"]
            direction LR
            MDPlugin["markdownPlugin<br/>kind: 'markdown'<br/>detect: () => true (fallback)<br/>renderer: MarkdownRenderer"]
            MermaidPlugin["mermaidPlugin<br/>kind: 'mermaid'<br/>detect: isMermaidText()<br/>renderer: MermaidDiagram"]
            HTMLPlugin["htmlPlugin<br/>kind: 'html'<br/>detect: isHtmlDocument()<br/>renderer: HtmlPreview"]
        end
        
        subgraph DetectPipeline["Detection Pipeline (ordered)"]
            direction TB
            Input["Raw Text Input"]
            Chain["registry.detect(text)<br/>iterate plugins by priority<br/>first match wins<br/>fallback: 'markdown'"]
            Result["DocumentKind string"]
            Input --> Chain --> Result
        end
        
        subgraph GenericRender["Generic RenderPane"]
            Lookup["registry.get(kind)"]
            DynRenderer["plugin.renderer"]
            Lookup --> DynRenderer
        end
        
        subgraph GenericTabUI["Generic Tab UI"]
            IconLookup["plugin.icon"]
            MenuGen["registry.all().map(p => menuItem)"]
            FactoryGen["registry.get(kind).defaultContent"]
        end
        
        subgraph GenericFileIO["Generic File I/O"]
            AcceptGen["registry.allExtensions().join(',')"]
            ExportGen["registry.get(kind).exportMimeType"]
        end
        
        BuiltIns --> RegMap
        RegMap --> DetectPipeline
        RegMap --> GenericRender
        RegMap --> GenericTabUI
        RegMap --> GenericFileIO
    end
    
    style PluginArch fill:#0a1628,stroke:#00b4d8,color:#eee
    style Registry fill:#1a1a2e,stroke:#00b4d8,color:#eee
    style BuiltIns fill:#16213e,stroke:#48cae4,color:#eee
    style DetectPipeline fill:#16213e,stroke:#48cae4,color:#eee
    style GenericRender fill:#16213e,stroke:#48cae4,color:#eee
    style GenericTabUI fill:#16213e,stroke:#48cae4,color:#eee
    style GenericFileIO fill:#16213e,stroke:#48cae4,color:#eee
```

### Diagram: Adding a New Document Type (Sequence)

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Plugin as newPlugin.ts
    participant Registry as DocumentTypeRegistry
    participant Editor as EditorWithProview
    participant Render as RenderPane
    participant Preview as NewRenderer

    Note over Dev: Step 1 - Create Renderer Component
    Dev->>Preview: Create renderer component<br/>accepting {content: string}

    Note over Dev: Step 2 - Create Plugin Definition
    Dev->>Plugin: Export DocumentTypePlugin object<br/>kind, detect, renderer, icon, etc.

    Note over Dev: Step 3 - Register Plugin
    Dev->>Registry: registry.register(plugin)
    Note over Registry: Plugin added to Map<br/>Detection chain updated

    Note over Dev: No changes to EditorWithProview needed!

    Note over Editor: Runtime - User pastes content
    Editor->>Registry: registry.detect(pastedText)
    Registry->>Plugin: plugin.detect(text)
    Plugin-->>Registry: true
    Registry-->>Editor: kind = plugin.kind
    Editor->>Editor: setDocuments({...doc, kind})

    Note over Editor: Runtime - Render
    Editor->>Render: RenderPane kind={kind} content={...}
    Render->>Registry: registry.get(kind).renderer
    Registry-->>Render: NewRenderer component
    Render->>Preview: <NewRenderer content={...} />
    Preview-->>Render: Rendered preview
```

## Key Design Decisions

1. **Priority-based detection**: Plugins declare a numeric priority. Higher priority plugins are checked first. Markdown (priority 0) is always the fallback.
2. **Renderer interface normalization**: All renderers accept `{ content: string }`, requiring thin wrapper adapters for existing components that use different prop names.
3. **Registry singleton**: A single shared instance eliminates prop-drilling and context overhead.
4. **Backwards compatibility**: Unknown `kind` values in persisted state gracefully fall back to markdown.
