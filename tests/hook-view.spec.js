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
    await page.waitForSelector('.tray');

    // Check for IndexedDB errors in console
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('IndexedDB')) {
        consoleErrors.push(msg.text());
      }
    });

    // Create a tray with hooks by editing the title
    const trayTitle = page.locator('.tray-title').first();
    await trayTitle.click();
    await trayTitle.fill('Test task @urgent @work');
    await trayTitle.press('Enter');

    // Wait a moment for any async operations
    await page.waitForTimeout(1000);

    // Check that no IndexedDB errors occurred
    expect(consoleErrors).toHaveLength(0);

    // Try to open hook view dialog
    const hookButton = page.locator('.hook-view-button');
    await expect(hookButton).toBeVisible();
    await hookButton.click();

    // Check if dialog opens successfully
    const hookDialog = page.locator('.hook-view-dialog');
    await expect(hookDialog).toBeVisible();

    // Verify hooks are displayed
    const hookContent = page.locator('#hook-content');
    await expect(hookContent).toContainText('@urgent');
    await expect(hookContent).toContainText('@work');
  });

  test('should open hook view dialog via keyboard shortcut', async ({ page }) => {
    // Clear any existing errors
    await page.evaluate(() => console.clear());

    // Create a tray with hooks
    const trayTitle = page.locator('.tray-title').first();
    await trayTitle.click();
    await trayTitle.fill('Another task @personal @important');
    await trayTitle.press('Enter');

    // Wait for the tray to be focused
    await page.waitForTimeout(500);

    // Use keyboard shortcut Ctrl+T to open hook view
    await page.keyboard.press('Control+t');

    // Check if dialog opens
    const hookDialog = page.locator('.hook-view-dialog');
    await expect(hookDialog).toBeVisible();

    // Verify content
    await expect(hookDialog).toContainText('Tasks Organized by Hooks');
    await expect(hookDialog).toContainText('@personal');
    await expect(hookDialog).toContainText('@important');

    // Close dialog with Escape
    await page.keyboard.press('Escape');
    await expect(hookDialog).not.toBeVisible();
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
    // Create multiple trays with the same hook
    const tasks = [
      'First task @shared',
      'Second task @shared',
      'Third task @different'
    ];

    for (let i = 0; i < tasks.length; i++) {
      if (i > 0) {
        // Add new child for subsequent tasks
        await page.keyboard.press('Control+Enter');
        await page.waitForTimeout(200);
      }
      
      const trayTitle = page.locator('.tray-title').nth(i);
      await trayTitle.click();
      await trayTitle.fill(tasks[i]);
      await trayTitle.press('Enter');
      await page.waitForTimeout(200);
    }

    // Open hook view
    const hookButton = page.locator('.hook-view-button');
    await hookButton.click();

    const hookDialog = page.locator('.hook-view-dialog');
    await expect(hookDialog).toBeVisible();

    // Click on a task in the hook view
    const taskItem = hookDialog.locator('text=First task @shared').first();
    await taskItem.click();

    // Dialog should close and task should be focused
    await expect(hookDialog).not.toBeVisible();
  });
});