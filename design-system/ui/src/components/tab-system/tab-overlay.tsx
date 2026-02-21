"use client"

import { cn } from "../../utils"
import { TabName } from "./tab-name"
import type { TabItem } from "./types"

interface TabOverlayProps {
  tab: TabItem
  triggerClassName: string
}

/**
 * TabDragOverlayContent — presentational copy of the dragged tab,
 * rendered inside a DragOverlay portal so it floats above everything.
 */
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

export { TabDragOverlayContent }
export type { TabOverlayProps }
