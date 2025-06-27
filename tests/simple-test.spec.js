const { test, expect } = require('@playwright/test');

test('IndexedDB version fix verification', async ({ page }) => {
  // Track console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Navigate to the application
  await page.goto('/');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000); // Give app time to initialize
  
  // Filter for IndexedDB version errors
  const indexedDBErrors = consoleErrors.filter(error => 
    error.includes('IndexedDB') || 
    error.includes('VersionError') || 
    error.includes('requested version')
  );
  
  console.log('Console errors found:', consoleErrors.length);
  console.log('IndexedDB errors found:', indexedDBErrors.length);
  if (indexedDBErrors.length > 0) {
    console.log('IndexedDB errors:', indexedDBErrors);
  }
  
  // Test should pass if no IndexedDB version errors
  expect(indexedDBErrors).toHaveLength(0);
  
  // Verify hook button exists (this shows the app loaded)
  const hookButton = page.locator('.hook-view-button');
  await expect(hookButton).toBeVisible({ timeout: 10000 });
});

test('Hook view opens without errors', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Click hook view button
  const hookButton = page.locator('.hook-view-button');
  await expect(hookButton).toBeVisible();
  await hookButton.click();
  
  // Check if dialog opens
  const hookDialog = page.locator('.hook-view-dialog');
  await expect(hookDialog).toBeVisible();
  
  // Should show "no hooks found" message initially
  const hookContent = page.locator('#hook-content');
  await expect(hookContent).toContainText('No tasks with hooks found');
  
  // Close dialog
  await page.keyboard.press('Escape');
  await expect(hookDialog).not.toBeVisible();
});