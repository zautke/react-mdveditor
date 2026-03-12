/**
 * TabSystem Variants — tailwind-variants (tv) slot architecture
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
      "text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--mdeditor-tabs-trigger-ring,var(--ring))] focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "select-none cursor-pointer",
    ],
    tabName: "flex-1 flex items-center justify-center min-w-0 z-10",
    closeButton: [
      "inline-flex items-center justify-center z-10",
      "transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--mdeditor-tabs-trigger-ring,var(--ring))]",
      "hover:bg-[color:var(--tabsys-close-hover-bg,var(--destructive)/20)] hover:text-[color:var(--tabsys-close-hover-foreground,var(--destructive))]",
    ],
    newButton: [
      "inline-flex items-center justify-center h-8 w-8 rounded-md",
      "text-[color:var(--mdeditor-tabs-actions-fg,var(--muted-foreground))] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
      "hover:bg-[color:var(--mdeditor-tabs-menu-item-hover-bg,var(--accent))] hover:text-[color:var(--mdeditor-tabs-menu-item-hover-fg,var(--accent-foreground))]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--mdeditor-tabs-trigger-ring,var(--ring))]",
    ],
    scrollArrow: [
      "inline-flex items-center justify-center h-full w-6",
      "text-[color:var(--mdeditor-tabs-actions-fg,var(--muted-foreground))] transition-opacity duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
      "hover:bg-[color:var(--mdeditor-tabs-menu-item-hover-bg,var(--accent))] hover:text-[color:var(--mdeditor-tabs-menu-item-hover-fg,var(--accent-foreground))]",
      "disabled:opacity-0 disabled:pointer-events-none",
    ],
    content: "flex-1 overflow-hidden",
    scrollContainer:
      "flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  },
  variants: {
    variant: {
      chrome: {
        list: "bg-[color:var(--tabs-bar-bg,#1f2d35)] pt-[var(--tabsys-pt,0.25rem)] px-1.5 rounded-t-[calc(var(--radius)+0.25rem)] relative overflow-visible flex items-end gap-[var(--tabsys-gap,0.25rem)] z-0 shadow-inner",
        trigger: [
          "py-[var(--tabsys-py,0.375rem)] px-3",
          "text-[color:var(--tab-text,#8e9ba2)]",
          "rounded-t-[calc(var(--radius)-0.125rem)] relative",
          // Hover state
          "hover:bg-[color:var(--tab-hover-bg,#2b3c46)] hover:text-[color:var(--tab-hover-text,#c2ccd1)]",
          // Active State
          "data-[state=active]:bg-[color:var(--tab-active-bg,#293d48)] data-[state=active]:text-[color:var(--tab-active-text,#e2e8f0)]",
          // Lift the active tab up over the content border. z-20 puts it above the panel border.
          "data-[state=active]:z-20 data-[state=active]:shadow-[var(--tab-shadow)]",
          
          // --- Flared Outward Corners (Left & Right) ---
          "before:content-[''] before:absolute before:-left-3 before:bottom-0 before:w-3 before:h-3 before:bg-transparent before:opacity-0 data-[state=active]:before:opacity-100",
          "before:rounded-br-[calc(var(--radius)-0.125rem)] before:shadow-[6px_4px_0_0_var(--tab-active-bg,#293d48)] before:z-10",
          
          "after:content-[''] after:absolute after:-right-3 after:bottom-0 after:w-3 after:h-3 after:bg-transparent after:opacity-0 data-[state=active]:after:opacity-100",
          "after:rounded-bl-[calc(var(--radius)-0.125rem)] after:shadow-[-6px_4px_0_0_var(--tab-active-bg,#293d48)] after:z-10",
        ],
        newButton:
          "bg-transparent mb-0.5",
        // The content area takes the panel background
        content: "bg-[color:var(--tab-active-bg,#293d48)] p-1 rounded-b-[var(--radius)] rounded-tr-[var(--radius)] border border-[color:var(--tabs-bar-border-strong,#2b3c46)] relative z-10 -mt-[1px]",
      },
      capsule: {
        list: "bg-[color:var(--mdeditor-tabs-list-bg,var(--secondary))] p-1 rounded-full relative border border-[color:var(--mdeditor-tabs-list-border,var(--border))] shadow-inner gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        trigger: [
          "py-1.5 px-4",
          "text-[color:var(--mdeditor-tabs-trigger-fg,var(--muted-foreground))]",
          "rounded-full",
          "shrink grow-0 min-w-0",
          "hover:text-[color:var(--mdeditor-tabs-trigger-hover-fg,var(--foreground))] hover:bg-[color:var(--mdeditor-tabs-trigger-hover-bg,var(--accent))]",
          "data-[state=active]:bg-[color:var(--mdeditor-tabs-trigger-active-bg,var(--card))] data-[state=active]:text-[color:var(--mdeditor-tabs-trigger-active-fg,var(--foreground))]",
          "data-[state=active]:shadow-[var(--mdeditor-tabs-trigger-shadow,var(--shadow-sm))] data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--mdeditor-tabs-list-border,var(--border))]",
          "data-[state=active]:z-10",
        ],
        newButton:
          "rounded-full bg-transparent",
      },
      underline: {
        list: "border-b border-[color:var(--mdeditor-tabs-list-border,var(--border))] gap-6 px-2",
        trigger: [
          "py-2.5",
          "text-[color:var(--mdeditor-tabs-trigger-fg,var(--muted-foreground))]",
          "relative",
          "hover:text-[color:var(--mdeditor-tabs-trigger-hover-fg,var(--foreground))]",
          "data-[state=active]:text-[color:var(--mdeditor-tabs-trigger-active-fg,var(--foreground))]",
          // Animated underline
          "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[color:var(--mdeditor-tabs-trigger-active-bg,var(--primary))] after:scale-x-0 after:origin-left after:transition-transform after:duration-300 after:ease-[cubic-bezier(0.2,0.8,0.2,1)] data-[state=active]:after:scale-x-100",
        ],
        newButton: "border border-dashed border-[color:var(--mdeditor-tabs-actions-border,var(--border))] hover:border-solid rounded-full w-7 h-7 mb-1.5",
        content: "border-0",
      },
      pills: {
        list: "bg-[color:var(--mdeditor-tabs-list-bg,var(--secondary))] p-1.5 rounded-[calc(var(--mdeditor-tabs-radius,0.5rem)+0.25rem)] gap-1.5 shadow-inner",
        trigger: [
          "py-2 px-3 rounded-[var(--mdeditor-tabs-trigger-radius,0.5rem)]",
          "text-[color:var(--mdeditor-tabs-trigger-fg,var(--muted-foreground))]",
          "hover:bg-[color:var(--mdeditor-tabs-trigger-hover-bg,var(--accent))] hover:text-[color:var(--mdeditor-tabs-trigger-hover-fg,var(--foreground))]",
          "data-[state=active]:bg-[color:var(--mdeditor-tabs-trigger-active-bg,var(--card))] data-[state=active]:text-[color:var(--mdeditor-tabs-trigger-active-fg,var(--foreground))]",
          "data-[state=active]:shadow-[var(--mdeditor-tabs-trigger-shadow,var(--shadow-sm))] data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--mdeditor-tabs-list-border,var(--border))]",
        ],
        newButton: "bg-transparent",
      },
      boxed: {
        list: "border border-[color:var(--mdeditor-tabs-list-border,var(--border))] bg-[color:var(--mdeditor-tabs-list-bg,var(--secondary))] rounded-[calc(var(--mdeditor-tabs-radius,0.5rem)+0.25rem)] p-1.5 gap-1.5 shadow-sm",
        trigger: [
          "py-2 px-3 rounded-[var(--mdeditor-tabs-trigger-radius,0.5rem)]",
          "border border-transparent",
          "text-[color:var(--mdeditor-tabs-trigger-fg,var(--muted-foreground))]",
          "hover:bg-[color:var(--mdeditor-tabs-trigger-hover-bg,var(--accent))] hover:text-[color:var(--mdeditor-tabs-trigger-hover-fg,var(--foreground))]",
          "data-[state=active]:bg-[color:var(--mdeditor-tabs-trigger-active-bg,var(--card))] data-[state=active]:border-[color:var(--mdeditor-tabs-list-border,var(--border))]",
          "data-[state=active]:text-[color:var(--mdeditor-tabs-trigger-active-fg,var(--foreground))] data-[state=active]:shadow-[var(--mdeditor-tabs-trigger-shadow,var(--shadow-sm))]",
        ],
        newButton: "border border-dashed border-[color:var(--mdeditor-tabs-actions-border,var(--border))] hover:border-solid",
      },
      minimal: {
        list: "gap-6 px-2",
        trigger: [
          "py-2",
          "text-[color:var(--mdeditor-tabs-trigger-fg,var(--muted-foreground))] opacity-70",
          "hover:opacity-100 hover:text-[color:var(--mdeditor-tabs-trigger-hover-fg,var(--foreground))]",
          "data-[state=active]:text-[color:var(--mdeditor-tabs-trigger-active-fg,var(--foreground))] data-[state=active]:opacity-100",
          "data-[state=active]:font-medium",
        ],
        newButton: "hover:bg-[color:var(--mdeditor-tabs-menu-item-hover-bg,var(--accent))] rounded-full w-7 h-7",
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
      inside: { closeButton: "ml-1.5" },
      outside: { closeButton: "absolute -right-1 -top-1" },
      overlap: {
        closeButton: "absolute right-1 top-1/2 -translate-y-1/2",
      },
    },
    closeShape: {
      circle: { closeButton: "rounded-full p-0.5 h-4 w-4" },
      square: { closeButton: "rounded-[var(--mdeditor-tabs-actions-radius,0.25rem)] p-0.5 h-4 w-4" },
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
    // Chrome × horizontal: items align to bottom
    {
      variant: "chrome",
      orientation: "horizontal",
      class: { list: "items-end pb-0" },
    },
    // Chrome × vertical: adjust for vertical usage
    {
      variant: "chrome",
      orientation: "vertical",
      class: {
        list: "rounded-t-none rounded-l-[calc(var(--mdeditor-tabs-radius,0.5rem)+0.25rem)] border-b-0 border-r flex-col items-end pb-1.5 pr-0",
        trigger: [
          "rounded-t-none rounded-l-[var(--mdeditor-tabs-trigger-radius,0.5rem)]",
          "-mr-[1px] mb-0",
          "before:rounded-t-none before:rounded-l-lg",
          "after:bottom-0 after:top-0 after:right-0 after:left-auto after:w-[1.5px] after:h-auto",
          "[&[data-state=active]]:before:shadow-[0_-4px_0_0_var(--mdeditor-tabs-panel-bg,var(--card))] [&[data-state=active]]:before:-top-2 [&[data-state=active]]:before:right-0 [&[data-state=active]]:before:left-auto [&[data-state=active]]:before:rounded-br-[var(--mdeditor-tabs-trigger-radius,0.5rem)] [&[data-state=active]]:before:w-2 [&[data-state=active]]:before:h-2",
          "[&[data-state=active]]:after:shadow-[0_4px_0_0_var(--mdeditor-tabs-panel-bg,var(--card))] [&[data-state=active]]:after:-bottom-2 [&[data-state=active]]:after:right-0 [&[data-state=active]]:after:left-auto [&[data-state=active]]:after:rounded-tr-[var(--mdeditor-tabs-trigger-radius,0.5rem)] [&[data-state=active]]:after:w-2 [&[data-state=active]]:after:h-2",
        ],
        content: "-ml-[1px] -mt-0 rounded-l-none rounded-b-[var(--mdeditor-tabs-panel-radius,0.5rem)] rounded-tr-[var(--mdeditor-tabs-panel-radius,0.5rem)]",
      },
    },
    // Capsule × horizontal: stretch items
    {
      variant: "capsule",
      orientation: "horizontal",
      class: { list: "items-center" },
    },
    // Capsule × vertical: full rounding
    {
      variant: "capsule",
      orientation: "vertical",
      class: {
        list: "rounded-3xl flex-col",
        trigger: [
          "rounded-full",
          "data-[state=active]:rounded-full",
        ],
      },
    },
    // Underline × vertical: border on right instead of bottom
    {
      variant: "underline",
      orientation: "vertical",
      class: {
        list: "border-b-0 border-r border-[color:var(--mdeditor-tabs-list-border,var(--border))] gap-2 py-2",
        trigger: [
          "py-2 px-3",
          "after:bottom-0 after:top-0 after:right-0 after:left-auto after:w-[2px] after:h-full after:scale-x-100 after:scale-y-0 data-[state=active]:after:scale-y-100 after:origin-top",
        ],
      },
    },
  ],
  defaultVariants: {
    variant: "chrome",
    orientation: "horizontal",
    closePosition: "inside",
    closeShape: "circle",
    closeVisibility: "hover",
  },
})

export type TabSystemVariantProps = Parameters<typeof tabSystem>[0]
