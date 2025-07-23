import { test, expect } from '@playwright/test';

test.describe('Mobile Basic Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Use unique session ID for each test to avoid interference
    const sessionId = `mobile-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await page.goto(`/?sessionId=${sessionId}`);
    await page.waitForLoadState('networkidle');
  });

  test('should load application on mobile viewport', async ({ page }) => {
    const rootTray = page.locator('.tray').first();
    await expect(rootTray).toBeVisible();
    await expect(rootTray).toContainText('Root Tray');
    
    // Check that default children are present and visible on mobile
    await expect(page.locator('.tray-title').filter({ hasText: 'ToDo' })).toBeVisible();
    await expect(page.locator('.tray-title').filter({ hasText: 'Doing' })).toBeVisible();
    await expect(page.locator('.tray-title').filter({ hasText: 'Done' })).toBeVisible();
  });

  test('should create new tray with touch interaction', async ({ page }) => {
    // Focus a tray with touch tap
    await page.locator('.tray').first().tap();
    
    // Find and tap the add button
    const addButton = page.locator('.add-button');
    await expect(addButton).toBeVisible();
    await addButton.tap();
    
    // Wait for the new tray to be created and in edit mode
    await page.waitForTimeout(500);
    
    // Type in the new tray name using mobile keyboard
    await page.keyboard.type('Mobile New Tray');
    await page.keyboard.press('Enter');
    
    // Verify the text was saved
    await expect(page.locator('.tray .tray-title').filter({ hasText: 'Mobile New Tray' })).toBeVisible();
  });

  test('should edit tray content with touch double-tap', async ({ page }) => {
    const titleElement = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    
    // Use double-click event directly since mobile browsers convert double-tap to dblclick
    await titleElement.dblclick();
    
    // Wait longer for mobile interaction to complete
    await page.waitForTimeout(200);
    
    // Wait for contenteditable to be enabled with timeout
    await expect(titleElement).toHaveAttribute('contenteditable', 'true', { timeout: 3000 });
    
    // Select all and type new text
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Mobile Updated ToDo');
    await page.keyboard.press('Enter');
    
    // Wait for contenteditable to be disabled with timeout
    await expect(titleElement).toHaveAttribute('contenteditable', 'false', { timeout: 3000 });
    
    // Verify the update
    await expect(page.locator('.tray-title').filter({ hasText: 'Mobile Updated ToDo' })).toBeVisible();
  });

  test('should focus and navigate trays with touch', async ({ page }) => {
    // Tap on ToDo tray to focus it
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const todoTray = todoTitle.locator('..');
    await todoTray.tap();
    
    // Verify focus state
    const initialFocus = await page.evaluate(() => {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.classList.contains('tray')) {
        const title = activeEl.querySelector('.tray-title');
        return title ? title.textContent : '';
      }
      return '';
    });
    expect(initialFocus).toBe('ToDo');
    
    // Tap on next tray (Doing) to change focus
    const doingTitle = page.locator('.tray-title').filter({ hasText: 'Doing' });
    const doingTray = doingTitle.locator('..');
    await doingTray.tap();
    
    const newFocus = await page.evaluate(() => {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.classList.contains('tray')) {
        const title = activeEl.querySelector('.tray-title');
        return title ? title.textContent : '';
      }
      return '';
    });
    expect(newFocus).toBe('Doing');
  });

  test('should handle viewport orientation changes', async ({ page }) => {
    // Test in portrait mode (default)
    await expect(page.locator('.tray').first()).toBeVisible();
    
    // Simulate landscape orientation
    await page.setViewportSize({ width: 736, height: 414 }); // iPhone landscape
    await page.waitForTimeout(100);
    
    // Verify content is still accessible and visible
    await expect(page.locator('.tray').first()).toBeVisible();
    await expect(page.locator('.tray-title').filter({ hasText: 'ToDo' })).toBeVisible();
    
    // Return to portrait
    await page.setViewportSize({ width: 414, height: 736 });
    await page.waitForTimeout(100);
    
    // Verify content is still accessible
    await expect(page.locator('.tray').first()).toBeVisible();
  });

  test('should handle mobile keyboard input properly', async ({ page }) => {
    // Focus a tray
    await page.locator('.tray').first().tap();
    
    // Add new tray to test keyboard input
    const addButton = page.locator('.add-button');
    await addButton.tap();
    await page.waitForTimeout(500);
    
    // Test various mobile keyboard scenarios
    await page.keyboard.type('Mobile Test 123!@#');
    await page.keyboard.press('Enter');
    
    // Verify the text input worked correctly
    await expect(page.locator('.tray .tray-title').filter({ hasText: 'Mobile Test 123!@#' })).toBeVisible();
  });

  test('should create nested trays on mobile', async ({ page }) => {
    // Tap on ToDo tray to focus it
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const parentTray = todoTitle.locator('..');
    await parentTray.tap();
    
    // Create child using keyboard shortcut (touch devices still support keyboard)
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Mobile Child Tray');
    await page.keyboard.press('Enter');
    
    // Verify nested structure
    await expect(page.locator('.tray-title').filter({ hasText: 'Mobile Child Tray' })).toBeVisible();
  });

  test('should handle touch scrolling with many trays', async ({ page }) => {
    // Focus root tray and create multiple child trays to test scrolling
    const rootTray = page.locator('.tray').first();
    await rootTray.tap();
    
    // Create several trays to enable scrolling
    for (let i = 1; i <= 5; i++) {
      await page.keyboard.press('Control+Enter');
      await page.keyboard.type(`Mobile Tray ${i}`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
    }
    
    // Verify we can scroll to see all trays
    const lastTray = page.locator('.tray-title').filter({ hasText: 'Mobile Tray 5' });
    await lastTray.scrollIntoViewIfNeeded();
    await expect(lastTray).toBeVisible();
    
    // Tap the last tray to ensure it's interactive
    await lastTray.locator('..').tap();
    
    const focusedTrayName = await page.evaluate(() => {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.classList.contains('tray')) {
        const title = activeEl.querySelector('.tray-title');
        return title ? title.textContent : '';
      }
      return '';
    });
    expect(focusedTrayName).toBe('Mobile Tray 5');
  });

  test('should toggle tray collapse/expand with touch', async ({ page }) => {
    // Tap on ToDo tray to focus it
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const parentTray = todoTitle.locator('..');
    await parentTray.tap();
    
    // Add a child to have something to collapse
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Mobile Test Child');
    await page.keyboard.press('Enter');
    
    // Verify child is visible
    await expect(page.locator('.tray-title').filter({ hasText: 'Mobile Test Child' })).toBeVisible();
    
    // Focus parent again
    await parentTray.tap();
    
    // Toggle fold using keyboard (mobile keyboards still support Enter)
    await page.keyboard.press('Enter');
    
    // Toggle fold again to expand
    await page.keyboard.press('Enter');
    
    // Verify child is visible again
    await expect(page.locator('.tray-title').filter({ hasText: 'Mobile Test Child' })).toBeVisible();
  });
});