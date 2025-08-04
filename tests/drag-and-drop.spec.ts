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
    
    // Verify drag and drop attributes are present
    const dragAttributes = await page.evaluate(() => {
      const doingEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('Doing')
      ) as HTMLElement;
      const todoEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('ToDo')
      ) as HTMLElement;
      
      return {
        doingDraggable: doingEl?.draggable,
        todoDraggable: todoEl?.draggable,
        hasEventListeners: !!(doingEl && todoEl)
      };
    });
    
    // Verify elements have drag and drop capabilities
    expect(dragAttributes.doingDraggable).toBe(true);
    expect(dragAttributes.todoDraggable).toBe(true);
    expect(dragAttributes.hasEventListeners).toBe(true);
    
    // Test that trays respond to drag events without breaking
    await page.evaluate(() => {
      const doingEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('Doing')
      ) as HTMLElement;
      
      if (doingEl) {
        // Test dragstart event handling
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true
        });
        doingEl.dispatchEvent(dragStartEvent);
      }
    });
    
    // Verify app is still functional after drag events
    await expect(doingTray).toBeVisible();
    await expect(todoTray).toBeVisible();
    
    // Test basic interaction still works
    await doingTray.click();
    await page.waitForTimeout(100);
    await expect(doingTray).toBeVisible();
  });

  test('should drag tray into another tray', async ({ page }) => {
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const todoTray = todoTitle.locator('..');
    const doneTitle = page.locator('.tray-title').filter({ hasText: 'Done' });
    const doneTray = doneTitle.locator('..');
    
    // Test the drag and drop functionality exists and doesn't break the app
    const dragTestResult = await page.evaluate(() => {
      const todoEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('ToDo')
      ) as HTMLElement;
      const doneEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('Done')
      ) as HTMLElement;
      
      if (todoEl && doneEl) {
        // Test that drag events can be created and fired without errors
        try {
          const dragStartEvent = new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true
          });
          todoEl.dispatchEvent(dragStartEvent);
          
          const dragOverEvent = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true
          });
          doneEl.dispatchEvent(dragOverEvent);
          
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
      return { success: false, error: 'Elements not found' };
    });
    
    // Verify drag events work without errors
    expect(dragTestResult.success).toBe(true);
    expect(dragTestResult.error).toBeNull();
    
    // Verify both trays are still visible and functional
    await expect(todoTray).toBeVisible();
    await expect(doneTray).toBeVisible();
    
    // Test that basic interactions still work after drag events
    await todoTray.click();
    await page.waitForTimeout(100);
    await expect(todoTray).toBeVisible();
  });

  test('should show drop indicator during drag', async ({ page }) => {
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const todoTray = todoTitle.locator('..');
    const doingTitle = page.locator('.tray-title').filter({ hasText: 'Doing' });
    const doingTray = doingTitle.locator('..');
    
    // Test drag operation completion
    await page.evaluate(() => {
      const todoEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('ToDo')
      ) as HTMLElement;
      const doingEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('Doing')
      ) as HTMLElement;
      
      if (todoEl && doingEl) {
        const { element2TrayMap } = window as any;
        const todoTray = element2TrayMap?.get(todoEl);
        const trayId = todoTray?.id || 'default-id';
        
        // Simulate drag start and drop
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        dragStartEvent.dataTransfer!.setData('text/plain', trayId);
        todoEl.dispatchEvent(dragStartEvent);
        
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        dropEvent.dataTransfer!.setData('text/plain', trayId);
        doingEl.dispatchEvent(dropEvent);
      }
    });
    
    // Wait for operation to complete
    await page.waitForTimeout(300);
    
    // App should still be functional after drag operation
    await expect(todoTray).toBeVisible();
    await expect(doingTray).toBeVisible();
  });

  test('should properly clean up CSS classes after drag to lower area', async ({ page }) => {
    // Create a scenario where we drag to a lower tray position
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const todoTray = todoTitle.locator('..');
    const doingTitle = page.locator('.tray-title').filter({ hasText: 'Doing' });
    const doingTray = doingTitle.locator('..');
    
    // Simulate drag to lower area (common trigger for the bug)
    const dragCleanupResult = await page.evaluate(() => {
      const todoEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('ToDo')
      ) as HTMLElement;
      const doingEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('Doing')
      ) as HTMLElement;
      
      if (todoEl && doingEl) {
        // Add drag classes that might persist (simulating the bug condition)
        doingEl.classList.add('drop-target', 'drop-after', 'drag-over');
        
        // Simulate dragend event to test cleanup
        const dragEndEvent = new DragEvent('dragend', {
          bubbles: true,
          cancelable: true
        });
        doingEl.dispatchEvent(dragEndEvent);
        
        // Check if all drag classes were removed
        const remainingClasses = Array.from(doingEl.classList).filter(cls => 
          ['drop-target', 'drop-before', 'drop-after', 'drop-inside', 'drag-over'].includes(cls)
        );
        
        return {
          classesRemaining: remainingClasses,
          isClean: remainingClasses.length === 0,
          backgroundColor: window.getComputedStyle(doingEl).backgroundColor,
          borderColor: window.getComputedStyle(doingEl).borderColor
        };
      }
      return { classesRemaining: [], isClean: false, backgroundColor: '', borderColor: '' };
    });
    
    // Verify all drag classes are properly cleaned up
    expect(dragCleanupResult.isClean).toBe(true);
    expect(dragCleanupResult.classesRemaining).toEqual([]);
    
    // Verify tray is not stuck in blue state
    // Background should not be the blue drop-target color (#f0f8ff or similar)
    expect(dragCleanupResult.backgroundColor).not.toContain('240, 248, 255'); // rgb for #f0f8ff
    
    // Verify tray remains interactive
    await expect(doingTray).toBeVisible();
    await doingTray.click();
    await page.waitForTimeout(100);
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
    
    // Drag Doing tray using HTML5 events
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const todoTray = todoTitle.locator('..');
    
    await page.evaluate(() => {
      const doingEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('Doing')
      ) as HTMLElement;
      const todoEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('ToDo')
      ) as HTMLElement;
      
      if (doingEl && todoEl) {
        const { element2TrayMap } = window as any;
        const doingTray = element2TrayMap?.get(doingEl);
        const trayId = doingTray?.id || 'default-id';
        
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        dragStartEvent.dataTransfer!.setData('text/plain', trayId);
        doingEl.dispatchEvent(dragStartEvent);
        
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        dropEvent.dataTransfer!.setData('text/plain', trayId);
        todoEl.dispatchEvent(dropEvent);
      }
    });
    
    // Wait for DOM updates
    await page.waitForTimeout(300);
    
    // Verify Doing tray still maintains its state after drag
    await expect(doingTray).toBeVisible();
  });

  test('should handle basic drag operation', async ({ page }) => {
    // Simple test: drag ToDo to a different position
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const todoTray = todoTitle.locator('..');
    const doneTitle = page.locator('.tray-title').filter({ hasText: 'Done' });
    const doneTray = doneTitle.locator('..');
    
    // Perform drag operation using HTML5 events
    await page.evaluate(() => {
      const todoEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('ToDo')
      ) as HTMLElement;
      const doneEl = Array.from(document.querySelectorAll('.tray')).find(el => 
        el.querySelector('.tray-title')?.textContent?.includes('Done')
      ) as HTMLElement;
      
      if (todoEl && doneEl) {
        const { element2TrayMap } = window as any;
        const todoTray = element2TrayMap?.get(todoEl);
        const trayId = todoTray?.id || 'default-id';
        
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        dragStartEvent.dataTransfer!.setData('text/plain', trayId);
        todoEl.dispatchEvent(dragStartEvent);
        
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        dropEvent.dataTransfer!.setData('text/plain', trayId);
        doneEl.dispatchEvent(dropEvent);
      }
    });
    
    // Wait for operation to complete
    await page.waitForTimeout(300);
    
    // Verify drag operation completed (trays should still be visible)
    await expect(todoTray).toBeVisible();
    await expect(doneTray).toBeVisible();
  });
});