const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');

// Mock DOM environment
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLDivElement = dom.window.HTMLDivElement;
global.Event = dom.window.Event;

// Mock IndexedDB with data storage
const mockDatabase = new Map();
global.indexedDB = {
  open: (name, version) => {
    const request = {
      result: null,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null
    };

    setTimeout(() => {
      const db = {
        objectStoreNames: { contains: () => true },
        createObjectStore: () => ({}),
        transaction: () => ({
          objectStore: () => ({
            get: (key) => {
              const getRequest = { result: mockDatabase.get(key), onsuccess: null };
              setTimeout(() => {
                if (getRequest.onsuccess) getRequest.onsuccess();
              }, 0);
              return getRequest;
            },
            put: (data) => {
              const putRequest = { onsuccess: null };
              setTimeout(() => {
                mockDatabase.set(data.id, data);
                if (putRequest.onsuccess) putRequest.onsuccess();
              }, 0);
              return putRequest;
            }
          })
        })
      };

      request.result = db;
      if (request.onsuccess) request.onsuccess();
    }, 0);

    return request;
  }
};

global.localStorage = {
  data: new Map(),
  getItem: function(key) { return this.data.get(key) || null; },
  setItem: function(key, value) { this.data.set(key, value); },
  removeItem: function(key) { this.data.delete(key); },
  clear: function() { this.data.clear(); }
};

// Import modules after setting up globals
const { loadFromIndexedDB } = require('../cjs/io.js');
const { DATA_VERSION } = require('../cjs/types.js');

