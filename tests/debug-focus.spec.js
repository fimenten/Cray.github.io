const { test, expect } = require('@playwright/test');

test.describe('Debug Focus and Tray Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('Debug tray creation and focus behavior', async ({ page }) => {
    console.log('=== Starting Debug Test ===');
    
    // Check initial state
    const initialTrays = await page.locator('.tray').count();
    console.log('Initial tray count:', initialTrays);
    
    // Get the root tray info
    const rootTray = page.locator('.tray').first();
    const rootTrayInfo = await rootTray.evaluate(el => ({
      id: el.getAttribute('data-tray-id'),
      tabIndex: el.tabIndex,
      isFocused: document.activeElement === el,
      classList: Array.from(el.classList)
    }));
    console.log('Root tray info:', rootTrayInfo);
    
    // Try to focus the root tray first
    await rootTray.focus();
    await page.waitForTimeout(500);
    
    const afterFocus = await rootTray.evaluate(el => ({
      isFocused: document.activeElement === el,
      tabIndex: el.tabIndex
    }));
    console.log('After manual focus:', afterFocus);
    
    // Try Ctrl+Enter to create child
    console.log('Pressing Ctrl+Enter...');
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(1000);
    
    // Check what happened
    const afterCtrlEnter = await page.locator('.tray').count();
    console.log('Tray count after Ctrl+Enter:', afterCtrlEnter);
    
    // Check all trays
    const allTrays = await page.locator('.tray').all();
    for (let i = 0; i < allTrays.length; i++) {
      const trayInfo = await allTrays[i].evaluate(el => ({
        index: i,
        id: el.getAttribute('data-tray-id'),
        isFocused: document.activeElement === el,
        title: el.querySelector('.tray-title')?.textContent || 'no title',
        contentEditable: el.querySelector('.tray-title')?.contentEditable,
        classList: Array.from(el.classList)
      }));
      console.log(`Tray ${i}:`, trayInfo);
    }
    
    // Check if any element has focus
    const focusedElement = await page.evaluate(() => {
      const active = document.activeElement;
      return {
        tagName: active?.tagName,
        className: active?.className,
        id: active?.id,
        contentEditable: active?.contentEditable
      };
    });
    console.log('Currently focused element:', focusedElement);
  });

  test('Debug Delete functionality', async ({ page }) => {
    console.log('=== Testing Delete Functionality ===');
    
    // First create a tray
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(1000);
    
    const afterCreate = await page.locator('.tray').count();
    console.log('Trays after creation:', afterCreate);
    
    // Try to find the newly created tray and focus it
    const allTrays = await page.locator('.tray').all();
    if (allTrays.length > 1) {
      const lastTray = allTrays[allTrays.length - 1];
      await lastTray.focus();
      await page.waitForTimeout(500);
      
      const focused = await lastTray.evaluate(el => document.activeElement === el);
      console.log('Last tray focused:', focused);
      
      // Try different delete combinations
      console.log('Trying Control+Delete...');
      await page.keyboard.press('Control+Delete');
      await page.waitForTimeout(1000);
      
      let afterDelete = await page.locator('.tray').count();
      console.log('Trays after Control+Delete:', afterDelete);
      
      if (afterDelete === afterCreate) {
        console.log('Trying just Delete...');
        await page.keyboard.press('Delete');
        await page.waitForTimeout(1000);
        afterDelete = await page.locator('.tray').count();
        console.log('Trays after Delete:', afterDelete);
      }
      
      if (afterDelete === afterCreate) {
        console.log('Trying Backspace...');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(1000);
        afterDelete = await page.locator('.tray').count();
        console.log('Trays after Backspace:', afterDelete);
      }
    }
  });

  test('Debug arrow key navigation', async ({ page }) => {
    console.log('=== Testing Arrow Key Navigation ===');
    
    const rootTray = page.locator('.tray').first();
    await rootTray.focus();
    
    // Create multiple children
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+Enter');
      await page.keyboard.type(`Child ${i + 1}`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }
    
    const allTrays = await page.locator('.tray').all();
    console.log('Total trays after creation:', allTrays.length);
    
    // Try navigation
    console.log('Pressing ArrowUp...');
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(500);
    
    const focusedAfterUp = await page.evaluate(() => {
      const active = document.activeElement;
      return {
        tagName: active?.tagName,
        className: active?.className,
        title: active?.querySelector?.('.tray-title')?.textContent
      };
    });
    console.log('Focused after ArrowUp:', focusedAfterUp);
    
    console.log('Pressing ArrowDown...');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    
    const focusedAfterDown = await page.evaluate(() => {
      const active = document.activeElement;
      return {
        tagName: active?.tagName,
        className: active?.className,
        title: active?.querySelector?.('.tray-title')?.textContent
      };
    });
    console.log('Focused after ArrowDown:', focusedAfterDown);
  });
});