/**
 * useWheelScroll — intercepts wheel/trackpad gestures on a horizontal
 * tab bar and converts them into horizontal scrollLeft changes.
 *
 * Direction mapping (matches VS Code / Chrome tab bar convention):
 *   • wheel-up  / right-swipe  → scroll toward BEGINNING (scrollLeft ↓)
 *   • wheel-down / left-swipe  → scroll toward END        (scrollLeft ↑)
 *
 * Handles:
 *   • Vertical mouse-wheel → horizontal conversion (deltaY → scrollLeft)
 *   • Horizontal trackpad swipe (deltaX → scrollLeft)
 *   • Shift+wheel (browsers emit horizontal delta in deltaX)
 *   • All three WheelEvent.deltaMode values (pixel, line, page)
 *
 * Implementation note: the browser reports WheelEvent delta values
 * AFTER the OS applies natural-scrolling inversion. deltaX already
 * points in the correct direction for horizontal scroll (right-swipe
 * on macOS natural = negative deltaX = scrollLeft decreases = toward
 * beginning). For vertical-to-horizontal conversion, deltaY follows
 * the same convention, so `scrollLeft += delta` works for both axes.
 */

import { useEffect } from "react"

export interface UseWheelScrollOptions {
  containerRef: React.RefObject<HTMLElement | null>
  enabled?: boolean
}

export function useWheelScroll({
  containerRef,
  enabled = true,
}: UseWheelScrollOptions): void {
  useEffect(() => {
    if (!enabled) return

    const el = containerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      // Don't scroll if there's nothing to scroll
      const { scrollWidth, clientWidth } = el
      if (scrollWidth <= clientWidth) return

      // Pick the dominant axis: use deltaX for horizontal gestures
      // (trackpad swipes, shift+wheel), deltaY for vertical wheel.
      const absX = Math.abs(e.deltaX)
      const absY = Math.abs(e.deltaY)

      // Skip zero-motion events
      if (absX === 0 && absY === 0) return

      let delta = absX >= absY ? e.deltaX : e.deltaY

      // Convert deltaMode: 0=pixels, 1=lines (×40), 2=pages (×clientWidth)
      switch (e.deltaMode) {
        case WheelEvent.DOM_DELTA_LINE:
          delta *= 40
          break
        case WheelEvent.DOM_DELTA_PAGE:
          delta *= clientWidth
          break
      }

      // Clamp: don't overshoot the scroll boundaries
      const maxScroll = scrollWidth - clientWidth
      const newScrollLeft = Math.max(0, Math.min(maxScroll, el.scrollLeft + delta))

      if (newScrollLeft !== el.scrollLeft) {
        el.scrollLeft = newScrollLeft
      }

      // Prevent the event from bubbling to parent scroll containers
      e.preventDefault()
    }

    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [containerRef, enabled])
}
