import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const APP_URL = process.env.MDEDITOR_TEST_URL ?? 'http://127.0.0.1:5200'

const fixtureImageUrl = 'https://placehold.co/240x160/png?text=Hover+Panel'
const fixtureVideoUrl = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

const markdown = `
# Media hover fixture

![Fixture image](${fixtureImageUrl})

<video src="${fixtureVideoUrl}" muted playsinline controls></video>

\`\`\`mermaid
flowchart TD
  A[Hover] --> B[Panel]
\`\`\`
`.trim()

const seededDocuments = [
  {
    id: 'doc-hover',
    title: 'Media Hover Fixture',
    kind: 'markdown',
    content: markdown,
  },
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })

try {
  await page.addInitScript((documents) => {
    localStorage.setItem('mdeditor:documents', JSON.stringify(documents))
    localStorage.setItem('mdeditor:activeDocId', JSON.stringify('doc-hover'))
    localStorage.setItem('mdeditor:isExpanded', JSON.stringify(false))
  }, seededDocuments)

  await page.goto(APP_URL, { waitUntil: 'networkidle' })

  await page.waitForSelector('.mdeditor-media-asset', { state: 'visible', timeout: 10000 })
  await page.waitForFunction(() => document.querySelectorAll('.mdeditor-media-asset').length >= 3)

  const wrappers = page.locator('.mdeditor-media-asset')
  const wrapperCount = await wrappers.count()
  assert.ok(wrapperCount >= 3, `expected at least 3 media assets, got ${wrapperCount}`)

  for (let index = 0; index < wrapperCount; index += 1) {
    const wrapper = wrappers.nth(index)
    const panel = wrapper.locator('.mdeditor-media-action-panel--inline')

    await panel.waitFor({ state: 'attached', timeout: 3000 })

    const before = await panel.evaluate((element) => {
      const style = window.getComputedStyle(element)
      return {
        opacity: style.opacity,
        backgroundColor: style.backgroundColor,
        backdropFilter: style.backdropFilter,
      }
    })

    assert.equal(before.opacity, '0', `panel ${index} should start hidden`)

    await wrapper.hover()

    await page.waitForFunction(
      (element) => window.getComputedStyle(element).opacity === '1',
      await panel.elementHandle(),
    )

    const after = await panel.evaluate((element) => {
      const style = window.getComputedStyle(element)
      return {
        opacity: style.opacity,
        backgroundColor: style.backgroundColor,
        backdropFilter: style.backdropFilter,
      }
    })

    assert.equal(after.opacity, '1', `panel ${index} should be visible on hover`)
    assert.notEqual(
      after.backgroundColor,
      'rgba(0, 0, 0, 0)',
      `panel ${index} should render a visible hover surface`,
    )
  }
} finally {
  await browser.close()
}

assert.ok(true)
