const { test, expect } = require('@playwright/test');

test('Check if app loads completely', async ({ page }) => {
  // Track console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Check for script tags
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => ({
      src: s.src,
      hasContent: s.innerHTML.length > 0
    }));
  });
  
  console.log('Scripts found:', scripts);
  
  // Check if bundle.js is loaded
  const bundleScript = scripts.find(s => s.src.includes('bundle.js'));
  if (!bundleScript) {
    console.log('Bundle.js not found, checking if script is inline...');
  }
  
  // Check if left bar elements exist
  const leftBar = page.locator('.left-bar');
  await expect(leftBar).toBeVisible({ timeout: 10000 });
  
  // Check for hook button specifically
  const hookButton = page.locator('.hook-view-button');
  await expect(hookButton).toBeVisible();
  
  console.log('Console errors:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors.slice(0, 5));
  }
});