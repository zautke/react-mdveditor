"use client"

import { forwardRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "../../utils"

interface ScrollArrowProps {
  direction: "left" | "right"
  onClick: () => void
  className?: string
}

/**
 * ScrollArrow — chevron button that indicates scrollable overflow.
 * Fades in/out based on parent visibility toggle.
 */
const ScrollArrow = forwardRef<HTMLButtonElement, ScrollArrowProps>(
  ({ direction, onClick, className }, ref) => {
    const Icon = direction === "left" ? ChevronLeft : ChevronRight

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center justify-center h-full w-6",
          "text-[color:var(--tab-text)] transition-opacity duration-150",
          "hover:bg-[color:var(--tab-hover-bg)]",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "flex-shrink-0",
          className
        )}
        aria-label={`Scroll tabs ${direction}`}
      >
        <Icon className="h-4 w-4" />
      </button>
    )
  }
)
ScrollArrow.displayName = "ScrollArrow"

export { ScrollArrow }
export type { ScrollArrowProps }
