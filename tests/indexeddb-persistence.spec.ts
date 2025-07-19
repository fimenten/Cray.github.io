import { test, expect } from '@playwright/test';

test.describe('IndexedDB Persistence', () => {
  test('should persist data across page reloads', async ({ page }) => {
    const sessionId = `persist-test-${Date.now()}`;
    await page.goto(`/?sessionId=${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Create some test data
    await page.locator('.tray').first().click();
    
    // Create multiple trays with specific content
    const testData = [
      { name: 'Persistent Tray 1', children: ['Child 1.1', 'Child 1.2'] },
      { name: 'Persistent Tray 2', children: ['Child 2.1'] },
      { name: 'Persistent Tray 3', children: [] }
    ];
    
    for (const item of testData) {
      // Click the add button to create a new sibling tray
      const addButton = page.locator('.add-button');
      await addButton.click();
      await page.waitForTimeout(200);
      
      await page.keyboard.type(item.name);
      await page.keyboard.press('Enter');
      
      if (item.children.length > 0) {
        const parentTray = page.locator('.tray').filter({ hasText: item.name }).first();
        await parentTray.click();
        
        for (const child of item.children) {
          await page.keyboard.press('Control+Enter');
          await page.keyboard.type(child);
          await page.keyboard.press('Escape');
          await parentTray.click();
        }
      }
      
      await page.locator('.tray').first().click();
    }
    
    // Wait for auto-save (should happen within 1 second)
    await page.waitForTimeout(1500);
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify all data is restored
    for (const item of testData) {
      const tray = page.locator('.tray-title').filter({ hasText: item.name });
      await expect(tray).toBeVisible();
      
      for (const child of item.children) {
        const childTray = page.locator('.tray-title').filter({ hasText: child });
        await expect(childTray).toBeVisible();
      }
    }
  });

  test('should handle concurrent saves gracefully', async ({ page }) => {
    const sessionId = `concurrent-test-${Date.now()}`;
    await page.goto(`/?sessionId=${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Create multiple trays rapidly
    await page.locator('.tray').first().click();
    
    for (let i = 1; i <= 10; i++) {
      const addButton = page.locator('.add-button');
      await addButton.click();
      await page.waitForTimeout(50);
      await page.keyboard.type(`Rapid Tray ${i}`);
      await page.keyboard.press('Enter');
    }
    
    // Wait for all saves to complete
    await page.waitForTimeout(2000);
    
    // Reload and verify
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    for (let i = 1; i <= 10; i++) {
      await expect(page.locator('.tray-title').filter({ hasText: new RegExp(`^Rapid Tray ${i}$`) })).toBeVisible();
    }
  });

  test('should restore collapsed state', async ({ page }) => {
    const sessionId = `collapsed-test-${Date.now()}`;
    await page.goto(`/?sessionId=${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Create parent with children
    await page.locator('.tray').first().click();
    const addButton = page.locator('.add-button');
    await addButton.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Collapsible Parent');
    await page.keyboard.press('Enter');
    
    const parentTray = page.locator('.tray').filter({ hasText: 'Collapsible Parent' }).first();
    await parentTray.click();
    
    // Add children
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Hidden Child 1');
    await page.keyboard.press('Escape');
    
    await parentTray.click();
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Hidden Child 2');
    await page.keyboard.press('Escape');
    
    // Collapse the parent by clicking the right fold button (visible when unfolded)
    await parentTray.click();
    const foldButton = parentTray.locator('.tray-fold-button-right').first();
    await foldButton.click();
    
    // Verify content is hidden (folded state)
    const parentContent = parentTray.locator('.tray-content').first();
    await expect(parentContent).toHaveCSS('display', 'none');
    
    // Wait for save
    await page.waitForTimeout(1500);
    
    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify parent is still collapsed
    const restoredParent = page.locator('.tray').filter({ hasText: 'Collapsible Parent' }).first();
    const restoredContent = restoredParent.locator('.tray-content').first();
    await expect(restoredContent).toHaveCSS('display', 'none');
    
    // The main test is that collapsed state persisted - this is working!
    // Additional verification: check that the fold button is visible (indicates children exist)
    const restoredFoldButton = restoredParent.locator('.tray-fold-button').first();
    await expect(restoredFoldButton).toBeVisible();
  });

  test('should handle storage quota gracefully', async ({ page }) => {
    const sessionId = `quota-test-${Date.now()}`;
    await page.goto(`/?sessionId=${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Create a very large tray structure
    await page.locator('.tray').first().click();
    
    // Create parent
    const addButton = page.locator('.add-button');
    await addButton.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Large Data Parent');
    await page.keyboard.press('Enter');
    
    const parentTray = page.locator('.tray').filter({ hasText: 'Large Data Parent' }).first();
    await parentTray.click();
    
    // Create many children with large content
    const largeText = 'This is a very long text content that simulates large data storage. '.repeat(50);
    
    for (let i = 1; i <= 5; i++) {
      await page.keyboard.press('Control+Enter');
      await page.keyboard.type(`Large Child ${i}: ${largeText}`);
      await page.keyboard.press('Escape');
      await parentTray.click();
    }
    
    // Wait for save
    await page.waitForTimeout(2000);
    
    // Reload and verify
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check that at least the parent is restored
    await expect(page.locator('.tray-title').filter({ hasText: 'Large Data Parent' })).toBeVisible();
  });

  test('should clear old session data on new session', async ({ page, context }) => {
    const sessionId = `session-clear-test-${Date.now()}`;
    await page.goto(`/?sessionId=${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Create test data
    await page.locator('.tray').first().click();
    const addButton = page.locator('.add-button');
    await addButton.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Session 1 Data');
    await page.keyboard.press('Enter');
    
    // Wait for save
    await page.waitForTimeout(1500);
    
    // Get current session ID
    const sessionId1 = await page.evaluate(() => localStorage.getItem('sessionId'));
    
    // Navigate to a completely new session with different sessionId
    const newSessionId = `new-session-${Date.now()}`;
    await page.goto(`/?sessionId=${newSessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Should have the new session ID
    const sessionId2 = await page.evaluate(() => {
      const params = new URLSearchParams(window.location.search);
      return params.get('sessionId');
    });
    expect(sessionId2).toBe(newSessionId);
    expect(sessionId2).not.toBe(sessionId1);
    
    // Old data should not be visible
    await expect(page.locator('.tray-title').filter({ hasText: 'Session 1 Data' })).not.toBeVisible();
    
    // Should have clean root with default content (not the old session data)
    const rootTray = page.locator('.tray').first();
    await expect(rootTray).toBeVisible();
    await expect(rootTray).toContainText('Root Tray');
    
    // Should have default trays (ToDo, Doing, Done) not custom session data
    await expect(page.locator('.tray-title').filter({ hasText: 'ToDo' })).toBeVisible();
    await expect(page.locator('.tray-title').filter({ hasText: 'Doing' })).toBeVisible();
    await expect(page.locator('.tray-title').filter({ hasText: 'Done' })).toBeVisible();
  });

  test('should handle IndexedDB errors gracefully', async ({ page }) => {
    const sessionId = `error-test-${Date.now()}`;
    await page.goto(`/?sessionId=${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Inject error into IndexedDB operations
    await page.evaluate(() => {
      const originalOpen = window.indexedDB.open;
      let callCount = 0;
      window.indexedDB.open = function(...args) {
        callCount++;
        // Fail every third call to simulate intermittent errors
        if (callCount % 3 === 0) {
          throw new Error('Simulated IndexedDB error');
        }
        return originalOpen.apply(this, args);
      };
    });
    
    // Try to create data despite errors
    await page.locator('.tray').first().click();
    const addButton = page.locator('.add-button');
    await addButton.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Error Test Tray');
    await page.keyboard.press('Enter');
    
    // The app should still be functional
    await expect(page.locator('.tray-title').filter({ hasText: 'Error Test Tray' })).toBeVisible();
    
    // Restore normal IndexedDB
    await page.evaluate(() => {
      location.reload();
    });
    
    await page.waitForLoadState('networkidle');
    
    // App should still work
    await expect(page.locator('.tray').first()).toBeVisible();
  });
});