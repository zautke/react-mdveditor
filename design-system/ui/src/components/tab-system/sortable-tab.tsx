"use client"

import * as React from "react"
import { forwardRef } from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "motion/react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

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
} from "./types"

// ── Animation configuration ─────────────────────────────────────────

const ANIMATION_DURATION = 0.2
const ANIMATION_DISTANCE = 30

const getTabAnimations = (orientation: TabOrientation) => {
  const isHorizontal = orientation === "horizontal"

  return {
    initial: {
      opacity: 0,
      scale: 0.8,
      ...(isHorizontal ? { x: ANIMATION_DISTANCE } : { y: ANIMATION_DISTANCE }),
    },
    animate: {
      opacity: 1,
      scale: 1,
      ...(isHorizontal ? { x: 0 } : { y: 0 }),
      transition: {
        duration: ANIMATION_DURATION,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      ...(isHorizontal ? { x: -ANIMATION_DISTANCE } : { y: -ANIMATION_DISTANCE }),
      transition: {
        duration: ANIMATION_DURATION,
        ease: [0.4, 0, 1, 1] as const,
      },
    },
  }
}

// ── SortableTab ─────────────────────────────────────────────────────

export interface SortableTabProps {
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

export { SortableTab }
