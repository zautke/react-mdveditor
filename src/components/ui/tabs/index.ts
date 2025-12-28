/**
 * TabSystem - Multi-variant animated tab component
 *
 * @example
 * ```tsx
 * import { TabSystem, TabContent } from "@/components/ui/tabs"
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
 *     >
 *       <TabContent value="1">Content 1</TabContent>
 *       <TabContent value="2">Content 2</TabContent>
 *     </TabSystem>
 *   )
 * }
 * ```
 */

export { TabSystem, TabContent } from "./TabSystem"
export type {
  TabSystemProps,
  TabItem,
  TabOrientation,
  TabVariant,
  CloseButtonPosition,
  CloseButtonShape,
  CloseButtonVisibility,
  TabGroupConfig,
  TabGroup,
} from "./types"
export {
  tabListVariants,
  tabTriggerVariants,
  closeButtonVariants,
  newTabButtonVariants,
} from "./tab-variants"
