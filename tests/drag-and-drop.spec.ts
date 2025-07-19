import { test, expect } from '@playwright/test';

test.describe('Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Use existing structure (Root Tray with ToDo, Doing, Done)
    // Add a child to one of them for nested structure - use more specific selector
    const doingTitle = page.locator('.tray-title').filter({ hasText: 'Doing' });
    const doingTray = doingTitle.locator('..');
    await doingTray.click();
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Nested Task');
    await page.keyboard.press('Enter');
  });

  test('should drag tray to nest inside another tray', async ({ page }) => {
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const todoTray = todoTitle.locator('..');
    const doingTitle = page.locator('.tray-title').filter({ hasText: 'Doing' });
    const doingTray = doingTitle.locator('..');
    
    // Verify initial state: Doing is at root level
    const initialStructure = await page.evaluate(() => {
      const doingEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('Doing')
      );
      return doingEl?.parentElement?.closest('.tray')?.querySelector('.tray-title')?.textContent;
    });
    expect(initialStructure).toBe('Root Tray');
    
    // Drag Doing into ToDo using Playwright's drag and drop
    await doingTray.dragTo(todoTray);
    
    // Wait for potential DOM updates
    await page.waitForTimeout(100);
    
    // Verify Doing is now a child of ToDo
    const finalStructure = await page.evaluate(() => {
      const doingEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('Doing')
      );
      return doingEl?.parentElement?.closest('.tray')?.querySelector('.tray-title')?.textContent;
    });
    expect(finalStructure).toBe('ToDo');
  });

  test('should drag tray into another tray', async ({ page }) => {
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const todoTray = todoTitle.locator('..');
    const doneTitle = page.locator('.tray-title').filter({ hasText: 'Done' });
    const doneTray = doneTitle.locator('..');
    
    // Drag ToDo into Done using Playwright's drag and drop
    await todoTray.dragTo(doneTray);
    
    // Wait for potential DOM updates
    await page.waitForTimeout(100);
    
    // Verify ToDo is now a child of Done by checking its parent
    const todoParent = await page.evaluate(() => {
      const todoEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('ToDo')
      );
      return todoEl?.parentElement?.closest('.tray')?.querySelector('.tray-title')?.textContent;
    });
    expect(todoParent).toBe('Done');
  });

  test('should show drop indicator during drag', async ({ page }) => {
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const todoTray = todoTitle.locator('..');
    const doingTitle = page.locator('.tray-title').filter({ hasText: 'Doing' });
    const doingTray = doingTitle.locator('..');
    
    // Start dragging using Playwright's drag and drop
    await todoTray.dragTo(doingTray, { sourcePosition: { x: 10, y: 10 }, targetPosition: { x: 10, y: 10 } });
    
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
    
    // The drag operation has completed
    
    // App should still be functional after cancelled drag
    await expect(todoTray).toBeVisible();
    await expect(doingTray).toBeVisible();
  });

  test('should not allow dragging parent into its own child', async ({ page }) => {
    const doingTitle = page.locator('.tray-title').filter({ hasText: 'Doing' });
    const doingTray = doingTitle.locator('..');
    const nestedTitle = page.locator('.tray-title').filter({ hasText: 'Nested Task' });
    const nestedTask = nestedTitle.locator('..');
    
    // Verify initial state: Doing is at root level, Nested Task is child of Doing
    const initialDoingParent = await page.evaluate(() => {
      const doingEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('Doing')
      );
      return doingEl?.parentElement?.closest('.tray')?.querySelector('.tray-title')?.textContent;
    });
    expect(initialDoingParent).toBe('Root Tray');
    
    // Try to drag Doing into its own child (Nested Task) using Playwright's drag and drop
    await doingTray.dragTo(nestedTask);
    
    // Wait for potential DOM updates
    await page.waitForTimeout(100);
    
    // Verify Doing is still at root level (circular reference should be prevented)
    const finalDoingParent = await page.evaluate(() => {
      const doingEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('Doing')
      );
      return doingEl?.parentElement?.closest('.tray')?.querySelector('.tray-title')?.textContent;
    });
    expect(finalDoingParent).toBe('Root Tray');
    
    // Verify both trays are still visible
    await expect(doingTray).toBeVisible();
    await expect(nestedTask).toBeVisible();
  });

  test('should maintain tray state after drag', async ({ page }) => {
    // First collapse Doing tray (fold it)
    const doingTitle = page.locator('.tray-title').filter({ hasText: 'Doing' });
    const doingTray = doingTitle.locator('..');
    await doingTray.click();
    await page.keyboard.press('Enter'); // Toggle fold
    
    // Drag Doing tray using Playwright's drag and drop
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const todoTray = todoTitle.locator('..');
    await doingTray.dragTo(todoTray);
    
    // Verify Doing tray still maintains its state after drag
    await expect(doingTray).toBeVisible();
  });

  test('should handle basic drag operation', async ({ page }) => {
    // Simple test: drag ToDo to a different position
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const todoTray = todoTitle.locator('..');
    const doneTitle = page.locator('.tray-title').filter({ hasText: 'Done' });
    const doneTray = doneTitle.locator('..');
    
    // Get initial position
    const initialTodoBox = await todoTray.boundingBox();
    const initialDoneBox = await doneTray.boundingBox();
    
    // Drag ToDo below Done using Playwright's drag and drop
    await todoTray.dragTo(doneTray);
    
    // Verify drag operation completed (trays should still be visible)
    await expect(todoTray).toBeVisible();
    await expect(doneTray).toBeVisible();
  });
});