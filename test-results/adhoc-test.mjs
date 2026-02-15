#!/usr/bin/env node
/**
 * Ad-hoc browser automation tests for mdeditor
 * Run: node test-results/adhoc-test.mjs
 */
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs'

const BASE = 'http://localhost:5200'
const RESULTS = []
let page, browser

function log(test, pass, detail = '') {
  const icon = pass ? 'PASS' : 'FAIL'
  const msg = `[${icon}] ${test}${detail ? ': ' + detail : ''}`
  console.log(msg)
  RESULTS.push({ test, pass, detail })
}

async function screenshot(name) {
  await page.screenshot({ path: `test-results/${name}.png`, fullPage: true })
}

try {
  browser = await chromium.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  page = await ctx.newPage()

  // ──── TEST 1: Page loads ────
  const response = await page.goto(BASE, { waitUntil: 'networkidle' })
  log('Page loads', response.status() === 200, `status=${response.status()}`)
  await screenshot('01-initial-load')

  // ──── TEST 2: Core elements present ────
  const textarea = page.locator('textarea')
  await textarea.waitFor({ state: 'visible', timeout: 5000 })
  log('Textarea visible', true)

  const tabTriggers = page.locator('[role="tab"]')
  const tabCount = await tabTriggers.count()
  log('Tab system renders', tabCount >= 1, `${tabCount} tab(s)`)

  const firstTabText = await tabTriggers.first().textContent()
  log('First tab has label', firstTabText.trim().length > 0, `"${firstTabText.trim()}"`)

  // ──── TEST 3: Preview pane renders markdown ────
  const previewH1 = page.locator('.p-4 h1, [class*="transform-gpu"] h1').first()
  const h1Exists = await previewH1.count() > 0
  log('Preview H1 renders', h1Exists, h1Exists ? await previewH1.textContent() : 'not found')

  const codeBlocks = page.locator('.p-4 pre, [class*="transform-gpu"] pre')
  const codeCount = await codeBlocks.count()
  log('Code blocks render', codeCount > 0, `${codeCount} block(s)`)

  // ──── TEST 4: New tab dropdown menu ────
  // Look for the split button / chevron area
  const newTabButton = page.locator('button:has(svg)').filter({ hasText: /^$/ })
  const allButtons = page.locator('button')
  const allBtnCount = await allButtons.count()
  log('Buttons present', allBtnCount > 0, `${allBtnCount} button(s)`)

  // Find the new-tab plus/chevron split button
  const chevronBtn = page.locator('[class*="rounded-r"]').first()
  const chevronExists = await chevronBtn.count() > 0

  if (chevronExists) {
    await chevronBtn.click()
    await page.waitForTimeout(400)
    await screenshot('02-dropdown-open')

    const menuItems = page.locator('[role="menuitem"], [role="menu"] button')
    const menuCount = await menuItems.count()
    log('Dropdown menu opens', menuCount > 0, `${menuCount} item(s)`)

    if (menuCount > 0) {
      const labels = []
      for (let i = 0; i < menuCount; i++) {
        labels.push(await menuItems.nth(i).textContent())
      }
      log('Menu items present', true, labels.map(l => l.trim()).join(', '))
    }

    // Close menu by clicking elsewhere
    await page.locator('body').click({ position: { x: 10, y: 10 } })
    await page.waitForTimeout(300)
  } else {
    // Try finding plus button directly
    const plusBtn = page.locator('button').filter({ has: page.locator('svg') })
    let foundPlus = false
    const btnCount = await plusBtn.count()
    for (let i = 0; i < btnCount; i++) {
      const btn = plusBtn.nth(i)
      const ariaLabel = await btn.getAttribute('aria-label')
      const title = await btn.getAttribute('title')
      const text = await btn.textContent()
      if (text.trim() === '' || ariaLabel?.includes('new') || title?.includes('new')) {
        // This is likely a new-tab button area
        await btn.click()
        await page.waitForTimeout(400)
        await screenshot('02-plus-clicked')
        foundPlus = true
        break
      }
    }
    log('New tab control found', foundPlus || chevronExists, chevronExists ? 'chevron split' : 'plus button')
  }

  // ──── TEST 5: Create a new tab ────
  const tabCountBefore = await tabTriggers.count()

  // Try clicking the left (plus) side of the split button
  const plusSide = page.locator('[class*="rounded-l"]').first()
  const plusExists = await plusSide.count() > 0

  if (plusExists) {
    await plusSide.click()
  } else {
    // Fall back: find any button that creates a new tab
    const newBtn = page.locator('button').filter({ has: page.locator('svg.lucide-plus, svg[class*="Plus"]') }).first()
    if (await newBtn.count() > 0) {
      await newBtn.click()
    }
  }
  await page.waitForTimeout(500)

  const tabCountAfter = await tabTriggers.count()
  log('New tab created', tabCountAfter > tabCountBefore, `${tabCountBefore} → ${tabCountAfter}`)
  await screenshot('03-new-tab-created')

  // ──── TEST 6: Type in the new tab ────
  const testContent = '# Test Document\n\nThis is automated test content.'
  await textarea.fill('')
  await textarea.fill(testContent)
  await page.waitForTimeout(800)

  const typedValue = await textarea.inputValue()
  log('Text input works', typedValue.includes('Test Document'), `${typedValue.length} chars`)
  await screenshot('04-typed-content')

  // Check preview updated
  const testH1 = page.locator('.p-4 h1, [class*="transform-gpu"] h1').filter({ hasText: 'Test Document' })
  const testH1Exists = await testH1.count() > 0
  log('Preview updates live', testH1Exists)

  // ──── TEST 7: Switch tabs ────
  if (tabCountAfter > 1) {
    const firstTab = tabTriggers.first()
    await firstTab.click()
    await page.waitForTimeout(500)

    const switchedContent = await textarea.inputValue()
    log('Tab switch restores content', switchedContent !== testContent, `${switchedContent.length} chars (different from new tab)`)
    await screenshot('05-tab-switched')
  }

  // ──── TEST 8: Close a tab ────
  const closeButtons = page.locator('[role="tab"] button, [class*="tab"] [class*="close"], button:has(svg.lucide-x)')
  const closeBtnCount = await closeButtons.count()
  if (closeBtnCount > 0 && tabCountAfter > 1) {
    // Hover over the last tab to reveal close button
    const lastTab = tabTriggers.last()
    await lastTab.hover()
    await page.waitForTimeout(300)

    const closeBtn = lastTab.locator('button').first()
    if (await closeBtn.count() > 0) {
      await closeBtn.click()
      await page.waitForTimeout(500)
      const tabCountAfterClose = await tabTriggers.count()
      log('Tab close works', tabCountAfterClose < tabCountAfter, `${tabCountAfter} → ${tabCountAfterClose}`)
    } else {
      log('Tab close button', false, 'close button not found on hover')
    }
  } else {
    log('Tab close', closeBtnCount > 0, `${closeBtnCount} close button(s)`)
  }
  await screenshot('06-after-close')

  // ──── TEST 9: Expand/collapse toggle ────
  const expandBtn = page.locator('button[aria-label*="expand"], button[aria-label*="Expand"], button[title*="expand"], button[title*="Expand"]').first()
  let expandFound = await expandBtn.count() > 0
  
  if (!expandFound) {
    // Try finding by SVG icon pattern (arrows)
    const allBtns = page.locator('button')
    const cnt = await allBtns.count()
    for (let i = 0; i < cnt; i++) {
      const btn = allBtns.nth(i)
      const cls = await btn.getAttribute('class') || ''
      if (cls.includes('expand') || cls.includes('toggle')) {
        await btn.click()
        expandFound = true
        await page.waitForTimeout(500)
        await screenshot('07-expanded')
        await btn.click()
        await page.waitForTimeout(500)
        break
      }
    }
  } else {
    await expandBtn.click()
    await page.waitForTimeout(500)
    await screenshot('07-expanded')
    await expandBtn.click()
    await page.waitForTimeout(500)
  }
  log('Expand toggle found', expandFound)

  // ──── TEST 10: State persistence ────
  // Type something unique, reload, check it persists
  await textarea.fill('')
  const persistTestContent = '# Persistence Test ' + Date.now()
  await textarea.fill(persistTestContent)
  await page.waitForTimeout(1500) // wait for debounced save

  await page.reload({ waitUntil: 'networkidle' })
  await textarea.waitFor({ state: 'visible', timeout: 5000 })
  await page.waitForTimeout(500)

  const afterReload = await textarea.inputValue()
  log('State persists after reload', afterReload.includes('Persistence Test'), `restored ${afterReload.length} chars`)
  await screenshot('08-after-reload')

  // ──── TEST 11: CSS design tokens applied ────
  const tabList = page.locator('[role="tablist"]').first()
  if (await tabList.count() > 0) {
    const bgColor = await tabList.evaluate(el => getComputedStyle(el).backgroundColor)
    log('Tab bar has background', bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent', bgColor)
    
    const borderColor = await tabList.evaluate(el => getComputedStyle(el).borderColor)
    log('Tab bar has border', borderColor !== 'rgba(0, 0, 0, 0)', borderColor)
  }

  // ──── TEST 12: Responsive layout check ────
  const editorContainer = page.locator('textarea').locator('..')
  const textareaBox = await textarea.boundingBox()
  log('Textarea has dimensions', textareaBox && textareaBox.width > 100 && textareaBox.height > 100, 
    textareaBox ? `${Math.round(textareaBox.width)}x${Math.round(textareaBox.height)}` : 'no bounding box')

  await screenshot('09-final-state')

  // ──── SUMMARY ────
  console.log('\n' + '='.repeat(60))
  const passed = RESULTS.filter(r => r.pass).length
  const failed = RESULTS.filter(r => !r.pass).length
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${RESULTS.length} total`)
  if (failed > 0) {
    console.log('\nFailed tests:')
    RESULTS.filter(r => !r.pass).forEach(r => console.log(`  - ${r.test}: ${r.detail}`))
  }
  console.log('='.repeat(60))

} catch (err) {
  console.error('FATAL:', err.message)
  if (page) await screenshot('error-state')
} finally {
  if (browser) await browser.close()
}
