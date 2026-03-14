import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5201');
  await page.waitForTimeout(2000);
  
  // Inspect dimensions of TabSystem components
  const dimensions = await page.evaluate(() => {
    const list = document.querySelector('[role="tablist"]');
    const trigger = document.querySelector('[role="tab"]');
    const bar = list?.closest('.flex.items-center');
    
    if (!list || !trigger || !bar) return { error: "Elements not found" };
    
    const listRect = list.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    
    const listStyle = window.getComputedStyle(list);
    const triggerStyle = window.getComputedStyle(trigger);
    const barStyle = window.getComputedStyle(bar);
    
    return {
      bar: {
        height: barRect.height,
        paddingTop: barStyle.paddingTop,
        paddingBottom: barStyle.paddingBottom,
        marginTop: barStyle.marginTop,
        marginBottom: barStyle.marginBottom,
        classes: bar.className
      },
      list: {
        height: listRect.height,
        paddingTop: listStyle.paddingTop,
        paddingBottom: listStyle.paddingBottom,
        marginTop: listStyle.marginTop,
        marginBottom: listStyle.marginBottom,
        classes: list.className
      },
      trigger: {
        height: triggerRect.height,
        paddingTop: triggerStyle.paddingTop,
        paddingBottom: triggerStyle.paddingBottom,
        marginTop: triggerStyle.marginTop,
        marginBottom: triggerStyle.marginBottom,
        classes: trigger.className
      }
    };
  });
  
  console.log(JSON.stringify(dimensions, null, 2));

  await page.screenshot({ path: 'test-results/tabs-before-fix.png' });
  await browser.close();
})();