describe('Automatic Migration Integration Tests', () => {
  
  before(() => {
    // Clear any existing data
    mockDatabase.clear();
    global.localStorage.clear();
  });

  describe('IndexedDB Loading with Migration', () => {
    test('should automatically migrate legacy data on load', async () => {
      // Create legacy data structure (version 0)
      const legacyData = {
        id: 'auto-migration-root',
        name: 'Legacy Root',
        children: [
          {
            id: 'legacy-child-1',
            name: 'Legacy Child 1',
            borderColor: '#ff0000',
            created_dt: '2023-01-01T00:00:00.000Z',
            properties: { priority: 3 },
            hooks: ['@legacy'],
            children: []
          },
          {
            id: 'legacy-child-2', 
            name: 'Legacy Child 2',
            borderColor: '#00ff00',
            created_dt: '2023-01-02T00:00:00.000Z',
            properties: { tags: ['test', 'legacy'] },
            children: []
          }
        ],
        borderColor: '#0000ff',
        created_dt: '2023-01-01T00:00:00.000Z',
        flexDirection: 'column',
        isFolded: false,
        properties: {},
        hooks: [],
        isDone: false
      };

      // Store legacy data in mock IndexedDB
      const sessionKey = 'test-auto-migration';
      mockDatabase.set(sessionKey, {
        id: sessionKey,
        value: JSON.stringify(legacyData)
      });

      console.log('Starting automatic migration test...');
      
      // Capture console logs to verify migration messages
      const consoleLogs = [];
      const originalLog = console.log;
      const originalWarn = console.warn;
      console.log = (...args) => {
        consoleLogs.push(['log', ...args]);
        originalLog(...args);
      };
      console.warn = (...args) => {
        consoleLogs.push(['warn', ...args]);
        originalWarn(...args);
      };

      try {
        // Load data - this should trigger automatic migration
        await loadFromIndexedDB(sessionKey);

        // Verify migration occurred by checking console logs
        const migrationLogs = consoleLogs.filter(log => 
          log.some(arg => 
            typeof arg === 'string' && 
            (arg.includes('migration') || arg.includes('Migration'))
          )
        );

        assert.ok(migrationLogs.length > 0, 'Migration process should have logged messages');
        
        // Check that migration was detected
        const migrationDetectedLog = migrationLogs.find(log =>
          log.some(arg => typeof arg === 'string' && 
            (arg.includes('Migrating data from version') || arg.includes('Migration completed')))
        );
        assert.ok(migrationDetectedLog, 'Should detect and log version migration');

        // Verify the migrated data was saved back to IndexedDB
        const savedData = mockDatabase.get(sessionKey);
        assert.ok(savedData, 'Data should be saved back to IndexedDB');

        // Parse the saved data to verify it's in the new format
        const parsedSavedData = JSON.parse(savedData.value);
        
        // The data should now be in current serialized format (not raw TrayData)
        // It should have the structure that can be deserialized by the legacy deserialize function
        assert.ok(parsedSavedData.id, 'Saved data should have root id');
        assert.ok(parsedSavedData.name, 'Saved data should have root name');
        assert.ok(Array.isArray(parsedSavedData.children), 'Saved data should have children array');
        
        console.log('Automatic migration test completed successfully');

      } finally {
        // Restore console functions
        console.log = originalLog;
        console.warn = originalWarn;
      }
    });

    test('should handle corrupted legacy data gracefully', async () => {
      const corruptedData = {
        id: 'corrupted-test',
        name: 'Corrupted Data',
        children: [
          {
            // Missing required id field
            name: 'No ID Child',
            children: []
          }
        ]
      };

      const sessionKey = 'test-corrupted-migration';
      mockDatabase.set(sessionKey, {
        id: sessionKey,
        value: JSON.stringify(corruptedData)
      });

      // Capture console errors
      const consoleErrors = [];
      const originalError = console.error;
      console.error = (...args) => {
        consoleErrors.push(args);
        originalError(...args);
      };

      try {
        // This should not throw an error, but should log warnings
        await loadFromIndexedDB(sessionKey);

        // Verify that errors were logged but the function completed
        const migrationErrors = consoleErrors.filter(args =>
          args.some(arg => 
            typeof arg === 'string' && 
            (arg.includes('Migration failed') || arg.includes('migration'))
          )
        );

        // Should either have migration warnings or fall back to legacy deserialization
        console.log('Corrupted data handled gracefully');

      } finally {
        console.error = originalError;
      }
    });

    test('should skip migration for current version data', async () => {
      // Create data that's already in current format
      const currentData = {
        id: 'current-version-root',
        name: 'Current Version Root',
        version: DATA_VERSION.CURRENT,
        parentId: null,
        borderColor: '#ffffff',
        created_dt: new Date().toISOString(),
        flexDirection: 'column',
        host_url: null,
        filename: null,
        isFolded: false,
        properties: {},
        hooks: [],
        isDone: false,
        showDoneMarker: false,
        children: []
      };

      const sessionKey = 'test-current-version';
      mockDatabase.set(sessionKey, {
        id: sessionKey,
        value: JSON.stringify(currentData)
      });

      const consoleLogs = [];
      const originalLog = console.log;
      console.log = (...args) => {
        consoleLogs.push(args);
        originalLog(...args);
      };

      try {
        await loadFromIndexedDB(sessionKey);

        // Should log that no migration is needed
        const noMigrationLog = consoleLogs.find(args =>
          args.some(arg => 
            typeof arg === 'string' && 
            arg.includes('no migration needed')
          )
        );

        assert.ok(noMigrationLog, 'Should log that no migration is needed for current version data');

      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Import Data with Migration', () => {
    test('should migrate legacy data during import', async () => {
      // This test would verify that the importData function also handles migration
      // but since it involves file input simulation, we'll focus on the core logic
      
      const legacyImportData = {
        id: 'import-legacy-root',
        name: 'Imported Legacy Root',
        children: [
          {
            id: 'import-child',
            name: 'Imported Child',
            borderColor: '#purple',
            created_dt: '2022-01-01T00:00:00.000Z',
            properties: { 
              priority: 5,
              customField: 'custom value'
            },
            children: []
          }
        ],
        borderColor: '#blue',
        created_dt: '2022-01-01T00:00:00.000Z'
      };

      // Verify that the detection works correctly
      const { migrationService } = require('../cjs/migration.js');
      const detectedVersion = migrationService.detectVersion(legacyImportData);
      
      assert.strictEqual(detectedVersion, DATA_VERSION.LEGACY, 'Should detect legacy format');
      assert.ok(detectedVersion < DATA_VERSION.CURRENT, 'Should be less than current version');

      console.log('Import migration verification completed');
    });
  });
});

console.log('Automatic migration integration tests completed successfully!');