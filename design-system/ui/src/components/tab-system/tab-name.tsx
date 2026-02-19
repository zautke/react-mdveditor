import * as React from "react"
import { cn } from "../../utils"
import { IconLabel } from "../icon-label"

interface TabNameProps {
  icon?: React.ReactNode
  label: string
  iconColor?: React.CSSProperties
  className?: string
}

/**
 * TabName — responsive tab content wrapper.
 *
 * Uses CSS container query units (cqi) to scale font and padding
 * with the available tab width. Requires a container-type: inline-size
 * ancestor (set by SortableTab's motion.div wrapper).
 *
 * Composes IconLabel for vertical icon+text alignment.
 */
export function TabName({ icon, label, iconColor, className }: TabNameProps) {
  return (
    <span
      className={cn(
        // Take remaining space after close button, allow shrinking, center content
        "flex-1 flex items-center justify-center min-w-0",
        // Responsive font: scales between 0.7rem -> 0.875rem with container width
        "text-[clamp(0.7rem,4cqi,0.875rem)]",
        // Responsive horizontal padding: scales between 0.5rem -> 1rem
        "px-[clamp(0.5rem,3cqi,1rem)]",
        className,
      )}
    >
      <IconLabel
        icon={icon ? (
          <span className="tab-icon" style={iconColor}>
            {icon}
          </span>
        ) : undefined}
        label={label}
        position="left"
        gutter={6}
        className="min-w-0"
      />
    </span>
  )
}
