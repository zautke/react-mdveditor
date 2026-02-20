"use client"

import * as React from "react"
import { forwardRef, useCallback } from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { tabSystem } from "./tab-system.variants"
import type {
  CloseButtonPosition,
  CloseButtonShape,
  CloseButtonVisibility,
} from "./types"

/**
 * TabCloseButton - Configurable close button for tabs
 */
interface TabCloseButtonProps {
  tabId: string
  tabLabel?: string
  onDelete: (tabId: string) => void
  position: CloseButtonPosition
  shape: CloseButtonShape
  visibility: CloseButtonVisibility
  disabled?: boolean
}

const TabCloseButton = forwardRef<HTMLSpanElement, TabCloseButtonProps>(
  ({ tabId, tabLabel, onDelete, position, shape, visibility, disabled }, ref) => {
    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        onDelete(tabId)
      },
      [tabId, onDelete]
    )

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation()
          e.preventDefault()
          onDelete(tabId)
        }
      },
      [tabId, onDelete]
    )

    if (shape === "none") return null

    // Using span with role="button" to avoid invalid button-in-button nesting
    // (Radix TabsTrigger renders as a button)
    return (
      <span
        ref={ref}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-disabled={disabled}
        className={cn(
          tabSystem({
            closePosition: position,
            closeShape: shape,
            closeVisibility: visibility,
          }).closeButton()
        )}
        aria-label={tabLabel ? `Close ${tabLabel} tab` : "Close tab"}
      >
        <X className="h-3 w-3" />
      </span>
    )
  }
)
TabCloseButton.displayName = "TabCloseButton"

export { TabCloseButton }
export type { TabCloseButtonProps }
