const { test, expect } = require('@playwright/test');

test('Debug hook view button click', async ({ page }) => {
  // Track all console messages
  page.on('console', msg => {
    console.log(`Console ${msg.type()}: ${msg.text()}`);
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Verify hook button exists and is clickable
  const hookButton = page.locator('.hook-view-button');
  await expect(hookButton).toBeVisible();
  
  console.log('Hook button found, checking its properties...');
  
  // Get button properties
  const buttonInfo = await hookButton.evaluate(el => ({
    textContent: el.textContent,
    innerHTML: el.innerHTML,
    classList: Array.from(el.classList),
    hasClickListener: el.onclick !== null,
    style: el.style.cssText
  }));
  
  console.log('Button info:', buttonInfo);
  
  // Try clicking and see what happens
  console.log('Clicking hook button...');
  await hookButton.click();
  
  // Wait a moment and check if dialog appeared
  await page.waitForTimeout(2000);
  
  // Check for dialogs
  const dialogs = await page.evaluate(() => {
    const allDialogs = document.querySelectorAll('[class*="dialog"]');
    return Array.from(allDialogs).map(d => ({
      className: d.className,
      visible: d.offsetParent !== null,
      innerHTML: d.innerHTML.substring(0, 200)
    }));
  });
  
  console.log('Dialogs found:', dialogs);
  
  // Check if any elements were added to body after click
  const bodyChildren = await page.evaluate(() => {
    return Array.from(document.body.children).map(el => ({
      tagName: el.tagName,
      className: el.className,
      id: el.id
    }));
  });
  
  console.log('Body children:', bodyChildren);
});