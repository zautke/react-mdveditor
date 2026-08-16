import { defineConfig, devices } from "@playwright/test"

const port = process.env.TABBAR_HARNESS_PORT
if (!port) throw new Error("TABBAR_HARNESS_PORT must be loaded from .env")

const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL,
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `next dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
})
