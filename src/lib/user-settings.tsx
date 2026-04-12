/**
 * UserSettings — React Context provider + hook.
 *
 * Persists to localStorage via the existing `storage.ts` helpers.
 * Consumers read/write settings through the `useUserSettings()` hook.
 *
 * Types and defaults live in `user-settings-types.ts` to satisfy
 * the react-refresh only-export-components lint rule.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { loadState, saveState } from '@/lib/storage'
import { DEFAULT_SETTINGS } from '@/lib/user-settings-types'
import type { UserSettings } from '@/lib/user-settings-types'

// ── Storage key ─────────────────────────────────────────────────────

const STORAGE_KEY = 'userSettings'

// ── Context ─────────────────────────────────────────────────────────

interface UserSettingsContextValue {
  settings: UserSettings
  /** Update one or more settings fields. Persists immediately. */
  updateSettings: (patch: Partial<UserSettings>) => void
  /** Reset all settings to defaults. */
  resetSettings: () => void
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null)

// ── Provider ────────────────────────────────────────────────────────

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const persisted = loadState<Partial<UserSettings>>(STORAGE_KEY, {})
    // Merge with defaults so new keys are backfilled
    return { ...DEFAULT_SETTINGS, ...persisted }
  })

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      saveState(STORAGE_KEY, next)
      return next
    })
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    saveState(STORAGE_KEY, DEFAULT_SETTINGS)
  }, [])

  return (
    <UserSettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </UserSettingsContext.Provider>
  )
}

// ── Hook ────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components -- hook is co-located with its provider
export function useUserSettings() {
  const ctx = useContext(UserSettingsContext)
  if (!ctx) {
    throw new Error('useUserSettings must be used within a <UserSettingsProvider>')
  }
  return ctx
}
