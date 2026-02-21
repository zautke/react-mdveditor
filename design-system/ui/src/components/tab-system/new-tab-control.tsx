"use client"

import { forwardRef, useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronDown, Plus } from "lucide-react"

import { cn } from "../../utils"
import { IconLabel } from "../icon-label"
import type { TabOrientation, NewTabMenuItem } from "./types"

// ── NewTabButton ────────────────────────────────────────────────────

interface NewTabButtonProps {
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
        <Plus className="h-4 w-4" />
      </motion.button>
    )
  }
)
NewTabButton.displayName = "NewTabButton"

// ── NewTabControl ───────────────────────────────────────────────────

interface NewTabControlProps {
  onNewTab: () => void
  menuItems: NewTabMenuItem[]
  newButtonClassName: string
  orientation: TabOrientation
  className?: string
}

const NewTabControl = ({
  onNewTab,
  menuItems,
  newButtonClassName,
  orientation,
  className,
}: NewTabControlProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const handleNewTab = useCallback(() => {
    setIsOpen(false)
    onNewTab()
  }, [onNewTab])

  const handleMenuItemSelect = useCallback((item: NewTabMenuItem) => {
    item.onSelect()
    setIsOpen(false)
  }, [])

  const menuPositionClass =
    orientation === "horizontal"
      ? "left-0 top-full mt-2"
      : "left-full top-0 ml-2"

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "inline-flex overflow-hidden rounded-md border border-[color:var(--tabs-bar-border)] bg-[color:var(--tab-bg)]",
          orientation === "vertical" ? "w-full" : ""
        )}
      >
        <button
          type="button"
          onClick={handleNewTab}
          className={cn(
            newButtonClassName,
            "rounded-none rounded-l-md",
            orientation === "vertical" ? "flex-1" : ""
          )}
          aria-label="Add new tab"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            newButtonClassName,
            "rounded-none rounded-r-md border-l border-[color:var(--tabs-bar-border)]",
            orientation === "vertical" ? "flex-1" : ""
          )}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="Open new tab menu"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && menuItems.length > 0 && (
          <motion.div
            key="new-tab-menu"
            initial={{ opacity: 0, scale: 0, x: -6, y: 6 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: -6, y: 6 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
              "absolute z-50 min-w-[220px] origin-top-left rounded-lg border p-1 shadow-[var(--menu-shadow)]",
              "bg-[color:var(--menu-bg)] border-[color:var(--menu-border)]",
              menuPositionClass
            )}
            role="menu"
          >
            {menuItems.map((item, index) => (
              <motion.button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => handleMenuItemSelect(item)}
                disabled={item.disabled}
                initial={{ opacity: 0, x: -8, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{
                  duration: 0.12,
                  ease: [0.2, 0.8, 0.2, 1],
                  delay: 0.04 + index * 0.03,
                }}
                className={cn(
                  "flex w-full items-center rounded-md px-3 py-2 text-sm text-[color:var(--tab-active-text)] transition-colors",
                  "hover:bg-[color:var(--tab-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:pointer-events-none disabled:opacity-50"
                )}
              >
                <IconLabel
                  icon={item.icon}
                  label={item.label}
                  position="left"
                  gutter={10}
                  className="w-full"
                />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { NewTabButton, NewTabControl }
export type { NewTabButtonProps, NewTabControlProps }
