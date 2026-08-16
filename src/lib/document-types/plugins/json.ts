import { FileJson } from 'lucide-react'
import JsonPreview from '@/components/markdown/JsonPreview'
import type { DocumentTypePlugin } from '../types'

export const jsonPlugin: DocumentTypePlugin = {
  kind: 'json',
  label: 'JSON',
  icon: FileJson,
  detect: (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return false
    
    // A quick heuristic: JSON usually starts and ends with { } or [ ]
    const looksLikeJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                          (trimmed.startsWith('[') && trimmed.endsWith(']'))
    
    if (!looksLikeJson) return false

    // To prevent false positives with markdown that happens to have brackets,
    // we do a quick parse. This is fast enough for small/medium documents,
    // but we can wrap it in a try-catch.
    try {
      JSON.parse(trimmed)
      return true
    } catch {
      return false
    }
  },
  priority: 8,
  renderer: JsonPreview,
  layout: 'split',
  fileExtensions: ['.json'],
  exportMimeType: 'application/json',
  exportExtension: '.json',
  defaultContent: '{\n  "hello": "world"\n}',
  defaultTitle: (n: number) => `data-${n}`,
  tabColor: 'oklch(0.65 0.15 100)',
}
