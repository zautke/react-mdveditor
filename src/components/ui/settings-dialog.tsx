/**
 * SettingsDialog — Radix Dialog for managing user preferences.
 *
 * Mirrors the visual patterns from UrlInputModal (same overlay,
 * same animation tokens, same button styles). Sections are rendered
 * as labelled groups; each setting is a row with description +
 * toggle switch.
 *
 * Extensible: add new sections/settings by following the existing
 * pattern and wiring to the `UserSettings` type.
 */

import * as Dialog from '@radix-ui/react-dialog'
import * as Switch from '@radix-ui/react-switch'
import { X, Settings2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserSettings } from '@/lib/user-settings'
import { DEFAULT_SETTINGS } from '@/lib/user-settings-types'
import type { UserSettings } from '@/lib/user-settings-types'

// ── Props ───────────────────────────────────────────────────────────

export interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ── Reusable setting row ────────────────────────────────────────────

function SettingRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer">
          {label}
        </label>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full',
          'border-2 border-transparent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/25',
        )}
      >
        <Switch.Thumb
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform',
            'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
          )}
        />
      </Switch.Root>
    </div>
  )
}

// ── Section wrapper ─────────────────────────────────────────────────

function SettingsSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </legend>
      <div className="divide-y divide-border">{children}</div>
    </fieldset>
  )
}

// ── Dialog body ──────────────────────────────────────────────────────

function SettingsDialogBody({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void
}) {
  const { settings, updateSettings, resetSettings } = useUserSettings()

  const toggle = (key: keyof UserSettings) => (checked: boolean) => {
    updateSettings({ [key]: checked })
  }

  const isDefault = (JSON.stringify(settings) === JSON.stringify(DEFAULT_SETTINGS))

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Settings2 className="h-5 w-5 text-primary" />
          Settings
        </Dialog.Title>
        <Dialog.Close asChild>
          <button
            className="rounded-sm p-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </Dialog.Close>
      </div>

      <Dialog.Description className="sr-only">
        Configure application preferences. Changes are saved automatically.
      </Dialog.Description>

      {/* Settings sections */}
      <div className="space-y-6">
        <SettingsSection title="URL Documents">
          <SettingRow
            id="setting-url-auto-fetch"
            label="Auto-fetch dropped URLs"
            description="Skip the confirmation dialog when a URL is dropped onto the editor. The page content will be fetched immediately."
            checked={settings.urlDragAutoFetch}
            onCheckedChange={toggle('urlDragAutoFetch')}
          />
        </SettingsSection>
      </div>

      {/* Footer — reset */}
      <div className="flex justify-end pt-6 mt-6 border-t border-border">
        <button
          onClick={() => {
            resetSettings()
            onOpenChange(false)
          }}
          disabled={isDefault}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium',
            'border border-border text-muted-foreground',
            'hover:bg-accent hover:text-foreground transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          <RotateCcw className="h-3 w-3" />
          Reset to defaults
        </button>
      </div>
    </>
  )
}

// ── Outer shell ─────────────────────────────────────────────────────

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'focus:outline-none',
          )}
        >
          <SettingsDialogBody onOpenChange={onOpenChange} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

SettingsDialog.displayName = 'SettingsDialog'
