"use client"

import { useCallback, useMemo, useState } from "react"
import { Braces, Code2, FileText, LayoutTemplate, Workflow } from "lucide-react"
import {
  TabPanel,
  TabSystem,
  type NewTabMenuItem,
  type TabItem,
} from "@braisenly/ui/tab-system"

type HarnessKind = "markdown" | "mermaid" | "html" | "react"

interface HarnessTab {
  tab: TabItem
  kind: HarnessKind
  description: string
}

const KIND_META = {
  markdown: { label: "Markdown", icon: FileText, color: "oklch(0.7 0.14 230)", suffix: ".md" },
  mermaid: { label: "Mermaid", icon: Workflow, color: "oklch(0.72 0.15 145)", suffix: ".mmd" },
  html: { label: "HTML", icon: Code2, color: "oklch(0.68 0.17 45)", suffix: ".html" },
  react: { label: "React", icon: Braces, color: "oklch(0.7 0.13 285)", suffix: ".tsx" },
} satisfies Record<HarnessKind, {
  label: string
  icon: typeof FileText
  color: string
  suffix: string
}>

function createTab(
  id: string,
  label: string,
  kind: HarnessKind,
  description: string,
  options: Pick<TabItem, "disabled" | "closable"> = {},
): HarnessTab {
  const meta = KIND_META[kind]
  const Icon = meta.icon
  return {
    tab: {
      id,
      label,
      icon: <Icon className="h-3.5 w-3.5" />,
      color: meta.color,
      ...options,
    },
    kind,
    description,
  }
}

const INITIAL_TABS: HarnessTab[] = [
  createTab("readme", "README.md", "markdown", "Controlled selection and panel composition.", { closable: false }),
  createTab("notes", "Notes.md", "markdown", "Double-click this label to exercise inline rename."),
  createTab("diagram", "Architecture.mmd", "mermaid", "Pointer, touch, and keyboard drag all reorder the same data."),
  createTab("preview", "Preview.html", "html", "The split add control can create typed tabs."),
  createTab("component", "InteractiveComponentWithALongName.tsx", "react", "Long labels clamp and overflow without widening the page."),
  createTab("disabled", "Disabled.md", "markdown", "Disabled tabs remain visible but cannot activate or drag.", { disabled: true }),
]

export function TabbarHarness() {
  const [items, setItems] = useState(INITIAL_TABS)
  const [activeTab, setActiveTab] = useState(INITIAL_TABS[0].tab.id)
  const [nextId, setNextId] = useState(1)

  const tabs = useMemo(
    () => items.map(({ tab }) => ({ ...tab, closable: items.length > 1 && tab.closable !== false })),
    [items],
  )

  const addTab = useCallback((kind: HarnessKind) => {
    const meta = KIND_META[kind]
    const id = `${kind}-${nextId}`
    const label = `${meta.label} ${nextId}${meta.suffix}`
    const next = createTab(id, label, kind, `New ${meta.label} tab created inside the isolated harness.`)

    setItems((current) => [...current, next])
    setActiveTab(id)
    setNextId((value) => value + 1)
  }, [nextId])

  const menuItems = useMemo<NewTabMenuItem[]>(
    () => (Object.keys(KIND_META) as HarnessKind[]).map((kind) => {
      const meta = KIND_META[kind]
      const Icon = meta.icon
      return {
        id: kind,
        label: `New ${meta.label}`,
        icon: <Icon className="h-4 w-4" />,
        onSelect: () => addTab(kind),
      }
    }),
    [addTab],
  )

  const deleteTab = useCallback((tabId: string) => {
    setItems((current) => {
      if (current.length <= 1) return current
      const removedIndex = current.findIndex(({ tab }) => tab.id === tabId)
      const next = current.filter(({ tab }) => tab.id !== tabId)

      if (activeTab === tabId) {
        const fallback = next[Math.min(Math.max(removedIndex, 0), next.length - 1)]
        setActiveTab(fallback.tab.id)
      }

      return next
    })
  }, [activeTab])

  const renameTab = useCallback((tabId: string, label: string) => {
    const nextLabel = label.trim()
    if (!nextLabel) return
    setItems((current) => current.map((item) => (
      item.tab.id === tabId ? { ...item, tab: { ...item.tab, label: nextLabel } } : item
    )))
  }, [])

  const reorderTabs = useCallback((tabIds: string[]) => {
    setItems((current) => {
      const byId = new Map(current.map((item) => [item.tab.id, item]))
      return tabIds.map((id) => byId.get(id)).filter((item): item is HarnessTab => Boolean(item))
    })
  }, [])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-start px-3 py-12 sm:px-6">
      <section className="w-full min-w-0" aria-label="Tabbar development harness">
        <h1 className="sr-only">Tabbar isolation harness</h1>
        <TabSystem
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNewTab={() => addTab("markdown")}
          newTabMenuItems={menuItems}
          onDeleteTab={deleteTab}
          onRenameTab={renameTab}
          onReorderTabs={reorderTabs}
          variant="capsule"
          skin="editor"
          density="compact"
          showNewButton
          showCloseButtons
          className="w-full min-w-0"
        >
          {items.map((item) => (
            <TabPanel key={item.tab.id} value={item.tab.id}>
              <div
                data-testid="tab-content-shell"
                className="min-h-64 border border-[color:var(--tabs-bar-border)] bg-[color:var(--tab-active-bg)] p-6"
              >
                <div className="flex items-center gap-3">
                  <LayoutTemplate className="h-5 w-5 text-[color:var(--tab-accent)]" aria-hidden="true" />
                  <p className="m-0 font-medium">{item.tab.label}</p>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--tab-text)]">
                  {item.description}
                </p>
              </div>
            </TabPanel>
          ))}
        </TabSystem>
      </section>
    </main>
  )
}
