import { test, expect } from '@playwright/test';

test.describe('Drag and Drop Debug', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Create the same structure as the failing tests
    const doingTitle = page.locator('.tray-title').filter({ hasText: 'Doing' });
    const doingTray = doingTitle.locator('..');
    await doingTray.click();
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Nested Task');
    await page.keyboard.press('Enter');
  });

  test('should debug what actually happens during drag', async ({ page }) => {
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const todoTray = todoTitle.locator('..');
    const doingTitle = page.locator('.tray-title').filter({ hasText: 'Doing' });
    const doingTray = doingTitle.locator('..');
    
    // Take a screenshot before drag
    await page.screenshot({ path: 'before-drag.png' });
    
    // Log initial structure
    const initialStructure = await page.evaluate(() => {
      const trays = Array.from(document.querySelectorAll('.tray')).map(tray => {
        const title = tray.querySelector('.tray-title')?.textContent;
        const rect = tray.getBoundingClientRect();
        return { title, y: rect.y, parentTitle: tray.parentElement?.closest('.tray')?.querySelector('.tray-title')?.textContent };
      });
      return trays;
    });
    console.log('Initial structure:', initialStructure);
    
    // Try using the lower-level drag simulation
    await doingTray.hover();
    await page.mouse.down();
    await todoTray.hover();
    await page.mouse.up();
    
    // Wait for any potential DOM updates
    await page.waitForTimeout(500);
    
    // Take a screenshot after drag
    await page.screenshot({ path: 'after-drag.png' });
    
    // Log final structure
    const finalStructure = await page.evaluate(() => {
      const trays = Array.from(document.querySelectorAll('.tray')).map(tray => {
        const title = tray.querySelector('.tray-title')?.textContent;
        const rect = tray.getBoundingClientRect();
        return { title, y: rect.y, parentTitle: tray.parentElement?.closest('.tray')?.querySelector('.tray-title')?.textContent };
      });
      return trays;
    });
    console.log('Final structure:', finalStructure);
    
    // Check if drag events were fired
    const dragEvents = await page.evaluate(() => {
      return window['dragEventLog'] || 'No drag events logged';
    });
    console.log('Drag events:', dragEvents);
  });

  test('should test with native HTML5 drag events', async ({ page }) => {
    // Inject debugging script to log drag events
    await page.addInitScript(() => {
      window['dragEventLog'] = [];
      ['dragstart', 'dragover', 'dragenter', 'dragleave', 'drop', 'dragend'].forEach(eventType => {
        document.addEventListener(eventType, (e) => {
          window['dragEventLog'].push({
            type: eventType,
            target: e.target.className,
            targetText: e.target.querySelector?.('.tray-title')?.textContent || e.target.textContent,
            dataTransfer: e.dataTransfer?.getData?.('text/plain')
          });
        }, true);
      });
    });
    
    const todoTitle = page.locator('.tray-title').filter({ hasText: 'ToDo' });
    const todoTray = todoTitle.locator('..');
    const doingTitle = page.locator('.tray-title').filter({ hasText: 'Doing' });
    const doingTray = doingTitle.locator('..');
    
    // Use Playwright's dispatchEvent to simulate HTML5 drag and drop
    const doingTrayHandle = await doingTray.elementHandle();
    const todoTrayHandle = await todoTray.elementHandle();
    
    // Simulate dragstart
    await doingTrayHandle?.dispatchEvent('dragstart', {
      dataTransfer: {
        effectAllowed: 'move',
        getData: () => 'doing',
        setData: () => {}
      }
    });
    
    // Simulate dragover on target
    await todoTrayHandle?.dispatchEvent('dragover', {
      dataTransfer: {
        dropEffect: 'move'
      }
    });
    
    // Simulate drop
    await todoTrayHandle?.dispatchEvent('drop', {
      dataTransfer: {
        getData: () => 'doing'
      }
    });
    
    // Simulate dragend
    await doingTrayHandle?.dispatchEvent('dragend');
    
    await page.waitForTimeout(500);
    
    // Check drag events
    const dragEvents = await page.evaluate(() => window['dragEventLog']);
    console.log('Drag events:', dragEvents);
    
    await page.screenshot({ path: 'after-native-drag.png' });
  });
});