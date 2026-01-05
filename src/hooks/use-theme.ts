"use client"

import { useState, useSyncExternalStore } from "react"

type Theme = "light" | "dark" | "system"

// Get initial theme from localStorage or system preference
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "system"
  return (localStorage.getItem("theme") as Theme) || "system"
}

// Subscribe to document class changes
function subscribeToThemeChanges(callback: () => void) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"]
  })
  return () => observer.disconnect()
}

// Get current theme from DOM
function getThemeSnapshot(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

// Server snapshot
function getServerSnapshot(): "light" | "dark" {
  return "light"
}

/**
 * useTheme hook - Access theme state from anywhere
 *
 * Watches the document root for theme class changes and provides
 * the current resolved theme (light or dark).
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  // Use useSyncExternalStore to watch for DOM class changes
  const resolvedTheme = useSyncExternalStore(
    subscribeToThemeChanges,
    getThemeSnapshot,
    getServerSnapshot
  )

  return { theme, resolvedTheme, setTheme }
}
