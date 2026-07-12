import { act, render, renderHook, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import * as tabSystemModule from "./index"
import { TabContent, TabSystem, useDragReorder, useWheelScroll } from "./index"
import type { NewTabMenuItem, TabItem } from "./types"

const tabs: TabItem[] = [
  { id: "readme", label: "README.md", closable: false },
  { id: "notes", label: "Notes.md", closable: true },
]

function renderTabs(overrides: Record<string, unknown> = {}) {
  const onTabChange = vi.fn()
  const onDeleteTab = vi.fn()
  const onRenameTab = vi.fn()
  const onNewTab = vi.fn()
  const menuItems: NewTabMenuItem[] = [
    { id: "markdown", label: "New Markdown", icon: <span>M</span>, onSelect: vi.fn() },
    { id: "disabled", label: "Disabled type", icon: <span>D</span>, onSelect: vi.fn(), disabled: true },
    { id: "html", label: "New HTML", icon: <span>H</span>, onSelect: vi.fn() },
  ]

  render(
    <TabSystem
      tabs={tabs}
      activeTab="readme"
      onTabChange={onTabChange}
      onDeleteTab={onDeleteTab}
      onRenameTab={onRenameTab}
      onNewTab={onNewTab}
      onReorderTabs={vi.fn()}
      newTabMenuItems={menuItems}
      showNewButton
      showCloseButtons
      variant="capsule"
      skin="editor"
      density="compact"
      {...overrides}
    >
      <TabContent value="readme">README content</TabContent>
      <TabContent value="notes">Notes content</TabContent>
    </TabSystem>,
  )

  return { menuItems, onDeleteTab, onNewTab, onRenameTab, onTabChange }
}

describe("packaged TabSystem parity", () => {
  it("exports TabPanel while preserving TabContent", () => {
    expect(tabSystemModule.TabPanel).toBe(tabSystemModule.TabContent)
  })

  it("exposes public variant, skin, density, and motion state", () => {
    renderTabs({ variant: "boxed", skin: "quiet", density: "comfortable", motion: "reduced" })
    const root = screen.getByRole("tablist", { name: "Document tabs" }).closest("[data-tab-skin]")

    expect(root).toHaveAttribute("data-tab-skin", "quiet")
    expect(root).toHaveAttribute("data-density", "comfortable")
    expect(root).toHaveAttribute("data-motion", "reduced")
  })

  it("selects tabs with roving keyboard focus", async () => {
    const user = userEvent.setup()
    const { onTabChange } = renderTabs()
    const readme = screen.getByRole("tab", { name: /README/ })

    act(() => readme.focus())
    await user.keyboard("{ArrowRight}")

    expect(screen.getByRole("tab", { name: /Notes/ })).toHaveFocus()
    expect(onTabChange).toHaveBeenCalledWith("notes")
  })

  it("keeps sortable presentation wrappers out of the tab order", () => {
    renderTabs()

    for (const tab of screen.getAllByRole("tab")) {
      const wrapper = tab.parentElement
      expect(wrapper).toHaveAttribute("role", "presentation")
      expect(wrapper).not.toHaveAttribute("tabindex")
      expect(wrapper).not.toHaveAttribute("aria-describedby")
    }
  })

  it("renames a tab on double click and Enter", async () => {
    const user = userEvent.setup()
    const { onRenameTab } = renderTabs()

    await user.dblClick(screen.getByText("Notes.md"))
    const input = screen.getByRole("textbox", { name: "Rename tab" })
    await user.clear(input)
    await user.type(input, "Research.md{Enter}")

    expect(onRenameTab).toHaveBeenCalledWith("notes", "Research.md")
  })

  it("cancels rename on Escape", async () => {
    const user = userEvent.setup()
    const { onRenameTab } = renderTabs()

    await user.dblClick(screen.getByText("Notes.md"))
    const input = screen.getByRole("textbox", { name: "Rename tab" })
    await user.clear(input)
    await user.type(input, "Discarded.md{Escape}")

    expect(onRenameTab).not.toHaveBeenCalled()
    expect(screen.getByText("Notes.md")).toBeVisible()
  })

  it("rejects a blank rename", async () => {
    const user = userEvent.setup()
    const { onRenameTab } = renderTabs()

    await user.dblClick(screen.getByText("Notes.md"))
    const input = screen.getByRole("textbox", { name: "Rename tab" })
    await user.clear(input)
    await user.type(input, "   {Enter}")

    expect(onRenameTab).not.toHaveBeenCalled()
    expect(screen.getByText("Notes.md")).toBeVisible()
  })

  it("closes a tab without activating it", async () => {
    const user = userEvent.setup()
    const { onDeleteTab, onTabChange } = renderTabs()

    await user.click(screen.getByRole("button", { name: "Close Notes.md tab" }))

    expect(onDeleteTab).toHaveBeenCalledWith("notes")
    expect(onTabChange).not.toHaveBeenCalled()
  })

  it("moves focus through enabled new-tab menu items", async () => {
    const user = userEvent.setup()
    renderTabs()

    await user.click(screen.getByRole("button", { name: "Choose new tab type" }))
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /New Markdown/ })).toHaveFocus()
    })

    await user.keyboard("{ArrowDown}")
    expect(screen.getByRole("menuitem", { name: /New HTML/ })).toHaveFocus()

    await user.keyboard("{Escape}")
    expect(screen.getByRole("button", { name: "Choose new tab type" })).toHaveFocus()
  })

  it("runs default add and blocks disabled typed-add items", async () => {
    const user = userEvent.setup()
    const { menuItems, onNewTab } = renderTabs()

    await user.click(screen.getByRole("button", { name: "Add new tab" }))
    expect(onNewTab).toHaveBeenCalledOnce()

    await user.click(screen.getByRole("button", { name: "Choose new tab type" }))
    const disabledItem = screen.getByRole("menuitem", { name: /Disabled type/ })
    expect(disabledItem).toBeDisabled()
    await user.click(disabledItem)
    expect(menuItems[1]?.onSelect).not.toHaveBeenCalled()
  })

  it("focuses the first enabled typed-add item when disabled items come first", async () => {
    const user = userEvent.setup()
    const disabledFirst: NewTabMenuItem[] = [
      { id: "disabled", label: "Disabled first", icon: <span>D</span>, onSelect: vi.fn(), disabled: true },
      { id: "enabled", label: "Enabled second", icon: <span>E</span>, onSelect: vi.fn() },
    ]
    renderTabs({ newTabMenuItems: disabledFirst })

    await user.click(screen.getByRole("button", { name: "Choose new tab type" }))

    await waitFor(() => expect(screen.getByRole("menuitem", { name: /Enabled second/ })).toHaveFocus())
    expect(screen.getByRole("menuitem", { name: /Disabled first/ })).toHaveAttribute("tabindex", "-1")
  })

  it("reorders during drag-over and clears active state on drag end", () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() =>
      useDragReorder({ items: ["readme", "notes"], onReorder }),
    )

    act(() => {
      result.current.handleDragStart({ active: { id: "readme" } } as never)
      result.current.handleDragOver({
        active: { id: "readme" },
        over: { id: "notes" },
      } as never)
    })

    expect(onReorder).toHaveBeenCalledWith(["notes", "readme"])
  })

  it("ignores invalid drops and clears state on cancel", () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() =>
      useDragReorder({ items: ["readme", "notes"], onReorder }),
    )

    act(() => {
      result.current.handleDragStart({ active: { id: "readme" } } as never)
      result.current.handleDragOver({ active: { id: "readme" }, over: null } as never)
      result.current.handleDragOver({ active: { id: "missing" }, over: { id: "notes" } } as never)
      result.current.handleDragCancel()
    })

    expect(onReorder).not.toHaveBeenCalled()
    expect(result.current.activeId).toBeNull()
  })

  it("restores the starting order when an optimistic drag is cancelled", () => {
    const onReorder = vi.fn()
    const { result, rerender } = renderHook(
      ({ items }) => useDragReorder({ items, onReorder }),
      { initialProps: { items: ["readme", "notes"] } },
    )

    act(() => {
      result.current.handleDragStart({ active: { id: "readme" } } as never)
      result.current.handleDragOver({ active: { id: "readme" }, over: { id: "notes" } } as never)
    })
    rerender({ items: ["notes", "readme"] })
    act(() => result.current.handleDragCancel())

    expect(onReorder).toHaveBeenLastCalledWith(["readme", "notes"])
    expect(result.current.activeId).toBeNull()
  })

  it("converts line-mode wheel movement into horizontal scrolling", () => {
    const element = document.createElement("div")
    Object.defineProperties(element, {
      clientWidth: { value: 200 },
      scrollWidth: { value: 600 },
    })
    const ref = { current: element }
    renderHook(() => useWheelScroll({ containerRef: ref }))

    element.dispatchEvent(new WheelEvent("wheel", {
      deltaY: 2,
      deltaMode: WheelEvent.DOM_DELTA_LINE,
      cancelable: true,
    }))

    expect(element.scrollLeft).toBe(80)
  })

  it("converts page-mode wheel movement and clamps at the edge", () => {
    const element = document.createElement("div")
    Object.defineProperties(element, {
      clientWidth: { value: 200 },
      scrollWidth: { value: 500 },
    })
    const ref = { current: element }
    renderHook(() => useWheelScroll({ containerRef: ref }))

    element.dispatchEvent(new WheelEvent("wheel", {
      deltaY: 3,
      deltaMode: WheelEvent.DOM_DELTA_PAGE,
      cancelable: true,
    }))

    expect(element.scrollLeft).toBe(300)
  })

  it("clears pending enter-animation timers on unmount", () => {
    vi.useFakeTimers()
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout")
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout")
    const { unmount } = render(
      <TabSystem tabs={tabs} activeTab="readme" onTabChange={vi.fn()}>
        <TabContent value="readme">README</TabContent>
      </TabSystem>,
    )

    const enterTimerIndex = setTimeoutSpy.mock.calls.findIndex((call) => call[1] === 500)
    expect(enterTimerIndex).toBeGreaterThanOrEqual(0)
    const enterTimer = setTimeoutSpy.mock.results[enterTimerIndex]?.value

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalledWith(enterTimer)
    setTimeoutSpy.mockRestore()
    clearTimeoutSpy.mockRestore()
    vi.useRealTimers()
  })
})
