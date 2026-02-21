"use client"

import * as React from "react"
import { forwardRef } from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "motion/react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { AnimateLayoutChanges } from "@dnd-kit/sortable"

import { cn } from "@/lib/utils"
import { TabName } from "./tab-name"
import { TabCloseButton } from "./tab-close-button"
import type {
  TabItem,
  TabOrientation,
  TabVariant,
  CloseButtonPosition,
  CloseButtonShape,
  CloseButtonVisibility,
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

// ── DraggableTab ────────────────────────────────────────────────────
// Wraps a Radix tab trigger with dnd-kit sortable drag support and
// framer-motion layout animations. Handles the ARIA role conflict
// between dnd-kit's role="button" and Radix's role="tab".

// Disable layout animation during active sorting to prevent
// framer-motion from fighting with dnd-kit's CSS transforms.
// Only allow layout changes when not in a drag operation.
const disableLayoutDuringDrag: AnimateLayoutChanges = ({
  isSorting,
  wasDragging,
}) => !(isSorting || wasDragging)

export interface DraggableTabProps {
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
  /** Whether any tab is currently being dragged (from DndContext) */
  isSortingActive: boolean
}

const DraggableTab = forwardRef<HTMLButtonElement, DraggableTabProps>(
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
      isSortingActive,
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
      // Prevent framer-motion layout animations from firing during
      // active drag — dnd-kit's CSS transforms handle displacement.
      animateLayoutChanges: disableLayoutDuringDrag,
      transition: {
        duration: 200,
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      },
    })

    const sortableStyle: React.CSSProperties = {
      // Use Translate (not Transform) since DragOverlay is in use —
      // avoids scale jumps that CSS.Transform can cause.
      transform: CSS.Translate.toString(transform),
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

    // Separate dnd-kit role attributes to avoid invalid button>tab nesting.
    // dnd-kit injects role="button" on the wrapper which conflicts with
    // Radix's role="tab" on the inner trigger. We override to role="presentation".
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { role: _dndRole, ...safeAttributes } = attributes

    return (
      <motion.div
        ref={setNodeRef}
        // Disable framer-motion layout when ANY drag is active — dnd-kit
        // manages displacement transforms; layout fights them and causes jank.
        layout={!isSortingActive}
        layoutId={`tab-${tab.id}`}
        initial={isNew ? animations.initial : false}
        animate={animations.animate}
        exit={animations.exit}
        className="relative min-w-0"
        style={sortableStyle}
        role="presentation"
        {...safeAttributes}
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
          aria-roledescription={isDndEnabled ? "draggable tab" : undefined}
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
              tabLabel={tab.label}
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
DraggableTab.displayName = "DraggableTab"

export { DraggableTab }
