"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type Theme = "light" | "dark" | "system"

interface ThemeToggleProps {
  className?: string
}

// Apply theme to document root with smooth transition
function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement

  // Add transition class before changing theme
  root.classList.add("theme-transitioning")

  if (theme === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }

  // Remove transition class after animation completes
  setTimeout(() => {
    root.classList.remove("theme-transitioning")
  }, 300)
}

/**
 * ThemeToggle - Smooth animated theme switcher
 *
 * Features:
 * - Smooth CSS transitions between themes
 * - System preference detection
 * - localStorage persistence
 * - Animated sun/moon icons
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = React.useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light")

  // Initialize theme from localStorage or system preference
  React.useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    if (stored) {
      setTheme(stored)
      const resolved = stored === "system"
        ? (systemPrefersDark ? "dark" : "light")
        : stored
      setResolvedTheme(resolved)
      applyTheme(resolved)
    } else {
      setResolvedTheme(systemPrefersDark ? "dark" : "light")
      applyTheme(systemPrefersDark ? "dark" : "light")
    }
  }, [])

  // Listen for system preference changes
  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === "system") {
        const newResolved = e.matches ? "dark" : "light"
        setResolvedTheme(newResolved)
        applyTheme(newResolved)
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  const toggleTheme = () => {
    const newTheme: "light" | "dark" = resolvedTheme === "light" ? "dark" : "light"
    setTheme(newTheme)
    setResolvedTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    applyTheme(newTheme)
  }

  const isDark = resolvedTheme === "dark"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className={cn(
            "relative h-8 w-8 overflow-hidden",
            className
          )}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {/* Sun icon - visible in dark mode */}
          <Sun
            className={cn(
              "h-4 w-4 absolute transition-all duration-300 ease-out",
              isDark
                ? "rotate-0 scale-100 opacity-100"
                : "rotate-90 scale-0 opacity-0"
            )}
          />
          {/* Moon icon - visible in light mode */}
          <Moon
            className={cn(
              "h-4 w-4 absolute transition-all duration-300 ease-out",
              isDark
                ? "-rotate-90 scale-0 opacity-0"
                : "rotate-0 scale-100 opacity-100"
            )}
          />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isDark ? "Light mode" : "Dark mode"}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export default ThemeToggle
