import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5201');
  await page.waitForTimeout(3000); // wait for load
  
  // Set window size large enough to avoid overflow on the right
  await page.setViewportSize({ width: 1400, height: 800 });

  // Open the "New Tab" dropdown to verify position
  const dropdownTrigger = page.locator('button[aria-haspopup="menu"]');
  if (await dropdownTrigger.count() > 0) {
    await dropdownTrigger.click();
    await page.waitForTimeout(500); // wait for menu animation
    
    // create a json tab
    const jsonMenu = page.locator('button[role="menuitem"]:has-text("JSON")');
    if (await jsonMenu.count() > 0) {
      await jsonMenu.click();
      await page.waitForTimeout(500);
    }
  }

  // Hover over dropdown to show it again, so screenshot captures dropdown fix
  if (await dropdownTrigger.count() > 0) {
    await dropdownTrigger.click();
    await page.waitForTimeout(500); // wait for menu animation
  }

  // Hide the JSON PREVIEW label text in the editor since I removed it but just in case
  
  // Wait to make sure rendering is settled
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'test-results/tabs-fixed.png' });
  console.log("Screenshot saved to test-results/tabs-fixed.png");

  await browser.close();
})();
