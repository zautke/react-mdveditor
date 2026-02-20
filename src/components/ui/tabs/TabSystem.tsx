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

import { cn } from "@/lib/utils"
import { DraggableTab } from "./draggable-tab"
import { TabDragOverlay } from "./tab-drag-overlay"
import { NewTabButton } from "./new-tab-button"
import { NewTabDropdown } from "./new-tab-dropdown"
import { TabPanel } from "./tab-panel"
import { ScrollArrow } from "./scroll-arrow"
import { tabSystem } from "./tab-system.variants"
import { useTabOverflow } from "./hooks/use-tab-overflow"
import { useWheelScroll } from "./hooks/use-wheel-scroll"
import { useDragReorder } from "./hooks/use-drag-reorder"
import type {
  TabSystemProps,
  TabItem,
} from "./types"

// ── TabSystem ───────────────────────────────────────────────────────
// Orchestrator component that composes all tab sub-components:
// DraggableTab, TabDragOverlay, NewTabButton/NewTabDropdown,
// ScrollArrow, and TabPanel into a complete tabbed interface.

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

    const { sensors, activeId, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel } =
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
        <NewTabDropdown
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

    // ── Custom DnD screen-reader announcements ─────────────────
    // Replaces the generic default ("Draggable item X was dropped
    // over droppable area X") with position-based sortable messages.
    const getTabLabel = useCallback(
      (id: string | number) => tabs.find((t) => t.id === String(id))?.label ?? String(id),
      [tabs]
    )
    const getPosition = useCallback(
      (id: string | number) => tabIds.indexOf(String(id)) + 1,
      [tabIds]
    )
    const tabCount = tabs.length

    const dndAnnouncements = useMemo(
      () => ({
        onDragStart({ active }: { active: { id: string | number } }) {
          return `Picked up tab ${getTabLabel(active.id)}. Tab is in position ${getPosition(active.id)} of ${tabCount}.`
        },
        onDragOver({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) {
          if (over) {
            return `Tab ${getTabLabel(active.id)} was moved to position ${getPosition(over.id)} of ${tabCount}.`
          }
          return `Tab ${getTabLabel(active.id)} is no longer over a drop target.`
        },
        onDragEnd({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) {
          if (over) {
            return `Tab ${getTabLabel(active.id)} was dropped at position ${getPosition(over.id)} of ${tabCount}.`
          }
          return `Tab ${getTabLabel(active.id)} was dropped.`
        },
        onDragCancel({ active }: { active: { id: string | number } }) {
          return `Reorder cancelled. Tab ${getTabLabel(active.id)} was returned to its original position.`
        },
      }),
      [getTabLabel, getPosition, tabCount]
    )

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
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              accessibility={{ announcements: dndAnnouncements }}
            >
              <SortableContext
                items={tabIds}
                strategy={sortingStrategy}
              >
                <LayoutGroup>
                  <TabsPrimitive.List
                    className={cn(styles.list(), "flex-1 min-w-0")}
                    style={{ position: "relative" }}
                    aria-label="Document tabs"
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {tabs.map((tab) => (
                        <DraggableTab
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
                          isSortingActive={!!activeId}
                        />
                      ))}
                    </AnimatePresence>
                  </TabsPrimitive.List>
                </LayoutGroup>
              </SortableContext>

              <DragOverlay dropAnimation={null}>
                {activeTab_item ? (
                  <TabDragOverlay
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

// ── Backward-compatible alias ───────────────────────────────────────
// The old name `TabContent` is kept as an alias for `TabPanel` to avoid
// breaking existing imports. New code should use `TabPanel`.
const TabContent = TabPanel

export { TabSystem, TabPanel, TabContent }
export type { TabSystemProps, TabItem }
