"use client"

import * as React from "react"
import { forwardRef, useCallback, useEffect, useRef, useState } from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { AnimatePresence, motion, LayoutGroup } from "motion/react"
import { X } from "lucide-react"
import { ChevronDown, Plus } from "react-feather"

import { cn } from "@/lib/utils"
import { IconLabel } from "@/components/ui/icon-label"
import {
  tabListVariants,
  tabTriggerVariants,
  closeButtonVariants,
  newTabButtonVariants,
} from "./tab-variants"
import type {
  TabSystemProps,
  TabItem,
  TabOrientation,
  TabVariant,
  CloseButtonPosition,
  CloseButtonShape,
  CloseButtonVisibility,
  NewTabMenuItem,
} from "./types"

/**
 * ★ Insight ─────────────────────────────────────
 * TabSystem Architecture:
 * 1. Uses Radix UI Tabs for accessibility (ARIA roles, keyboard nav)
 * 2. Motion's AnimatePresence with popLayout for smooth exit animations
 * 3. LayoutGroup coordinates animations across all tabs
 * ─────────────────────────────────────────────────
 */

/**
 * Unified animation configuration
 * Both enter and exit use identical timing for perfect mirroring
 */
const ANIMATION_DURATION = 0.2
const ANIMATION_DISTANCE = 30

const getTabAnimations = (orientation: TabOrientation) => {
  const axis = orientation === "horizontal" ? "x" : "y"

  return {
    // Enter: slide in from the right/bottom (positive direction)
    initial: {
      opacity: 0,
      scale: 0.8,
      [axis]: ANIMATION_DISTANCE,
    },
    // Resting state
    animate: {
      opacity: 1,
      scale: 1,
      [axis]: 0,
      transition: {
        duration: ANIMATION_DURATION,
        ease: [0.4, 0, 0.2, 1], // ease-out (CSS ease-out equivalent)
      },
    },
    // Exit: slide out to the left/top (negative direction) - mirrors enter
    exit: {
      opacity: 0,
      scale: 0.8,
      [axis]: -ANIMATION_DISTANCE,
      transition: {
        duration: ANIMATION_DURATION,
        ease: [0.4, 0, 1, 1], // ease-in (CSS ease-in equivalent)
      },
    },
  }
}

/**
 * TabCloseButton - Configurable close button for tabs
 */
interface TabCloseButtonProps {
  tabId: string
  onDelete: (tabId: string) => void
  position: CloseButtonPosition
  shape: CloseButtonShape
  visibility: CloseButtonVisibility
  disabled?: boolean
}

const TabCloseButton = forwardRef<HTMLSpanElement, TabCloseButtonProps>(
  ({ tabId, onDelete, position, shape, visibility, disabled }, ref) => {
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
        className={cn(closeButtonVariants({ position, shape, visibility }))}
        aria-label="Close tab"
      >
        <X className="h-3 w-3" />
      </span>
    )
  }
)
TabCloseButton.displayName = "TabCloseButton"

/**
 * AnimatedTab - Single tab with enter/exit animations
 */
interface AnimatedTabProps {
  tab: TabItem
  orientation: TabOrientation
  variant: TabVariant
  showCloseButton: boolean
  closeButtonPosition: CloseButtonPosition
  closeButtonShape: CloseButtonShape
  closeButtonVisibility: CloseButtonVisibility
  onDelete?: (tabId: string) => void
  isNew?: boolean
}

const AnimatedTab = forwardRef<HTMLButtonElement, AnimatedTabProps>(
  (
    {
      tab,
      orientation,
      variant,
      showCloseButton,
      closeButtonPosition,
      closeButtonShape,
      closeButtonVisibility,
      onDelete,
      isNew,
    },
    ref
  ) => {
    const animations = getTabAnimations(orientation)

    return (
      <motion.div
        layout
        layoutId={`tab-${tab.id}`}
        initial={isNew ? animations.initial : false}
        animate={animations.animate}
        exit={animations.exit}
        className="relative"
        style={{ position: "relative" }}
      >
        <TabsPrimitive.Trigger
          ref={ref}
          value={tab.id}
          disabled={tab.disabled}
          className={cn(
            tabTriggerVariants({ variant, orientation }),
            "group relative"
          )}
        >
          {tab.icon && <span className="shrink-0">{tab.icon}</span>}
          <span className="truncate">{tab.label}</span>
          {showCloseButton && tab.closable !== false && onDelete && (
            <TabCloseButton
              tabId={tab.id}
              onDelete={onDelete}
              position={closeButtonPosition}
              shape={closeButtonShape}
              visibility={closeButtonVisibility}
              disabled={tab.disabled}
            />
          )}
        </TabsPrimitive.Trigger>
      </motion.div>
    )
  }
)
AnimatedTab.displayName = "AnimatedTab"

