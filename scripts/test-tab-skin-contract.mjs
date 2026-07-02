#!/usr/bin/env node
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

function Usage() {
  return `Usage: node scripts/test-tab-skin-contract.mjs -u <url> -b <browser-path> [-s <screenshot-dir>]

Options:
  -u, --url              App URL to test.
  -b, --browser-path     Existing Chromium/Chrome executable path.
  -s, --screenshot-dir   Optional directory for desktop and mobile screenshots.
  -h, --help             Show this help text.
`
}

function parseArgs(argv) {
  const args = {
    url: '',
    browserPath: '',
    screenshotDir: '',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    switch (arg) {
      case '-h':
      case '--help':
        console.log(Usage())
        process.exit(0)
      case '-u':
      case '--url':
        args.url = next ?? ''
        index += 1
        break
      case '-b':
      case '--browser-path':
        args.browserPath = next ?? ''
        index += 1
        break
      case '-s':
      case '--screenshot-dir':
        args.screenshotDir = next ?? ''
        index += 1
        break
      default:
        throw new Error(`Unknown argument: ${arg}\n${Usage()}`)
    }
  }

  if (!args.url || !args.browserPath) {
    throw new Error(`Missing required arguments.\n${Usage()}`)
  }

  return args
}

function assertCondition(condition, message) {
  if (!condition) throw new Error(message)
}

async function addTab(page) {
  const chooser = page.getByLabel('Choose new tab type')
  if (await chooser.count()) {
    await chooser.click()
    await page.getByRole('menuitem', { name: /New Markdown/i }).click()
    await page.waitForSelector('[role="menu"]', { state: 'detached', timeout: 2000 })
    return
  }

  await page.getByLabel('Add new tab').click()
}

const args = parseArgs(process.argv.slice(2))
const browser = await chromium.launch({
  headless: true,
  executablePath: args.browserPath,
})

try {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 820 },
  })
  const page = await context.newPage()
  await page.goto(args.url, { waitUntil: 'networkidle' })
  await page.waitForSelector('[role="tablist"]')

  const before = await page.evaluate(() => {
    const root = document.querySelector('[data-tab-skin]')
    const list = document.querySelector('[role="tablist"]')
    const style = root ? getComputedStyle(root) : null
    return {
      rootFound: Boolean(root),
      skin: root?.getAttribute('data-tab-skin'),
      density: root?.getAttribute('data-density'),
      motion: root?.getAttribute('data-motion'),
      tabCount: document.querySelectorAll('[role="tab"]').length,
      activeCount: document.querySelectorAll('[role="tab"][data-state="active"]').length,
      overflowX: list ? getComputedStyle(list.parentElement ?? list).overflowX : '',
      controlHeight: style?.getPropertyValue('--tab-control-height').trim() ?? '',
      focusRing: style?.getPropertyValue('--tab-focus-ring').trim() ?? '',
    }
  })

  assertCondition(before.rootFound, 'Expected tab root with data-tab-skin.')
  assertCondition(before.skin === 'editor', `Expected editor skin, got ${before.skin}.`)
  assertCondition(before.density === 'compact', `Expected compact density, got ${before.density}.`)
  assertCondition(before.activeCount === 1, `Expected one active tab, got ${before.activeCount}.`)
  assertCondition(before.overflowX === 'auto', `Expected scrollable tab container, got ${before.overflowX}.`)
  assertCondition(Boolean(before.focusRing), 'Expected focus ring token to resolve.')

  await addTab(page)
  await page.waitForTimeout(250)
  const afterNew = await page.evaluate(() => ({
    tabCount: document.querySelectorAll('[role="tab"]').length,
    activeCount: document.querySelectorAll('[role="tab"][data-state="active"]').length,
    hasColoredTab: Boolean(document.querySelector('[role="tab"][data-tab-color]')),
  }))
  assertCondition(afterNew.tabCount > before.tabCount, 'Expected new-tab action to add a tab.')
  assertCondition(afterNew.activeCount === 1, `Expected one active tab after add, got ${afterNew.activeCount}.`)
  assertCondition(afterNew.hasColoredTab, 'Expected at least one per-tab accent marker.')

  const firstTab = page.locator('[role="tab"]').first()
  await firstTab.focus()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(100)
  const keyboard = await page.evaluate(() => ({
    focusedText: document.activeElement?.textContent?.trim() ?? '',
    activeText: document.querySelector('[role="tab"][data-state="active"]')?.textContent?.trim() ?? '',
  }))
  assertCondition(keyboard.focusedText === keyboard.activeText, 'Expected ArrowRight to move roving focus and active tab together.')

  if (args.screenshotDir) {
    await mkdir(args.screenshotDir, { recursive: true })
    await page.screenshot({ path: `${args.screenshotDir}/tabs-desktop.png`, fullPage: false })
  }

  await page.setViewportSize({ width: 375, height: 760 })
  await page.waitForTimeout(250)
  const mobile = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')]
    return {
      documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      tabViewportOverflow: tabs.some((tab) => {
        const rect = tab.getBoundingClientRect()
        return rect.right > window.innerWidth + 1 || rect.left < -1
      }),
    }
  })
  assertCondition(!mobile.documentOverflow, 'Expected no document overflow at 375px width.')
  assertCondition(!mobile.tabViewportOverflow, 'Expected tab triggers to stay within the viewport at 375px width.')

  if (args.screenshotDir) {
    await page.screenshot({ path: `${args.screenshotDir}/tabs-mobile.png`, fullPage: false })
  }

  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('[data-tab-skin]')
  const media = await page.evaluate(() => {
    const root = document.querySelector('[data-tab-skin]')
    const style = root ? getComputedStyle(root) : null
    return {
      duration: style?.getPropertyValue('--tab-motion-duration').trim(),
      tabBg: style?.getPropertyValue('--tab-bg').trim(),
      focusRing: style?.getPropertyValue('--tab-focus-ring').trim(),
      shadow: style?.getPropertyValue('--tab-shadow').trim(),
    }
  })
  assertCondition(media.duration === '0ms', `Expected reduced motion duration 0ms, got ${media.duration}.`)
  assertCondition(media.tabBg === 'Canvas', `Expected forced-colors Canvas tab bg, got ${media.tabBg}.`)
  assertCondition(media.focusRing === 'Highlight', `Expected forced-colors Highlight focus ring, got ${media.focusRing}.`)
  assertCondition(media.shadow === 'none', `Expected forced-colors shadow none, got ${media.shadow}.`)

  console.log(JSON.stringify({ before, afterNew, keyboard, mobile, media }, null, 2))
} finally {
  await browser.close()
}
