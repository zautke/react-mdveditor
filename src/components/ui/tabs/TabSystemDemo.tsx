"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { FileText, Settings, User, Bell, Home } from "lucide-react"

import { TabSystem, TabContent } from "./TabSystem"
import type { TabItem, TabVariant, TabOrientation } from "./types"

/**
 * TabSystemDemo - Interactive demonstration of all TabSystem features
 */
export function TabSystemDemo() {
  // Demo state
  const [variant, setVariant] = useState<TabVariant>("chrome")
  const [orientation, setOrientation] = useState<TabOrientation>("horizontal")
  const [showCloseButtons, setShowCloseButtons] = useState(true)
  const [showNewButton, setShowNewButton] = useState(true)

  // Tab data
  const [tabs, setTabs] = useState<TabItem[]>([
    { id: "home", label: "Home", icon: <Home className="h-4 w-4" /> },
    { id: "documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ])
  const [activeTab, setActiveTab] = useState("home")

  const handleNewTab = useCallback(() => {
    const newId = `tab-${Date.now()}`
    setTabs((prev) => [
      ...prev,
      {
        id: newId,
        label: `New Tab ${prev.length + 1}`,
        icon: <Bell className="h-4 w-4" />,
      },
    ])
    setActiveTab(newId)
  }, [])

  const handleDeleteTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== tabId)
        // If we're deleting the active tab, switch to the first remaining tab
        if (tabId === activeTab && filtered.length > 0) {
          setActiveTab(filtered[0].id)
        }
        return filtered
      })
    },
    [activeTab]
  )

  const variants: TabVariant[] = ["chrome", "underline", "pills", "boxed", "minimal"]

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">TabSystem Demo</h1>
        <p className="text-muted-foreground">
          Interactive demo showcasing all 5 tab variants with animations.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="space-y-1">
          <label className="text-sm font-medium">Variant</label>
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as TabVariant)}
            className="block w-32 px-3 py-2 rounded-md border bg-background"
          >
            {variants.map((v) => (
              <option key={v} value={v}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Orientation</label>
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as TabOrientation)}
            className="block w-32 px-3 py-2 rounded-md border bg-background"
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </div>

        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showCloseButtons}
              onChange={(e) => setShowCloseButtons(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Close Buttons</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showNewButton}
              onChange={(e) => setShowNewButton(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">New Tab Button</span>
          </label>
        </div>
      </div>

      {/* Main Demo */}
      <div
        className={`border rounded-lg p-4 bg-background ${
          orientation === "vertical" ? "min-h-[400px]" : ""
        }`}
      >
        <TabSystem
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant={variant}
          orientation={orientation}
          showNewButton={showNewButton}
          showCloseButtons={showCloseButtons}
          onNewTab={handleNewTab}
          onDeleteTab={handleDeleteTab}
          closeButtonVisibility="hover"
          closeButtonShape="circle"
          closeButtonPosition="inside"
        >
          {tabs.map((tab) => (
            <TabContent key={tab.id} value={tab.id}>
              <div className="p-6 bg-muted/30 rounded-lg mt-2">
                <h2 className="text-xl font-semibold mb-2">{tab.label}</h2>
                <p className="text-muted-foreground">
                  This is the content for the "{tab.label}" tab. Try adding new tabs
                  or closing existing ones to see the smooth animations!
                </p>
              </div>
            </TabContent>
          ))}
        </TabSystem>
      </div>

      {/* All Variants Preview */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">All Variants</h2>
        <div className="grid gap-6">
          {variants.map((v) => (
            <div key={v} className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3 capitalize">{v}</h3>
              <TabSystem
                tabs={[
                  { id: "1", label: "Tab One" },
                  { id: "2", label: "Tab Two" },
                  { id: "3", label: "Tab Three" },
                ]}
                activeTab="1"
                onTabChange={() => {}}
                variant={v}
              >
                <TabContent value="1">
                  <div className="p-4 text-sm text-muted-foreground">
                    Content preview for {v} variant
                  </div>
                </TabContent>
              </TabSystem>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TabSystemDemo
