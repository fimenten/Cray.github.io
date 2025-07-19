const { test, expect } = require('@playwright/test');

test('Debug drag and drop events', async ({ page }) => {
  await page.goto('file://' + __dirname + '/test-drag-debug.html');
  
  const tray1 = page.locator('#tray1');
  const tray2 = page.locator('#tray2');
  
  // Perform drag and drop
  await tray1.dragTo(tray2);
  
  // Check if events were logged
  const logContent = await page.locator('#log').textContent();
  console.log('Log content:', logContent);
  
  // Verify that drag events fired
  expect(logContent).toContain('Dragstart');
  expect(logContent).toContain('Drop');
});