/**
 * useDragReorder — wraps @dnd-kit sortable state management
 *
 * Provides sensor configuration, active drag ID tracking, and
 * event handlers for DndContext. The consumer wires these into
 * <DndContext> and <SortableContext>.
 */

import { useState, useCallback, useRef } from "react"
import {
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensors,
  useSensor,
  type DragStartEvent,
  type DragOverEvent,
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
  handleDragOver: (event: DragOverEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
  handleDragCancel: () => void
}

export function useDragReorder({
  items,
  onReorder,
  enabled = true,
}: UseDragReorderOptions): UseDragReorderReturn {
  const [activeId, setActiveId] = useState<string | null>(null)
  const startingOrderRef = useRef<string[] | null>(null)

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
      startingOrderRef.current = [...items]
      setActiveId(String(event.active.id))
    },
    [enabled, items]
  )

  // Optimistic reorder on drag-over: moves tabs out of the way in
  // real-time as the dragged item crosses their midpoint.
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
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

  const handleDragEnd = useCallback(
    (_event: DragEndEvent) => {
      // Reorder already happened in onDragOver — just clear active state.
      startingOrderRef.current = null
      setActiveId(null)
    },
    []
  )

  const handleDragCancel = useCallback(() => {
    const startingOrder = startingOrderRef.current
    const sameItems = startingOrder?.length === items.length &&
      startingOrder.every((id) => items.includes(id))
    const orderChanged = startingOrder?.some((id, index) => items[index] !== id)

    if (startingOrder && sameItems && orderChanged) {
      onReorder(startingOrder)
    }
    startingOrderRef.current = null
    setActiveId(null)
  }, [items, onReorder])

  return { sensors, activeId, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel }
}
