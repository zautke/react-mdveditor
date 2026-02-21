"use client"

import { forwardRef } from "react"
import { motion } from "motion/react"
import { Plus } from "react-feather"

// ── NewTabButton ────────────────────────────────────────────────────
// Simple animated plus-icon button for adding a new tab.
// Used when no dropdown menu items are configured.

export interface NewTabButtonProps {
  onClick: () => void
  className?: string
}

const NewTabButton = forwardRef<HTMLButtonElement, NewTabButtonProps>(
  ({ onClick, className }, ref) => {
    return (
      <motion.button
        ref={ref}
        type="button"
        onClick={onClick}
        className={className}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Add new tab"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </motion.button>
    )
  }
)
NewTabButton.displayName = "NewTabButton"

export { NewTabButton }
