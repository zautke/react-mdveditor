"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { TabSystem, TabContent } from "./TabSystem"
import { SettingsDropdown } from "./settings-dropdown"
import type { TabDensity, TabItem, TabSkin, TabVariant } from "./types"

function DemoPanel({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="rounded-[calc(var(--tabsys-radius,0.5rem)+0.125rem)] border border-[color:var(--tabsys-panel-border,var(--border))] bg-[color:var(--tabsys-panel-bg,var(--background))] p-6 text-[color:var(--tabsys-panel-fg,var(--foreground))] shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
      <div className="mt-3 space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}

export function PoachedTabSystemDemo() {
  const initialTabs = useMemo<{ tab: TabItem; panel: React.ReactNode; closable?: boolean }[]>(
    () => [
      {
        tab: { id: 'overview', label: 'Overview', color: 'oklch(0.64 0.16 35)' },
        panel: (
          <DemoPanel
            eyebrow="Import proof"
            title="Imported from @braisenly/ui/tab-system"
            body="This Next.js page imports the packaged TabSystem family through the published ui subpath and renders it with token-backed chrome."
          />
        ),
      },
      {
        tab: { id: 'tokens', label: 'Tokens', color: 'oklch(0.65 0.14 235)' },
        panel: (
          <DemoPanel
            eyebrow="Design tokens"
            title="Tabsys visual contract"
            body="The rail, trigger, panel, and actions all inherit the canonical --tabsys-* token contract from @braisenly/design-tokens."
          />
        ),
        closable: true,
      },
      {
        tab: { id: 'composed', label: 'Composed API With A Long Label', color: 'oklch(0.68 0.15 145)' },
        panel: (
          <DemoPanel
            eyebrow="Composed components"
            title="Reusable assembly, thin wrapper"
            body="The exported family separates core wrappers, primitives, behaviors, and composed assemblies so another renderer stack can reuse the visual contract later."
          />
        ),
        closable: true,
      },
      {
        tab: { id: 'disabled', label: 'Disabled', disabled: true },
        panel: (
          <DemoPanel
            eyebrow="Disabled state"
            title="Disabled tabs keep token styling"
            body="The disabled trigger remains in the roving tab list but cannot be activated."
          />
        ),
      },
    ],
    []
  )

  const [tabData, setTabData] = useState(initialTabs)
  const [activeTab, setActiveTab] = useState(initialTabs[0]?.tab.id)
  const [newTabCount, setNewTabCount] = useState(1)
  const [variant, setVariant] = useState<TabVariant>("chrome")
  const [skin, setSkin] = useState<TabSkin>("editor")
  const [density, setDensity] = useState<TabDensity>("compact")

  const tabs: TabItem[] = tabData.map(t => t.tab)

  const handleClose = (tabId: string) => {
    setTabData((currentTabs) => {
      const nextTabs = currentTabs.filter((t) => t.tab.id !== tabId)

      if (nextTabs.length === 0) {
        return currentTabs
      }

      if (activeTab === tabId) {
        const closedIndex = currentTabs.findIndex((t) => t.tab.id === tabId)
        const fallbackTab = nextTabs[Math.max(0, Math.min(closedIndex, nextTabs.length - 1))]
        setActiveTab(fallbackTab?.tab.id)
      }

      return nextTabs
    })
  }

  const handleNewTab = () => {
    const id = `new-tab-${newTabCount}`
    const label = `New ${newTabCount}`

    const nextTab = {
      tab: { id, label, color: 'oklch(0.72 0.14 80)' },
      closable: true,
      panel: (
        <DemoPanel
          eyebrow="Runtime interaction"
          title={`Generated tab ${newTabCount}`}
          body="The new-tab action comes from the packaged composed TabSystem wrapper, rendered inside the Next demo application."
        />
      ),
    }

    setTabData((currentTabs) => [...currentTabs, nextTab])
    setActiveTab(id)
    setNewTabCount((count) => count + 1)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Poached TabSystem Demo</h1>
          <p className="text-muted-foreground">
            Adapted from the Next.js worktree to run on our implementation.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SettingsDropdown
            currentVariant={variant}
            onVariantChange={setVariant}
          />
          <label className="space-y-1 text-sm font-medium">
            <span className="block">Skin</span>
            <select
              value={skin}
              onChange={(event) => setSkin(event.target.value as TabSkin)}
              className="block rounded-md border bg-background px-3 py-2"
            >
              {(["editor", "chrome", "quiet", "contrast"] satisfies TabSkin[]).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span className="block">Density</span>
            <select
              value={density}
              onChange={(event) => setDensity(event.target.value as TabDensity)}
              className="block rounded-md border bg-background px-3 py-2"
            >
              {(["compact", "comfortable"] satisfies TabDensity[]).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <section className="rounded-[calc(var(--tabsys-radius,0.5rem)+0.75rem)] border border-border/70 bg-card/70 p-6 shadow-sm backdrop-blur-sm">
        <TabSystem
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onDeleteTab={handleClose}
          onNewTab={handleNewTab}
          variant={variant}
          skin={skin}
          density={density}
          showNewButton={true}
          showCloseButtons={true}
        >
          {tabData.map((t) => (
            <TabContent key={t.tab.id} value={t.tab.id}>
              <div className="pt-4">
                {t.panel}
              </div>
            </TabContent>
          ))}
        </TabSystem>
      </section>
    </div>
  )
}
