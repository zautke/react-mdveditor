"use client"

import { forwardRef } from "react"
import { motion as Motion } from "motion/react"
import { Plus } from "react-feather"
import type { TabMotion } from "./types"

// ── NewTabButton ────────────────────────────────────────────────────
// Simple animated plus-icon button for adding a new tab.
// Used when no dropdown menu items are configured.

export interface NewTabButtonProps {
  onClick: () => void
  className?: string
  motion?: TabMotion
}

const NewTabButton = forwardRef<HTMLButtonElement, NewTabButtonProps>(
  ({ onClick, className, motion = "standard" }, ref) => {
    const hoverScale = motion === "standard" ? { scale: 1.05 } : undefined
    const tapScale = motion === "none" ? undefined : { scale: 0.95 }

    return (
      <Motion.button
        ref={ref}
        type="button"
        onClick={onClick}
        className={className}
        whileHover={hoverScale}
        whileTap={tapScale}
        aria-label="Add new tab"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Motion.button>
    )
  }
)
NewTabButton.displayName = "NewTabButton"

export { NewTabButton }
