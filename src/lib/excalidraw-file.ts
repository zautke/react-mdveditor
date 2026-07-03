import { restore, serializeAsJSON, MIME_TYPES } from '@excalidraw/excalidraw'
import type { BinaryFiles } from '@excalidraw/excalidraw/types'

export const EXCALIDRAW_EXPORT_MIME_TYPE = MIME_TYPES.excalidraw

type ParsedExcalidrawObject = {
  type?: unknown
  version?: unknown
  source?: unknown
  elements?: unknown
  appState?: unknown
  files?: unknown
}

export type RestoredExcalidrawScene = ReturnType<typeof restore>

export interface ParsedExcalidrawContent {
  raw: ParsedExcalidrawObject
  scene: RestoredExcalidrawScene
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function looksLikeExcalidrawText(text: string): boolean {
  const trimmed = text.trimStart()
  if (!trimmed.startsWith('{')) return false

  const peek = trimmed.slice(0, 400).toLowerCase()
  return (
    peek.includes('"type"') &&
    peek.includes('"excalidraw"') &&
    peek.includes('"elements"')
  )
}

export function parseExcalidrawContent(
  text: string,
): { ok: true; value: ParsedExcalidrawContent } | { ok: false; error: string } {
  if (!text.trim()) {
    return { ok: false, error: 'Excalidraw documents must contain JSON scene data.' }
  }

  let raw: ParsedExcalidrawObject
  try {
    const parsed = JSON.parse(text) as unknown
    if (!isRecord(parsed)) {
      return { ok: false, error: 'Expected a JSON object at the top level.' }
    }
    raw = parsed as ParsedExcalidrawObject
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON'
    return { ok: false, error: message }
  }

  if (raw.type !== 'excalidraw') {
    return { ok: false, error: 'Expected `type` to be `"excalidraw"`.' }
  }

  if (!Array.isArray(raw.elements)) {
    return { ok: false, error: 'Expected `elements` to be an array.' }
  }

  const appState = isRecord(raw.appState) ? raw.appState : {}
  const files = isRecord(raw.files) ? (raw.files as BinaryFiles) : {}

  try {
    const scene = restore(
      {
        elements: raw.elements,
        appState,
        files,
      },
      null,
      null,
      { refreshDimensions: true, repairBindings: true },
    )

    return { ok: true, value: { raw, scene } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to restore Excalidraw scene'
    return { ok: false, error: message }
  }
}

export function isExcalidrawContentValid(text: string): boolean {
  return parseExcalidrawContent(text).ok
}

export function serializeExcalidrawScene(scene: RestoredExcalidrawScene): string {
  return serializeAsJSON(scene.elements, scene.appState, scene.files, 'local')
}
