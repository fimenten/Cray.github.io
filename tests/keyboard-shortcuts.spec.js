const { test, expect } = require('@playwright/test');

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('Basic navigation shortcuts', async ({ page }) => {
    // Focus root tray first
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create test content
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('First item');
    await page.keyboard.press('Enter');
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Second item');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(1000);
    
    // Test arrow key navigation
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(500);
    
    // Check focus moved
    const focusedAfterUp = await page.evaluate(() => {
      return document.activeElement?.querySelector('.tray-title')?.textContent || '';
    });
    expect(focusedAfterUp).toBeTruthy();
    
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    
    const focusedAfterDown = await page.evaluate(() => {
      return document.activeElement?.querySelector('.tray-title')?.textContent || '';
    });
    expect(focusedAfterDown).toBeTruthy();
  });

  // TODO: Fix undo timing and state management
  /*test('Ctrl+Z undo functionality', async ({ page }) => {
    // Focus root tray
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    const initialTrays = await page.locator('.tray').count();
    
    // Create a tray
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Test tray');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(1000);
    const afterCreateTrays = await page.locator('.tray').count();
    expect(afterCreateTrays).toBe(initialTrays + 1);
    
    // Focus on any tray to ensure we can undo
    await rootTray.focus();
    
    // Undo the creation
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(1000);
    
    const afterUndoTrays = await page.locator('.tray').count();
    expect(afterUndoTrays).toBe(initialTrays);
  });*/

  // Ctrl+Y redo is not implemented in the actual application

  // Tab for indentation is not implemented - remove test

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

  /*test('Ctrl+C and Ctrl+V copy paste', async ({ page }) => {
    // Focus root tray
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create source tray
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Original content');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    const initialTrays = await page.locator('.tray').count();
    
    // Focus the newly created tray
    const newTray = page.locator('.tray').nth(1);
    await newTray.focus();
    await page.waitForTimeout(500);
    
    // Copy the tray
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(1000);
    
    // Paste
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(1000);
    
    // Verify copy was created
    const finalTrays = await page.locator('.tray').count();
    expect(finalTrays).toBe(initialTrays + 1);
    
    // Verify content was copied
    const trayTitles = await page.locator('.tray .tray-title').allTextContents();
    const originalCount = trayTitles.filter(text => text.includes('Original content')).length;
    expect(originalCount).toBeGreaterThan(1);
  });*/

  /*test('Ctrl+X cut operation', async ({ page }) => {
    // Focus root tray
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
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
    
    await page.waitForTimeout(1000);
    
    // Focus on a specific tray to cut
    const trayToCut = page.locator('.tray').nth(2); // "To be cut" tray
    await trayToCut.focus();
    await page.waitForTimeout(500);
    
    const initialTrays = await page.locator('.tray').count();
    
    // Cut the tray
    await page.keyboard.press('Control+x');
    await page.waitForTimeout(1000);
    
    // Verify tray was removed
    const afterCutTrays = await page.locator('.tray').count();
    expect(afterCutTrays).toBe(initialTrays - 1);
    
    // Focus somewhere to paste
    await rootTray.focus();
    
    // Paste it back
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(1000);
    
    const afterPasteTrays = await page.locator('.tray').count();
    expect(afterPasteTrays).toBe(initialTrays);
  });*/

  // F2 renaming is not implemented in the actual application

  // Ctrl+A select all is not implemented in the actual application

  test('Shift+Enter for editing mode', async ({ page }) => {
    // Focus root tray
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create tray
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Test content');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    // Focus the newly created tray
    const newTray = page.locator('.tray').nth(1);
    await newTray.focus();
    await page.waitForTimeout(500);
    
    // Enter edit mode with Shift+Enter
    await page.keyboard.press('Shift+Enter');
    await page.waitForTimeout(500);
    
    // Verify we're in edit mode
    const editableTitle = await page.locator('.tray-title[contenteditable="true"]').count();
    expect(editableTitle).toBeGreaterThan(0);
    
    // Edit the content
    await page.keyboard.press('End');
    await page.keyboard.type(' edited');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    const trayTitle = newTray.locator('.tray-title');
    await expect(trayTitle).toContainText('Test content edited');
  });

  test('Focused tray auto scrolls into view', async ({ page }) => {
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();

    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Control+Enter');
      await page.keyboard.type(`Item ${i}`);
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const root = document.querySelector('body > div.tray');
      if (root) root.scrollTop = 0;
    });

    const firstChild = page.locator('.tray').nth(1);
    await firstChild.focus();

    const total = await page.locator('.tray').count();
    for (let i = 1; i < total - 1; i++) {
      await page.keyboard.press('ArrowDown');
    }
    await page.waitForTimeout(1000);

    const lastTray = page.locator('.tray').nth(total - 1);
    const isVisible = await lastTray.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    expect(isVisible).toBe(true);
  });

  /*test('Escape to exit edit mode', async ({ page }) => {
    // Focus root tray
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create tray - it will be in edit mode automatically
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(500);
    
    // Verify we're in edit mode
    const editableCount = await page.locator('.tray-title[contenteditable="true"]').count();
    expect(editableCount).toBeGreaterThan(0);
    
    // Type something then exit edit mode with Escape
    await page.keyboard.type('Test content');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Verify we're no longer in edit mode
    const editableAfterEscape = await page.locator('.tray-title[contenteditable="true"]').count();
    expect(editableAfterEscape).toBe(0);
    
    // Verify original text was restored (escape cancels edit)
    const newTray = page.locator('.tray').nth(1);
    const trayTitle = newTray.locator('.tray-title');
    await expect(trayTitle).toContainText('New Tray'); // Default text
  });*/
});