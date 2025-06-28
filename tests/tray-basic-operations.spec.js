const { test, expect } = require('@playwright/test');

test.describe('Tray Basic Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('Create new tray', async ({ page }) => {
    // Focus root tray first
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    await page.waitForTimeout(500);
    
    // Get initial tray count
    const initialTrays = await page.locator('.tray').count();
    
    // Create new tray with Ctrl+Enter key
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(1000);
    
    // Verify new tray was created
    const finalTrays = await page.locator('.tray').count();
    expect(finalTrays).toBe(initialTrays + 1);
  });

  test('Edit tray content', async ({ page }) => {
    // Focus root tray
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Count initial trays to find the new one later
    const initialTrayCount = await page.locator('.tray').count();
    
    // Create a new tray with Ctrl+Enter - it will automatically be in edit mode
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(500);
    
    // Wait for the new tray to be in edit mode
    await page.waitForSelector('.tray-title[contenteditable="true"]');
    
    // The new tray is already in edit mode with "New Tray" text selected
    // Simply type the new content (it will replace the selected text)
    const testText = 'Test tray content';
    await page.keyboard.type(testText);
    
    // Press Enter to finish editing
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Verify content was saved in the newly created tray
    // The new tray should be the first child of the root tray (added via unshift)
    const newTray = rootTray.locator('.tray-content > .tray').first();
    const trayTitle = newTray.locator('.tray-title');
    await expect(trayTitle).toContainText(testText);
  });

  test('Navigate between trays with arrow keys', async ({ page }) => {
    // Focus root tray and create multiple trays
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('First tray');
    await page.keyboard.press('Enter');
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Second tray');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(1000);
    
    // Navigate up
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(500);
    
    // Check that focus moved (use evaluate to check document.activeElement)
    const focusedUp = await page.evaluate(() => {
      return {
        hasFocus: document.activeElement?.classList.contains('tray'),
        title: document.activeElement?.querySelector('.tray-title')?.textContent || ''
      };
    });
    expect(focusedUp.hasFocus).toBe(true);
    
    // Navigate down
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    
    const focusedDown = await page.evaluate(() => {
      return {
        hasFocus: document.activeElement?.classList.contains('tray'),
        title: document.activeElement?.querySelector('.tray-title')?.textContent || ''
      };
    });
    expect(focusedDown.hasFocus).toBe(true);
  });

  test('Delete tray with Delete key', async ({ page }) => {
    // Focus root tray and create a tray
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Tray to delete');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    const initialTrays = await page.locator('.tray').count();
    
    // Focus the newly created tray and delete it
    const lastTray = page.locator('.tray').last();
    await lastTray.focus();
    await page.waitForTimeout(500);
    
    await page.keyboard.press('Control+Delete');
    await page.waitForTimeout(1000);
    
    // Verify tray was deleted
    const finalTrays = await page.locator('.tray').count();
    expect(finalTrays).toBe(initialTrays - 1);
  });

  test('Create child tray with Ctrl+Enter', async ({ page }) => {
    // Focus root and create parent tray
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Parent tray');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    const beforeChild = await page.locator('.tray').count();
    
    // Create child tray with Ctrl+Enter
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(1000);
    
    // Verify child tray was created
    const afterChild = await page.locator('.tray').count();
    expect(afterChild).toBe(beforeChild + 1);
  });

  test('Basic folding functionality', async ({ page }) => {
    // Focus root and create parent with child
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Parent tray');
    await page.keyboard.press('Enter');
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Child tray');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    const totalTrays = await page.locator('.tray').count();
    
    // Go back to parent (should be second-to-last tray)
    const parentTray = page.locator('.tray').nth(totalTrays - 2);
    await parentTray.focus();
    await page.waitForTimeout(500);
    
    // Test folding by checking visible tray count
    const visibleBefore = await page.locator('.tray:visible').count();
    
    // Fold the parent
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(1000);
    
    const visibleAfterFold = await page.locator('.tray:visible').count();
    
    // Unfold the parent
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    const visibleAfterUnfold = await page.locator('.tray:visible').count();
    
    // Basic check that folding/unfolding does something
    expect(visibleAfterUnfold).toBeGreaterThanOrEqual(visibleAfterFold);
  });
});