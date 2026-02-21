/**
 * @braisenly/ui/tab-system
 *
 * Multi-variant animated tab component with drag-and-drop reordering,
 * responsive width clamping, scroll overflow, and doctype color support.
 *
 * @example
 * ```tsx
 * import { TabSystem, TabContent } from "@braisenly/ui/tab-system"
 *
 * function MyTabs() {
 *   const [tabs, setTabs] = useState([
 *     { id: "1", label: "Tab 1" },
 *     { id: "2", label: "Tab 2" },
 *   ])
 *   const [activeTab, setActiveTab] = useState("1")
 *
 *   return (
 *     <TabSystem
 *       tabs={tabs}
 *       activeTab={activeTab}
 *       onTabChange={setActiveTab}
 *       variant="chrome"
 *       showNewButton
 *       showCloseButtons
 *       onNewTab={() => setTabs([...tabs, { id: Date.now().toString(), label: "New" }])}
 *       onDeleteTab={(id) => setTabs(tabs.filter(t => t.id !== id))}
 *       onReorderTabs={(newOrder) => setTabs(newOrder.map(id => tabs.find(t => t.id === id)!))}
 *     >
 *       <TabContent value="1">Content 1</TabContent>
 *       <TabContent value="2">Content 2</TabContent>
 *     </TabSystem>
 *   )
 * }
 * ```
 */

// Main components
export { TabSystem, TabContent } from "./tab-system"
export { SortableTab } from "./sortable-tab"
export { TabName } from "./tab-name"
export { TabCloseButton } from "./tab-close-button"
export { TabDragOverlayContent } from "./tab-overlay"
export { NewTabButton, NewTabControl } from "./new-tab-control"
export { ScrollArrow } from "./scroll-arrow"

// Variant system
export { tabSystem } from "./tab-system.variants"
export type { TabSystemVariantProps } from "./tab-system.variants"

// Types
export type {
  TabSystemProps,
  TabItem,
  TabOrientation,
  TabVariant,
  CloseButtonPosition,
  CloseButtonShape,
  CloseButtonVisibility,
  NewTabMenuItem,
  TabGroupConfig,
  TabGroup,
  TabAnimationState,
} from "./types"

// Sub-component types
export type { SortableTabProps } from "./sortable-tab"
export type { TabCloseButtonProps } from "./tab-close-button"
export type { ScrollArrowProps } from "./scroll-arrow"
export type { TabOverlayProps } from "./tab-overlay"

// Hooks
export { useTabOverflow } from "./hooks/use-tab-overflow"
export type { UseTabOverflowReturn } from "./hooks/use-tab-overflow"
export { useWheelScroll } from "./hooks/use-wheel-scroll"
export type { UseWheelScrollOptions } from "./hooks/use-wheel-scroll"
export { useDragReorder } from "./hooks/use-drag-reorder"
export type { UseDragReorderOptions, UseDragReorderReturn } from "./hooks/use-drag-reorder"

// Shared utilities
export { IconLabel } from "../icon-label"
export type { IconLabelPosition } from "../icon-label"
