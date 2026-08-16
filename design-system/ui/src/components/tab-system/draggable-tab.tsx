"use client"

import * as React from "react"
import { forwardRef } from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion as Motion } from "motion/react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { AnimateLayoutChanges } from "@dnd-kit/sortable"

import { cn } from "../../utils"
import { TabName } from "./tab-name"
import { TabCloseButton } from "./tab-close-button"
import type {
  TabItem,
  TabOrientation,
  TabVariant,
  CloseButtonPosition,
  CloseButtonShape,
  CloseButtonVisibility,
  TabMotion,
} from "./types"

// ── Animation configuration ─────────────────────────────────────────

const ANIMATION_DISTANCE = 30
const REDUCED_ANIMATION_DISTANCE = 12

const getTabAnimations = (orientation: TabOrientation, motion: TabMotion) => {
  const isHorizontal = orientation === "horizontal"
  const duration = motion === "none" ? 0 : motion === "reduced" ? 0.12 : 0.2
  const distance = motion === "reduced" ? REDUCED_ANIMATION_DISTANCE : ANIMATION_DISTANCE

  if (motion === "none") {
    return {
      initial: false,
      animate: {
        opacity: 1,
        scale: 1,
        ...(isHorizontal ? { x: 0 } : { y: 0 }),
        transition: { duration: 0 },
      },
      exit: {
        opacity: 0,
        ...(isHorizontal ? { x: 0 } : { y: 0 }),
        transition: { duration: 0 },
      },
    }
  }

  return {
    initial: {
      opacity: 0,
      scale: 0.8,
      ...(isHorizontal ? { x: distance } : { y: distance }),
    },
    animate: {
      opacity: 1,
      scale: 1,
      ...(isHorizontal ? { x: 0 } : { y: 0 }),
      transition: {
        duration,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      ...(isHorizontal ? { x: -distance } : { y: -distance }),
      transition: {
        duration,
        ease: [0.4, 0, 1, 1] as const,
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
  onRename?: (tabId: string, label: string) => void
  isNew?: boolean
  triggerClassName: string
  tabNameClassName?: string
  closeButtonClassName?: string
  motion: TabMotion
  isDndEnabled: boolean
  /** Whether any tab is currently being dragged (from DndContext) */
  isSortingActive: boolean
}

const DraggableTab = forwardRef<HTMLDivElement, DraggableTabProps>(
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
      onRename,
      isNew,
      triggerClassName,
      tabNameClassName,
      closeButtonClassName,
      motion,
      isDndEnabled,
      isSortingActive,
    },
    ref
  ) => {
    const animations = getTabAnimations(orientation, motion)

    const {
      attributes,
      listeners,
      setNodeRef,
      setActivatorNodeRef,
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
        duration: motion === "none" ? 0 : motion === "reduced" ? 120 : 200,
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
      flex: "1 0 auto",
      minWidth: "var(--tab-min-width, 5rem)",
      maxWidth: "var(--tab-max-width, 15rem)",
      position: "relative" as const,
    }

    const setTriggerRef = React.useCallback((node: HTMLDivElement | null) => {
      setActivatorNodeRef(node)
      if (typeof ref === "function") {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    }, [ref, setActivatorNodeRef])

    return (
      <Motion.div
        ref={setNodeRef}
        // Disable framer-motion layout when ANY drag is active — dnd-kit
        // manages displacement transforms; layout fights them and causes jank.
        layout={motion !== "none" && !isSortingActive}
        layoutId={`tab-${tab.id}`}
        initial={isNew ? animations.initial : false}
        animate={animations.animate}
        exit={animations.exit}
        className="relative min-w-0"
        style={sortableStyle}
        role="presentation"
      >
        <TabsPrimitive.Trigger
          asChild
          value={tab.id}
          disabled={tab.disabled}
        >
          <div
            ref={setTriggerRef}
            className={cn(
              triggerClassName,
              "group relative w-full",
              "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            )}
            style={
              tab.color
                ? ({ "--tab-accent": tab.color } as React.CSSProperties)
                : undefined
            }
            data-tab-color={tab.color ? "" : undefined}
            aria-describedby={isDndEnabled ? attributes["aria-describedby"] : undefined}
            aria-roledescription={isDndEnabled ? "draggable tab" : undefined}
            {...listeners}
          >
            <TabName
              icon={tab.icon}
              label={tab.label}
              onRename={onRename ? (label) => onRename(tab.id, label) : undefined}
              className={tabNameClassName}
              iconColor={
                tab.color
                  ? {
                      color: "color-mix(in oklch, var(--tab-accent) 80%, var(--tab-active-text))",
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
                className={closeButtonClassName}
              />
            )}
          </div>
        </TabsPrimitive.Trigger>
      </Motion.div>
    )
  }
)
DraggableTab.displayName = "DraggableTab"

export { DraggableTab }
