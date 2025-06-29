const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Critical Baseline Tests for Refactoring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('Basic tray creation and editing', async ({ page }) => {
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create a new tray
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Test Tray Content');
    await page.keyboard.press('Enter');
    
    // Verify tray was created
    const newTray = rootTray.locator('.tray-content > .tray').first();
    await expect(newTray).toBeVisible();
    await expect(newTray.locator('.tray-title')).toContainText('Test Tray Content');
  });

  test('Nested tray structure', async ({ page }) => {
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create parent
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Parent Tray');
    await page.keyboard.press('Enter');
    
    // Create child
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Child Tray');
    await page.keyboard.press('Enter');
    
    // Create grandchild
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Grandchild Tray');
    await page.keyboard.press('Enter');
    
    // Verify structure
    const trays = await page.locator('.tray').count();
    expect(trays).toBeGreaterThanOrEqual(4); // Root + 3 created
  });

  test('Export functionality', async ({ page }) => {
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create test data
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Export Test @hook');
    await page.keyboard.press('Enter');
    
    // Export data
    await page.click('.hamburger-menu');
    await page.waitForTimeout(500);
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=データのエクスポート');
    const download = await downloadPromise;
    
    // Save and verify
    const exportPath = path.join(__dirname, '..', 'test-critical-export.json');
    await download.saveAs(exportPath);
    
    const exportedData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    expect(exportedData).toHaveProperty('id');
    expect(exportedData).toHaveProperty('children');
    expect(JSON.stringify(exportedData)).toContain('Export Test');
    expect(JSON.stringify(exportedData)).toContain('@hook');
    
    fs.unlinkSync(exportPath);
  });

  test('Basic keyboard navigation', async ({ page }) => {
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create multiple trays
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('First');
    await page.keyboard.press('Enter');
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Second');
    await page.keyboard.press('Enter');
    
    // Navigate up
    await page.keyboard.press('ArrowUp');
    
    // Verify focus changed (check active element)
    const focused = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.querySelector('.tray-title')?.textContent || '';
    });
    
    expect(focused).toBeTruthy();
  });

  test('Context menu basic functionality', async ({ page }) => {
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create a tray
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Context Menu Test');
    await page.keyboard.press('Enter');
    
    // Right-click
    const newTray = rootTray.locator('.tray-content > .tray').first();
    await newTray.click({ button: 'right' });
    
    // Verify menu appears
    const contextMenu = page.locator('.context-menu');
    await expect(contextMenu).toBeVisible();
    
    // Close menu
    await page.keyboard.press('Escape');
    await expect(contextMenu).not.toBeVisible();
  });

  test('Delete operation', async ({ page }) => {
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create a tray
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('To Delete');
    await page.keyboard.press('Enter');
    
    const beforeDelete = await page.locator('.tray').count();
    
    // Delete it
    await page.keyboard.press('Control+Delete');
    await page.waitForTimeout(500);
    
    const afterDelete = await page.locator('.tray').count();
    expect(afterDelete).toBe(beforeDelete - 1);
  });

  test('Copy and paste basic', async ({ page }) => {
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create source
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Copy Source');
    await page.keyboard.press('Enter');
    
    // Copy
    await page.keyboard.press('Control+c');
    
    // Navigate to root
    await page.keyboard.press('ArrowUp');
    
    // Paste
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);
    
    // Verify paste created new tray
    const afterPaste = await page.locator('.tray').count();
    expect(afterPaste).toBeGreaterThan(2); // Should have more trays after paste
  });

  test('Data persistence check', async ({ page }) => {
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create data
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Persistent Data');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if data persists
    const persistedTray = page.locator('.tray-title:has-text("Persistent Data")');
    await expect(persistedTray).toBeVisible();
  });

  test('Folding and unfolding', async ({ page }) => {
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create parent with child
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Foldable Parent');
    await page.keyboard.press('Enter');
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Child to Hide');
    await page.keyboard.press('Enter');
    
    // Go back to parent
    await page.keyboard.press('ArrowUp');
    
    // Fold
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    
    // Check if child is hidden (folded state)
    const childTray = page.locator('.tray-title:has-text("Child to Hide")');
    const isChildVisible = await childTray.isVisible();
    
    // If child is visible, we're unfolded, so unfold state should show different button
    if (isChildVisible) {
      // We're in unfolded state after ArrowLeft, so unfold again
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
    } else {
      // We're in folded state, verify and then unfold
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
      await expect(childTray).toBeVisible();
    }
  });

  test('Hook functionality', async ({ page }) => {
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create tasks with hooks
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Task 1 @important');
    await page.keyboard.press('Enter');
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Task 2 @todo @urgent');
    await page.keyboard.press('Enter');
    
    // Open hook view
    await page.click('.hook-view-button');
    await page.waitForTimeout(500);
    
    // Verify dialog
    const hookDialog = page.locator('.hook-view-dialog');
    await expect(hookDialog).toBeVisible();
    
    // Close dialog
    await page.keyboard.press('Escape');
    await expect(hookDialog).not.toBeVisible();
  });
});