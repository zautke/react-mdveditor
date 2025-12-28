"use client"

import * as React from "react"
import { forwardRef, useCallback, useRef, useState } from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { AnimatePresence, motion, LayoutGroup } from "motion/react"
import { X, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
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
}

const NewTabButton = forwardRef<HTMLButtonElement, NewTabButtonProps>(
  ({ onClick, variant, orientation }, ref) => {
    return (
      <motion.button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(newTabButtonVariants({ variant, orientation }))}
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

    return (
      <TabsPrimitive.Root
        ref={ref}
        value={activeTab}
        onValueChange={onTabChange}
        orientation={orientation}
        className={cn(
          "flex",
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
              <NewTabButton
                onClick={onNewTab}
                variant={variant}
                orientation={orientation}
              />
            )}
          </TabsPrimitive.List>
        </LayoutGroup>

        {/* Tab content area */}
        <div className="flex-1">
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
      "mt-2 ring-offset-background",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabContent.displayName = "TabContent"

export { TabSystem, TabContent }
export type { TabSystemProps, TabItem }
