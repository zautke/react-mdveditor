#!/usr/bin/env node
/**
 * Ad-hoc browser tests round 2: targeted at failed selectors + dropdown menu
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

  // Clear localStorage so we start fresh
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // ──── DIAGNOSE: Map the DOM structure ────
  const domInfo = await page.evaluate(() => {
    const result = {}
    
    // All buttons with their structure
    const buttons = document.querySelectorAll('button')
    result.buttons = Array.from(buttons).map((btn, i) => ({
      index: i,
      text: btn.textContent?.trim().substring(0, 50),
      classes: btn.className?.substring(0, 100),
      ariaLabel: btn.getAttribute('aria-label'),
      title: btn.getAttribute('title'),
      childSvgs: btn.querySelectorAll('svg').length,
      parentRole: btn.parentElement?.getAttribute('role'),
      parentClass: btn.parentElement?.className?.substring(0, 60),
    }))
    
    // The new tab button area specifically
    const tablist = document.querySelector('[role="tablist"]')
    if (tablist) {
      const afterTabs = tablist.querySelectorAll(':scope > div:not([role="tab"])')
      result.tablistChildren = tablist.children.length
      result.afterTabDivs = Array.from(afterTabs).map(d => ({
        classes: d.className?.substring(0, 100),
        html: d.innerHTML?.substring(0, 200),
      }))
    }
    
    // Expand toggle area
    const expandBtns = document.querySelectorAll('[class*="expand"], [class*="toggle"], [class*="Expand"]')
    result.expandElements = Array.from(expandBtns).map(el => ({
      tag: el.tagName,
      classes: el.className?.substring(0, 100),
      text: el.textContent?.trim().substring(0, 30),
    }))

    return result
  })

  console.log('\n=== DOM DIAGNOSTIC ===')
  console.log('Buttons:')
  domInfo.buttons.forEach(b => {
    console.log(`  [${b.index}] text="${b.text}" svgs=${b.childSvgs} aria="${b.ariaLabel}" title="${b.title}" parent=${b.parentRole || b.parentClass?.substring(0, 30)}`)
  })
  console.log(`\nTablist children: ${domInfo.tablistChildren}`)
  console.log('After-tab divs:', JSON.stringify(domInfo.afterTabDivs, null, 2))
  console.log('Expand elements:', JSON.stringify(domInfo.expandElements, null, 2))

  await screenshot('10-diagnostic-fresh')

  // ──── TEST: New tab via the split dropdown ────
  // Find the split button container within tablist
  const splitContainer = page.locator('[role="tablist"] > div').last()
  const splitBtns = splitContainer.locator('button')
  const splitBtnCount = await splitBtns.count()
  console.log(`\nSplit button container has ${splitBtnCount} button(s)`)

  if (splitBtnCount >= 2) {
    // It's a split: [Plus] [Chevron]
    const plusBtn = splitBtns.first()
    const chevronBtn = splitBtns.last()
    
    // Test dropdown
    await chevronBtn.click()
    await page.waitForTimeout(500)
    await screenshot('11-dropdown-opened')
    
    const menuItems = page.locator('[role="menu"] button, [role="menuitem"]')
    const menuCount = await menuItems.count()
    log('Dropdown menu opens', menuCount > 0, `${menuCount} item(s)`)
    
    if (menuCount > 0) {
      const labels = []
      for (let i = 0; i < menuCount; i++) {
        labels.push((await menuItems.nth(i).textContent()).trim())
      }
      log('Menu items enumerated', true, labels.join(' | '))
    }

    // Close menu
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    
    // Test new tab via plus button
    const tabsBefore = await page.locator('[role="tab"]').count()
    await plusBtn.click()
    await page.waitForTimeout(500)
    const tabsAfter = await page.locator('[role="tab"]').count()
    log('Plus button creates tab', tabsAfter > tabsBefore, `${tabsBefore} → ${tabsAfter}`)
    await screenshot('12-after-new-tab')

  } else if (splitBtnCount === 1) {
    // Single button — might be plus-only
    const btn = splitBtns.first()
    const tabsBefore = await page.locator('[role="tab"]').count()
    await btn.click()
    await page.waitForTimeout(500)
    const tabsAfter = await page.locator('[role="tab"]').count()
    log('Single new-tab button creates tab', tabsAfter > tabsBefore, `${tabsBefore} → ${tabsAfter}`)
  } else {
    log('New tab button found in tablist', false, 'no buttons in last tablist child')
  }

  // ──── TEST: Close button (hover reveal) ────
  const tabs = page.locator('[role="tab"]')
  const currentTabCount = await tabs.count()
  
  if (currentTabCount > 1) {
    const lastTab = tabs.last()
    await lastTab.hover()
    await page.waitForTimeout(500)
    await screenshot('13-tab-hovered')

    // Check for close button inside tab trigger or its motion wrapper
    const closeInTab = lastTab.locator('button, [class*="close"]')
    const closeCount = await closeInTab.count()
    console.log(`Close buttons found in hovered tab: ${closeCount}`)

    if (closeCount > 0) {
      const tabCountPre = await tabs.count()
      await closeInTab.first().click()
      await page.waitForTimeout(500)
      const tabCountPost = await tabs.count()
      log('Close button works', tabCountPost < tabCountPre, `${tabCountPre} → ${tabCountPost}`)
    } else {
      // The close button might be a sibling of the tab trigger inside the motion wrapper
      const motionParent = page.locator('[role="tab"]').last().locator('..')
      const siblingClose = motionParent.locator('button')
      const sibCloseCount = await siblingClose.count()
      console.log(`Sibling buttons in motion wrapper: ${sibCloseCount}`)
      
      if (sibCloseCount > 0) {
        await lastTab.hover()
        await page.waitForTimeout(200)
        const tabCountPre = await tabs.count()
        await siblingClose.last().click()
        await page.waitForTimeout(500)
        const tabCountPost = await tabs.count()
        log('Close button (sibling) works', tabCountPost < tabCountPre, `${tabCountPre} → ${tabCountPost}`)
      } else {
        log('Close button visible on hover', false, 'no close button found')
      }
    }
  }

  await screenshot('14-after-close-test')

  // ──── TEST: Expand toggle ────
  // The ExpandToggleButton is likely in the left panel header area
  const allBtns = page.locator('button')
  const btnCount = await allBtns.count()
  let expandClicked = false

  for (let i = 0; i < btnCount; i++) {
    const btn = allBtns.nth(i)
    const html = await btn.evaluate(el => el.outerHTML)
    // Look for arrows/chevrons that suggest expand/collapse
    if (html.includes('ChevronLeft') || html.includes('ChevronRight') || 
        html.includes('Maximize') || html.includes('Minimize') ||
        html.includes('expand') || html.includes('arrow')) {
      console.log(`Found potential expand button [${i}]: ${html.substring(0, 120)}`)
      const textareaBefore = await page.locator('textarea').boundingBox()
      await btn.click()
      await page.waitForTimeout(600)
      const textareaAfter = await page.locator('textarea').boundingBox()
      
      const widthChanged = textareaBefore && textareaAfter && 
        Math.abs(textareaBefore.width - textareaAfter.width) > 50
      
      if (widthChanged) {
        log('Expand toggle works', true, `width ${Math.round(textareaBefore.width)} → ${Math.round(textareaAfter.width)}`)
        await screenshot('15-expanded')
        await btn.click() // toggle back
        await page.waitForTimeout(600)
        await screenshot('16-collapsed')
        expandClicked = true
        break
      }
    }
  }

  if (!expandClicked) {
    // Try the floating arrow indicator
    const arrows = page.locator('[class*="arrow"], [class*="Arrow"], svg[class*="chevron"]')
    const arrowCount = await arrows.count()
    console.log(`Arrow/chevron elements: ${arrowCount}`)
    
    // Check if expand-toggle-button renders as a non-button element
    const toggleEl = page.locator('[class*="ExpandToggle"], [class*="expand-toggle"]')
    const toggleCount = await toggleEl.count()
    console.log(`ExpandToggle elements: ${toggleCount}`)
    
    log('Expand toggle found', false, 'could not locate via button scan')
  }

  // ──── TEST: File input accept attribute ────
  const fileInput = page.locator('input[type="file"]')
  if (await fileInput.count() > 0) {
    const accept = await fileInput.getAttribute('accept')
    log('File input has accept attr', !!accept, accept || 'none')
  }

  // ──── TEST: Save button ────
  const saveBtn = page.locator('button').filter({ has: page.locator('svg') })
  const saveBtnCount = await saveBtn.count()
  log('Action buttons present', saveBtnCount > 0, `${saveBtnCount} icon button(s)`)

  await screenshot('17-final')

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
  if (page) await screenshot('error-state-2')
} finally {
  if (browser) await browser.close()
}
