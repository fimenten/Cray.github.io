const { test, expect } = require('@playwright/test');

test.describe('Hook View Full Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('Hook view dialog opens and displays "no hooks" message', async ({ page }) => {
    // Click hook view button
    const hookButton = page.locator('.hook-view-button');
    await expect(hookButton).toBeVisible();
    await hookButton.click();
    
    // Check if dialog opens
    const hookDialog = page.locator('.hook-view-dialog');
    await expect(hookDialog).toBeVisible();
    
    // Verify content
    await expect(hookDialog).toContainText('Tasks Organized by Hooks');
    
    // Should show "no hooks found" message initially
    const hookContent = page.locator('#hook-content');
    await expect(hookContent).toContainText('No tasks with hooks found');
    
    // Close dialog by clicking close button
    const closeButton = page.locator('#close-hook-view');
    await closeButton.click();
    await expect(hookDialog).not.toBeVisible();
  });

  test('Hook view displays hooks after creating tasks with @hook patterns', async ({ page }) => {
    // Create a task with hooks - need to double-click to enter edit mode
    const trayTitle = page.locator('.tray-title').first();
    await trayTitle.dblclick();
    await page.waitForTimeout(200); // Wait for edit mode
    
    // Clear existing content and type new content
    await trayTitle.press('Control+a'); // Select all
    await trayTitle.type('Test task @urgent @work');
    await trayTitle.press('Enter');
    
    // Wait for changes to be processed
    await page.waitForTimeout(1000);
    
    // Open hook view
    const hookButton = page.locator('.hook-view-button');
    await hookButton.click();
    
    const hookDialog = page.locator('.hook-view-dialog');
    await expect(hookDialog).toBeVisible();
    
    // Verify hooks are displayed
    const hookContent = page.locator('#hook-content');
    await expect(hookContent).toContainText('@urgent');
    await expect(hookContent).toContainText('@work');
    await expect(hookContent).toContainText('Test task @urgent @work');
    
    // Close dialog
    const closeButton = page.locator('#close-hook-view');
    await closeButton.click();
    await expect(hookDialog).not.toBeVisible();
  });

  test('Hook view keyboard shortcut Ctrl+T works', async ({ page }) => {
    // Focus on a tray element
    const tray = page.locator('.tray').first();
    await tray.click();
    
    // Use keyboard shortcut
    await page.keyboard.press('Control+t');
    
    // Check if dialog opens
    const hookDialog = page.locator('.hook-view-dialog');
    await expect(hookDialog).toBeVisible();
    
    // Close dialog
    const closeButton = page.locator('#close-hook-view');
    await closeButton.click();
    await expect(hookDialog).not.toBeVisible();
  });

  test('IndexedDB errors are fixed (no version conflicts)', async ({ page }) => {
    // Track console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Perform actions that trigger IndexedDB operations
    const trayTitle = page.locator('.tray-title').first();
    await trayTitle.dblclick();
    await page.waitForTimeout(200);
    
    await trayTitle.press('Control+a');
    await trayTitle.type('Test with @hooks for IndexedDB test');
    await trayTitle.press('Enter');
    
    await page.waitForTimeout(2000);
    
    // Open and close hook view (triggers database operations)
    const hookButton = page.locator('.hook-view-button');
    await hookButton.click();
    
    const hookDialog = page.locator('.hook-view-dialog');
    await expect(hookDialog).toBeVisible();
    
    const closeButton = page.locator('#close-hook-view');
    await closeButton.click();
    
    // Check that no IndexedDB errors occurred
    const indexedDBErrors = consoleErrors.filter(error => 
      error.includes('IndexedDB') || 
      error.includes('VersionError') || 
      error.includes('requested version')
    );
    
    expect(indexedDBErrors).toHaveLength(0);
  });
});