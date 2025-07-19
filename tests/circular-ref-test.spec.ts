import { test, expect } from '@playwright/test';

test.describe('Circular Reference Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Create the same structure: Doing with Nested Task
    const doingTitle = page.locator('.tray-title').filter({ hasText: 'Doing' });
    const doingTray = doingTitle.locator('..');
    await doingTray.click();
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Nested Task');
    await page.keyboard.press('Enter');
  });

  test('should test what happens when dragging parent into child', async ({ page }) => {
    const doingTitle = page.locator('.tray-title').filter({ hasText: 'Doing' });
    const doingTray = doingTitle.locator('..');
    const nestedTitle = page.locator('.tray-title').filter({ hasText: 'Nested Task' });
    const nestedTask = nestedTitle.locator('..');
    
    // Log initial structure
    const initialStructure = await page.evaluate(() => {
      const trays = Array.from(document.querySelectorAll('.tray')).map(tray => {
        const title = tray.querySelector('.tray-title')?.textContent;
        const parent = tray.parentElement?.closest('.tray')?.querySelector('.tray-title')?.textContent;
        return { title, parent };
      });
      return trays;
    });
    console.log('Initial structure:', initialStructure);
    
    await page.screenshot({ path: 'before-circular-drag.png' });
    
    // Try to drag Doing into its own child (Nested Task)
    await doingTray.dragTo(nestedTask);
    
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 'after-circular-drag.png' });
    
    // Log final structure
    const finalStructure = await page.evaluate(() => {
      const trays = Array.from(document.querySelectorAll('.tray')).map(tray => {
        const title = tray.querySelector('.tray-title')?.textContent;
        const parent = tray.parentElement?.closest('.tray')?.querySelector('.tray-title')?.textContent;
        return { title, parent };
      });
      return trays;
    });
    console.log('Final structure:', finalStructure);
    
    // Check if both Doing and Nested Task are still visible
    await expect(doingTray).toBeVisible();
    await expect(nestedTask).toBeVisible();
  });
});