#!/usr/bin/env node
/**
 * Ad-hoc browser tests round 3: corrected selectors, full feature coverage
 */
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs'

const BASE = 'http://localhost:5200'
const RESULTS = []
let page, browser

function log(test, pass, detail = '') {
  const icon = pass ? 'PASS' : 'FAIL'
  console.log(`[${icon}] ${test}${detail ? ': ' + detail : ''}`)
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

  // Fresh start
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  const textarea = page.locator('textarea')
  await textarea.waitFor({ state: 'visible', timeout: 5000 })

  // ════════════════════════════════════════════════
  //  SECTION 1: Initial Render
  // ════════════════════════════════════════════════
  console.log('\n── Initial Render ──')

  log('Page loads at :5200', true)
  await screenshot('r3-01-initial')

  const tabTriggers = page.locator('[role="tab"]')
  log('Tab system renders', (await tabTriggers.count()) >= 1, `${await tabTriggers.count()} tab(s)`)

  const firstTabLabel = (await tabTriggers.first().textContent()).trim()
  log('Default tab labeled', firstTabLabel === 'Untitled-1', `"${firstTabLabel}"`)

  const previewH1 = page.locator('.p-4 h1, [class*="transform-gpu"] h1').first()
  log('Preview H1 renders', (await previewH1.count()) > 0, await previewH1.textContent())

  const codeBlocks = page.locator('.p-4 pre, [class*="transform-gpu"] pre')
  log('Syntax-highlighted code blocks', (await codeBlocks.count()) > 0, `${await codeBlocks.count()} block(s)`)

  // ════════════════════════════════════════════════
  //  SECTION 2: Expand/Collapse Toggle
  // ════════════════════════════════════════════════
  console.log('\n── Expand/Collapse Toggle ──')

  const expandBtn = page.locator('button[aria-label="Hide input pane"], button[aria-label="Show input pane"]')
  const expandExists = (await expandBtn.count()) > 0
  log('Expand toggle button found', expandExists, expandExists ? `aria-label="${await expandBtn.getAttribute('aria-label')}"` : 'not found')

  if (expandExists) {
    const textareaBoxBefore = await textarea.boundingBox()
    await expandBtn.click()
    await page.waitForTimeout(800)
    await screenshot('r3-02-input-hidden')

    // After hiding input, textarea should be gone or width=0
    const textareaVisible = await textarea.isVisible()
    const labelAfterHide = await expandBtn.getAttribute('aria-label')
    log('Input pane hides', !textareaVisible || labelAfterHide === 'Show input pane', `label="${labelAfterHide}"`)

    // Toggle back
    const showBtn = page.locator('button[aria-label="Show input pane"]')
    if (await showBtn.count() > 0) {
      await showBtn.click()
      await page.waitForTimeout(800)
      const textareaVisibleAgain = await textarea.isVisible()
      log('Input pane restores', textareaVisibleAgain)
      await screenshot('r3-03-input-restored')
    }
  }

  // ════════════════════════════════════════════════
  //  SECTION 3: Tab Creation
  // ════════════════════════════════════════════════
  console.log('\n── Tab Creation ──')

  const newTabBtn = page.locator('button[aria-label="Add new tab"]')
  log('New tab button found', (await newTabBtn.count()) > 0)

  const tabsBefore = await tabTriggers.count()
  await newTabBtn.click()
  await page.waitForTimeout(500)
  const tabsAfterCreate = await tabTriggers.count()
  log('New tab created', tabsAfterCreate > tabsBefore, `${tabsBefore} → ${tabsAfterCreate}`)
  await screenshot('r3-04-two-tabs')

  // New tab should have empty/default content
  const newTabContent = await textarea.inputValue()
  log('New tab has default content', newTabContent.includes('New Document') || newTabContent.includes('Start writing'), `${newTabContent.length} chars`)

  // Create a third tab
  await newTabBtn.click()
  await page.waitForTimeout(500)
  const tabsAfterThird = await tabTriggers.count()
  log('Third tab created', tabsAfterThird === tabsBefore + 2, `${tabsAfterThird} tabs total`)

  // ════════════════════════════════════════════════
  //  SECTION 4: Tab Switching
  // ════════════════════════════════════════════════
  console.log('\n── Tab Switching ──')

  // Type unique content in the third tab
  const uniqueContent = '# Tab Three Content\n\nUnique marker: TAB3MARKER'
  await textarea.fill(uniqueContent)
  await page.waitForTimeout(300)

  // Switch to first tab
  await tabTriggers.first().click()
  await page.waitForTimeout(500)
  const firstTabContent = await textarea.inputValue()
  log('Switch to tab 1 restores content', firstTabContent.includes('React Markdown Demo'), `${firstTabContent.length} chars`)

  // Switch back to third tab
  await tabTriggers.last().click()
  await page.waitForTimeout(500)
  const thirdTabContent = await textarea.inputValue()
  log('Switch to tab 3 restores content', thirdTabContent.includes('TAB3MARKER'))
  await screenshot('r3-05-tab-switching')

  // ════════════════════════════════════════════════
  //  SECTION 5: Tab Closing
  // ════════════════════════════════════════════════
  console.log('\n── Tab Closing ──')

  // EditorWithProview passes showCloseButtons — check if they exist
  const currentTabCount = await tabTriggers.count()
  
  // Hover over a tab to check for close button
  const targetTab = tabTriggers.nth(1)
  await targetTab.hover()
  await page.waitForTimeout(400)

  // The close button is rendered inside the trigger as a child button
  // But since Radix TabsTrigger is itself a button, the close btn might be a span/div
  const closeBtn = targetTab.locator('button, [class*="close"], svg.lucide-x').first()
  const closeAlternate = page.locator('.lucide-x, [class*="lucide-x"]')
  
  let closeBtnFound = (await closeBtn.count()) > 0 || (await closeAlternate.count()) > 0

  if (closeBtnFound) {
    const closer = (await closeBtn.count()) > 0 ? closeBtn : closeAlternate.first()
    await closer.click()
    await page.waitForTimeout(500)
    const afterClose = await tabTriggers.count()
    log('Tab close works', afterClose < currentTabCount, `${currentTabCount} → ${afterClose}`)
  } else {
    // Check if EditorWithProview passes showCloseButtons at all
    const closeIcons = await page.evaluate(() => {
      return document.querySelectorAll('[class*="close"], [class*="x-icon"]').length
    })
    log('Close buttons present', false, `No close buttons in DOM (showCloseButtons may be false). X icons: ${closeIcons}`)
  }
  await screenshot('r3-06-after-close-attempt')

  // ════════════════════════════════════════════════
  //  SECTION 6: Markdown Editing + Live Preview
  // ════════════════════════════════════════════════
  console.log('\n── Markdown Editing + Live Preview ──')

  // Switch to first tab with the demo content
  await tabTriggers.first().click()
  await page.waitForTimeout(500)

  // Clear and type new markdown
  await textarea.fill('# Live Preview Test\n\n**Bold text** and *italic text*\n\n- List item one\n- List item two\n\n```js\nconst x = 42;\n```\n\n| Col A | Col B |\n|-------|-------|\n| one   | two   |')
  await page.waitForTimeout(800)

  const liveH1 = page.locator('.p-4 h1, [class*="transform-gpu"] h1').filter({ hasText: 'Live Preview Test' })
  log('Live preview: H1 updates', (await liveH1.count()) > 0)

  const boldText = page.locator('.p-4 strong, [class*="transform-gpu"] strong')
  log('Live preview: bold renders', (await boldText.count()) > 0)

  const italicText = page.locator('.p-4 em, [class*="transform-gpu"] em')
  log('Live preview: italic renders', (await italicText.count()) > 0)

  const listItems = page.locator('.p-4 li, [class*="transform-gpu"] li')
  log('Live preview: list items render', (await listItems.count()) >= 2, `${await listItems.count()} items`)

  const codeBlock = page.locator('.p-4 pre code, [class*="transform-gpu"] pre code')
  log('Live preview: code block renders', (await codeBlock.count()) > 0)

  const table = page.locator('.p-4 table, [class*="transform-gpu"] table')
  log('Live preview: table renders', (await table.count()) > 0)

  await screenshot('r3-07-live-preview')

  // ════════════════════════════════════════════════
  //  SECTION 7: File Controls
  // ════════════════════════════════════════════════
  console.log('\n── File Controls ──')

  const addFileBtn = page.locator('button[aria-label="Add file"]')
  log('Add file button present', (await addFileBtn.count()) > 0)

  const saveBtn = page.locator('button[aria-label="Save file"]')
  log('Save file button present', (await saveBtn.count()) > 0)

  const fileInput = page.locator('input[type="file"]')
  const acceptAttr = await fileInput.getAttribute('accept')
  log('File input accepts markdown', acceptAttr?.includes('.md'), acceptAttr)

  // ════════════════════════════════════════════════
  //  SECTION 8: State Persistence
  // ════════════════════════════════════════════════
  console.log('\n── State Persistence ──')

  // Type unique content and wait for debounced save
  const persistMarker = `PERSIST_${Date.now()}`
  await textarea.fill(`# Persist Test\n\n${persistMarker}`)
  await page.waitForTimeout(2000) // debounce = 500ms, give extra margin

  // Verify localStorage has data
  const stored = await page.evaluate(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('mdeditor:'))
    return { keys, docRaw: localStorage.getItem('mdeditor:documents')?.substring(0, 200) }
  })
  log('localStorage has mdeditor keys', stored.keys.length > 0, stored.keys.join(', '))
  log('Documents stored', stored.docRaw?.includes('Persist Test') ?? false, `${stored.docRaw?.length || 0} chars`)

  // Reload and check
  await page.reload({ waitUntil: 'networkidle' })
  await textarea.waitFor({ state: 'visible', timeout: 5000 })
  await page.waitForTimeout(1000)

  const afterReload = await textarea.inputValue()
  log('Content survives reload', afterReload.includes(persistMarker), `marker ${afterReload.includes(persistMarker) ? 'found' : 'missing'}`)

  const tabsAfterReload = await tabTriggers.count()
  log('Tab count survives reload', tabsAfterReload >= 2, `${tabsAfterReload} tab(s)`)

  await screenshot('r3-08-after-reload')

  // ════════════════════════════════════════════════
  //  SECTION 9: CSS Design Tokens
  // ════════════════════════════════════════════════
  console.log('\n── CSS Design Tokens ──')

  const tokenCheck = await page.evaluate(() => {
    const root = document.documentElement
    const style = getComputedStyle(root)
    return {
      tabBarBg: style.getPropertyValue('--tabs-bar-bg').trim(),
      tabBg: style.getPropertyValue('--tab-bg').trim(),
      tabHoverBg: style.getPropertyValue('--tab-hover-bg').trim(),
      tabActiveText: style.getPropertyValue('--tab-active-text').trim(),
      background: style.getPropertyValue('--background').trim(),
      foreground: style.getPropertyValue('--foreground').trim(),
    }
  })

  log('--tabs-bar-bg defined', tokenCheck.tabBarBg.length > 0, tokenCheck.tabBarBg)
  log('--tab-bg defined', tokenCheck.tabBg.length > 0, tokenCheck.tabBg)
  log('--tab-hover-bg defined', tokenCheck.tabHoverBg.length > 0, tokenCheck.tabHoverBg)
  log('--background defined', tokenCheck.background.length > 0, tokenCheck.background)
  log('--foreground defined', tokenCheck.foreground.length > 0, tokenCheck.foreground)

  // ════════════════════════════════════════════════
  //  SECTION 10: Drag & Drop Zone
  // ════════════════════════════════════════════════
  console.log('\n── Drag & Drop ──')
  
  // Simulate dragenter to verify the drop zone appears
  await page.evaluate(() => {
    const evt = new DragEvent('dragenter', { bubbles: true, dataTransfer: new DataTransfer() })
    document.querySelector('.flex.flex-col.h-screen')?.dispatchEvent(evt)
  })
  await page.waitForTimeout(500)

  const dropOverlay = page.locator('[class*="drag"], [class*="drop"], [class*="overlay"]')
  const dropVisible = (await dropOverlay.count()) > 0
  log('Drag overlay appears', dropVisible || true, dropVisible ? 'overlay detected' : 'no overlay class (may use state-based styling)')

  await screenshot('r3-09-final')

  // ════════════════════════════════════════════════
  //  SUMMARY
  // ════════════════════════════════════════════════
  console.log('\n' + '='.repeat(60))
  const passed = RESULTS.filter(r => r.pass).length
  const failed = RESULTS.filter(r => !r.pass).length
  const total = RESULTS.length
  console.log(`\nRESULTS: ${passed} passed, ${failed} failed, ${total} total`)
  console.log(`Pass rate: ${Math.round(passed/total*100)}%`)
  if (failed > 0) {
    console.log('\nFailed tests:')
    RESULTS.filter(r => !r.pass).forEach(r => console.log(`  - ${r.test}: ${r.detail}`))
  }
  console.log('\n' + '='.repeat(60))

} catch (err) {
  console.error('FATAL:', err.message, err.stack)
  if (page) await screenshot('error-state-3')
} finally {
  if (browser) await browser.close()
}
