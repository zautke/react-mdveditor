"use client"

import * as React from "react"
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { AnimatePresence, motion, LayoutGroup } from "motion/react"
import { ChevronDown, Plus } from "react-feather"
import {
  DndContext,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { cn } from "@/lib/utils"
import { IconLabel } from "@/components/ui/icon-label"
import { TabName } from "./tab-name"
import { TabCloseButton } from "./tab-close-button"
import { ScrollArrow } from "./scroll-arrow"
import { tabSystem } from "./tab-system.variants"
import { useTabOverflow } from "./hooks/use-tab-overflow"
import { useWheelScroll } from "./hooks/use-wheel-scroll"
import { useDragReorder } from "./hooks/use-drag-reorder"
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

// ── Animation configuration ─────────────────────────────────────────

const ANIMATION_DURATION = 0.2
const ANIMATION_DISTANCE = 30

const getTabAnimations = (orientation: TabOrientation) => {
  const axis = orientation === "horizontal" ? "x" : "y"

  return {
    initial: {
      opacity: 0,
      scale: 0.8,
      [axis]: ANIMATION_DISTANCE,
    },
    animate: {
      opacity: 1,
      scale: 1,
      [axis]: 0,
      transition: {
        duration: ANIMATION_DURATION,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      [axis]: -ANIMATION_DISTANCE,
      transition: {
        duration: ANIMATION_DURATION,
        ease: [0.4, 0, 1, 1],
      },
    },
  }
}

// ── SortableTab ─────────────────────────────────────────────────────

interface SortableTabProps {
  tab: TabItem
  orientation: TabOrientation
  variant: TabVariant
  showCloseButton: boolean
  closeButtonPosition: CloseButtonPosition
  closeButtonShape: CloseButtonShape
  closeButtonVisibility: CloseButtonVisibility
  onDelete?: (tabId: string) => void
  isNew?: boolean
  triggerClassName: string
  isDndEnabled: boolean
}

const SortableTab = forwardRef<HTMLButtonElement, SortableTabProps>(
  (
    {
      tab,
      orientation,
      variant: _variant,
      showCloseButton,
      closeButtonPosition,
      closeButtonShape,
      closeButtonVisibility,
      onDelete,
      isNew,
      triggerClassName,
      isDndEnabled,
    },
    ref
  ) => {
    const animations = getTabAnimations(orientation)

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: tab.id,
      disabled: !isDndEnabled || tab.disabled,
    })

    const sortableStyle: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 50 : undefined,
      containerType: "inline-size" as React.CSSProperties["containerType"],
      // Responsive width clamping via CSS custom properties
      flex: "1 1 0",
      minWidth: "var(--tab-min-width, 5rem)",
      maxWidth: "var(--tab-max-width, 15rem)",
      position: "relative" as const,
    }

    return (
      <motion.div
        ref={setNodeRef}
        layout={!isDragging}
        layoutId={`tab-${tab.id}`}
        initial={isNew ? animations.initial : false}
        animate={animations.animate}
        exit={animations.exit}
        className="relative min-w-0"
        style={sortableStyle}
        {...attributes}
        {...listeners}
      >
        <TabsPrimitive.Trigger
          ref={ref}
          value={tab.id}
          disabled={tab.disabled}
          className={cn(triggerClassName, "group relative w-full")}
          style={
            tab.color
              ? ({ "--tab-accent": tab.color } as React.CSSProperties)
              : undefined
          }
          data-tab-color={tab.color ? "" : undefined}
        >
          <TabName
            icon={tab.icon}
            label={tab.label}
            iconColor={
              tab.color
                ? {
                    color: `color-mix(in oklch, ${tab.color} 75%, black)`,
                  }
                : undefined
            }
          />
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
SortableTab.displayName = "SortableTab"

// ── TabDragOverlay ──────────────────────────────────────────────────

interface TabOverlayProps {
  tab: TabItem
  triggerClassName: string
}

const TabDragOverlayContent = ({ tab, triggerClassName }: TabOverlayProps) => (
  <div
    className="shadow-lg rounded-md opacity-90 pointer-events-none"
    style={{ containerType: "inline-size" as React.CSSProperties["containerType"] }}
  >
    <div
      className={cn(triggerClassName, "w-full")}
      style={
        tab.color
          ? ({ "--tab-accent": tab.color } as React.CSSProperties)
          : undefined
      }
      data-tab-color={tab.color ? "" : undefined}
      data-state="active"
    >
      <TabName
        icon={tab.icon}
        label={tab.label}
        iconColor={
          tab.color
            ? { color: `color-mix(in oklch, ${tab.color} 75%, black)` }
            : undefined
        }
      />
    </div>
  </div>
)
TabDragOverlayContent.displayName = "TabDragOverlayContent"

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

// ── TabSystem ───────────────────────────────────────────────────────

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
      onReorderTabs,
      showNewButton = false,
      newTabMenuItems,
      showCloseButtons = false,
      closeButtonPosition = "inside",
      closeButtonShape = "circle",
      closeButtonVisibility = "hover",
      tabMinWidth,
      tabMaxWidth,
      className,
      children,
      // v2 stub - grouping not implemented yet (intentionally unused)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      grouping,
    },
    ref
  ) => {
    // ── Variant styles ─────────────────────────────────────────
    const styles = useMemo(
      () =>
        tabSystem({
          variant,
          orientation,
          closePosition: closeButtonPosition,
          closeShape: closeButtonShape,
          closeVisibility: closeButtonVisibility,
        }),
      [variant, orientation, closeButtonPosition, closeButtonShape, closeButtonVisibility]
    )

    // ── Track newly added tabs for enter animation ─────────────
    const [newTabIds, setNewTabIds] = useState<Set<string>>(new Set())
    const prevTabIdsRef = useRef<string[]>([])

    useEffect(() => {
      const currentIds = tabs.map((t) => t.id)
      const prevIds = prevTabIdsRef.current

      const addedIds = currentIds.filter((id) => !prevIds.includes(id))

      if (addedIds.length > 0) {
        setNewTabIds((prev) => new Set([...prev, ...addedIds]))
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

    // ── DnD hook ───────────────────────────────────────────────
    const tabIds = useMemo(() => tabs.map((t) => t.id), [tabs])
    const isDndEnabled = !!onReorderTabs

    const handleReorder = useCallback(
      (newOrder: string[]) => {
        onReorderTabs?.(newOrder)
      },
      [onReorderTabs]
    )

    const { sensors, activeId, handleDragStart, handleDragEnd, handleDragCancel } =
      useDragReorder({
        items: tabIds,
        onReorder: handleReorder,
        enabled: isDndEnabled,
      })

    // Cancel drag when tabs change (rapid add/delete during drag guard)
    const prevTabCountRef = useRef(tabs.length)
    useEffect(() => {
      if (prevTabCountRef.current !== tabs.length && activeId) {
        handleDragCancel()
      }
      prevTabCountRef.current = tabs.length
    }, [tabs.length, activeId, handleDragCancel])

    // ── Scroll overflow + wheel ────────────────────────────────
    const {
      containerRef: scrollContainerRef,
      canScrollLeft,
      canScrollRight,
      scrollLeft: doScrollLeft,
      scrollRight: doScrollRight,
    } = useTabOverflow()

    useWheelScroll({
      containerRef: scrollContainerRef,
      enabled: orientation === "horizontal",
    })

    // ── Handlers ───────────────────────────────────────────────
    const handleDelete = useCallback(
      (tabId: string) => {
        onDeleteTab?.(tabId)
      },
      [onDeleteTab]
    )

    // ── Derived elements ───────────────────────────────────────
    const menuItems = newTabMenuItems ?? []

    const newTabControlEl = showNewButton &&
      onNewTab &&
      (menuItems.length > 0 ? (
        <NewTabControl
          onNewTab={onNewTab}
          menuItems={menuItems}
          newButtonClassName={styles.newButton()}
          orientation={orientation}
        />
      ) : (
        <NewTabButton onClick={onNewTab} className={styles.newButton()} />
      ))

    const sortingStrategy =
      orientation === "horizontal"
        ? horizontalListSortingStrategy
        : verticalListSortingStrategy

    const activeTab_item = activeId
      ? tabs.find((t) => t.id === activeId)
      : null

    // ── CSS custom properties for responsive sizing ────────────
    const rootStyle = {
      "--tab-min-width": tabMinWidth ?? "5rem",
      "--tab-max-width": tabMaxWidth ?? "15rem",
    } as React.CSSProperties

    return (
      <TabsPrimitive.Root
        ref={ref}
        value={activeTab}
        onValueChange={onTabChange}
        orientation={orientation}
        className={cn(styles.root(), className)}
        style={rootStyle}
      >
        {/* Tab bar: scroll arrows + scrollable list + pinned action */}
        <div className={styles.bar()}>
          {/* Left scroll arrow */}
          {canScrollLeft && (
            <ScrollArrow
              direction="left"
              onClick={doScrollLeft}
              className={styles.scrollArrow()}
            />
          )}

          {/* Scrollable container */}
          <div ref={scrollContainerRef} className={styles.scrollContainer()}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext
                items={tabIds}
                strategy={sortingStrategy}
              >
                <LayoutGroup>
                  <TabsPrimitive.List
                    className={cn(styles.list(), "flex-1 min-w-0")}
                    style={{ position: "relative" }}
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {tabs.map((tab) => (
                        <SortableTab
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
                          triggerClassName={styles.trigger()}
                          isDndEnabled={isDndEnabled}
                        />
                      ))}
                    </AnimatePresence>
                  </TabsPrimitive.List>
                </LayoutGroup>
              </SortableContext>

              <DragOverlay dropAnimation={null}>
                {activeTab_item ? (
                  <TabDragOverlayContent
                    tab={activeTab_item}
                    triggerClassName={styles.trigger()}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

          {/* Right scroll arrow */}
          {canScrollRight && (
            <ScrollArrow
              direction="right"
              onClick={doScrollRight}
              className={styles.scrollArrow()}
            />
          )}

          {/* Pinned new tab control — outside scroll container */}
          {newTabControlEl && (
            <div
              className={cn(
                "flex-shrink-0",
                orientation === "horizontal"
                  ? "border-l border-[color:var(--tabs-bar-border)] pl-1 ml-1"
                  : "border-t border-[color:var(--tabs-bar-border)] pt-1 mt-1 w-full"
              )}
            >
              {newTabControlEl}
            </div>
          )}
        </div>

        {/* Tab content area */}
        <div className={styles.content()}>
          {children}
        </div>
      </TabsPrimitive.Root>
    )
  }
)
TabSystem.displayName = "TabSystem"

// ── TabContent ──────────────────────────────────────────────────────

const TabContent = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "ring-offset-background h-full overflow-auto",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabContent.displayName = "TabContent"

export { TabSystem, TabContent }
export type { TabSystemProps, TabItem }
