export type PreviewMode = 'shared' | 'isolated'

const modeByDocument = new Map<string, PreviewMode>()

function getSessionKey(documentId?: string): string {
  return documentId && documentId.trim().length > 0
    ? documentId
    : '__react-preview:ephemeral__'
}

export function getMode(documentId?: string): PreviewMode {
  const key = getSessionKey(documentId)
  return modeByDocument.get(key) ?? 'shared'
}

export function setMode(documentId: string | undefined, mode: PreviewMode): void {
  const key = getSessionKey(documentId)
  modeByDocument.set(key, mode)
}
