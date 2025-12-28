import * as React from "react"
import { memo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface ExpandToggleButtonProps {
  isExpanded: boolean
  onClick: () => void
  opacity?: number
  className?: string
}

const ExpandToggleButton = memo(({
  isExpanded,
  onClick,
  opacity = 1,
  className
}: ExpandToggleButtonProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={onClick}
          className={cn(
            "h-12 w-6 px-0 transition-opacity",
            className
          )}
          style={{ opacity }}
          aria-label={isExpanded ? "Show input pane" : "Hide input pane"}
        >
          {isExpanded ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{isExpanded ? "Show editor" : "Hide editor"}</p>
      </TooltipContent>
    </Tooltip>
  )
})
ExpandToggleButton.displayName = "ExpandToggleButton"

export { ExpandToggleButton }
