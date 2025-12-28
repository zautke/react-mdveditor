/**
 * TabSystem Variants
 * CVA-powered style variants for the 5 tab presets
 */

import { cva, type VariantProps } from "class-variance-authority"

/**
 * Tab list container variants
 * Defines the container that holds all tab triggers
 */
export const tabListVariants = cva(
  // Base styles for all variants
  "flex gap-0.5",
  {
    variants: {
      variant: {
        chrome: "bg-muted/50 p-1 rounded-t-lg relative",
        underline: "border-b border-border gap-4",
        pills: "bg-muted p-1 rounded-lg gap-1",
        boxed: "border border-border rounded-lg p-1 gap-1",
        minimal: "gap-6",
      },
      orientation: {
        horizontal: "flex-row items-center",
        vertical: "flex-col items-stretch",
      },
    },
    compoundVariants: [
      // Vertical adjustments for each variant
      {
        variant: "underline",
        orientation: "vertical",
        className: "border-b-0 border-r border-border gap-1",
      },
      {
        variant: "chrome",
        orientation: "vertical",
        className: "rounded-t-none rounded-l-lg",
      },
    ],
    defaultVariants: {
      variant: "underline",
      orientation: "horizontal",
    },
  }
)

/**
 * Individual tab trigger variants
 * The clickable tab element
 */
export const tabTriggerVariants = cva(
  // Base styles for all tabs
  [
    "relative inline-flex items-center justify-center gap-2",
    "text-sm font-medium transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "select-none cursor-pointer",
  ],
  {
    variants: {
      variant: {
        chrome: [
          // Chrome-style curved tabs with overlapping effect
          "px-4 py-2 min-w-[120px]",
          "bg-muted/70 text-muted-foreground",
          "rounded-t-lg",
          // Chrome tab shape via clip-path (trapezoid)
          "[clip-path:polygon(8px_0%,calc(100%-8px)_0%,100%_100%,0%_100%)]",
          "-ml-2 first:ml-0",
          "hover:bg-muted",
          "data-[state=active]:bg-background data-[state=active]:text-foreground",
          "data-[state=active]:shadow-[0_-2px_10px_rgba(0,0,0,0.1)]",
          "data-[state=active]:z-10",
        ],
        underline: [
          "px-4 py-2",
          "text-muted-foreground",
          "border-b-2 border-transparent -mb-px",
          "hover:text-foreground hover:border-border",
          "data-[state=active]:text-foreground data-[state=active]:border-primary",
        ],
        pills: [
          "px-4 py-2 rounded-md",
          "text-muted-foreground",
          "hover:bg-background/50 hover:text-foreground",
          "data-[state=active]:bg-background data-[state=active]:text-foreground",
          "data-[state=active]:shadow-sm",
        ],
        boxed: [
          "px-4 py-2 rounded-md",
          "border border-transparent",
          "text-muted-foreground",
          "hover:bg-accent/50 hover:text-accent-foreground",
          "data-[state=active]:bg-background data-[state=active]:border-border",
          "data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        ],
        minimal: [
          "px-2 py-1",
          "text-muted-foreground",
          "hover:text-foreground",
          "data-[state=active]:text-foreground",
          "data-[state=active]:font-semibold",
        ],
      },
      orientation: {
        horizontal: "",
        vertical: "w-full justify-start text-left",
      },
    },
    compoundVariants: [
      // Chrome vertical: change clip-path direction
      {
        variant: "chrome",
        orientation: "vertical",
        className: [
          "[clip-path:polygon(0%_8px,100%_0%,100%_100%,0%_calc(100%-8px))]",
          "-mt-2 first:mt-0 ml-0",
          "rounded-t-none rounded-l-lg",
        ],
      },
      // Underline vertical: border on right instead of bottom
      {
        variant: "underline",
        orientation: "vertical",
        className: [
          "border-b-0 border-r-2 -mr-px mb-0",
          "data-[state=active]:border-b-0 data-[state=active]:border-r-primary",
        ],
      },
    ],
    defaultVariants: {
      variant: "underline",
      orientation: "horizontal",
    },
  }
)

/**
 * Close button variants
 * Configurable position, shape, and visibility
 */
export const closeButtonVariants = cva(
  // Base close button styles
  [
    "inline-flex items-center justify-center",
    "transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    "hover:bg-destructive/20 hover:text-destructive",
  ],
  {
    variants: {
      position: {
        inside: "ml-2",
        outside: "absolute -right-1 -top-1",
        overlap: "absolute right-1 top-1/2 -translate-y-1/2",
      },
      shape: {
        circle: "rounded-full p-0.5 h-4 w-4",
        square: "rounded-sm p-0.5 h-4 w-4",
        none: "p-0 h-3 w-3",
      },
      visibility: {
        always: "opacity-100",
        hover: "opacity-0 group-hover:opacity-100",
        "active-only": "opacity-0 group-data-[state=active]:opacity-100",
      },
    },
    defaultVariants: {
      position: "inside",
      shape: "circle",
      visibility: "hover",
    },
  }
)

/**
 * New tab button variants
 */
export const newTabButtonVariants = cva(
  [
    "inline-flex items-center justify-center",
    "h-8 w-8 rounded-md",
    "text-muted-foreground",
    "transition-colors duration-150",
    "hover:bg-accent hover:text-accent-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  ],
  {
    variants: {
      variant: {
        chrome: "bg-muted/30 hover:bg-muted",
        underline: "border border-dashed border-border hover:border-solid",
        pills: "bg-muted/50 hover:bg-muted",
        boxed: "border border-dashed border-border hover:border-solid",
        minimal: "hover:bg-muted/50",
      },
      orientation: {
        horizontal: "ml-1",
        vertical: "mt-1 w-full",
      },
    },
    defaultVariants: {
      variant: "underline",
      orientation: "horizontal",
    },
  }
)

export type TabListVariantProps = VariantProps<typeof tabListVariants>
export type TabTriggerVariantProps = VariantProps<typeof tabTriggerVariants>
export type CloseButtonVariantProps = VariantProps<typeof closeButtonVariants>
export type NewTabButtonVariantProps = VariantProps<typeof newTabButtonVariants>
