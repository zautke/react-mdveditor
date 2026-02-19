/**
 * TabSystem Variants — tailwind-variants (tv) slot architecture
 *
 * Replaces the 4 separate CVA schemas (tabListVariants, tabTriggerVariants,
 * closeButtonVariants, newTabButtonVariants) with a single tv() definition.
 *
 * Slots: root, bar, list, trigger, tabName, closeButton, newButton,
 *        scrollArrow, content, scrollContainer
 */

import { tv } from "tailwind-variants"

export const tabSystem = tv({
  slots: {
    root: "flex min-h-0",
    bar: "flex items-center",
    list: "flex gap-0.5",
    trigger: [
      "relative inline-flex items-center justify-center gap-2",
      "text-sm font-medium transition-all duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "select-none cursor-pointer",
    ],
    tabName: "flex-1 flex items-center justify-center min-w-0",
    closeButton: [
      "inline-flex items-center justify-center",
      "transition-all duration-150",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      "hover:bg-destructive/20 hover:text-destructive",
    ],
    newButton: [
      "inline-flex items-center justify-center h-8 w-8 rounded-md",
      "text-[color:var(--tab-text)] transition-colors duration-150",
      "hover:bg-[color:var(--tab-hover-bg)] hover:text-[color:var(--tab-active-text)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    ],
    scrollArrow: [
      "inline-flex items-center justify-center h-full w-6",
      "text-[color:var(--tab-text)] transition-opacity duration-150",
      "hover:bg-[color:var(--tab-hover-bg)]",
      "disabled:opacity-0 disabled:pointer-events-none",
    ],
    content: "flex-1 overflow-hidden",
    scrollContainer:
      "flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  },
  variants: {
    variant: {
      chrome: {
        list: "bg-[color:var(--tabs-bar-bg)] p-1 rounded-t-lg relative border border-[color:var(--tabs-bar-border)] border-t-[color:var(--tabs-bar-border-strong)] border-r-[color:var(--tabs-bar-border-strong)] backdrop-blur-md shadow-sm overflow-visible",
        trigger: [
          "py-2",
          "bg-[color:var(--tab-bg)] text-[color:var(--tab-text)]",
          "rounded-t-lg",
          "-mb-px",
          "[clip-path:polygon(8px_0%,calc(100%-8px)_0%,100%_100%,0%_100%)]",
          "-ml-2 first:ml-0",
          "hover:bg-[color:var(--tab-hover-bg)]",
          "data-[state=active]:bg-[color:var(--tab-active-bg)] data-[state=active]:text-[color:var(--tab-active-text)]",
          "data-[state=active]:shadow-[var(--tab-shadow)]",
          "data-[state=active]:z-10",
        ],
        newButton:
          "bg-[color:var(--tab-bg)] hover:bg-[color:var(--tab-hover-bg)]",
        content: "border-t border-[color:var(--tabs-bar-border)]",
      },
      capsule: {
        list: "bg-[color:var(--tabs-bar-bg)] p-1 rounded-full relative border border-[color:var(--tabs-bar-border)] backdrop-blur-md shadow-sm gap-1.5 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        trigger: [
          "py-1.5",
          "bg-transparent text-[color:var(--tab-text)]",
          "rounded-full",
          "shrink grow-0 min-w-0",
          "hover:bg-[color:var(--tab-hover-bg)]",
          "data-[state=active]:rounded-t-full data-[state=active]:rounded-b-none",
          "data-[state=active]:bg-[color:var(--tab-active-bg)] data-[state=active]:text-[color:var(--tab-active-text)]",
          "data-[state=active]:shadow-[var(--tab-shadow)]",
          "data-[state=active]:z-10",
        ],
        newButton:
          "rounded-full bg-[color:var(--tab-bg)] hover:bg-[color:var(--tab-hover-bg)]",
      },
      underline: {
        list: "border-b border-border gap-4",
        trigger: [
          "py-2",
          "text-[color:var(--tab-text)]",
          "border-b-2 border-transparent -mb-px",
          "hover:text-[color:var(--tab-active-text)] hover:border-border",
          "data-[state=active]:text-[color:var(--tab-active-text)] data-[state=active]:border-primary",
        ],
        newButton: "border border-dashed border-border hover:border-solid",
        content: "border-t border-transparent",
      },
      pills: {
        list: "bg-muted p-1 rounded-lg gap-1",
        trigger: [
          "py-2 rounded-md",
          "text-[color:var(--tab-text)]",
          "hover:bg-[color:var(--tab-hover-bg)] hover:text-[color:var(--tab-active-text)]",
          "data-[state=active]:bg-[color:var(--tab-active-bg)] data-[state=active]:text-[color:var(--tab-active-text)]",
          "data-[state=active]:shadow-sm",
        ],
        newButton: "bg-muted/50 hover:bg-muted",
      },
      boxed: {
        list: "border border-border rounded-lg p-1 gap-1",
        trigger: [
          "py-2 rounded-md",
          "border border-transparent",
          "text-[color:var(--tab-text)]",
          "hover:bg-[color:var(--tab-hover-bg)] hover:text-[color:var(--tab-active-text)]",
          "data-[state=active]:bg-[color:var(--tab-active-bg)] data-[state=active]:border-border",
          "data-[state=active]:text-[color:var(--tab-active-text)] data-[state=active]:shadow-sm",
        ],
        newButton: "border border-dashed border-border hover:border-solid",
      },
      minimal: {
        list: "gap-6",
        trigger: [
          "py-1",
          "text-[color:var(--tab-text)]",
          "hover:text-[color:var(--tab-active-text)]",
          "data-[state=active]:text-[color:var(--tab-active-text)]",
          "data-[state=active]:font-semibold",
        ],
        newButton: "hover:bg-muted/50",
      },
    },
    orientation: {
      horizontal: {
        root: "flex-col",
        bar: "flex-row",
        list: "flex-row items-center",
      },
      vertical: {
        root: "flex-row",
        bar: "flex-col",
        list: "flex-col items-stretch",
        trigger: "w-full justify-start text-left",
        newButton: "w-full",
      },
    },
    closePosition: {
      inside: { closeButton: "ml-2" },
      outside: { closeButton: "absolute -right-1 -top-1" },
      overlap: {
        closeButton: "absolute right-1 top-1/2 -translate-y-1/2",
      },
    },
    closeShape: {
      circle: { closeButton: "rounded-full p-0.5 h-4 w-4" },
      square: { closeButton: "rounded-sm p-0.5 h-4 w-4" },
      none: { closeButton: "hidden" },
    },
    closeVisibility: {
      always: { closeButton: "opacity-100" },
      hover: { closeButton: "opacity-0 group-hover:opacity-100" },
      "active-only": {
        closeButton: "opacity-0 group-data-[state=active]:opacity-100",
      },
    },
  },
  compoundVariants: [
    // Chrome x horizontal: items align to bottom, no bottom padding
    {
      variant: "chrome",
      orientation: "horizontal",
      class: { list: "items-end pb-0" },
    },
    // Chrome x vertical: adjust clip-path and rounding
    {
      variant: "chrome",
      orientation: "vertical",
      class: {
        list: "rounded-t-none rounded-l-lg",
        trigger: [
          "[clip-path:polygon(0%_8px,100%_0%,100%_100%,0%_calc(100%-8px))]",
          "-mt-2 first:mt-0 ml-0",
          "rounded-t-none rounded-l-lg",
        ],
      },
    },
    // Capsule x horizontal: stretch items
    {
      variant: "capsule",
      orientation: "horizontal",
      class: { list: "items-stretch" },
    },
    // Capsule x vertical: full rounding with right-side flat for active
    {
      variant: "capsule",
      orientation: "vertical",
      class: {
        list: "rounded-full flex-col",
        trigger: [
          "rounded-full",
          "data-[state=active]:rounded-t-full data-[state=active]:rounded-b-full",
          "data-[state=active]:rounded-l-full data-[state=active]:rounded-r-none",
        ],
      },
    },
    // Underline x vertical: border on right instead of bottom
    {
      variant: "underline",
      orientation: "vertical",
      class: {
        list: "border-b-0 border-r border-border gap-1",
        trigger: [
          "border-b-0 border-r-2 -mr-px mb-0",
          "data-[state=active]:border-b-0 data-[state=active]:border-r-primary",
        ],
      },
    },
  ],
  defaultVariants: {
    variant: "underline",
    orientation: "horizontal",
    closePosition: "inside",
    closeShape: "circle",
    closeVisibility: "hover",
  },
})

export type TabSystemVariantProps = Parameters<typeof tabSystem>[0]
