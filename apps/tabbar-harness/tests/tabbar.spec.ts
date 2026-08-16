import { expect, test } from "@playwright/test"

test("renders the complete tabbar above a bordered content panel", async ({ page }) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  page.on("pageerror", (error) => pageErrors.push(error.message))
  await page.goto("/")
  await page.reload()

  await expect(page.getByRole("tablist", { name: "Document tabs" })).toBeVisible()
  await expect(page.getByTestId("tab-content-shell")).toHaveCSS("border-top-style", "solid")
  await expect(page.getByRole("tab", { name: /README/ })).toHaveAttribute("aria-selected", "true")
  expect(consoleErrors).toEqual([])
  expect(pageErrors).toEqual([])
})

test("supports add, typed menu, rename, close, and keyboard selection", async ({ page }) => {
  await page.goto("/")

  const initialCount = await page.getByRole("tab").count()
  await page.getByRole("button", { name: "Add new tab" }).click()
  await expect(page.getByRole("tab")).toHaveCount(initialCount + 1)

  await page.getByRole("button", { name: "Choose new tab type" }).click()
  await expect(page.getByRole("menuitem").first()).toBeFocused()
  await page.keyboard.press("End")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("tab", { name: /React/ })).toBeVisible()

  const notes = page.getByText("Notes.md", { exact: true })
  await notes.dblclick()
  const rename = page.getByRole("textbox", { name: "Rename tab" })
  await rename.fill("Research.md")
  await rename.press("Enter")
  await expect(page.getByRole("tab", { name: /Research.md/ })).toBeVisible()

  await page.getByRole("tab", { name: /Research.md/ }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(page.locator('[role="tab"][data-state="active"]')).toBeFocused()

  await page.getByRole("tab", { name: /Research.md/ }).click()
  await expect(page.getByRole("tab", { name: /Research.md/ })).toHaveAttribute("aria-selected", "true")
  await page.getByRole("button", { name: /Close Research.md tab/ }).click()
  await expect(page.getByRole("tab", { name: /Research.md/ })).toHaveCount(0)
  await expect(page.locator('[role="tab"][data-state="active"]')).toHaveCount(1)
})

test("supports pointer and keyboard reorder", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop exercises pointer and keyboard sensors")
  await page.goto("/")

  const notes = page.getByRole("tab", { name: /Notes.md/ })
  const diagram = page.getByRole("tab", { name: /Architecture.mmd/ })
  const notesBox = await notes.boundingBox()
  const diagramBox = await diagram.boundingBox()
  expect(notesBox).not.toBeNull()
  expect(diagramBox).not.toBeNull()

  await page.mouse.move(notesBox!.x + notesBox!.width / 2, notesBox!.y + notesBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(diagramBox!.x + diagramBox!.width / 2, diagramBox!.y + diagramBox!.height / 2, { steps: 12 })
  await page.mouse.up()
  await expect(page.getByRole("tab").nth(2)).toContainText("Notes.md")
  const liveRegion = page.locator('[role="status"]')
  await expect(liveRegion).toContainText(/Tab Notes\.md was dropped/)

  await diagram.focus()
  await page.keyboard.press("Space")
  await expect(liveRegion).toContainText(/Architecture\.mmd.*position/)
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Space")
  await expect(liveRegion).toContainText(/Tab Architecture\.mmd was dropped/)
  await expect(page.getByRole("tab").nth(2)).toContainText("Architecture.mmd")
})

test("handles narrow overflow, scroll arrows, reduced motion, and forced colors", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" })
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto("/")

  const root = page.locator('[data-tab-skin="editor"]')
  await expect(root).toBeVisible()
  const motionDuration = await root.evaluate((element) => (
    getComputedStyle(element).getPropertyValue("--tab-motion-duration").trim()
  ))
  expect(Number.parseFloat(motionDuration)).toBe(0)

  const right = page.getByRole("button", { name: "Scroll tabs right" })
  await expect(right).toBeVisible()
  await right.click()
  await expect(page.getByRole("button", { name: "Scroll tabs left" })).toBeVisible()
  await expect(page.getByTestId("tab-content-shell")).toBeVisible()
})
