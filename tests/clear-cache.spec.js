const { test, expect } = require('@playwright/test');

test('Clear IndexedDB cache and verify no version errors', async ({ page }) => {
  // Navigate to the application
  await page.goto('/');
  
  // Delete the IndexedDB database completely
  await page.evaluate(() => {
    return new Promise((resolve) => {
      const deleteReq = indexedDB.deleteDatabase('TrayDatabase');
      deleteReq.onsuccess = () => {
        console.log('TrayDatabase deleted successfully');
        resolve();
      };
      deleteReq.onerror = () => {
        console.log('Error deleting database, but continuing...');
        resolve();
      };
      deleteReq.onblocked = () => {
        console.log('Database deletion blocked, but continuing...');
        resolve();
      };
    });
  });
  
  // Also clear localStorage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Reload the page to start fresh
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Track console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Wait and let the app initialize
  await page.waitForTimeout(5000);
  
  // Try to create a tray with hooks to trigger database operations
  const trayTitle = page.locator('.tray-title').first();
  await trayTitle.dblclick();
  await page.waitForTimeout(200);
  await trayTitle.press('Control+a');
  await trayTitle.type('Fresh start @test @cleared');
  await trayTitle.press('Enter');
  
  await page.waitForTimeout(2000);
  
  // Open hook view to trigger more database operations
  const hookButton = page.locator('.hook-view-button');
  await hookButton.click();
  
  const hookDialog = page.locator('.hook-view-dialog');
  await expect(hookDialog).toBeVisible();
  
  // Should show the hooks we just created
  await expect(hookDialog).toContainText('@test');
  await expect(hookDialog).toContainText('@cleared');
  
  // Close dialog
  const closeButton = page.locator('#close-hook-view');
  await closeButton.click();
  
  // Check for any IndexedDB errors
  const indexedDBErrors = consoleErrors.filter(error => 
    error.includes('IndexedDB') || 
    error.includes('VersionError') || 
    error.includes('requested version')
  );
  
  console.log('All console errors:', consoleErrors);
  console.log('IndexedDB-specific errors:', indexedDBErrors);
  
  // Should have no IndexedDB version errors
  expect(indexedDBErrors).toHaveLength(0);
});