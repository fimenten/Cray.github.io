const { test, expect } = require('@playwright/test');

test.describe('Hook View Dialog', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the application to load - check for body first
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Wait for app initialization and DOM to be ready
    await page.waitForTimeout(3000);
    
    // Try to find tray element, if not found that's ok - might need to be created
    try {
      await page.waitForSelector('.tray', { timeout: 5000 });
    } catch (e) {
      // Tray might not exist yet, that's fine for some tests
      console.log('No .tray element found, continuing...');
    }
  });

  test('should fix IndexedDB version conflict', async ({ page }) => {
    // Clear IndexedDB before test to start fresh
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const deleteReq = indexedDB.deleteDatabase('TrayDatabase');
        deleteReq.onsuccess = () => resolve();
        deleteReq.onerror = () => resolve(); // Continue even if deletion fails
      });
    });

    // Reload page to trigger fresh database creation
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Increased wait time for database initialization

    // Check for IndexedDB errors in console
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('IndexedDB')) {
        consoleErrors.push(msg.text());
      }
    });

    // Wait for the application to be fully initialized
    await page.waitForSelector('.tray', { timeout: 10000 });
    
    // Focus root tray and create a new tray with hooks
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(500); // Wait for input field to appear
    await page.keyboard.type('Test task @urgent @work');
    await page.keyboard.press('Enter');

    // Wait for data to be persisted to IndexedDB
    await page.waitForTimeout(2000);

    // Check that no IndexedDB errors occurred
    expect(consoleErrors).toHaveLength(0);

    // Wait for hook view button to be available
    const hookButton = page.locator('.hook-view-button');
    await expect(hookButton).toBeVisible({ timeout: 5000 });
    await hookButton.click();

    // Check if dialog opens successfully
    const hookDialog = page.locator('.hook-view-dialog');
    await expect(hookDialog).toBeVisible({ timeout: 5000 });

    // Verify hooks are displayed
    const hookContent = page.locator('#hook-content');
    await expect(hookContent).toContainText('@urgent', { timeout: 5000 });
    await expect(hookContent).toContainText('@work', { timeout: 5000 });
  });

  test('should open hook view dialog via keyboard shortcut', async ({ page }) => {
    // Clear any existing errors
    await page.evaluate(() => console.clear());

    // Wait for application to be fully loaded
    await page.waitForSelector('.tray', { timeout: 10000 });

    // Focus root tray and create a tray with hooks
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(500); // Wait for input field
    await page.keyboard.type('Another task @personal @important');
    await page.keyboard.press('Enter');

    // Wait for the tray to be created and data to be persisted
    await page.waitForTimeout(2000);

    // Focus any tray to ensure keyboard shortcut works
    await rootTray.focus();
    await page.waitForTimeout(500);
    
    // Use keyboard shortcut Ctrl+T to open hook view
    await page.keyboard.press('Control+t');
    await page.waitForTimeout(1000); // Increased wait time

    // Check if dialog opens
    const hookDialog = page.locator('.hook-view-dialog');
    await expect(hookDialog).toBeVisible({ timeout: 5000 });

    // Verify content
    await expect(hookDialog).toContainText('Tasks Organized by Hooks', { timeout: 5000 });
    await expect(hookDialog).toContainText('@personal', { timeout: 5000 });
    await expect(hookDialog).toContainText('@important', { timeout: 5000 });

    // Close dialog by clicking outside
    await page.mouse.click(10, 10);
    await page.waitForTimeout(1000);
    await expect(hookDialog).not.toBeVisible({ timeout: 5000 });
  });

  test('should show "no hooks found" message when no hooks exist', async ({ page }) => {
    // Click hook view button without creating any hooks
    const hookButton = page.locator('.hook-view-button');
    await hookButton.click();

    // Check dialog opens
    const hookDialog = page.locator('.hook-view-dialog');
    await expect(hookDialog).toBeVisible();

    // Verify no hooks message is displayed
    const hookContent = page.locator('#hook-content');
    await expect(hookContent).toContainText('No tasks with hooks found');
  });

  test('should allow navigation to hooked tasks', async ({ page }) => {
    // Focus root tray
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create multiple trays with the same hook
    const tasks = [
      'First task @shared',
      'Second task @shared',
      'Third task @different'
    ];

    for (let i = 0; i < tasks.length; i++) {
      await page.keyboard.press('Control+Enter');
      await page.keyboard.type(tasks[i]);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }

    // Open hook view
    const hookButton = page.locator('.hook-view-button');
    await hookButton.click();
    await page.waitForTimeout(500);

    const hookDialog = page.locator('.hook-view-dialog');
    await expect(hookDialog).toBeVisible();

    // Click on a task in the hook view
    const taskItem = hookDialog.locator('text=First task @shared').first();
    await taskItem.click();
    await page.waitForTimeout(500);

    // Dialog should close and task should be focused
    await expect(hookDialog).not.toBeVisible();
  });
});