import { TabContent, TabSystem } from "./TabSystem"
import type {
  TabDensity,
  TabItem,
  TabMotion,
  TabSkin,
  TabSystemSlot,
} from "./types"

const tabs: TabItem[] = [
  { id: "readme", label: "README.md", color: "oklch(0.68 0.14 230)" },
  { id: "disabled", label: "Disabled", disabled: true },
]

const classNames: Partial<Record<TabSystemSlot, string>> = {
  root: "contract-root",
  list: "contract-list",
  trigger: "contract-trigger",
  newButton: "contract-new-button",
  scrollArrow: "contract-scroll-arrow",
  content: "contract-content",
}

const skin: TabSkin = "editor"
const density: TabDensity = "compact"
const motion: TabMotion = "reduced"

export const localTabSystemContract = (
  <TabSystem
    tabs={tabs}
    activeTab="readme"
    onTabChange={() => undefined}
    variant="chrome"
    skin={skin}
    density={density}
    motion={motion}
    classNames={classNames}
    showNewButton
    onNewTab={() => undefined}
    showCloseButtons
  >
    <TabContent value="readme">README</TabContent>
  </TabSystem>
)
