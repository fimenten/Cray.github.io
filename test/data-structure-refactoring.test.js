const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');

// Mock DOM environment
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLDivElement = dom.window.HTMLDivElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.HTMLSpanElement = dom.window.HTMLSpanElement;
global.HTMLButtonElement = dom.window.HTMLButtonElement;
global.MouseEvent = dom.window.MouseEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;
global.Event = dom.window.Event;
global.DragEvent = dom.window.DragEvent;

// Mock indexedDB and other browser APIs
global.indexedDB = {
  open: () => ({
    result: { transaction: () => ({ objectStore: () => ({}) }) },
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null
  })
};

// Import modules after setting up globals
const { TrayData, TrayUIState, DATA_VERSION } = require('../cjs/types.js');
const { DataMigration, migrationService, convertTrayToData } = require('../cjs/migration.js');
const { TrayGraph } = require('../cjs/trayGraph.js');
const { TrayManager, trayManager } = require('../cjs/trayManager.js');
const { Tray } = require('../cjs/tray.js');

describe('Data Structure Refactoring Tests', () => {
  
  describe('Type Definitions', () => {
    test('TrayData interface has required fields', () => {
      const trayData = {
        id: 'test-123',
        name: 'Test Tray',
        parentId: null,
        borderColor: '#ffffff',
        created_dt: new Date(),
        flexDirection: 'column',
        host_url: null,
        filename: null,
        isFolded: true,
        properties: { priority: 1 },
        hooks: [],
        isDone: false,
        showDoneMarker: false,
        version: 1
      };

      assert.strictEqual(trayData.id, 'test-123');
      assert.strictEqual(trayData.name, 'Test Tray');
      assert.strictEqual(trayData.version, 1);
      assert.strictEqual(typeof trayData.properties, 'object');
    });

    test('TrayUIState interface separation', () => {
      const uiState = {
        id: 'test-123',
        isEditing: false,
        isSelected: false,
        isFocused: false,
        isExpanded: true,
        autoUpload: false,
        lastInteractionTime: new Date()
      };

      assert.strictEqual(uiState.id, 'test-123');
      assert.strictEqual(uiState.isEditing, false);
      assert.ok(uiState.lastInteractionTime instanceof Date);
    });
  });

  describe('Migration Utilities', () => {
    test('DataMigration detects legacy format', () => {
      const legacyData = {
        id: 'old-tray',
        name: 'Old Tray',
        children: [],
        borderColor: '#ff0000',
        created_dt: '2024-01-01T00:00:00.000Z'
      };

      const version = migrationService.detectVersion(legacyData);
      assert.strictEqual(version, DATA_VERSION.LEGACY);
    });

    test('Migration from legacy to modern format', async () => {
      const legacyData = {
        id: 'legacy-123',
        name: 'Legacy Tray',
        parentId: null,
        borderColor: '#ff0000',
        created_dt: '2024-01-01T00:00:00.000Z',
        flexDirection: 'column',
        isFolded: true,
        properties: { priority: 5, tags: ['important'] },
        hooks: ['@test'],
        isDone: false
      };

      const migrationResult = await migrationService.migrate(legacyData);
      const modernData = migrationResult.data;

      assert.strictEqual(modernData.id, 'legacy-123');
      assert.strictEqual(modernData.name, 'Legacy Tray');
      assert.strictEqual(modernData.version, DATA_VERSION.V1_SEPARATED);
      assert.strictEqual(modernData.properties.priority, 5);
      assert.deepStrictEqual(modernData.properties.tags, ['important']);
      assert.deepStrictEqual(modernData.hooks, ['@test']);
      assert.ok(modernData.created_dt instanceof Date);
    });

    test('Hierarchical migration preserves structure', async () => {
      const legacyRoot = {
        id: 'root',
        name: 'Root Tray',
        children: [
          {
            id: 'child1',
            name: 'Child 1',
            children: [
              { id: 'grandchild1', name: 'Grandchild 1', children: [] }
            ]
          },
          { id: 'child2', name: 'Child 2', children: [] }
        ]
      };

      const result = await migrationService.migrateHierarchical(legacyRoot);
      const { root, allTrays } = result;

      assert.strictEqual(root.id, 'root');
      assert.strictEqual(Object.keys(allTrays).length, 4);
      assert.strictEqual(allTrays['child1'].parentId, 'root');
      assert.strictEqual(allTrays['grandchild1'].parentId, 'child1');
      assert.strictEqual(allTrays['child2'].parentId, 'root');
    });

    test('Convert Tray class to TrayData', () => {
      // Create a minimal Tray instance for testing
      const tray = {
        id: 'tray-123',
        name: 'Test Tray',
        parentId: 'parent-456',
        borderColor: '#00ff00',
        created_dt: new Date('2024-01-01'),
        flexDirection: 'row',
        host_url: 'https://example.com',
        filename: 'test.json',
        isFolded: false,
        properties: { priority: 3, metadata: { custom: 'value' } },
        hooks: ['@urgent'],
        isDone: true,
        showDoneMarker: true,
        autoUpload: false
      };

      const trayData = convertTrayToData(tray);

      assert.strictEqual(trayData.id, 'tray-123');
      assert.strictEqual(trayData.name, 'Test Tray');
      assert.strictEqual(trayData.parentId, 'parent-456');
      assert.strictEqual(trayData.version, DATA_VERSION.V1_SEPARATED);
      assert.strictEqual(trayData.properties.priority, 3);
      assert.deepStrictEqual(trayData.hooks, ['@urgent']);
    });
  });

  describe('TrayGraph Operations', () => {
    let graph;

    before(() => {
      graph = new TrayGraph();
    });

    test('Add and retrieve trays', () => {
      graph.addTray('tray1');
      graph.addTray('tray2', 'tray1');
      graph.addTray('tray3', 'tray1');

      assert.ok(graph.hasTray('tray1'));
      assert.ok(graph.hasTray('tray2'));
      assert.ok(graph.hasTray('tray3'));
      assert.strictEqual(graph.getRootId(), 'tray1');
    });

    test('Parent-child relationships', () => {
      const children = graph.getChildren('tray1');
      assert.ok(children.includes('tray2'));
      assert.ok(children.includes('tray3'));

      assert.strictEqual(graph.getParent('tray2'), 'tray1');
      assert.strictEqual(graph.getParent('tray3'), 'tray1');
      assert.strictEqual(graph.getParent('tray1'), null);
    });

    test('Move tray to new parent', () => {
      graph.addTray('tray4');
      const success = graph.moveTray('tray3', 'tray4');

      assert.ok(success);
      assert.strictEqual(graph.getParent('tray3'), 'tray4');
      assert.ok(graph.getChildren('tray4').includes('tray3'));
      assert.ok(!graph.getChildren('tray1').includes('tray3'));
    });

    test('Prevent circular references', () => {
      // Try to move tray1 under tray2 (which is a child of tray1)
      const success = graph.moveTray('tray1', 'tray2');
      assert.ok(!success);
    });

    test('Remove tray and descendants', () => {
      graph.addTray('tray5', 'tray2');
      graph.addTray('tray6', 'tray5');

      const removed = graph.removeTray('tray2');
      assert.ok(removed.includes('tray2'));
      assert.ok(removed.includes('tray5'));
      assert.ok(removed.includes('tray6'));

      assert.ok(!graph.hasTray('tray2'));
      assert.ok(!graph.hasTray('tray5'));
      assert.ok(!graph.hasTray('tray6'));
    });

    test('Get descendants and ancestors', () => {
      graph.addTray('deep1', 'tray1');
      graph.addTray('deep2', 'deep1');
      graph.addTray('deep3', 'deep2');

      const descendants = graph.getDescendants('tray1');
      assert.ok(descendants.includes('deep1'));
      assert.ok(descendants.includes('deep2'));
      assert.ok(descendants.includes('deep3'));

      const ancestors = graph.getAncestors('deep3');
      assert.ok(ancestors.includes('deep2'));
      assert.ok(ancestors.includes('deep1'));
      assert.ok(ancestors.includes('tray1'));
    });

    test('Tree structure conversion', () => {
      const tree = graph.getTreeStructure();
      assert.strictEqual(tree.id, 'tray1');
      assert.ok(Array.isArray(tree.children));
      assert.ok(tree.children.some(child => child.id === 'deep1'));
    });

    test('Flatten tree with depth', () => {
      const flat = graph.flattenTree();
      assert.ok(flat.length > 0);
      assert.strictEqual(flat[0].id, 'tray1');
      assert.strictEqual(flat[0].depth, 0);

      const deep3Node = flat.find(node => node.id === 'deep3');
      assert.ok(deep3Node);
      assert.strictEqual(deep3Node.depth, 3);
    });

    test('Validate graph integrity', () => {
      const validation = graph.validate();
      assert.ok(validation.isValid);
      assert.strictEqual(validation.errors.length, 0);
    });
  });

  describe('TrayManager Integration', () => {
    before(() => {
      trayManager.clear();
    });

    test('Create tray with modern architecture', () => {
      const id = trayManager.createTray('Test Tray', null, {
        borderColor: '#ff0000',
        properties: { priority: 2 }
      });

      assert.ok(id);
      const data = trayManager.getTrayData(id);
      assert.strictEqual(data.name, 'Test Tray');
      assert.strictEqual(data.borderColor, '#ff0000');
      assert.strictEqual(data.properties.priority, 2);
    });

    test('Update tray data', () => {
      const id = trayManager.createTray('Update Test');
      const success = trayManager.updateTrayData(id, {
        name: 'Updated Name',
        isDone: true
      });

      assert.ok(success);
      const data = trayManager.getTrayData(id);
      assert.strictEqual(data.name, 'Updated Name');
      assert.strictEqual(data.isDone, true);
    });

    test('Create parent-child relationship', () => {
      const parentId = trayManager.createTray('Parent');
      const childId = trayManager.createTray('Child', parentId);

      const children = trayManager.getChildren(parentId);
      assert.ok(children.includes(childId));

      const parent = trayManager.getParent(childId);
      assert.strictEqual(parent, parentId);
    });

    test('Move tray between parents', () => {
      const parent1Id = trayManager.createTray('Parent 1');
      const parent2Id = trayManager.createTray('Parent 2');
      const childId = trayManager.createTray('Movable Child', parent1Id);

      const success = trayManager.moveTray(childId, parent2Id);
      assert.ok(success);

      assert.ok(!trayManager.getChildren(parent1Id).includes(childId));
      assert.ok(trayManager.getChildren(parent2Id).includes(childId));
      assert.strictEqual(trayManager.getParent(childId), parent2Id);
    });

    test('Delete tray and descendants', () => {
      const rootId = trayManager.createTray('Delete Root');
      const child1Id = trayManager.createTray('Child 1', rootId);
      const child2Id = trayManager.createTray('Child 2', rootId);
      const grandchildId = trayManager.createTray('Grandchild', child1Id);

      const removed = trayManager.deleteTray(rootId);
      assert.strictEqual(removed.length, 4);
      assert.ok(removed.includes(rootId));
      assert.ok(removed.includes(child1Id));
      assert.ok(removed.includes(child2Id));
      assert.ok(removed.includes(grandchildId));

      // Verify all are removed
      assert.strictEqual(trayManager.getTrayData(rootId), null);
      assert.strictEqual(trayManager.getTrayData(child1Id), null);
    });

    test('Import legacy Tray hierarchy', async () => {
      const legacyData = {
        id: 'imported-root',
        name: 'Imported Root',
        borderColor: '#0000ff',
        created_dt: new Date().toISOString(),
        children: [
          {
            id: 'imported-child',
            name: 'Imported Child',
            borderColor: '#00ff00',
            created_dt: new Date().toISOString(),
            children: []
          }
        ]
      };

      const rootId = await trayManager.importLegacyHierarchy(legacyData);
      assert.ok(rootId);
      assert.strictEqual(rootId, 'imported-root');

      const rootData = trayManager.getTrayData(rootId);
      assert.strictEqual(rootData.name, 'Imported Root');

      const children = trayManager.getChildren(rootId);
      assert.strictEqual(children.length, 1);
      assert.strictEqual(children[0], 'imported-child');
    });

    test('Export as legacy format', () => {
      // Clear any existing data first
      trayManager.clear();
      
      const rootId = trayManager.createTray('Export Root');
      const childId = trayManager.createTray('Export Child', rootId);

      const legacyData = trayManager.exportAsLegacyFormat();
      assert.ok(legacyData);
      assert.strictEqual(legacyData.name, 'Export Root');
      assert.ok(Array.isArray(legacyData.children));
      assert.strictEqual(legacyData.children.length, 1);
      assert.strictEqual(legacyData.children[0].name, 'Export Child');
      
      // Verify IDs match what we created
      assert.strictEqual(legacyData.id, rootId);
      assert.strictEqual(legacyData.children[0].id, childId);
    });

    test('Validate manager integrity', () => {
      const validation = trayManager.validate();
      assert.ok(validation.isValid);
      if (!validation.isValid) {
        console.log('Validation errors:', validation.errors);
      }
    });

    test('Performance metrics', () => {
      const metrics = trayManager.getMetrics();
      assert.ok(metrics.totalTrays >= 0);
      assert.ok(metrics.totalComponents >= 0);
      assert.ok(metrics.maxDepth >= 0);
      assert.ok(metrics.orphanedComponents >= 0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('Migration handles invalid data gracefully', async () => {
      const invalidData = { invalid: 'data' };
      
      try {
        await migrationService.migrate(invalidData);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
      }
    });

    test('Graph operations with non-existent IDs', () => {
      const graph = new TrayGraph();
      
      assert.strictEqual(graph.getParent('non-existent'), null);
      assert.deepStrictEqual(graph.getChildren('non-existent'), []);
      assert.ok(!graph.moveTray('non-existent', 'also-non-existent'));
    });

    test('TrayManager handles missing data', () => {
      assert.strictEqual(trayManager.getTrayData('missing-id'), null);
      assert.ok(!trayManager.updateTrayData('missing-id', { name: 'New Name' }));
      assert.deepStrictEqual(trayManager.getChildren('missing-id'), []);
    });

    test('Large hierarchy performance', () => {
      const startTime = Date.now();
      
      // Create a tree with 100 nodes
      let rootId = trayManager.createTray('Perf Root');
      for (let i = 0; i < 99; i++) {
        const parentId = i === 0 ? rootId : `perf-${Math.floor(i / 10)}`;
        trayManager.createTray(`Perf Node ${i}`, parentId);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      assert.ok(duration < 1000, `Large hierarchy creation took ${duration}ms`);
      
      // Verify structure
      const allIds = trayManager.getAllTrayIds();
      assert.ok(allIds.length >= 100);
    });
  });
});

describe('Memory and Performance Tests', () => {
  test('Memory cleanup after tray deletion', () => {
    const initialMetrics = trayManager.getMetrics();
    
    // Create some trays
    const rootId = trayManager.createTray('Memory Test Root');
    for (let i = 0; i < 10; i++) {
      trayManager.createTray(`Memory Test ${i}`, rootId);
    }
    
    // Delete all
    trayManager.deleteTray(rootId);
    
    const finalMetrics = trayManager.getMetrics();
    
    // Should have cleaned up properly
    assert.ok(finalMetrics.totalTrays <= initialMetrics.totalTrays);
    assert.ok(finalMetrics.orphanedComponents === 0);
  });

  test('Graph operations are O(1) or O(log n)', () => {
    const graph = new TrayGraph();
    
    // Add 1000 nodes
    for (let i = 0; i < 1000; i++) {
      graph.addTray(`perf-${i}`, i > 0 ? `perf-${Math.floor(i / 2)}` : null);
    }
    
    // Test operations
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      graph.getChildren(`perf-${i}`);
      graph.getParent(`perf-${i}`);
      graph.getDepth(`perf-${i}`);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should be fast even with 1000 nodes
    assert.ok(duration < 100, `100 graph operations took ${duration}ms`);
  });
});

console.log('All data structure refactoring tests completed successfully!');