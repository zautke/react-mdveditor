/**
 * useTabOverflow — detects scroll overflow in a horizontal container
 *
 * Uses ResizeObserver to watch for container size changes and a scroll
 * event listener to track the current scroll position. Exposes boolean
 * flags (`canScrollLeft`/`canScrollRight`) and imperative scroll methods.
 */

import { useCallback, useEffect, useRef, useState } from "react"

export interface UseTabOverflowReturn {
  containerRef: React.RefObject<HTMLDivElement | null>
  canScrollLeft: boolean
  canScrollRight: boolean
  scrollLeft: () => void
  scrollRight: () => void
}

export function useTabOverflow(): UseTabOverflowReturn {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateOverflow = useCallback(() => {
    const el = containerRef.current
    if (!el) return

    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 1)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Initial check
    updateOverflow()

    // Listen to scroll events
    el.addEventListener("scroll", updateOverflow, { passive: true })

    // Watch for resize changes (tab add/remove, container resize)
    const observer = new ResizeObserver(updateOverflow)
    observer.observe(el)

    // Also observe the inner list if it exists (handles child mutations)
    const firstChild = el.firstElementChild
    if (firstChild) {
      observer.observe(firstChild)
    }

    return () => {
      el.removeEventListener("scroll", updateOverflow)
      observer.disconnect()
    }
  }, [updateOverflow])

  const scrollLeft = useCallback(() => {
    containerRef.current?.scrollBy({ left: -200, behavior: "auto" })
  }, [])

  const scrollRight = useCallback(() => {
    containerRef.current?.scrollBy({ left: 200, behavior: "auto" })
  }, [])

  return { containerRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight }
}
