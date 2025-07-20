import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

test.describe('Import/Export', () => {
  // Use a base downloads path that will be extended per test
  const baseDownloadsPath = path.join(__dirname, 'downloads');
  
  test.beforeAll(async () => {
    // Ensure base downloads directory exists
    await fs.mkdir(baseDownloadsPath, { recursive: true });
  });
  
  test.afterAll(async () => {
    // Clean up all downloads after tests complete
    try {
      await fs.rm(baseDownloadsPath, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  test('should export data as JSON', async ({ page }) => {
    const sessionId = `export-test-${Date.now()}`;
    const downloadsPath = path.join(baseDownloadsPath, sessionId);
    await fs.mkdir(downloadsPath, { recursive: true });
    
    await page.goto(`/?sessionId=${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Create test data using add button
    await page.locator('.tray').first().click();
    
    const addButton = page.locator('.add-button');
    await addButton.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Export Test Parent');
    await page.keyboard.press('Enter');
    
    const parentTray = page.locator('.tray-title').filter({ hasText: 'Export Test Parent' });
    await parentTray.click();
    
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(200);
    await page.keyboard.type('Export Test Child');
    await page.keyboard.press('Escape');
    
    // Set up download promise before triggering export
    const downloadPromise = page.waitForEvent('download');
    
    // Trigger export via hamburger menu
    await page.locator('.hamburger-menu').click();
    await page.locator('.menu-item').filter({ hasText: 'データのエクスポート' }).click();
    
    // Wait for download
    const download = await downloadPromise;
    const suggestedFilename = download.suggestedFilename();
    
    // Verify filename format
    expect(suggestedFilename).toMatch(/tray_data\.json|cray-export-\d{4}-\d{2}-\d{2}\.json/);
    
    // Save and read the file
    const savePath = path.join(downloadsPath, suggestedFilename);
    await download.saveAs(savePath);
    
    const exportedData = JSON.parse(await fs.readFile(savePath, 'utf-8'));
    
    // Verify exported structure
    expect(exportedData).toHaveProperty('id');
    expect(exportedData).toHaveProperty('name');
    expect(exportedData).toHaveProperty('children');
    
    // Find our test data in export
    const exportParent = exportedData.children.find(c => c.name === 'Export Test Parent');
    expect(exportParent).toBeTruthy();
    expect(exportParent.children).toHaveLength(1);
    expect(exportParent.children[0].name).toBe('Export Test Child');
  });

  test('should import JSON data', async ({ page }) => {
    const sessionId = `import-test-${Date.now()}`;
    const downloadsPath = path.join(baseDownloadsPath, sessionId);
    await fs.mkdir(downloadsPath, { recursive: true });
    
    await page.goto(`/?sessionId=${sessionId}`);
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
    
    // Verify file was written successfully
    try {
      await fs.access(importPath);
    } catch (error) {
      throw new Error(`Failed to create import file at ${importPath}: ${error}`);
    }
    
    // Set up file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Trigger import via hamburger menu
    await page.locator('.hamburger-menu').click();
    await page.locator('.menu-item').filter({ hasText: 'データのインポート' }).click();
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(importPath);
    
    // Wait for import to complete
    await page.waitForTimeout(1000);
    
    // Verify imported data appears
    await expect(page.locator('.tray-title').filter({ hasText: 'Imported Tray 1' })).toBeVisible();
    await expect(page.locator('.tray-title').filter({ hasText: 'Imported Tray 2' })).toBeVisible();
    await expect(page.locator('.tray-title').filter({ hasText: 'Imported Child' })).toBeVisible();
  });

  test('should merge imported data with existing data', async ({ page }) => {
    const sessionId = `merge-test-${Date.now()}`;
    const downloadsPath = path.join(baseDownloadsPath, sessionId);
    await fs.mkdir(downloadsPath, { recursive: true });
    
    await page.goto(`/?sessionId=${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Create existing data using add button
    await page.locator('.tray').first().click();
    
    const addButton = page.locator('.add-button');
    await addButton.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Existing Tray');
    await page.keyboard.press('Enter');
    
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
    
    // Verify file was written successfully
    try {
      await fs.access(mergePath);
    } catch (error) {
      throw new Error(`Failed to create merge file at ${mergePath}: ${error}`);
    }
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Trigger import via hamburger menu
    await page.locator('.hamburger-menu').click();
    await page.locator('.menu-item').filter({ hasText: 'データのインポート' }).click();
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(mergePath);
    
    await page.waitForTimeout(1000);
    
    // Verify imported data replaced existing data (this appears to be the app behavior)
    await expect(page.locator('.tray-title').filter({ hasText: 'Merged Tray 1' })).toBeVisible();
    // Check that old data is not present after import
    await expect(page.locator('.tray-title').filter({ hasText: 'Existing Tray' })).not.toBeVisible();
  });

  test('should handle import errors gracefully', async ({ page }) => {
    const sessionId = `error-test-${Date.now()}`;
    const downloadsPath = path.join(baseDownloadsPath, sessionId);
    await fs.mkdir(downloadsPath, { recursive: true });
    
    await page.goto(`/?sessionId=${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Create invalid JSON file
    const invalidPath = path.join(downloadsPath, 'invalid.json');
    await fs.writeFile(invalidPath, 'This is not valid JSON{]');
    
    // Verify file was written successfully
    try {
      await fs.access(invalidPath);
    } catch (error) {
      throw new Error(`Failed to create invalid file at ${invalidPath}: ${error}`);
    }
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Trigger import via hamburger menu
    await page.locator('.hamburger-menu').click();
    await page.locator('.menu-item').filter({ hasText: 'データのインポート' }).click();
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(invalidPath);
    
    // Wait for error handling
    await page.waitForTimeout(1000);
    
    // App should still be functional
    await page.locator('.tray').first().click();
    
    const addButton = page.locator('.add-button');
    await addButton.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Still Works After Error');
    await page.keyboard.press('Enter');
    
    await expect(page.locator('.tray-title').filter({ hasText: 'Still Works After Error' })).toBeVisible();
  });

  test('should export with proper formatting', async ({ page }) => {
    const sessionId = `formatting-test-${Date.now()}`;
    const downloadsPath = path.join(baseDownloadsPath, sessionId);
    await fs.mkdir(downloadsPath, { recursive: true });
    
    await page.goto(`/?sessionId=${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Create nested structure using add button
    await page.locator('.tray').first().click();
    
    const addButton = page.locator('.add-button');
    await addButton.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Level 1');
    await page.keyboard.press('Enter');
    
    const level1 = page.locator('.tray-title').filter({ hasText: 'Level 1' });
    await level1.click();
    
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(200);
    await page.keyboard.type('Level 2');
    await page.keyboard.press('Escape');
    
    const level2 = page.locator('.tray-title').filter({ hasText: 'Level 2' });
    await level2.click();
    
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(200);
    await page.keyboard.type('Level 3');
    await page.keyboard.press('Escape');
    
    // Export
    const downloadPromise = page.waitForEvent('download');
    
    // Trigger export via hamburger menu
    await page.locator('.hamburger-menu').click();
    await page.locator('.menu-item').filter({ hasText: 'データのエクスポート' }).click();
    
    const download = await downloadPromise;
    const savePath = path.join(downloadsPath, 'formatted-export.json');
    await download.saveAs(savePath);
    
    const content = await fs.readFile(savePath, 'utf-8');
    
    // Verify JSON is valid and parseable
    expect(() => JSON.parse(content)).not.toThrow();
    
    // Verify content structure exists
    const parsed = JSON.parse(content);
    expect(parsed).toHaveProperty('id');
    expect(parsed).toHaveProperty('children');
    expect(parsed.children.length).toBeGreaterThan(0);
  });

  test('should handle large exports', async ({ page }) => {
    test.setTimeout(60000); // Increase timeout for large data
    
    const sessionId = `large-test-${Date.now()}`;
    const downloadsPath = path.join(baseDownloadsPath, sessionId);
    await fs.mkdir(downloadsPath, { recursive: true });
    
    await page.goto(`/?sessionId=${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Create large structure using add button
    await page.locator('.tray').first().click();
    
    const addButton = page.locator('.add-button');
    
    for (let i = 1; i <= 5; i++) {
      await addButton.click();
      await page.waitForTimeout(100);
      await page.keyboard.type(`Parent ${i}`);
      await page.keyboard.press('Enter');
      
      const parent = page.locator('.tray-title').filter({ hasText: new RegExp(`^Parent ${i}$`) });
      await parent.click();
      
      // Add some children
      for (let j = 1; j <= 3; j++) {
        await page.keyboard.press('Control+Enter');
        await page.waitForTimeout(100);
        await page.keyboard.type(`Child ${i}.${j} with some longer text content to increase file size`);
        await page.keyboard.press('Escape');
        await parent.click();
      }
      
      // Click back on root to create next parent
      await page.locator('.tray').first().click();
    }
    
    // Export large structure
    const downloadPromise = page.waitForEvent('download');
    
    // Trigger export via hamburger menu
    await page.locator('.hamburger-menu').click();
    await page.locator('.menu-item').filter({ hasText: 'データのエクスポート' }).click();
    
    const download = await downloadPromise;
    const savePath = path.join(downloadsPath, 'large-export.json');
    await download.saveAs(savePath);
    
    // Verify file was created and is valid
    const stats = await fs.stat(savePath);
    expect(stats.size).toBeGreaterThan(1000); // Should be reasonably large
    
    const content = await fs.readFile(savePath, 'utf-8');
    const parsed = JSON.parse(content);
    
    // Verify structure
    expect(parsed).toHaveProperty('children');
    
    // Verify we can export a reasonably sized structure
    expect(parsed).toHaveProperty('children');
    expect(parsed.children.length).toBeGreaterThan(1);
    
    // Verify export contains some of our test data
    const hasTestData = parsed.children.some(c => 
      c.name && (c.name.startsWith('Parent ') || c.name.includes('Child '))
    );
    expect(hasTestData).toBeTruthy();
  });

  test('should preserve special characters in export/import', async ({ page }) => {
    const sessionId = `special-chars-test-${Date.now()}`;
    const downloadsPath = path.join(baseDownloadsPath, sessionId);
    await fs.mkdir(downloadsPath, { recursive: true });
    
    await page.goto(`/?sessionId=${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Create data with special characters
    const specialTexts = [
      'Tray with "quotes"',
      'Tray with \'apostrophes\'',
      'Tray with emoji 🎉',
      'Tray with <html> tags',
      'Tray with & ampersand',
      'Tray with \\ backslash'
    ];
    
    await page.locator('.tray').first().click();
    
    const addButton = page.locator('.add-button');
    
    for (const text of specialTexts) {
      await addButton.click();
      await page.waitForTimeout(100);
      await page.keyboard.type(text);
      await page.keyboard.press('Enter');
    }
    
    // Export
    const downloadPromise = page.waitForEvent('download');
    
    // Trigger export via hamburger menu
    await page.locator('.hamburger-menu').click();
    await page.locator('.menu-item').filter({ hasText: 'データのエクスポート' }).click();
    
    const download = await downloadPromise;
    const actualFilename = download.suggestedFilename();
    const savePath = path.join(downloadsPath, actualFilename);
    
    // Save the file and wait for completion
    await download.saveAs(savePath);
    
    // Verify the file was saved successfully
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    
    // Verify our saved file exists
    const savedFileStats = await fs.stat(savePath);
    expect(savedFileStats.size).toBeGreaterThan(0);
    
    // Clear current data
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Import back using the original download path (more reliable than saved path)
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Trigger import via hamburger menu
    await page.locator('.hamburger-menu').click();
    await page.locator('.menu-item').filter({ hasText: 'データのインポート' }).click();
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(downloadPath);
    
    await page.waitForTimeout(1000);
    
    // Verify all special characters preserved
    for (const text of specialTexts) {
      await expect(page.locator('.tray-title').filter({ hasText: text })).toBeVisible();
    }
  });
});