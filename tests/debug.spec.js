const { test, expect } = require('@playwright/test');

test('Debug what is being served', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Take a screenshot to see what's being displayed
  await page.screenshot({ path: 'debug-page.png', fullPage: true });
  
  // Get page title and URL
  const title = await page.title();
  const url = page.url();
  console.log('Page title:', title);
  console.log('Page URL:', url);
  
  // Check what HTML is being served
  const bodyContent = await page.evaluate(() => document.body.innerHTML);
  console.log('Body content length:', bodyContent.length);
  console.log('Body content preview:', bodyContent.substring(0, 500));
  
  // Check for specific elements
  const elements = await page.evaluate(() => {
    return {
      scripts: Array.from(document.querySelectorAll('script')).map(s => s.src || 'inline'),
      links: Array.from(document.querySelectorAll('link')).map(l => l.href),
      divs: document.querySelectorAll('div').length,
      classes: Array.from(document.querySelectorAll('[class]')).map(el => el.className)
    };
  });
  
  console.log('Scripts found:', elements.scripts);
  console.log('Links found:', elements.links);
  console.log('Div count:', elements.divs);
  console.log('Classes found:', elements.classes.slice(0, 10));
});