"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { TabSystem, TabContent } from "./TabSystem"
import { SettingsDropdown } from "./settings-dropdown"
import type { TabItem, TabVariant } from "./types"

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
        tab: { id: 'overview', label: 'Overview' },
        panel: (
          <DemoPanel
            eyebrow="Import proof"
            title="Imported from @braisenly/ui/tab-system"
            body="This Next.js page imports the packaged TabSystem family through the published ui subpath and renders it with token-backed chrome."
          />
        ),
      },
      {
        tab: { id: 'tokens', label: 'Tokens' },
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
        tab: { id: 'composed', label: 'Composed API' },
        panel: (
          <DemoPanel
            eyebrow="Composed components"
            title="Reusable assembly, thin wrapper"
            body="The exported family separates core wrappers, primitives, behaviors, and composed assemblies so another renderer stack can reuse the visual contract later."
          />
        ),
        closable: true,
      },
    ],
    []
  )

  const [tabData, setTabData] = useState(initialTabs)
  const [activeTab, setActiveTab] = useState(initialTabs[0]?.tab.id)
  const [newTabCount, setNewTabCount] = useState(1)
  const [variant, setVariant] = useState<TabVariant>("chrome")

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
      tab: { id, label },
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
        <SettingsDropdown
          currentVariant={variant}
          onVariantChange={setVariant}
        />
      </div>

      <section className="rounded-[calc(var(--tabsys-radius,0.5rem)+0.75rem)] border border-border/70 bg-card/70 p-6 shadow-sm backdrop-blur-sm">
        <TabSystem
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onDeleteTab={handleClose}
          onNewTab={handleNewTab}
          variant={variant}
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
