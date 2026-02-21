/**
 * useWheelScroll — converts vertical mouse wheel to horizontal scroll
 *
 * When the user scrolls vertically over a horizontal tab bar, this hook
 * intercepts the wheel event and translates deltaY into horizontal
 * scrollLeft movement. Handles all three WheelEvent deltaMode values.
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
      // Only convert when vertical scroll exceeds horizontal
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return

      // Don't scroll if there's nothing to scroll
      const { scrollWidth, clientWidth } = el
      if (scrollWidth <= clientWidth) return

      // Convert deltaMode: 0=pixels, 1=lines (x40), 2=pages (xclientWidth)
      let delta = e.deltaY
      switch (e.deltaMode) {
        case WheelEvent.DOM_DELTA_LINE:
          delta *= 40
          break
        case WheelEvent.DOM_DELTA_PAGE:
          delta *= clientWidth
          break
      }

      el.scrollLeft += delta
      e.preventDefault()
    }

    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [containerRef, enabled])
}
