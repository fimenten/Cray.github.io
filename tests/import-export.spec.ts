import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

test.describe('Import/Export', () => {
  const downloadsPath = path.join(__dirname, 'downloads');
  
  test.beforeAll(async () => {
    // Create downloads directory
    try {
      await fs.mkdir(downloadsPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });
  
  test.afterAll(async () => {
    // Clean up downloads
    try {
      await fs.rm(downloadsPath, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  test('should export data as JSON', async ({ page }) => {
    const sessionId = `export-test-${Date.now()}`;
    await page.goto(`/?sessionId=${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Create test data
    await page.locator('.tray').first().click();
    
    await page.keyboard.press('Enter');
    await page.keyboard.type('Export Test Parent');
    await page.keyboard.press('Escape');
    
    const parentTray = page.locator('.tray').filter({ hasText: 'Export Test Parent' }).first();
    await parentTray.click();
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Export Test Child');
    await page.keyboard.press('Escape');
    
    // Set up download promise before triggering export
    const downloadPromise = page.waitForEvent('download');
    
    // Trigger export via keyboard shortcut or menu
    await page.keyboard.press('Control+s');
    
    // Wait for download
    const download = await downloadPromise;
    const suggestedFilename = download.suggestedFilename();
    
    // Verify filename format
    expect(suggestedFilename).toMatch(/cray-export-\d{4}-\d{2}-\d{2}\.json/);
    
    // Save and read the file
    const savePath = path.join(downloadsPath, suggestedFilename);
    await download.saveAs(savePath);
    
    const exportedData = JSON.parse(await fs.readFile(savePath, 'utf-8'));
    
    // Verify exported structure
    expect(exportedData).toHaveProperty('id', 'root');
    expect(exportedData).toHaveProperty('name', 'root');
    expect(exportedData).toHaveProperty('children');
    
    // Find our test data in export
    const exportParent = exportedData.children.find(c => c.name === 'Export Test Parent');
    expect(exportParent).toBeTruthy();
    expect(exportParent.children).toHaveLength(1);
    expect(exportParent.children[0].name).toBe('Export Test Child');
  });

  test('should import JSON data', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Prepare import data
    const importData = {
      id: 'imported-root',
      name: 'Imported Root',
      children: [
        {
          id: 'import-1',
          name: 'Imported Tray 1',
          children: []
        },
        {
          id: 'import-2',
          name: 'Imported Tray 2',
          children: [
            {
              id: 'import-2-1',
              name: 'Imported Child',
              children: []
            }
          ]
        }
      ]
    };
    
    const importPath = path.join(downloadsPath, 'test-import.json');
    await fs.writeFile(importPath, JSON.stringify(importData, null, 2));
    
    // Set up file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Trigger import
    await page.keyboard.press('Control+o');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(importPath);
    
    // Wait for import to complete
    await page.waitForTimeout(1000);
    
    // Verify imported data appears
    await expect(page.locator('.tray').filter({ hasText: 'Imported Tray 1' })).toBeVisible();
    await expect(page.locator('.tray').filter({ hasText: 'Imported Tray 2' })).toBeVisible();
    await expect(page.locator('.tray').filter({ hasText: 'Imported Child' })).toBeVisible();
  });

  test('should merge imported data with existing data', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Create existing data
    await page.locator('.tray').first().click();
    await page.keyboard.press('Enter');
    await page.keyboard.type('Existing Tray');
    await page.keyboard.press('Escape');
    
    // Import additional data
    const mergeData = {
      id: 'merge-root',
      name: 'root',
      children: [
        {
          id: 'merge-1',
          name: 'Merged Tray 1',
          children: []
        }
      ]
    };
    
    const mergePath = path.join(downloadsPath, 'test-merge.json');
    await fs.writeFile(mergePath, JSON.stringify(mergeData, null, 2));
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.keyboard.press('Control+o');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(mergePath);
    
    await page.waitForTimeout(1000);
    
    // Verify both existing and imported data are present
    await expect(page.locator('.tray').filter({ hasText: 'Existing Tray' })).toBeVisible();
    await expect(page.locator('.tray').filter({ hasText: 'Merged Tray 1' })).toBeVisible();
  });

  test('should handle import errors gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Create invalid JSON file
    const invalidPath = path.join(downloadsPath, 'invalid.json');
    await fs.writeFile(invalidPath, 'This is not valid JSON{]');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.keyboard.press('Control+o');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(invalidPath);
    
    // Wait for error handling
    await page.waitForTimeout(1000);
    
    // App should still be functional
    await page.locator('.tray').first().click();
    await page.keyboard.press('Enter');
    await page.keyboard.type('Still Works After Error');
    await page.keyboard.press('Escape');
    
    await expect(page.locator('.tray').filter({ hasText: 'Still Works After Error' })).toBeVisible();
  });

  test('should export with proper formatting', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Create nested structure
    await page.locator('.tray').first().click();
    
    await page.keyboard.press('Enter');
    await page.keyboard.type('Level 1');
    await page.keyboard.press('Escape');
    
    const level1 = page.locator('.tray').filter({ hasText: 'Level 1' }).first();
    await level1.click();
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Level 2');
    await page.keyboard.press('Escape');
    
    const level2 = level1.locator('.tray').filter({ hasText: 'Level 2' }).first();
    await level2.click();
    
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('Level 3');
    await page.keyboard.press('Escape');
    
    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.keyboard.press('Control+s');
    
    const download = await downloadPromise;
    const savePath = path.join(downloadsPath, 'formatted-export.json');
    await download.saveAs(savePath);
    
    const content = await fs.readFile(savePath, 'utf-8');
    
    // Verify JSON is properly formatted
    expect(() => JSON.parse(content)).not.toThrow();
    
    // Verify indentation (should have newlines and spaces)
    expect(content).toContain('\n');
    expect(content).toMatch(/^\s{2,}/m); // Has indentation
  });

  test('should handle large exports', async ({ page }) => {
    test.setTimeout(60000); // Increase timeout for large data
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Create large structure
    await page.locator('.tray').first().click();
    
    for (let i = 1; i <= 20; i++) {
      await page.keyboard.press('Enter');
      await page.keyboard.type(`Parent ${i}`);
      await page.keyboard.press('Escape');
      
      const parent = page.locator('.tray').filter({ hasText: `Parent ${i}` }).first();
      await parent.click();
      
      // Add some children
      for (let j = 1; j <= 5; j++) {
        await page.keyboard.press('Control+Enter');
        await page.keyboard.type(`Child ${i}.${j} with some longer text content to increase file size`);
        await page.keyboard.press('Escape');
        await parent.click();
      }
      
      await page.locator('.tray').first().click();
    }
    
    // Export large structure
    const downloadPromise = page.waitForEvent('download');
    await page.keyboard.press('Control+s');
    
    const download = await downloadPromise;
    const savePath = path.join(downloadsPath, 'large-export.json');
    await download.saveAs(savePath);
    
    // Verify file was created and is valid
    const stats = await fs.stat(savePath);
    expect(stats.size).toBeGreaterThan(1000); // Should be reasonably large
    
    const content = await fs.readFile(savePath, 'utf-8');
    const parsed = JSON.parse(content);
    
    // Verify structure
    expect(parsed.children.length).toBe(20);
    expect(parsed.children[0].children.length).toBe(5);
  });

  test('should preserve special characters in export/import', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Create data with special characters
    const specialTexts = [
      'Tray with "quotes"',
      'Tray with \'apostrophes\'',
      'Tray with\nnewlines',
      'Tray with\ttabs',
      'Tray with emoji 🎉',
      'Tray with <html> tags',
      'Tray with & ampersand',
      'Tray with \\ backslash'
    ];
    
    await page.locator('.tray').first().click();
    
    for (const text of specialTexts) {
      await page.keyboard.press('Enter');
      await page.keyboard.type(text);
      await page.keyboard.press('Escape');
    }
    
    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.keyboard.press('Control+s');
    
    const download = await downloadPromise;
    const savePath = path.join(downloadsPath, 'special-chars.json');
    await download.saveAs(savePath);
    
    // Clear current data
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Import back
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.keyboard.press('Control+o');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(savePath);
    
    await page.waitForTimeout(1000);
    
    // Verify all special characters preserved
    for (const text of specialTexts) {
      await expect(page.locator('.tray').filter({ hasText: text })).toBeVisible();
    }
  });
});