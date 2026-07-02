"use client"

import { cn } from "../../utils"
import { TabName } from "./tab-name"
import type { TabItem } from "./types"

interface TabOverlayProps {
  tab: TabItem
  triggerClassName: string
  tabNameClassName?: string
  className?: string
}

/**
 * TabDragOverlayContent — presentational copy of the dragged tab,
 * rendered inside a DragOverlay portal so it floats above everything.
 */
const TabDragOverlayContent = ({ tab, triggerClassName, tabNameClassName, className }: TabOverlayProps) => (
  <div
    className={cn("shadow-[var(--tab-drag-shadow)] rounded-md opacity-90 pointer-events-none", className)}
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
        className={tabNameClassName}
        iconColor={
          tab.color
            ? { color: "color-mix(in oklch, var(--tab-accent) 80%, var(--tab-active-text))" }
            : undefined
        }
      />
    </div>
  </div>
)
TabDragOverlayContent.displayName = "TabDragOverlayContent"

export { TabDragOverlayContent }
export type { TabOverlayProps }
