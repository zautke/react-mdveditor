import * as React from "react"

import { cn } from "../utils"

export type IconLabelPosition = "left" | "right" | "top" | "bottom"

interface IconLabelProps {
  icon: React.ReactNode
  label: React.ReactNode
  position?: IconLabelPosition
  gutter?: number
  className?: string
}

const positionClasses: Record<IconLabelPosition, string> = {
  left: "flex-row",
  right: "flex-row-reverse",
  top: "flex-col",
  bottom: "flex-col-reverse",
}

export function IconLabel({
  icon,
  label,
  position = "left",
  gutter = 8,
  className,
}: IconLabelProps) {
  return (
    <span
      className={cn("inline-flex items-center", positionClasses[position], className)}
      style={{ gap: gutter }}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  )
}
