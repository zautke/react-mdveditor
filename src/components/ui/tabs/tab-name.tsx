import * as React from "react"
import { cn } from "@/lib/utils"

interface TabNameProps {
  icon?: React.ReactNode
  label: string
  iconColor?: React.CSSProperties
  onRename?: (label: string) => void
  className?: string
}

const SECOND_CLICK_MS = 250

const textSlotClassName = cn(
  "min-w-0 flex-1 truncate text-center",
  "[font:inherit] [line-height:inherit] text-current"
)

/**
 * TabName — responsive tab content wrapper.
 *
 * Uses CSS container query units (cqi) to scale font and padding
 * with the available tab width. Requires a container-type: inline-size
 * ancestor (set by AnimatedTab's motion.div wrapper).
 *
 * Keeps icon + text aligned and supports optional inline rename.
 */
export function TabName({ icon, label, iconColor, onRename, className }: TabNameProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(label)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const lastClickAtRef = React.useRef(0)

  React.useEffect(() => {
    if (!isEditing) setDraft(label)
  }, [isEditing, label])

  React.useEffect(() => {
    if (!isEditing) return
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [isEditing])

  const beginEdit = React.useCallback(() => {
    if (!onRename) return
    setDraft(label)
    setIsEditing(true)
  }, [label, onRename])

  const commitEdit = React.useCallback(() => {
    const nextLabel = draft.trim()
    setIsEditing(false)
    if (nextLabel && nextLabel !== label) {
      onRename?.(nextLabel)
    } else {
      setDraft(label)
    }
  }, [draft, label, onRename])

  const cancelEdit = React.useCallback(() => {
    setDraft(label)
    setIsEditing(false)
  }, [label])

  const stopTabInteraction = React.useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation()
  }, [])

  const handleLabelClick = React.useCallback((event: React.MouseEvent) => {
    if (!onRename || event.button !== 0) return

    const now = window.performance.now()
    if (now - lastClickAtRef.current <= SECOND_CLICK_MS) {
      event.preventDefault()
      event.stopPropagation()
      beginEdit()
      lastClickAtRef.current = 0
      return
    }
    lastClickAtRef.current = now
  }, [beginEdit, onRename])

  return (
    <span
      className={cn(
        // Take remaining space after close button, allow shrinking, center content
        "flex-1 flex items-center justify-center min-w-0",
        // Responsive font: scales between 0.7rem → 0.875rem with container width
        "text-[clamp(0.7rem,4cqi,0.875rem)]",
        // Responsive horizontal padding: scales between 0.5rem → 1rem
        "px-[clamp(0.5rem,3cqi,1rem)]",
        className,
      )}
    >
      <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
        {icon ? (
          <span className="tab-icon shrink-0" style={iconColor} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {isEditing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitEdit}
            onClick={stopTabInteraction}
            onMouseDown={stopTabInteraction}
            onPointerDown={stopTabInteraction}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === "Enter") {
                event.preventDefault()
                commitEdit()
              }
              if (event.key === "Escape") {
                event.preventDefault()
                cancelEdit()
              }
            }}
            aria-label="Rename tab"
            className={cn(
              textSlotClassName,
              "m-0 block h-auto w-full appearance-none border-0 bg-transparent p-0",
              "outline-none ring-0 shadow-none",
              "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
            )}
            style={{ backgroundColor: "transparent", boxShadow: "none" }}
          />
        ) : (
          <span
            onClick={handleLabelClick}
            className={textSlotClassName}
            title={label}
          >
            {label}
          </span>
        )}
      </span>
    </span>
  )
}
