"use client"

import * as React from "react"
import { forwardRef } from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

// ── TabPanel ────────────────────────────────────────────────────────
// Wrapper around Radix TabsPrimitive.Content with consistent focus
// ring styles. Named "TabPanel" to match the ARIA tabpanel role that
// Radix injects automatically.

const TabPanel = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "ring-offset-background h-full overflow-auto",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabPanel.displayName = "TabPanel"

export { TabPanel }
