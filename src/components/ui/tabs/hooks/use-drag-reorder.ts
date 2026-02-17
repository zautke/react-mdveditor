/**
 * useDragReorder — wraps @dnd-kit sortable state management
 *
 * Provides sensor configuration, active drag ID tracking, and
 * event handlers for DndContext. The consumer wires these into
 * <DndContext> and <SortableContext>.
 */

import { useState, useCallback } from "react"
import {
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensors,
  useSensor,
  type DragStartEvent,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core"
import {
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable"

export interface UseDragReorderOptions {
  /** Tab IDs in current display order */
  items: string[]
  /** Called with the new order after a successful drag */
  onReorder: (newOrder: string[]) => void
  /** Disable drag-and-drop (default: true when enabled) */
  enabled?: boolean
}

export interface UseDragReorderReturn {
  sensors: SensorDescriptor<SensorOptions>[]
  activeId: string | null
  handleDragStart: (event: DragStartEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
  handleDragCancel: () => void
}

export function useDragReorder({
  items,
  onReorder,
  enabled = true,
}: UseDragReorderOptions): UseDragReorderReturn {
  const [activeId, setActiveId] = useState<string | null>(null)

  // Pointer sensor: distance: 8 prevents accidental drag when clicking
  // tabs or close buttons
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (!enabled) return
      setActiveId(String(event.active.id))
    },
    [enabled]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)

      if (!enabled) return

      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = items.indexOf(String(active.id))
      const newIndex = items.indexOf(String(over.id))

      if (oldIndex === -1 || newIndex === -1) return

      const newOrder = arrayMove(items, oldIndex, newIndex)
      onReorder(newOrder)
    },
    [enabled, items, onReorder]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  return { sensors, activeId, handleDragStart, handleDragEnd, handleDragCancel }
}