/**
 * NewTabButton - Button to add new tabs
 */
interface NewTabButtonProps {
  onClick: () => void
  variant: TabVariant
  orientation: TabOrientation
  className?: string
}

const NewTabButton = forwardRef<HTMLButtonElement, NewTabButtonProps>(
  ({ onClick, variant, orientation, className }, ref) => {
    return (
      <motion.button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(newTabButtonVariants({ variant, orientation }), className)}
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

interface NewTabControlProps {
  onNewTab: () => void
  variant: TabVariant
  orientation: TabOrientation
  menuItems: NewTabMenuItem[]
  className?: string
}

const NewTabControl = ({
  onNewTab,
  variant,
  orientation,
  menuItems,
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
    orientation === "horizontal" ? "left-0 top-full mt-2" : "left-full top-0 ml-2"

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
            newTabButtonVariants({ variant, orientation }),
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
            newTabButtonVariants({ variant, orientation }),
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

/**
 * TabSystem - Main component
 * A fully-featured, animated tab system with multiple style variants
 */
const TabSystem = forwardRef<HTMLDivElement, TabSystemProps>(
  (
    {
      orientation = "horizontal",
      variant = "underline",
      tabs,
      activeTab,
      onTabChange,
      onNewTab,
      onDeleteTab,
      showNewButton = false,
      newTabMenuItems,
      showCloseButtons = false,
      closeButtonPosition = "inside",
      closeButtonShape = "circle",
      closeButtonVisibility = "hover",
      className,
      children,
      // v2 stub - grouping not implemented yet (intentionally unused)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      grouping,
    },
    ref
  ) => {
    // Track which tabs are newly added for enter animation
    const [newTabIds, setNewTabIds] = useState<Set<string>>(new Set())
    const prevTabIdsRef = useRef<string[]>([])

    // Detect newly added tabs
    React.useEffect(() => {
      const currentIds = tabs.map((t) => t.id)
      const prevIds = prevTabIdsRef.current

      const addedIds = currentIds.filter((id) => !prevIds.includes(id))

      if (addedIds.length > 0) {
        setNewTabIds((prev) => new Set([...prev, ...addedIds]))
        // Clear "new" status after animation completes
        setTimeout(() => {
          setNewTabIds((prev) => {
            const next = new Set(prev)
            addedIds.forEach((id) => next.delete(id))
            return next
          })
        }, 500)
      }

      prevTabIdsRef.current = currentIds
    }, [tabs])

    const handleDelete = useCallback(
      (tabId: string) => {
        if (onDeleteTab) {
          onDeleteTab(tabId)
        }
      },
      [onDeleteTab]
    )

    const newTabContainerClass = cn(
      "relative",
      orientation === "horizontal" ? "ml-1" : "mt-1 w-full"
    )
    const menuItems = newTabMenuItems ?? []

    return (
      <TabsPrimitive.Root
        ref={ref}
        value={activeTab}
        onValueChange={onTabChange}
        orientation={orientation}
        className={cn(
          "flex min-h-0",
          orientation === "horizontal" ? "flex-col" : "flex-row",
          className
        )}
      >
        <LayoutGroup>
          <TabsPrimitive.List
            className={cn(tabListVariants({ variant, orientation }))}
            style={{ position: "relative" }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {tabs.map((tab) => (
                <AnimatedTab
                  key={tab.id}
                  tab={tab}
                  orientation={orientation}
                  variant={variant}
                  showCloseButton={showCloseButtons}
                  closeButtonPosition={closeButtonPosition}
                  closeButtonShape={closeButtonShape}
                  closeButtonVisibility={closeButtonVisibility}
                  onDelete={handleDelete}
                  isNew={newTabIds.has(tab.id)}
                />
              ))}
            </AnimatePresence>

            {showNewButton && onNewTab && (
              menuItems.length > 0 ? (
                <NewTabControl
                  onNewTab={onNewTab}
                  variant={variant}
                  orientation={orientation}
                  menuItems={menuItems}
                  className={newTabContainerClass}
                />
              ) : (
                <div className={newTabContainerClass}>
                  <NewTabButton
                    onClick={onNewTab}
                    variant={variant}
                    orientation={orientation}
                  />
                </div>
              )
            )}
          </TabsPrimitive.List>
        </LayoutGroup>

        {/* Tab content area - must constrain height for scrolling */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </TabsPrimitive.Root>
    )
  }
)
TabSystem.displayName = "TabSystem"

/**
 * TabContent - Wrapper for individual tab content panels
 * Use this inside TabSystem.children for each tab
 */
const TabContent = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background h-full overflow-auto",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabContent.displayName = "TabContent"

export { TabSystem, TabContent }
export type { TabSystemProps, TabItem }
