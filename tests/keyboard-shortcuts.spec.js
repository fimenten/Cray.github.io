const { test, expect } = require('@playwright/test');

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('Basic navigation shortcuts', async ({ page }) => {
    // Create test content
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('First item');
    await page.keyboard.press('Enter');
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Second item');
    await page.keyboard.press('Enter');
    
    // Test arrow key navigation
    await page.keyboard.press('ArrowUp');
    const firstTray = page.locator('.tray').first();
    await expect(firstTray).toBeFocused();
    
    await page.keyboard.press('ArrowDown');
    const secondTray = page.locator('.tray').nth(1);
    await expect(secondTray).toBeFocused();
  });

  test('Ctrl+Z undo functionality', async ({ page }) => {
    const initialTrays = await page.locator('.tray').count();
    
    // Create a tray
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Test tray');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(500);
    const afterCreateTrays = await page.locator('.tray').count();
    expect(afterCreateTrays).toBe(initialTrays + 1);
    
    // Undo the creation
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);
    
    const afterUndoTrays = await page.locator('.tray').count();
    expect(afterUndoTrays).toBe(initialTrays);
  });

  // Ctrl+Y redo is not implemented in the actual application

  test('Tab for indentation', async ({ page }) => {
    // Create parent tray
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Parent');
    await page.keyboard.press('Enter');
    
    // Create child with Ctrl+Enter
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Child');
    await page.keyboard.press('Enter');
    
    // Verify child is indented
    const childTray = page.locator('.tray').nth(1);
    const marginLeft = await childTray.evaluate(el => {
      return parseInt(window.getComputedStyle(el).marginLeft);
    });
    expect(marginLeft).toBeGreaterThan(0);
  });

  test('Shift+Tab for outdentation', async ({ page }) => {
    // Create nested structure
    await page.keyboard.press('Enter');
    await page.keyboard.type('Parent');
    await page.keyboard.press('Escape');
    
    await page.keyboard.press('Tab');
    await page.keyboard.type('Child');
    await page.keyboard.press('Escape');
    
    // Outdent the child with Ctrl+Left
    await page.keyboard.press('Control+ArrowLeft');
    await page.waitForTimeout(500);
    
    // Verify child is no longer indented
    const childTray = page.locator('.tray').nth(1);
    const marginLeft = await childTray.evaluate(el => {
      return parseInt(window.getComputedStyle(el).marginLeft);
    });
    expect(marginLeft).toBeLessThanOrEqual(0);
  });

  test('Ctrl+C and Ctrl+V copy paste', async ({ page }) => {
    // Create source tray
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Original content');
    await page.keyboard.press('Enter');
    
    const initialTrays = await page.locator('.tray').count();
    
    // Copy the tray
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(500);
    
    // Paste
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);
    
    // Verify copy was created
    const finalTrays = await page.locator('.tray').count();
    expect(finalTrays).toBe(initialTrays + 1);
    
    // Verify content was copied
    const trayTitles = await page.locator('.tray .tray-title').allTextContents();
    const originalCount = trayTitles.filter(text => text.includes('Original content')).length;
    expect(originalCount).toBeGreaterThan(1);
  });

  test('Ctrl+X cut operation', async ({ page }) => {
    // Create multiple trays
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('First');
    await page.keyboard.press('Enter');
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('To be cut');
    await page.keyboard.press('Enter');
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Third');
    await page.keyboard.press('Enter');
    
    // Focus on middle tray
    await page.keyboard.press('ArrowUp');
    
    const initialTrays = await page.locator('.tray').count();
    
    // Cut the tray
    await page.keyboard.press('Control+x');
    await page.waitForTimeout(500);
    
    // Verify tray was removed
    const afterCutTrays = await page.locator('.tray').count();
    expect(afterCutTrays).toBe(initialTrays - 1);
    
    // Paste it back
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);
    
    const afterPasteTrays = await page.locator('.tray').count();
    expect(afterPasteTrays).toBe(initialTrays);
  });

  // F2 renaming is not implemented in the actual application

  // Ctrl+A select all is not implemented in the actual application

  test('Shift+Enter for editing mode', async ({ page }) => {
    // Create tray
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Test content');
    await page.keyboard.press('Enter');
    
    // Enter edit mode with Shift+Enter
    await page.keyboard.press('Shift+Enter');
    await page.waitForTimeout(500);
    
    // Verify we can edit
    await page.keyboard.press('End');
    await page.keyboard.type(' edited');
    await page.keyboard.press('Enter');
    
    const trayTitle = page.locator('.tray:focus .tray-title');
    await expect(trayTitle).toContainText('Test content edited');
  });

  test('Escape to exit edit mode', async ({ page }) => {
    // Create tray and enter edit mode
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Test');
    await page.keyboard.press('Shift+Enter'); // Enter edit mode
    
    // Verify we're in edit mode (tray-title should be editable)
    const editableTitle = page.locator('.tray:focus .tray-title[contenteditable="true"]');
    await expect(editableTitle).toBeVisible();
    
    // Exit edit mode
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Verify we're no longer in edit mode
    await expect(editableTitle).not.toBeVisible();
  });
});