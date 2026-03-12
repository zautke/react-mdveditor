/**
 * TabSystem - Multi-variant animated tab component
 *
 * Architecture:
 *   TabSystem (orchestrator)
 *   ├── DraggableTab      — drag-sortable tab trigger with animations
 *   ├── TabDragOverlay    — ghost element during drag
 *   ├── NewTabButton      — simple "+" button (no menu)
 *   ├── NewTabDropdown    — split button with document-type menu
 *   ├── TabPanel          — content wrapper (role="tabpanel")
 *   ├── TabCloseButton    — per-tab close control
 *   ├── TabName           — responsive icon+label tab content
 *   └── ScrollArrow       — overflow scroll indicator
 *
 * @example
 * ```tsx
 * import { TabSystem, TabPanel } from "@/components/ui/tabs"
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
 *       <TabPanel value="1">Content 1</TabPanel>
 *       <TabPanel value="2">Content 2</TabPanel>
 *     </TabSystem>
 *   )
 * }
 * ```
 */

// ── Core components ────────────────────────────────────────────────
export { TabSystem, TabPanel, TabContent } from "./TabSystem"

// ── Sub-components ─────────────────────────────────────────────────
export { DraggableTab } from "./draggable-tab"
export { TabDragOverlay } from "./tab-drag-overlay"
export { NewTabButton } from "./new-tab-button"
export { NewTabDropdown } from "./new-tab-dropdown"
export { SettingsDropdown } from "./settings-dropdown"
export { TabName } from "./tab-name"
export { TabCloseButton } from "./tab-close-button"
export { ScrollArrow } from "./scroll-arrow"

// ── Styling ────────────────────────────────────────────────────────
export { tabSystem } from "./tab-system.variants"
export type { TabSystemVariantProps } from "./tab-system.variants"

// ── Types ──────────────────────────────────────────────────────────
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
} from "./types"

// ── Hooks ──────────────────────────────────────────────────────────
export { useTabOverflow } from "./hooks/use-tab-overflow"
export { useWheelScroll } from "./hooks/use-wheel-scroll"
export { useDragReorder } from "./hooks/use-drag-reorder"
