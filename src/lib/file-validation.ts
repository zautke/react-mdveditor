/**
 * File Validation — Blacklist-based safety checks for dropped/uploaded files.
 *
 * Strategy: Accept all text-format files by default and reject only known
 * dangerous or binary file types. Two-pronged approach:
 *   1. Extension blacklist — known dangerous / binary extensions
 *   2. Binary content detection — checks first N bytes for null bytes
 *
 * Sources: Oracle, Microsoft, Intermedia, Broadcom security advisories.
 */

// ── Dangerous extensions ────────────────────────────────────────────
//
// Organised by category for maintainability.  All entries are lowercase
// with a leading dot.

const EXECUTABLES = [
  '.exe', '.com', '.dll', '.sys', '.drv', '.ocx', '.bin', '.elf',
  '.msi', '.msp', '.msc', '.app', '.dmg', '.deb', '.rpm', '.appimage',
  '.scr', '.pif', '.cpl', '.inf', '.lnk', '.scf',
] as const

const SYSTEM_SCRIPTS = [
  '.bat', '.cmd', '.vbs', '.vbe', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
  '.ps1', '.ps1xml', '.ps2', '.psc1', '.psc2',
  '.msh', '.msh1', '.msh2',
  '.reg', '.csh', '.ksh', '.hta',
] as const
// Note: .js, .jsx, .tsx, .sh are intentionally EXCLUDED — they are
// legitimate text files handled by the document-type registry.

const OFFICE_MACROS = [
  '.docm', '.dotm', '.xlsm', '.xltm', '.xlam',
  '.pptm', '.potm', '.ppam', '.ppsm', '.sldm',
] as const

const ARCHIVES = [
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
  '.cab', '.iso', '.img', '.dmg',
] as const

const BINARY_MEDIA = [
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.tiff', '.tif',
  '.webp', '.avif', '.heic', '.heif',
  '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac', '.ogg', '.webm',
  '.mkv', '.wmv', '.aac', '.m4a',
  '.pdf', '.doc', '.xls', '.ppt', '.docx', '.xlsx', '.pptx',
  '.class', '.pyc', '.o', '.so', '.dylib', '.wasm', '.a', '.lib',
] as const

/**
 * Frozen set of all blacklisted extensions for O(1) lookup.
 * Exported for testing and for building an `accept` attribute hint.
 */
export const DANGEROUS_EXTENSIONS: ReadonlySet<string> = new Set([
  ...EXECUTABLES,
  ...SYSTEM_SCRIPTS,
  ...OFFICE_MACROS,
  ...ARCHIVES,
  ...BINARY_MEDIA,
])

// ── Public API ──────────────────────────────────────────────────────

/** Extract the lowercase extension (with leading dot) from a filename. */
export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  if (dot === -1 || dot === filename.length - 1) return ''
  return filename.slice(dot).toLowerCase()
}

/**
 * Check whether a file extension is on the blacklist.
 * Returns `true` when the extension is **safe** (not blacklisted).
 */
export function isExtensionSafe(filename: string): boolean {
  const ext = getExtension(filename)
  if (ext === '') return true // no extension — allow (binary check is safety net)
  return !DANGEROUS_EXTENSIONS.has(ext)
}

/**
 * Scan an ArrayBuffer for null bytes to detect binary content.
 *
 * Text files virtually never contain 0x00 bytes.  Checking the first
 * 8 KB provides a very reliable heuristic that catches renamed binaries
 * regardless of extension.
 *
 * Returns `true` when the content appears to be **binary** (unsafe).
 */
export function isBinaryContent(buffer: ArrayBuffer): boolean {
  const SAMPLE_SIZE = 8192
  const view = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, SAMPLE_SIZE))
  for (let i = 0; i < view.length; i++) {
    if (view[i] === 0x00) return true
  }
  return false
}

/**
 * Read the first 8 KB of a File as an ArrayBuffer.
 * Utility for use with `isBinaryContent()`.
 */
export function readFileHead(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const slice = file.slice(0, 8192)
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(slice)
  })
}

/** Result of full file validation. */
export interface FileValidationResult {
  safe: boolean
  reason?: string
}

/**
 * Validate a file for safety: extension blacklist + binary content check.
 *
 * This is the primary entry point — call it before reading a dropped or
 * uploaded file's text content.
 */
export async function validateFile(file: File): Promise<FileValidationResult> {
  // 1. Extension blacklist
  if (!isExtensionSafe(file.name)) {
    const ext = getExtension(file.name)
    return { safe: false, reason: `File type "${ext}" is not supported` }
  }

  // 2. Binary content detection
  try {
    const head = await readFileHead(file)
    if (isBinaryContent(head)) {
      return { safe: false, reason: 'File appears to be binary' }
    }
  } catch {
    // If we can't read the file head, reject as a precaution
    return { safe: false, reason: 'Unable to read file for validation' }
  }

  return { safe: true }
}
