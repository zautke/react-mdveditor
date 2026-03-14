"use client"

import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronDown, Plus } from "react-feather"

import { cn } from "@/lib/utils"
import { IconLabel } from "@/components/ui/icon-label"
import type { TabOrientation, NewTabMenuItem } from "./types"

// ── NewTabDropdown ──────────────────────────────────────────────────
// Split button: left side creates default new tab, right side opens a
// dropdown menu with document-type choices. Implements WCAG-compliant
// focus management and keyboard navigation for the menu.

export interface NewTabDropdownProps {
  onNewTab: () => void
  menuItems: NewTabMenuItem[]
  newButtonClassName: string
  orientation: TabOrientation
  className?: string
}

function NewTabDropdown({
  onNewTab,
  menuItems,
  newButtonClassName,
  orientation,
  className,
}: NewTabDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeMenuIndex, setActiveMenuIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Close menu and return focus to trigger
  const closeMenu = useCallback(() => {
    setIsOpen(false)
    setActiveMenuIndex(0)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        closeMenu()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu()
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, closeMenu])

  // Focus first menu item when menu opens
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstItem = menuRef.current.querySelector<HTMLElement>('[role="menuitem"]')
      // Delay focus slightly for AnimatePresence
      requestAnimationFrame(() => firstItem?.focus())
    }
  }, [isOpen])

  const handleNewTab = useCallback(() => {
    setIsOpen(false)
    onNewTab()
  }, [onNewTab])

  const handleMenuItemSelect = useCallback((item: NewTabMenuItem) => {
    item.onSelect()
    closeMenu()
  }, [closeMenu])

  // ARIA: Keyboard navigation for the dropdown menu
  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')
    if (!items || items.length === 0) return

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault()
        const nextIdx = (activeMenuIndex + 1) % items.length
        setActiveMenuIndex(nextIdx)
        items[nextIdx]?.focus()
        break
      }
      case "ArrowUp": {
        e.preventDefault()
        const prevIdx = (activeMenuIndex - 1 + items.length) % items.length
        setActiveMenuIndex(prevIdx)
        items[prevIdx]?.focus()
        break
      }
      case "Home": {
        e.preventDefault()
        setActiveMenuIndex(0)
        items[0]?.focus()
        break
      }
      case "End": {
        e.preventDefault()
        const lastIdx = items.length - 1
        setActiveMenuIndex(lastIdx)
        items[lastIdx]?.focus()
        break
      }
      case "Tab": {
        closeMenu()
        break
      }
    }
  }, [activeMenuIndex, closeMenu])

  const menuPositionClass =
    orientation === "horizontal"
      ? "right-0 top-full mt-2"
      : "left-full top-0 ml-2"

  const menuId = "new-tab-menu"

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
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            newButtonClassName,
            "rounded-none rounded-r-md border-l border-[color:var(--tabs-bar-border)]",
            orientation === "vertical" ? "flex-1" : ""
          )}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          aria-label="Choose new tab type"
        >
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && menuItems.length > 0 && (
          <motion.div
            ref={menuRef}
            key="new-tab-menu"
            id={menuId}
            initial={{ opacity: 0, scale: 0, x: 6, y: 6 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: 6, y: 6 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
              "absolute z-50 min-w-[220px] origin-top-right rounded-lg border p-1 shadow-[var(--menu-shadow)]",
              "bg-[color:var(--menu-bg)] border-[color:var(--menu-border)]",
              menuPositionClass
            )}
            role="menu"
            aria-label="New tab type"
            onKeyDown={handleMenuKeyDown}
          >
            {menuItems.map((item, index) => (
              <motion.button
                key={item.id}
                type="button"
                role="menuitem"
                tabIndex={index === activeMenuIndex ? 0 : -1}
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
NewTabDropdown.displayName = "NewTabDropdown"

export { NewTabDropdown }
