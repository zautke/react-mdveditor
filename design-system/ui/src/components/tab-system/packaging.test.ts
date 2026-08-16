import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const packageRoot = resolve(import.meta.dirname, "../../..")

describe("tab system package boundary", () => {
  it("exports a standalone stylesheet", () => {
    const manifest = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"))
    expect(manifest.exports["./tab-system.css"]).toBe("./dist/tab-system.css")
    expect(manifest.sideEffects).toContain("**/*.css")
  })

  it("builds the package before a clean-checkout browser run", () => {
    const harnessManifest = JSON.parse(
      readFileSync(resolve(packageRoot, "../../apps/tabbar-harness/package.json"), "utf8"),
    )
    expect(harnessManifest.scripts["pretest:e2e"]).toBe("pnpm --filter @braisenly/ui build")
  })

  it("does not depend on mdeditor-only utility classes", () => {
    const variants = readFileSync(resolve(import.meta.dirname, "tab-system.variants.ts"), "utf8")
    const dropdown = readFileSync(resolve(import.meta.dirname, "new-tab-dropdown.tsx"), "utf8")
    expect(`${variants}\n${dropdown}`).not.toContain("app-icon-button")
  })
})
