"use client"

import * as React from "react"
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { AnimatePresence, LayoutGroup } from "motion/react"
import {
  DndContext,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core"
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

import { cn } from "../../utils"
import { SortableTab } from "./sortable-tab"
import { TabDragOverlayContent } from "./tab-overlay"
import { NewTabButton, NewTabControl } from "./new-tab-control"
import { ScrollArrow } from "./scroll-arrow"
import { tabSystem } from "./tab-system.variants"
import { useTabOverflow } from "./hooks/use-tab-overflow"
import { useWheelScroll } from "./hooks/use-wheel-scroll"
import { useDragReorder } from "./hooks/use-drag-reorder"
import type { TabSystemProps } from "./types"

// ── TabSystem ───────────────────────────────────────────────────────

const TabSystem = forwardRef<HTMLDivElement, TabSystemProps>(
  (
    {
      orientation = "horizontal",
      variant = "underline",
      skin = "editor",
      density = "comfortable",
      motion = "standard",
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
      classNames,
      children,
      // v2 stub - grouping not implemented yet
      grouping: _grouping,
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

    const slot = useCallback(
      (slotName: keyof NonNullable<TabSystemProps["classNames"]>, className?: string) =>
        cn(className, classNames?.[slotName]),
      [classNames]
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
          newButtonClassName={slot("newButton", styles.newButton())}
          orientation={orientation}
          motion={motion}
          groupClassName={classNames?.newButtonGroup}
          menuClassName={classNames?.newButtonMenu}
          menuItemClassName={classNames?.newButtonMenuItem}
        />
      ) : (
        <NewTabButton
          onClick={onNewTab}
          className={slot("newButton", styles.newButton())}
          motion={motion}
        />
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
        className={slot("root", cn(styles.root(), className))}
        style={rootStyle}
        data-tab-skin={skin}
        data-density={density}
        data-motion={motion}
      >
        {/* Tab bar: scroll arrows + scrollable list + pinned action */}
        <div className={slot("bar", styles.bar())}>
          {/* Left scroll arrow */}
          {canScrollLeft && (
            <ScrollArrow
              direction="left"
              onClick={doScrollLeft}
              className={slot("scrollArrow", styles.scrollArrow())}
            />
          )}

          {/* Scrollable container */}
          <div
            ref={scrollContainerRef as React.Ref<HTMLDivElement>}
            className={slot("scrollContainer", styles.scrollContainer())}
          >
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
                    className={slot("list", cn(styles.list(), "flex-1 min-w-0"))}
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
                          triggerClassName={slot("trigger", styles.trigger())}
                          tabNameClassName={classNames?.tabName}
                          closeButtonClassName={classNames?.closeButton}
                          motion={motion}
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
                    triggerClassName={slot("trigger", styles.trigger())}
                    tabNameClassName={classNames?.tabName}
                    className={classNames?.dragOverlay}
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
              className={slot("scrollArrow", styles.scrollArrow())}
            />
          )}

          {/* Pinned new tab control — outside scroll container */}
          {newTabControlEl && (
            <div
              className={cn(
                "flex-shrink-0",
                orientation === "horizontal"
                  ? "border-l border-[color:var(--tabs-bar-border)] pl-1 ml-1"
                  : "border-t border-[color:var(--tabs-bar-border)] pt-1 mt-1 w-full",
                classNames?.actionSeparator
              )}
            >
              {newTabControlEl}
            </div>
          )}
        </div>

        {/* Tab content area */}
        <div className={slot("content", styles.content())}>
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
