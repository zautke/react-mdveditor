import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.goto('http://localhost:5201');
  
  await page.waitForTimeout(3000); // wait for load

  // Find textarea and type a code block using page.keyboard
  const textarea = await page.locator('textarea').first();
  if (await textarea.count() > 0) {
    await textarea.click();
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('```javascript\nconsole.log("Hello, world!");\n```');
    await page.waitForTimeout(2000); // wait for render
  }
  
  const codeBlock = page.locator('.group.relative').first();
  if (await codeBlock.count() > 0) {
    console.log("Found CodeBlock! Hovering...");
    await codeBlock.hover();
    await page.waitForTimeout(500); // Wait for transition
    
    await page.screenshot({ path: 'test-results/hover-codeblock-full.png' });
    await codeBlock.screenshot({ path: 'test-results/hover-codeblock.png' });
    console.log("Screenshots saved.");
  } else {
    console.log("Could not find the CodeBlock.");
    await page.screenshot({ path: 'test-results/fallback.png' });
  }

  await browser.close();
})();
