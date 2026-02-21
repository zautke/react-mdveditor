"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { TabName } from "./tab-name"
import type { TabItem } from "./types"

// ── TabDragOverlay ──────────────────────────────────────────────────
// Ghost element rendered inside DragOverlay during tab reorder drag.
// Mimics the visual appearance of the dragged tab.

export interface TabDragOverlayProps {
  tab: TabItem
  triggerClassName: string
}

function TabDragOverlay({ tab, triggerClassName }: TabDragOverlayProps) {
  return (
    <div
      className="shadow-lg rounded-md opacity-90 pointer-events-none"
      style={{ containerType: "inline-size" as React.CSSProperties["containerType"] }}
      aria-hidden="true"
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
}
TabDragOverlay.displayName = "TabDragOverlay"

export { TabDragOverlay }
