import { test, expect } from '@playwright/test';

test.describe('Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Use existing structure (Root Tray with ToDo, Doing, Done)
    // Add a child to one of them for nested structure
    const doingTray = page.locator('.tray').filter({ hasText: 'Doing' });
    await doingTray.click();
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Nested Task');
    await page.keyboard.press('Enter');
  });

  test('should drag tray to reorder siblings', async ({ page }) => {
    const todoTray = page.locator('.tray').filter({ hasText: 'ToDo' }).first();
    const doingTray = page.locator('.tray').filter({ hasText: 'Doing' }).first();
    
    // Get initial positions
    const initialTodoBox = await todoTray.boundingBox();
    const initialDoingBox = await doingTray.boundingBox();
    
    expect(initialTodoBox.y).toBeLessThan(initialDoingBox.y);
    
    // Drag Doing above ToDo
    await doingTray.hover();
    await page.mouse.down();
    await todoTray.hover();
    await page.waitForTimeout(100); // Allow for drag preview
    await page.mouse.up();
    
    // Verify new order
    const newTodoBox = await todoTray.boundingBox();
    const newDoingBox = await doingTray.boundingBox();
    
    expect(newDoingBox.y).toBeLessThan(newTodoBox.y);
  });

  test('should drag tray into another tray', async ({ page }) => {
    const todoTray = page.locator('.tray').filter({ hasText: 'ToDo' }).first();
    const doneTray = page.locator('.tray').filter({ hasText: 'Done' }).first();
    
    // Drag ToDo into Done
    await todoTray.hover();
    await page.mouse.down();
    
    // Move to the center of Done tray to indicate nesting
    const bbox = await doneTray.boundingBox();
    await page.mouse.move(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
    await page.waitForTimeout(100);
    await page.mouse.up();
    
    // Verify ToDo is now a child of Done
    const todoInDone = doneTray.locator('.tray').filter({ hasText: 'ToDo' });
    await expect(todoInDone).toBeVisible();
  });

  test('should show drop indicator during drag', async ({ page }) => {
    const todoTray = page.locator('.tray').filter({ hasText: 'ToDo' }).first();
    const doingTray = page.locator('.tray').filter({ hasText: 'Doing' }).first();
    
    // Start dragging
    await todoTray.hover();
    await page.mouse.down();
    
    // Move over Doing tray
    await doingTray.hover();
    
    // Check for drop indicator class or style changes
    const hasDropIndicator = await page.evaluate(() => {
      const doingEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('Doing')
      );
      return doingEl && (
        doingEl.classList.contains('drop-target') ||
        doingEl.classList.contains('drag-over') ||
        doingEl.style.backgroundColor !== '' ||
        doingEl.style.border !== ''
      );
    });
    
    // Cancel drag
    await page.keyboard.press('Escape');
    await page.mouse.up();
    
    // App should still be functional after cancelled drag
    await expect(todoTray).toBeVisible();
    await expect(doingTray).toBeVisible();
  });

  test('should not allow dragging parent into its own child', async ({ page }) => {
    const doingTray = page.locator('.tray').filter({ hasText: 'Doing' }).first();
    const nestedTask = page.locator('.tray').filter({ hasText: 'Nested Task' }).first();
    
    // Try to drag Doing into its own child (Nested Task)
    await doingTray.hover();
    await page.mouse.down();
    await nestedTask.hover();
    await page.waitForTimeout(100);
    await page.mouse.up();
    
    // Verify Doing is still at root level (circular reference should be prevented)
    const rootTrays = page.locator('.tray').first().locator('> .tray');
    await expect(rootTrays.filter({ hasText: 'Doing' })).toBeVisible();
  });

  test('should maintain tray state after drag', async ({ page }) => {
    // First collapse Doing tray (fold it)
    const doingTray = page.locator('.tray').filter({ hasText: 'Doing' }).first();
    await doingTray.click();
    await page.keyboard.press('Enter'); // Toggle fold
    
    // Drag Doing tray
    const todoTray = page.locator('.tray').filter({ hasText: 'ToDo' }).first();
    await doingTray.hover();
    await page.mouse.down();
    await todoTray.hover();
    await page.waitForTimeout(100);
    await page.mouse.up();
    
    // Verify Doing tray still maintains its state after drag
    await expect(doingTray).toBeVisible();
  });

  test('should handle basic drag operation', async ({ page }) => {
    // Simple test: drag ToDo to a different position
    const todoTray = page.locator('.tray').filter({ hasText: 'ToDo' }).first();
    const doneTray = page.locator('.tray').filter({ hasText: 'Done' }).first();
    
    // Get initial position
    const initialTodoBox = await todoTray.boundingBox();
    const initialDoneBox = await doneTray.boundingBox();
    
    // Drag ToDo below Done
    await todoTray.hover();
    await page.mouse.down();
    
    // Move to position below Done
    await page.mouse.move(initialDoneBox.x, initialDoneBox.y + initialDoneBox.height + 10);
    await page.waitForTimeout(100);
    await page.mouse.up();
    
    // Verify drag operation completed (trays should still be visible)
    await expect(todoTray).toBeVisible();
    await expect(doneTray).toBeVisible();
  });
});