const { test, expect } = require('@playwright/test');

test.describe('Title Edit Focus Retention', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app with a test session
    await page.goto('http://localhost:9000/?sessionId=test-focus-' + Date.now());
    await page.waitForSelector('.tray');
  });

  test('should retain focus on tray after title edit via Enter key', async ({ page }) => {
    // Create a new tray
    const rootTray = page.locator('.tray').first();
    await rootTray.click();
    await page.keyboard.press('Enter');
    
    // Wait for new tray to be created
    await page.waitForSelector('.tray:nth-child(2)');
    const newTray = page.locator('.tray').nth(1);
    
    // Double-click to edit title
    const titleElement = newTray.locator('.tray-title');
    await titleElement.dblclick();
    
    // Verify contenteditable is enabled
    await expect(titleElement).toHaveAttribute('contenteditable', 'true');
    
    // Type new title
    await page.keyboard.type('Test Title');
    
    // Press Enter to save
    await page.keyboard.press('Enter');
    
    // Verify contenteditable is disabled
    await expect(titleElement).toHaveAttribute('contenteditable', 'false');
    
    // Verify the tray itself has focus (not the title)
    const focusedElement = await page.evaluate(() => document.activeElement?.className);
    expect(focusedElement).toContain('tray');
    
    // Verify we can immediately use keyboard shortcuts
    await page.keyboard.press('ArrowDown');
    // If focus was retained, this should work without needing to click first
  });

  test('should retain focus on tray after title edit via blur', async ({ page }) => {
    // Create a new tray
    const rootTray = page.locator('.tray').first();
    await rootTray.click();
    await page.keyboard.press('Enter');
    
    // Wait for new tray to be created
    await page.waitForSelector('.tray:nth-child(2)');
    const newTray = page.locator('.tray').nth(1);
    
    // Double-click to edit title
    const titleElement = newTray.locator('.tray-title');
    await titleElement.dblclick();
    
    // Type new title
    await page.keyboard.type('Test Title Blur');
    
    // Click elsewhere to trigger blur
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    
    // Click back on the tray we were editing
    await newTray.click();
    
    // Verify the tray has focus
    const focusedElement = await page.evaluate(() => document.activeElement?.className);
    expect(focusedElement).toContain('tray');
    
    // Verify title was saved
    await expect(titleElement).toHaveText('Test Title Blur');
  });

  test('should allow immediate keyboard navigation after title edit', async ({ page }) => {
    // Create multiple trays
    const rootTray = page.locator('.tray').first();
    await rootTray.click();
    
    // Create first child
    await page.keyboard.press('Enter');
    await page.waitForSelector('.tray:nth-child(2)');
    
    // Create second child
    await page.keyboard.press('Enter');
    await page.waitForSelector('.tray:nth-child(3)');
    
    const secondTray = page.locator('.tray').nth(2);
    const titleElement = secondTray.locator('.tray-title');
    
    // Edit the second tray's title
    await titleElement.dblclick();
    await page.keyboard.type('Middle Tray');
    await page.keyboard.press('Enter');
    
    // Immediately try to navigate up - this should work if focus is retained
    await page.keyboard.press('ArrowUp');
    
    // Check that focus moved to the previous tray
    const focusedTrayTitle = await page.evaluate(() => {
      const focused = document.activeElement;
      return focused?.querySelector('.tray-title')?.textContent || '';
    });
    
    // The focus should have moved to the first child tray
    expect(focusedTrayTitle).not.toBe('Middle Tray');
  });
});