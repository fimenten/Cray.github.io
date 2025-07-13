import { test, expect } from '@playwright/test';

test.describe('Data Migration', () => {
  test('should migrate from old data format to new format', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Simulate old data format in IndexedDB
    await page.evaluate(async () => {
      const dbName = 'CrayDB';
      
      // Close any existing connections
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name === dbName) {
          window.indexedDB.deleteDatabase(dbName);
        }
      }
      
      // Create database with old schema
      const request = window.indexedDB.open(dbName, 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('trays')) {
          db.createObjectStore('trays', { keyPath: 'sessionId' });
        }
      };
      
      await new Promise((resolve, reject) => {
        request.onsuccess = resolve;
        request.onerror = reject;
      });
      
      const db = request.result;
      const transaction = db.transaction(['trays'], 'readwrite');
      const store = transaction.objectStore('trays');
      
      // Insert old format data
      const oldData = {
        sessionId: localStorage.getItem('sessionId'),
        data: {
          id: 'root',
          name: 'root',
          children: [
            {
              id: 'old-1',
              name: 'Old Format Tray 1',
              children: []
            },
            {
              id: 'old-2',
              name: 'Old Format Tray 2',
              children: [
                {
                  id: 'old-2-1',
                  name: 'Old Child',
                  children: []
                }
              ]
            }
          ]
        }
      };
      
      await new Promise((resolve, reject) => {
        const putRequest = store.put(oldData);
        putRequest.onsuccess = resolve;
        putRequest.onerror = reject;
      });
      
      db.close();
    });
    
    // Reload page to trigger migration
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify old data was migrated
    await expect(page.locator('.tray').filter({ hasText: 'Old Format Tray 1' })).toBeVisible();
    await expect(page.locator('.tray').filter({ hasText: 'Old Format Tray 2' })).toBeVisible();
    await expect(page.locator('.tray').filter({ hasText: 'Old Child' })).toBeVisible();
    
    // Verify new data can be added
    await page.locator('.tray').first().click();
    await page.keyboard.press('Enter');
    await page.keyboard.type('New Format Tray');
    await page.keyboard.press('Escape');
    
    await page.waitForTimeout(1500);
    await page.reload();
    
    // Verify all data persists
    await expect(page.locator('.tray').filter({ hasText: 'Old Format Tray 1' })).toBeVisible();
    await expect(page.locator('.tray').filter({ hasText: 'New Format Tray' })).toBeVisible();
  });

  test('should handle missing fields during migration', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Insert incomplete data
    await page.evaluate(async () => {
      const dbName = 'CrayDB';
      const sessionId = localStorage.getItem('sessionId');
      
      const request = window.indexedDB.open(dbName, 1);
      await new Promise(resolve => { request.onsuccess = resolve; });
      
      const db = request.result;
      const transaction = db.transaction(['trays'], 'readwrite');
      const store = transaction.objectStore('trays');
      
      // Data with missing fields
      const incompleteData = {
        sessionId: sessionId,
        data: {
          id: 'root',
          name: 'root',
          children: [
            {
              id: 'incomplete-1',
              // Missing name
              children: []
            },
            {
              id: 'incomplete-2',
              name: 'Incomplete Tray',
              // Missing children array
            }
          ]
        }
      };
      
      await new Promise((resolve) => {
        store.put(incompleteData).onsuccess = resolve;
      });
      
      db.close();
    });
    
    // Reload to trigger migration/validation
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // App should handle incomplete data gracefully
    await expect(page.locator('.tray').first()).toBeVisible();
    
    // Should be able to add new data
    await page.locator('.tray').first().click();
    await page.keyboard.press('Enter');
    await page.keyboard.type('Recovery Test');
    await page.keyboard.press('Escape');
    
    await expect(page.locator('.tray').filter({ hasText: 'Recovery Test' })).toBeVisible();
  });

  test('should migrate collapsed state correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Insert old data with collapsed state
    await page.evaluate(async () => {
      const dbName = 'CrayDB';
      const sessionId = localStorage.getItem('sessionId');
      
      const request = window.indexedDB.open(dbName, 1);
      await new Promise(resolve => { request.onsuccess = resolve; });
      
      const db = request.result;
      const transaction = db.transaction(['trays'], 'readwrite');
      const store = transaction.objectStore('trays');
      
      const dataWithCollapsed = {
        sessionId: sessionId,
        data: {
          id: 'root',
          name: 'root',
          children: [
            {
              id: 'collapsed-parent',
              name: 'Collapsed Parent',
              collapsed: true,
              children: [
                {
                  id: 'hidden-child',
                  name: 'Hidden Child',
                  children: []
                }
              ]
            }
          ]
        }
      };
      
      await new Promise((resolve) => {
        store.put(dataWithCollapsed).onsuccess = resolve;
      });
      
      db.close();
    });
    
    // Reload to apply migration
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify collapsed state is preserved
    const collapsedParent = page.locator('.tray').filter({ hasText: 'Collapsed Parent' }).first();
    await expect(collapsedParent).toBeVisible();
    await expect(collapsedParent).toHaveClass(/collapsed/);
    
    // Expand and verify child
    await collapsedParent.click();
    await page.keyboard.press('Control+ArrowRight');
    await expect(collapsedParent.locator('.tray').filter({ hasText: 'Hidden Child' })).toBeVisible();
  });

  test('should handle version upgrades', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Simulate version upgrade scenario
    await page.evaluate(async () => {
      const dbName = 'CrayDB';
      
      // Delete existing database
      await new Promise((resolve) => {
        const deleteReq = window.indexedDB.deleteDatabase(dbName);
        deleteReq.onsuccess = resolve;
        deleteReq.onerror = resolve;
      });
      
      // Create v1 database
      const request = window.indexedDB.open(dbName, 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('trays')) {
          db.createObjectStore('trays', { keyPath: 'sessionId' });
        }
      };
      
      await new Promise((resolve) => {
        request.onsuccess = resolve;
      });
      
      const db = request.result;
      const transaction = db.transaction(['trays'], 'readwrite');
      const store = transaction.objectStore('trays');
      
      // Add v1 data
      await new Promise((resolve) => {
        store.put({
          sessionId: localStorage.getItem('sessionId'),
          version: 1,
          data: {
            id: 'root',
            name: 'root',
            children: [{
              id: 'v1-tray',
              name: 'Version 1 Tray',
              children: []
            }]
          }
        }).onsuccess = resolve;
      });
      
      db.close();
    });
    
    // Reload (simulating app update)
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify v1 data is still accessible
    await expect(page.locator('.tray').filter({ hasText: 'Version 1 Tray' })).toBeVisible();
    
    // Add new data
    await page.locator('.tray').first().click();
    await page.keyboard.press('Enter');
    await page.keyboard.type('Version 2 Tray');
    await page.keyboard.press('Escape');
    
    await page.waitForTimeout(1500);
    
    // Verify both old and new data coexist
    await page.reload();
    await expect(page.locator('.tray').filter({ hasText: 'Version 1 Tray' })).toBeVisible();
    await expect(page.locator('.tray').filter({ hasText: 'Version 2 Tray' })).toBeVisible();
  });

  test('should recover from corrupted data', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Insert corrupted data
    await page.evaluate(async () => {
      const dbName = 'CrayDB';
      const sessionId = localStorage.getItem('sessionId');
      
      const request = window.indexedDB.open(dbName, 1);
      await new Promise(resolve => { request.onsuccess = resolve; });
      
      const db = request.result;
      const transaction = db.transaction(['trays'], 'readwrite');
      const store = transaction.objectStore('trays');
      
      // Corrupted data with circular reference (stringified)
      const corruptedData = {
        sessionId: sessionId,
        data: "CORRUPTED_JSON_STRING"
      };
      
      await new Promise((resolve) => {
        store.put(corruptedData).onsuccess = resolve;
      });
      
      db.close();
    });
    
    // Reload - app should handle corruption
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // App should start with default data
    const rootTray = page.locator('.tray').first();
    await expect(rootTray).toBeVisible();
    await expect(rootTray).toContainText('root');
    
    // Should be able to use normally
    await rootTray.click();
    await page.keyboard.press('Enter');
    await page.keyboard.type('Post-Recovery Tray');
    await page.keyboard.press('Escape');
    
    await expect(page.locator('.tray').filter({ hasText: 'Post-Recovery Tray' })).toBeVisible();
  });
});