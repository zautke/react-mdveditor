/**
 * Complete controlled tab system for application and editor surfaces.
 * Consumers own tab state; this package owns interaction, accessibility,
 * animation, overflow, and presentation behavior.
 */

export { TabSystem, TabPanel, TabContent } from "./tab-system"

export { DraggableTab } from "./draggable-tab"
export type { DraggableTabProps } from "./draggable-tab"
export { DraggableTab as SortableTab } from "./draggable-tab"
export type { DraggableTabProps as SortableTabProps } from "./draggable-tab"

export { TabName } from "./tab-name"
export { TabCloseButton } from "./tab-close-button"
export type { TabCloseButtonProps } from "./tab-close-button"
export { TabDragOverlay } from "./tab-drag-overlay"
export type { TabDragOverlayProps } from "./tab-drag-overlay"
export { TabDragOverlay as TabDragOverlayContent } from "./tab-drag-overlay"
export type { TabDragOverlayProps as TabOverlayProps } from "./tab-drag-overlay"
export { NewTabButton } from "./new-tab-button"
export type { NewTabButtonProps } from "./new-tab-button"
export { NewTabDropdown } from "./new-tab-dropdown"
export type { NewTabDropdownProps } from "./new-tab-dropdown"
export { NewTabDropdown as NewTabControl } from "./new-tab-dropdown"
export type { NewTabDropdownProps as NewTabControlProps } from "./new-tab-dropdown"
export { ScrollArrow } from "./scroll-arrow"
export type { ScrollArrowProps } from "./scroll-arrow"

export { tabSystem } from "./tab-system.variants"
export type { TabSystemVariantProps } from "./tab-system.variants"

export type {
  TabSystemProps,
  TabItem,
  TabOrientation,
  TabVariant,
  TabSkin,
  TabDensity,
  TabMotion,
  TabSystemSlot,
  CloseButtonPosition,
  CloseButtonShape,
  CloseButtonVisibility,
  NewTabMenuItem,
  TabGroupConfig,
  TabGroup,
  TabAnimationState,
} from "./types"

export { useTabOverflow } from "./hooks/use-tab-overflow"
export type { UseTabOverflowReturn } from "./hooks/use-tab-overflow"
export { useWheelScroll } from "./hooks/use-wheel-scroll"
export type { UseWheelScrollOptions } from "./hooks/use-wheel-scroll"
export { useDragReorder } from "./hooks/use-drag-reorder"
export type { UseDragReorderOptions, UseDragReorderReturn } from "./hooks/use-drag-reorder"

export { IconLabel } from "../icon-label"
export type { IconLabelPosition } from "../icon-label"
