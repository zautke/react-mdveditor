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
    root: "flex min-h-0 [--tab-motion-duration:var(--tab-motion-duration-standard)] [--tab-motion-ease:var(--tab-motion-ease-standard)]",
    bar: "flex items-center bg-[color:var(--tabs-bar-bg)] text-[color:var(--tab-text)]",
    list: "flex gap-0.5",
    trigger: [
      "relative inline-flex items-center justify-center gap-2",
      "h-[var(--tab-control-height)] min-h-[var(--tab-control-height)] text-sm font-medium",
      "border border-transparent transition-[background,border-color,box-shadow,color,opacity,transform]",
      "duration-[var(--tab-motion-duration)] ease-[var(--tab-motion-ease)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tab-focus-ring)] focus-visible:ring-offset-[var(--tab-focus-offset)] focus-visible:ring-offset-[color:var(--tab-focus-offset-color)]",
      "disabled:pointer-events-none disabled:bg-[color:var(--tab-disabled-bg)] disabled:text-[color:var(--tab-disabled-text)] disabled:opacity-100",
      "select-none cursor-pointer",
    ],
    tabName: "flex-1 flex items-center justify-center min-w-0",
    closeButton: [
      "inline-flex items-center justify-center",
      "text-[color:var(--tab-action-fg)] transition-[background,color,opacity]",
      "duration-[var(--tab-motion-duration)] ease-[var(--tab-motion-ease)]",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--tab-focus-ring)]",
      "hover:bg-[color:var(--tab-close-hover-bg)] hover:text-[color:var(--tab-close-hover-fg)]",
    ],
    newButton: [
      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
      "text-[color:var(--tab-action-fg)] transition-colors",
      "duration-[var(--tab-motion-duration)] ease-[var(--tab-motion-ease)]",
      "hover:bg-[color:var(--tab-hover-bg)] hover:text-[color:var(--tab-active-text)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tab-focus-ring)]",
    ],
    scrollArrow: [
      "inline-flex items-center justify-center h-full w-6",
      "text-[color:var(--tab-action-fg)] transition-[background,color,opacity]",
      "duration-[var(--tab-motion-duration)] ease-[var(--tab-motion-ease)]",
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
        list: "bg-[color:var(--tabs-list-bg)] p-1 rounded-t-lg relative border border-[color:var(--tabs-bar-border)] border-t-[color:var(--tabs-bar-border-strong)] border-r-[color:var(--tabs-bar-border-strong)] backdrop-blur-md shadow-[var(--tabs-list-shadow)] overflow-visible",
        trigger: [
          "bg-[color:var(--tab-bg)] text-[color:var(--tab-text)] border-[color:var(--tab-border)]",
          "rounded-t-lg",
          "-mb-px",
          "[clip-path:polygon(8px_0%,calc(100%-8px)_0%,100%_100%,0%_100%)]",
          "-ml-2 first:ml-0",
          "hover:bg-[color:var(--tab-hover-bg)] hover:border-[color:var(--tab-hover-border)]",
          "data-[state=active]:bg-[color:var(--tab-active-bg)] data-[state=active]:text-[color:var(--tab-active-text)] data-[state=active]:border-[color:var(--tab-active-border)]",
          "data-[state=active]:shadow-[var(--tab-shadow)]",
          "data-[state=active]:z-10",
        ],
        newButton:
          "bg-[color:var(--tab-bg)] hover:bg-[color:var(--tab-hover-bg)]",
        content: "border-t border-[color:var(--tabs-bar-border)]",
      },
      capsule: {
        list: "bg-[color:var(--tabs-list-bg)] px-1 py-0 h-full rounded-full relative border border-[color:var(--tabs-bar-border)] backdrop-blur-md shadow-[var(--tabs-list-shadow)] gap-1.5 overflow-visible",
        trigger: [
          "py-0 h-full border-[color:var(--tab-border)]",
          "bg-transparent text-[color:var(--tab-text)]",
          "rounded-full",
          "shrink grow-0 min-w-0",
          "hover:bg-[color:var(--tab-hover-bg)] hover:border-[color:var(--tab-hover-border)]",
          "data-[state=active]:rounded-t-full data-[state=active]:rounded-b-none",
          "data-[state=active]:bg-[color:var(--tab-active-bg)] data-[state=active]:text-[color:var(--tab-active-text)] data-[state=active]:border-[color:var(--tab-active-border)]",
          "data-[state=active]:shadow-[var(--tab-shadow)]",
          "data-[state=active]:z-10",
        ],
        newButton: "rounded-full",
      },
      underline: {
        list: "border-b border-[color:var(--tabs-bar-border)] gap-4",
        trigger: [
          "text-[color:var(--tab-text)]",
          "border-b-2 border-transparent -mb-px",
          "hover:text-[color:var(--tab-active-text)] hover:border-[color:var(--tab-indicator-muted)]",
          "data-[state=active]:text-[color:var(--tab-active-text)] data-[state=active]:border-[color:var(--tab-indicator-active)]",
        ],
        newButton: "border border-dashed border-[color:var(--tabs-bar-border)] hover:border-solid bg-[color:var(--tab-bg)]",
        content: "border-t border-transparent",
      },
      pills: {
        list: "bg-[color:var(--tabs-list-bg)] p-1 rounded-lg gap-1",
        trigger: [
          "rounded-md border-[color:var(--tab-border)]",
          "text-[color:var(--tab-text)]",
          "hover:bg-[color:var(--tab-hover-bg)] hover:text-[color:var(--tab-active-text)] hover:border-[color:var(--tab-hover-border)]",
          "data-[state=active]:bg-[color:var(--tab-active-bg)] data-[state=active]:text-[color:var(--tab-active-text)] data-[state=active]:border-[color:var(--tab-active-border)]",
          "data-[state=active]:shadow-[var(--tab-shadow)]",
        ],
        newButton: "bg-[color:var(--tab-bg)]",
      },
      boxed: {
        list: "border border-[color:var(--tabs-bar-border)] rounded-lg p-1 gap-1 bg-[color:var(--tabs-list-bg)]",
        trigger: [
          "rounded-md",
          "border border-[color:var(--tab-border)]",
          "text-[color:var(--tab-text)]",
          "hover:bg-[color:var(--tab-hover-bg)] hover:text-[color:var(--tab-active-text)] hover:border-[color:var(--tab-hover-border)]",
          "data-[state=active]:bg-[color:var(--tab-active-bg)] data-[state=active]:border-[color:var(--tab-active-border)]",
          "data-[state=active]:text-[color:var(--tab-active-text)] data-[state=active]:shadow-sm",
        ],
        newButton: "border border-dashed border-[color:var(--tabs-bar-border)] hover:border-solid bg-[color:var(--tab-bg)]",
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
        newButton: "bg-transparent",
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
    // Chrome × horizontal: items align to bottom, no bottom padding
    {
      variant: "chrome",
      orientation: "horizontal",
      class: { list: "items-end pb-0" },
    },
    // Chrome × vertical: adjust clip-path and rounding
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
    // Capsule × horizontal: stretch items
    {
      variant: "capsule",
      orientation: "horizontal",
      class: { list: "items-stretch" },
    },
    // Capsule × vertical: full rounding with right-side flat for active
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
    // Underline × vertical: border on right instead of bottom
    {
      variant: "underline",
      orientation: "vertical",
      class: {
        list: "border-b-0 border-r border-[color:var(--tabs-bar-border)] gap-1",
        trigger: [
          "border-b-0 border-r-2 -mr-px mb-0",
          "data-[state=active]:border-b-0 data-[state=active]:border-r-[color:var(--tab-indicator-active)]",
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
