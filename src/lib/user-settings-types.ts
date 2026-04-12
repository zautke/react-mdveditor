/**
 * UserSettings types and defaults.
 *
 * Separated from the React provider to satisfy react-refresh
 * (only-export-components rule). Import these in both the
 * provider and consumer modules.
 *
 * Adding a new setting:
 *   1. Add the key + type to `UserSettings`
 *   2. Add a default value in `DEFAULT_SETTINGS`
 *   3. Add the toggle/control in `SettingsDialog`
 */

// ── Settings shape ──────────────────────────────────────────────────

export interface UserSettings {
  /**
   * When true, dropping a URL onto the editor surface skips
   * the confirmation modal and immediately fetches the content.
   * On fetch failure, the modal opens with the URL pre-filled.
   */
  urlDragAutoFetch: boolean
}

export const DEFAULT_SETTINGS: UserSettings = {
  urlDragAutoFetch: false,
}
