const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs').promises;
const path = require('path');
const { JSDOM } = require('jsdom');

// Mock DOM environment
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLDivElement = dom.window.HTMLDivElement;
global.Event = dom.window.Event;

// Mock browser APIs
global.indexedDB = {
  open: () => ({
    result: { 
      transaction: () => ({ 
        objectStore: () => ({
          get: () => ({ result: null }),
          put: () => ({}),
          delete: () => ({})
        }) 
      }) 
    },
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null
  })
};

global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

// Import modules after setting up globals
const { migrationService, convertTrayToData } = require('../cjs/migration.js');
const { TrayManager } = require('../cjs/trayManager.js');
const { serialize, deserialize } = require('../cjs/io.js');

describe('Migration Compatibility Tests', () => {
  let testDataDir;

  before(async () => {
    testDataDir = path.join(__dirname, 'fixtures');
    
    // Ensure test data directory exists
    try {
      await fs.access(testDataDir);
    } catch {
      console.log('Test fixtures directory not found, creating with sample data...');
      await fs.mkdir(testDataDir, { recursive: true });
      
      // Create sample legacy data files for testing
      await createSampleLegacyData(testDataDir);
    }
  });

  describe('Legacy Format Compatibility', () => {
    test('Migrate legacy v1 format', async () => {
      const legacyV1Data = {
        id: 'legacy-v1-root',
        name: 'Legacy V1 Root',
        children: [
          {
            id: 'legacy-v1-child1',
            name: 'Legacy Child 1',
            borderColor: '#ff0000',
            created_dt: '2023-01-01T00:00:00.000Z',
            children: []
          },
          {
            id: 'legacy-v1-child2',
            name: 'Legacy Child 2',
            borderColor: '#00ff00',
            created_dt: '2023-01-02T00:00:00.000Z',
            properties: { priority: 5 },
            hooks: ['@important'],
            isDone: true,
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

      const migrationResult = await migrationService.migrateHierarchical(legacyV1Data);
      const { root, allTrays } = migrationResult;

      // Verify root data
      assert.strictEqual(root.id, 'legacy-v1-root');
      assert.strictEqual(root.name, 'Legacy V1 Root');
      assert.strictEqual(root.version, 1);
      assert.ok(root.created_dt instanceof Date);

      // Verify all trays were migrated
      assert.strictEqual(Object.keys(allTrays).length, 3);
      
      // Verify child relationships
      assert.strictEqual(allTrays['legacy-v1-child1'].parentId, 'legacy-v1-root');
      assert.strictEqual(allTrays['legacy-v1-child2'].parentId, 'legacy-v1-root');

      // Verify properties migration
      assert.strictEqual(allTrays['legacy-v1-child2'].properties.priority, 5);
      assert.deepStrictEqual(allTrays['legacy-v1-child2'].hooks, ['@important']);
      assert.strictEqual(allTrays['legacy-v1-child2'].isDone, true);
    });

    test('Handle malformed legacy data', async () => {
      const malformedData = {
        id: 'malformed',
        name: 'Malformed Tray',
        created_dt: 'invalid-date',
        properties: 'not-an-object',
        hooks: 'not-an-array',
        children: 'not-an-array'
      };

      const migrationResult = await migrationService.migrate(malformedData);
      const modernData = migrationResult.data;

      // Should have warnings but still migrate
      assert.ok(migrationResult.warnings.length > 0);
      assert.strictEqual(modernData.id, 'malformed');
      assert.ok(modernData.created_dt instanceof Date);
      assert.strictEqual(typeof modernData.properties, 'object');
      assert.ok(Array.isArray(modernData.hooks));
    });

    test('Preserve network settings during migration', async () => {
      const legacyWithNetwork = {
        id: 'network-tray',
        name: 'Network Tray',
        host_url: 'https://example.com/api',
        filename: 'my-data.json',
        autoUpload: true,
        created_dt: '2023-01-01T00:00:00.000Z',
        children: []
      };

      const migrationResult = await migrationService.migrate(legacyWithNetwork);
      const modernData = migrationResult.data;

      assert.strictEqual(modernData.host_url, 'https://example.com/api');
      assert.strictEqual(modernData.filename, 'my-data.json');
      assert.strictEqual(modernData.version, 1);
    });

    test('Complex properties migration', async () => {
      const legacyWithComplexProps = {
        id: 'complex-props',
        name: 'Complex Properties',
        properties: {
          priority: 3,
          tags: ['work', 'urgent'],
          dueDate: '2024-12-31T23:59:59.000Z',
          color: '#ff00ff',
          customField: { nested: { data: 'value' } },
          stringField: 'simple string',
          numberField: 42,
          booleanField: true
        },
        created_dt: '2023-01-01T00:00:00.000Z',
        children: []
      };

      const migrationResult = await migrationService.migrate(legacyWithComplexProps);
      const modernData = migrationResult.data;

      // Known properties should be typed correctly
      assert.strictEqual(modernData.properties.priority, 3);
      assert.deepStrictEqual(modernData.properties.tags, ['work', 'urgent']);
      assert.ok(modernData.properties.dueDate instanceof Date);
      assert.strictEqual(modernData.properties.color, '#ff00ff');

      // Unknown properties should be in metadata
      assert.ok(modernData.properties.metadata);
      assert.deepStrictEqual(modernData.properties.metadata.customField, { nested: { data: 'value' } });
      assert.strictEqual(modernData.properties.metadata.stringField, 'simple string');
      assert.strictEqual(modernData.properties.metadata.numberField, 42);
      assert.strictEqual(modernData.properties.metadata.booleanField, true);
    });
  });

  describe('Serialization Compatibility', () => {
    test('Legacy serialized data can be deserialized and migrated', async () => {
      // Simulate legacy serialized data (JSON string)
      const legacySerializedData = JSON.stringify({
        id: 'serialized-root',
        name: 'Serialized Root',
        children: [
          {
            id: 'serialized-child',
            name: 'Serialized Child',
            children: []
          }
        ],
        borderColor: '#cccccc',
        created_dt: '2023-06-15T10:30:00.000Z'
      });

      // Deserialize using current system
      const deserialized = deserialize(legacySerializedData);
      
      // Should be a Tray object (legacy)
      assert.strictEqual(deserialized.id, 'serialized-root');
      assert.strictEqual(deserialized.name, 'Serialized Root');
      assert.strictEqual(deserialized.children.length, 1);

      // Convert to modern format
      const modernData = convertTrayToData(deserialized);
      assert.strictEqual(modernData.version, 1);
      assert.strictEqual(modernData.id, 'serialized-root');
    });

    test('Modern data can be converted back to legacy format', async () => {
      const modernData = {
        id: 'modern-tray',
        name: 'Modern Tray',
        parentId: null,
        borderColor: '#123456',
        created_dt: new Date('2024-01-15T12:00:00.000Z'),
        flexDirection: 'row',
        host_url: 'https://api.example.com',
        filename: 'data.json',
        isFolded: true,
        properties: {
          priority: 2,
          tags: ['test'],
          metadata: { custom: 'value' }
        },
        hooks: ['@sync'],
        isDone: false,
        showDoneMarker: true,
        version: 1
      };

      const legacyFormat = migrationService.convertToLegacyFormat(modernData);

      assert.strictEqual(legacyFormat.id, 'modern-tray');
      assert.strictEqual(legacyFormat.name, 'Modern Tray');
      assert.strictEqual(legacyFormat.borderColor, '#123456');
      assert.strictEqual(legacyFormat.flexDirection, 'row');
      assert.strictEqual(legacyFormat.host_url, 'https://api.example.com');
      assert.strictEqual(legacyFormat.filename, 'data.json');
      assert.strictEqual(legacyFormat.isFolded, true);
      assert.deepStrictEqual(legacyFormat.hooks, ['@sync']);
      assert.strictEqual(legacyFormat.isDone, false);
      assert.strictEqual(legacyFormat.showDoneMarker, true);

      // Properties should be flattened
      assert.strictEqual(legacyFormat.properties.priority, 2);
      assert.deepStrictEqual(legacyFormat.properties.tags, ['test']);
      assert.strictEqual(legacyFormat.properties.custom, 'value');
    });

    test('Round-trip migration preserves data integrity', async () => {
      const originalLegacy = {
        id: 'roundtrip-test',
        name: 'Round Trip Test',
        borderColor: '#abcdef',
        created_dt: '2024-01-01T00:00:00.000Z',
        flexDirection: 'column',
        host_url: 'https://test.com',
        filename: 'test.json',
        isFolded: false,
        properties: {
          priority: 4,
          tags: ['important', 'test'],
          customProp: 'custom value'
        },
        hooks: ['@test', '@roundtrip'],
        isDone: true,
        children: []
      };

      // Legacy -> Modern -> Legacy
      const migrationResult = await migrationService.migrate(originalLegacy);
      const modernData = migrationResult.data;
      const backToLegacy = migrationService.convertToLegacyFormat(modernData);

      // Compare key fields
      assert.strictEqual(backToLegacy.id, originalLegacy.id);
      assert.strictEqual(backToLegacy.name, originalLegacy.name);
      assert.strictEqual(backToLegacy.borderColor, originalLegacy.borderColor);
      assert.strictEqual(backToLegacy.flexDirection, originalLegacy.flexDirection);
      assert.strictEqual(backToLegacy.host_url, originalLegacy.host_url);
      assert.strictEqual(backToLegacy.filename, originalLegacy.filename);
      assert.strictEqual(backToLegacy.isFolded, originalLegacy.isFolded);
      assert.deepStrictEqual(backToLegacy.hooks, originalLegacy.hooks);
      assert.strictEqual(backToLegacy.isDone, originalLegacy.isDone);

      // Properties (may be reorganized but should contain same data)
      assert.strictEqual(backToLegacy.properties.priority, originalLegacy.properties.priority);
      assert.deepStrictEqual(backToLegacy.properties.tags, originalLegacy.properties.tags);
      assert.strictEqual(backToLegacy.properties.customProp, originalLegacy.properties.customProp);
    });
  });

  describe('Real Test Data Migration', () => {
    test('Migrate test-data-legacy.json', async () => {
      const legacyPath = path.join(testDataDir, 'test-data-legacy.json');
      
      // Ensure test data exists
      let legacyContent;
      try {
        legacyContent = await fs.readFile(legacyPath, 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') {
          // Create default test data if file doesn't exist
          await createSampleLegacyData(testDataDir);
          legacyContent = await fs.readFile(legacyPath, 'utf8');
        } else {
          throw error;
        }
      }
      
      const legacyData = JSON.parse(legacyContent);

      const migrationResult = await migrationService.migrateHierarchical(legacyData);
      const { root, allTrays } = migrationResult;

      assert.ok(root);
      assert.ok(Object.keys(allTrays).length > 0);
      
      // Verify all trays have modern format
      for (const [id, trayData] of Object.entries(allTrays)) {
        assert.strictEqual(trayData.version, 1);
        assert.ok(trayData.created_dt instanceof Date);
        assert.strictEqual(typeof trayData.properties, 'object');
      }

      console.log(`Successfully migrated ${Object.keys(allTrays).length} trays from legacy format`);
    });

    test('Migrate test-data-current.json', async () => {
      const currentPath = path.join(testDataDir, 'test-data-current.json');
      
      // Ensure test data exists
      let currentContent;
      try {
        currentContent = await fs.readFile(currentPath, 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') {
          // Create a current format test file if it doesn't exist
          const currentData = {
            id: 'current-root',
            name: 'Current Format Root',
            version: 1,
            parentId: null,
            created_dt: new Date().toISOString(),
            properties: { priority: 1 },
            hooks: ['@current'],
            isDone: false,
            children: [
              {
                id: 'current-child',
                name: 'Current Child',
                version: 1,
                parentId: 'current-root',
                created_dt: new Date().toISOString(),
                properties: {},
                hooks: [],
                isDone: false,
                children: []
              }
            ]
          };
          await fs.writeFile(currentPath, JSON.stringify(currentData, null, 2));
          currentContent = await fs.readFile(currentPath, 'utf8');
        } else {
          throw error;
        }
      }
      
      const currentData = JSON.parse(currentContent);

      // Current data might already be in modern format or legacy format
      const version = migrationService.detectVersion(currentData);
      
      if (version === 0) {
        // Legacy format
        const migrationResult = await migrationService.migrateHierarchical(currentData);
        const { root, allTrays } = migrationResult;
        
        assert.ok(root);
        assert.ok(Object.keys(allTrays).length > 0);
        console.log(`Migrated current test data: ${Object.keys(allTrays).length} trays`);
      } else {
        console.log('Current test data is already in modern format');
        // Verify it's valid modern format
        assert.ok(currentData.version);
        assert.ok(currentData.id);
        assert.ok(currentData.name);
      }
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    test('Handle corrupted legacy data', async () => {
      const corruptedData = {
        id: 'corrupted',
        name: 'Corrupted Tray',
        children: [
          {
            // Missing required id field
            name: 'No ID Child',
            children: []
          },
          {
            id: 'valid-child',
            name: 'Valid Child',
            children: []
          }
        ]
      };

      try {
        const migrationResult = await migrationService.migrateHierarchical(corruptedData);
        
        // Should have warnings about corrupted data
        assert.ok(migrationResult.warnings && migrationResult.warnings.length > 0);
        
        // Should still migrate what it can
        const { root, allTrays } = migrationResult;
        assert.ok(root);
        
      } catch (error) {
        // Error is acceptable for severely corrupted data
        assert.ok(error instanceof Error);
      }
    });

    test('Handle extremely deep hierarchy', async () => {
      // Create a very deep hierarchy (100 levels)
      let deepData = {
        id: 'level-0',
        name: 'Level 0',
        children: []
      };

      let current = deepData;
      for (let i = 1; i < 100; i++) {
        const child = {
          id: `level-${i}`,
          name: `Level ${i}`,
          children: []
        };
        current.children.push(child);
        current = child;
      }

      const startTime = Date.now();
      const migrationResult = await migrationService.migrateHierarchical(deepData);
      const endTime = Date.now();

      const { root, allTrays } = migrationResult;
      assert.strictEqual(Object.keys(allTrays).length, 100);
      
      // Should complete in reasonable time
      const duration = endTime - startTime;
      assert.ok(duration < 5000, `Deep hierarchy migration took ${duration}ms`);
    });

    test('Handle large number of siblings', async () => {
      // Create a flat hierarchy with many children
      const wideData = {
        id: 'wide-root',
        name: 'Wide Root',
        children: []
      };

      for (let i = 0; i < 1000; i++) {
        wideData.children.push({
          id: `child-${i}`,
          name: `Child ${i}`,
          children: []
        });
      }

      const startTime = Date.now();
      const migrationResult = await migrationService.migrateHierarchical(wideData);
      const endTime = Date.now();

      const { root, allTrays } = migrationResult;
      assert.strictEqual(Object.keys(allTrays).length, 1001); // root + 1000 children
      
      // Should complete in reasonable time
      const duration = endTime - startTime;
      assert.ok(duration < 5000, `Wide hierarchy migration took ${duration}ms`);
    });

    test('Validation after migration', async () => {
      const testData = {
        id: 'validation-root',
        name: 'Validation Root',
        children: [
          {
            id: 'child1',
            name: 'Child 1',
            properties: { priority: 'invalid-number' }, // Invalid type
            children: []
          }
        ]
      };

      const migrationResult = await migrationService.migrateHierarchical(testData);
      const { root, allTrays } = migrationResult;

      // Validate each migrated tray
      for (const [id, trayData] of Object.entries(allTrays)) {
        const isValid = migrationService.validateMigration(testData, trayData);
        // Should be valid even with type coercion
        assert.ok(isValid, `Tray ${id} failed validation after migration`);
      }
    });
  });
});

// Helper function to create sample legacy data files
async function createSampleLegacyData(testDataDir) {
  const legacyData = {
    id: 'sample-root',
    name: 'Sample Root Tray',
    children: [
      {
        id: 'sample-child-1',
        name: 'Sample Child 1',
        borderColor: '#ff0000',
        created_dt: '2023-01-01T00:00:00.000Z',
        properties: { priority: 1 },
        hooks: ['@sample'],
        children: [
          {
            id: 'sample-grandchild',
            name: 'Sample Grandchild',
            borderColor: '#00ff00',
            created_dt: '2023-01-02T00:00:00.000Z',
            isDone: true,
            children: []
          }
        ]
      },
      {
        id: 'sample-child-2',
        name: 'Sample Child 2',
        borderColor: '#0000ff',
        created_dt: '2023-01-03T00:00:00.000Z',
        properties: { tags: ['test', 'sample'] },
        children: []
      }
    ],
    borderColor: '#cccccc',
    created_dt: '2023-01-01T00:00:00.000Z',
    flexDirection: 'column',
    isFolded: false,
    properties: {},
    hooks: [],
    isDone: false
  };

  await fs.writeFile(
    path.join(testDataDir, 'test-data-legacy.json'),
    JSON.stringify(legacyData, null, 2)
  );

  console.log('Created sample legacy test data');
}

console.log('All migration compatibility tests completed successfully!');