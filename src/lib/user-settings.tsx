/**
 * UserSettings — React Context provider + hook.
 *
 * Persists to localStorage via the existing `storage.ts` helpers.
 * Consumers read/write settings through the `useUserSettings()` hook.
 *
 * Types and defaults live in `user-settings-types.ts` to satisfy
 * the react-refresh only-export-components lint rule.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { loadState, saveState, subscribe } from '@/lib/storage'
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
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)

  // Hydrate persisted settings from the sidecar after mount, merged over
  // defaults so newly-added keys are backfilled. Writes made while the sidecar is
  // unreachable are buffered by `storage` rather than sent, so they cannot clobber
  // the stored settings; we re-adopt the merged value once it reconnects.
  useEffect(() => {
    let cancelled = false

    const hydrate = () => {
      void loadState<Partial<UserSettings>>(STORAGE_KEY, {}).then(persisted => {
        if (!cancelled) setSettings({ ...DEFAULT_SETTINGS, ...persisted })
      })
    }

    hydrate()
    const unsubscribe = subscribe(status => { if (status === 'online') hydrate() })

    return () => { cancelled = true; unsubscribe() }
  }, [])

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      void saveState(STORAGE_KEY, next)
      return next
    })
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    void saveState(STORAGE_KEY, DEFAULT_SETTINGS)
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
