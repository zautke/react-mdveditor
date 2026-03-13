"use client"

import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Settings, Check } from "lucide-react"

import { cn } from "@/lib/utils"
import type { TabVariant } from "./types"

export interface SettingsDropdownProps {
  currentVariant: TabVariant
  onVariantChange: (variant: TabVariant) => void
  className?: string
}

const variants: { id: TabVariant; label: string }[] = [
  { id: "chrome", label: "Chrome" },
  { id: "capsule", label: "Capsule" },
  { id: "underline", label: "Underline" },
  { id: "pills", label: "Pills" },
  { id: "boxed", label: "Boxed" },
  { id: "minimal", label: "Minimal" },
]

export function SettingsDropdown({
  currentVariant,
  onVariantChange,
  className,
}: SettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeMenuIndex, setActiveMenuIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

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

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const activeIdx = variants.findIndex((v) => v.id === currentVariant)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveMenuIndex(activeIdx >= 0 ? activeIdx : 0)
      const items = menuRef.current.querySelectorAll<HTMLElement>('[role="menuitemradio"]')
      if (items[activeIdx >= 0 ? activeIdx : 0]) {
        requestAnimationFrame(() => items[activeIdx >= 0 ? activeIdx : 0]?.focus())
      }
    }
  }, [isOpen, currentVariant])

  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]:not([disabled])')
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

  const handleSelect = (variant: TabVariant) => {
    onVariantChange(variant)
    closeMenu()
  }

  const menuId = "settings-tab-menu"

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center justify-center h-7 w-7 rounded-md",
          "transition-all duration-150",
          "hover:bg-accent hover:text-accent-foreground",
          "hover:shadow-md hover:border-accent-foreground/30",
          "active:scale-95 active:shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isOpen && "bg-accent text-accent-foreground shadow-sm"
        )}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label="Tab system settings"
      >
        <Settings className="h-4 w-4" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            key="settings-tab-menu"
            id={menuId}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute right-0 top-full mt-2 z-50 w-48 origin-top-right rounded-lg border shadow-md",
              "bg-popover border-border p-1"
            )}
            role="menu"
            aria-label="Select Tab Variant"
            onKeyDown={handleMenuKeyDown}
          >
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Tab Variant
            </div>
            {variants.map((item, index) => {
              const isSelected = item.id === currentVariant

              return (
                <motion.button
                  key={item.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  tabIndex={index === activeMenuIndex ? 0 : -1}
                  onClick={() => handleSelect(item.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none",
                    isSelected ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  <span>{item.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
