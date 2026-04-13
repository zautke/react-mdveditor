import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const APP_URL = process.env.MDEDITOR_TEST_URL ?? 'http://127.0.0.1:4173'

const fixtureImageUrl = 'https://placehold.co/240x160/png?text=Media+Zoom'

const markdown = `
# Media zoom fixture

![Fixture image](${fixtureImageUrl})
`.trim()

const seededDocuments = [
  {
    id: 'doc-1',
    title: 'Media Fixture',
    kind: 'markdown',
    content: markdown,
  },
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })

try {
  await page.addInitScript((documents) => {
    localStorage.setItem('mdeditor:documents', JSON.stringify(documents))
    localStorage.setItem('mdeditor:activeDocId', JSON.stringify('doc-1'))
    localStorage.setItem('mdeditor:isExpanded', JSON.stringify(false))
  }, seededDocuments)

  await page.goto(APP_URL, { waitUntil: 'networkidle' })

  const image = page.getByRole('img', { name: 'Fixture image' })
  await image.waitFor({ state: 'visible' })
  await image.hover()

  const zoomButton = page.getByRole('button', { name: 'Zoom media' })
  await zoomButton.waitFor({ state: 'visible', timeout: 1500 })

  await zoomButton.click()

  const collapseButton = page.getByRole('button', { name: 'Collapse media' })
  await collapseButton.waitFor({ state: 'visible', timeout: 1500 })

  const modalImage = page.locator('[role="dialog"] img[alt="Fixture image"]')
  await modalImage.dblclick()
  await image.hover()
  await zoomButton.waitFor({ state: 'visible', timeout: 1500 })
} finally {
  await browser.close()
}

assert.ok(true)
