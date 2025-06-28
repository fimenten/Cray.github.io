const { test, expect } = require('@playwright/test');

test.describe('Drag and Drop Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Create test trays
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('First tray');
    await page.keyboard.press('Enter');
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Second tray');
    await page.keyboard.press('Enter');
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Third tray');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(500);
  });

  test('Drag tray to reorder', async ({ page }) => {
    // Get initial order
    const initialOrder = await page.locator('.tray .tray-title').allTextContents();
    
    // Get source and target trays
    const sourceTray = page.locator('.tray').first();
    const targetTray = page.locator('.tray').nth(2);
    
    // Perform drag and drop
    await sourceTray.dragTo(targetTray);
    await page.waitForTimeout(1000);
    
    // Verify order changed
    const finalOrder = await page.locator('.tray .tray-title').allTextContents();
    expect(finalOrder).not.toEqual(initialOrder);
  });

  test('Drag tray to create hierarchy', async ({ page }) => {
    const parentTray = page.locator('.tray').first();
    const childTray = page.locator('.tray').nth(1);
    
    // Get initial child count of parent
    const initialChildren = await parentTray.locator('.tray').count();
    
    // Drag second tray onto first to make it a child
    const parentBox = await parentTray.boundingBox();
    const childBox = await childTray.boundingBox();
    
    // Drag with slight horizontal offset to indicate child creation
    await page.mouse.move(childBox.x + childBox.width / 2, childBox.y + childBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(parentBox.x + parentBox.width / 2 + 30, parentBox.y + parentBox.height / 2);
    await page.mouse.up();
    
    await page.waitForTimeout(1000);
    
    // Verify child was created (check indentation or nesting)
    const finalChildren = await parentTray.locator('.tray').count();
    expect(finalChildren).toBeGreaterThan(initialChildren);
  });

  test('Multi-drag selection and move', async ({ page }) => {
    // Select multiple trays using checkboxes
    const firstTray = page.locator('.tray').first();
    const thirdTray = page.locator('.tray').nth(2);
    
    // Click on checkboxes to select trays
    const firstCheckbox = firstTray.locator('.tray-checkbox');
    const thirdCheckbox = thirdTray.locator('.tray-checkbox');
    
    await firstCheckbox.click();
    await thirdCheckbox.click();
    
    await page.waitForTimeout(500);
    
    // Verify multiple selection
    await expect(firstCheckbox).toBeChecked();
    await expect(thirdCheckbox).toBeChecked();
    
    // Drag selected items to new position
    const targetTray = page.locator('.tray').nth(1);
    await firstTray.dragTo(targetTray);
    
    await page.waitForTimeout(1000);
  });

  test('Drag tray outside boundaries', async ({ page }) => {
    const sourceTray = page.locator('.tray').first();
    const trayText = await sourceTray.locator('.tray-content').textContent();
    
    // Drag tray far outside the container
    const sourceBounds = await sourceTray.boundingBox();
    await page.mouse.move(sourceBounds.x + sourceBounds.width / 2, sourceBounds.y + sourceBounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(50, 50); // Move to top-left corner
    await page.mouse.up();
    
    await page.waitForTimeout(1000);
    
    // Verify tray still exists (shouldn't be deleted)
    const allTrays = await page.locator('.tray .tray-content').allTextContents();
    expect(allTrays).toContain(trayText);
  });

  test('Drag with visual feedback', async ({ page }) => {
    const sourceTray = page.locator('.tray').first();
    const targetArea = page.locator('.tray').nth(1);
    
    // Start drag
    const sourceBounds = await sourceTray.boundingBox();
    await page.mouse.move(sourceBounds.x + sourceBounds.width / 2, sourceBounds.y + sourceBounds.height / 2);
    await page.mouse.down();
    
    // Move over target and check for visual feedback
    const targetBounds = await targetArea.boundingBox();
    await page.mouse.move(targetBounds.x + targetBounds.width / 2, targetBounds.y + targetBounds.height / 2);
    
    // Look for drag feedback elements (ghost, highlight, etc.)
    const dragGhost = page.locator('.drag-ghost, .dragging');
    const dropZone = page.locator('.drop-zone, .drop-target');
    
    // At least one type of visual feedback should be present
    const hasVisualFeedback = await dragGhost.count() > 0 || await dropZone.count() > 0;
    expect(hasVisualFeedback).toBeTruthy();
    
    // Complete drag
    await page.mouse.up();
    await page.waitForTimeout(500);
  });

  test('Cancel drag operation', async ({ page }) => {
    const sourceTray = page.locator('.tray').first();
    const initialPosition = await sourceTray.boundingBox();
    const initialOrder = await page.locator('.tray .tray-title').allTextContents();
    
    // Start drag
    await page.mouse.move(initialPosition.x + initialPosition.width / 2, initialPosition.y + initialPosition.height / 2);
    await page.mouse.down();
    
    // Move to different position
    await page.mouse.move(initialPosition.x + 100, initialPosition.y + 100);
    
    // Cancel with Escape key
    await page.keyboard.press('Escape');
    await page.mouse.up();
    
    await page.waitForTimeout(500);
    
    // Verify nothing changed
    const finalOrder = await page.locator('.tray .tray-content').allTextContents();
    expect(finalOrder).toEqual(initialOrder);
  });
});