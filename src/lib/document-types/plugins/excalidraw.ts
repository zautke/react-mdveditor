/**
 * Excalidraw Plugin — native `.excalidraw` scene files.
 *
 * Detection stays intentionally cheap because the registry runs on paste,
 * drop, and load. We rely on file-extension matching first, then a short
 * string heuristic to pre-empt the generic JSON plugin.
 */

import { lazy, Suspense, createElement } from 'react'
import { PenTool } from 'lucide-react'
import type { DocumentTypePlugin, RendererProps } from '../types'
import {
  EXCALIDRAW_EXPORT_MIME_TYPE,
  looksLikeExcalidrawText,
} from '@/lib/excalidraw-file'

const LazyExcalidrawSurface = lazy(
  () => import('@/components/markdown/ExcalidrawSurface'),
)

function ExcalidrawRendererWrapper(props: RendererProps) {
  return createElement(
    Suspense,
    {
      fallback: createElement(
        'div',
        { style: { padding: '1rem', color: '#888', fontStyle: 'italic' } },
        'Loading Excalidraw…',
      ),
    },
    createElement(LazyExcalidrawSurface, props),
  )
}
ExcalidrawRendererWrapper.displayName = 'ExcalidrawRendererWrapper'

const defaultExcalidrawContent = `{
  "type": "excalidraw",
  "version": 2,
  "source": "mdeditor",
  "elements": [],
  "appState": {},
  "files": {}
}`

export const excalidrawPlugin: DocumentTypePlugin = {
  kind: 'excalidraw',
  label: 'Excalidraw',
  icon: PenTool,
  detect: looksLikeExcalidrawText,
  priority: 9,
  renderer: ExcalidrawRendererWrapper,
  layout: 'canvas',
  fileExtensions: ['.excalidraw'],
  exportMimeType: EXCALIDRAW_EXPORT_MIME_TYPE,
  exportExtension: '.excalidraw',
  defaultContent: defaultExcalidrawContent,
  defaultTitle: (n: number) => `Drawing-${n}`,
  tabColor: 'oklch(0.72 0.17 85)',
}
