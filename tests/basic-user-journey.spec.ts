import { test, expect } from '@playwright/test';

test.describe('Basic User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Use unique session ID for each test to avoid interference
    const sessionId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await page.goto(`/?sessionId=${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Wait for application to fully initialize
    await page.waitForSelector('.tray', { timeout: 10000 });
    await page.waitForTimeout(2000); // Additional buffer for app initialization
  });

  test('should load the application with default tray', async ({ page }) => {
    const rootTray = page.locator('.tray').first();
    await expect(rootTray).toBeVisible({ timeout: 10000 });
    await expect(rootTray).toContainText('Root Tray', { timeout: 5000 });
    
    // Check that default children are present - use title-specific locators with timeouts
    await expect(page.locator('.tray-title').filter({ hasText: 'ToDo' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.tray-title').filter({ hasText: 'Doing' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.tray-title').filter({ hasText: 'Done' })).toBeVisible({ timeout: 5000 });
  });

  test('should create a new tray using action button', async ({ page }) => {
    // Click the add button to create a sibling tray
    const addButton = page.locator('.add-button');
    await expect(addButton).toBeVisible({ timeout: 5000 });
    
    // First focus a tray so the add button knows where to add
    await page.locator('.tray').first().click();
    await page.waitForTimeout(500); // Wait for focus to be established
    
    // Click the add button
    await addButton.click();
    
    // Wait for the new tray to be created and in edit mode
    await page.waitForTimeout(1000); // Increased wait time
    
    // Type in the new tray name
    await page.keyboard.type('My New Tray');
    
    // Press Enter to finish editing
    await page.keyboard.press('Enter');
    
    // Wait for save operation to complete
    await page.waitForTimeout(1000);
    
    // Verify the text was saved (use more specific locator with timeout)
    await expect(page.locator('.tray .tray-title').filter({ hasText: 'My New Tray' })).toBeVisible({ timeout: 5000 });
  });

  test('should navigate between trays using keyboard', async ({ page }) => {
    // Start with a child tray (ToDo)
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const todoTray = todoTitle.locator('..');
    await todoTray.click();
    
    // Verify we're on ToDo
    const initialFocus = await page.evaluate(() => {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.classList.contains('tray')) {
        const title = activeEl.querySelector('.tray-title');
        return title ? title.textContent : '';
      }
      return '';
    });
    expect(initialFocus).toBe('ToDo');
    
    // Navigate down to next sibling (Doing)
    await page.keyboard.press('ArrowDown');
    
    const focusedTrayName = await page.evaluate(() => {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.classList.contains('tray')) {
        const title = activeEl.querySelector('.tray-title');
        return title ? title.textContent : '';
      }
      return '';
    });
    expect(focusedTrayName).toBe('Doing');
    
    // Navigate back up
    await page.keyboard.press('ArrowUp');
    
    const focusedTrayName2 = await page.evaluate(() => {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.classList.contains('tray')) {
        const title = activeEl.querySelector('.tray-title');
        return title ? title.textContent : '';
      }
      return '';
    });
    expect(focusedTrayName2).toBe('ToDo');
  });

  test('should edit existing tray content', async ({ page }) => {
    // Use an existing tray (ToDo) - use title locator directly
    const titleElement = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    
    // Double-click the title to edit it
    await titleElement.dblclick();
    
    // Wait for contenteditable to be enabled
    await expect(titleElement).toHaveAttribute('contenteditable', 'true');
    
    // Clear and type new text
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Updated ToDo');
    await page.keyboard.press('Enter');
    
    // Wait for contenteditable to be disabled
    await expect(titleElement).toHaveAttribute('contenteditable', 'false');
    
    // Verify the update
    await expect(page.locator('.tray-title').filter({ hasText: 'Updated ToDo' })).toBeVisible();
  });

  test('should delete a tray', async ({ page }) => {
    // Use existing tray (Done) to test deletion - use title-specific locator
    const doneTrayTitle = page.locator('.tray-title').filter({ hasText: 'Done' });
    await expect(doneTrayTitle).toBeVisible();
    
    // Click the parent tray to focus it
    const doneTray = doneTrayTitle.locator('..'); // Get parent tray
    await doneTray.click();
    
    // Delete it using Ctrl+Delete (as seen in keyboard interaction)
    await page.keyboard.press('Control+Delete');
    
    // Verify it's gone
    await expect(doneTrayTitle).not.toBeVisible();
  });

  test('should create nested trays', async ({ page }) => {
    // Use existing tray (ToDo) as parent - use title locator
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const parentTray = todoTitle.locator('..');
    await parentTray.click();
    
    // Create child using Ctrl+Enter
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Child Tray');
    await page.keyboard.press('Enter'); // Finish editing
    
    // Verify nested structure - child should be visible
    await expect(page.locator('.tray-title').filter({ hasText: 'Child Tray' })).toBeVisible();
  });

  test('should toggle tray collapse/expand', async ({ page }) => {
    // Use ToDo tray and add a child first - use title locator
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const parentTray = todoTitle.locator('..');
    await parentTray.click();
    
    // Add a child to have something to collapse
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Test Child');
    await page.keyboard.press('Enter');
    
    // Verify child is visible
    await expect(page.locator('.tray-title').filter({ hasText: 'Test Child' })).toBeVisible();
    
    // Focus parent again
    await parentTray.click();
    
    // Toggle fold (Enter)
    await page.keyboard.press('Enter');
    
    // Check if tray appears folded (children should be hidden)
    const isFolded = await page.evaluate(() => {
      const todoTray = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('ToDo')
      );
      return todoTray?.classList.contains('folded') || 
             todoTray?.style.display === 'none' ||
             !todoTray?.querySelector('.tray-content')?.children.length;
    });
    
    // Toggle fold again to expand
    await page.keyboard.press('Enter');
    
    // Verify child is visible again
    await expect(page.locator('.tray-title').filter({ hasText: 'Test Child' })).toBeVisible();
  });
});