const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { deserialize, serialize } = require('../dist/io');

// Mock DOM for testing
global.document = {
  createElement: (tag) => ({
    classList: { add: () => {}, remove: () => {} },
    style: {},
    setAttribute: () => {},
    addEventListener: () => {},
    querySelector: () => null,
    appendChild: () => {},
    insertBefore: () => {},
    removeChild: () => {},
    focus: () => {},
    blur: () => {},
    textContent: '',
    innerHTML: '',
    type: '',
    checked: false,
    value: ''
  }),
  body: { appendChild: () => {}, innerHTML: '' }
};

global.window = { getSelection: () => ({ removeAllRanges: () => {}, addRange: () => {} }) };
global.HTMLElement = class {};
global.HTMLDivElement = class {};

describe('Version Compatibility Tests', () => {
  
  const fixturesDir = path.join(__dirname, 'fixtures');
  
  // Helper function to load test data
  const loadTestData = (filename) => {
    const filePath = path.join(fixturesDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  };
  
  describe('Forward Compatibility', () => {
    
    test('should load v1.0 data in current version', () => {
      const v1Data = loadTestData('test-data-v1.json');
      const serialized = JSON.stringify(v1Data);
      const deserialized = deserialize(serialized);
      
      assert.strictEqual(deserialized.id, 'root-v1');
      assert.strictEqual(deserialized.name, 'Root Tray v1.0');
      assert.strictEqual(deserialized.children.length, 2);
      
      // Check that missing fields are handled gracefully
      assert.strictEqual(typeof deserialized.properties, 'object');
      assert.strictEqual(Array.isArray(deserialized.hooks), true);
      assert.strictEqual(typeof deserialized.isDone, 'boolean');
      
      // Verify child structure is preserved
      const projectTray = deserialized.children.find(c => c.name.includes('Project'));
      assert.notStrictEqual(projectTray, undefined);
      assert.strictEqual(projectTray.children.length, 2);
      
      // Check that @@ markers are correctly interpreted
      const completedTask = projectTray.children.find(c => c.name.includes('@@'));
      assert.notStrictEqual(completedTask, undefined);
      assert.strictEqual(completedTask.isDone, true);
    });
    
    test('should load v2.0 data with enhanced features', () => {
      const v2Data = loadTestData('test-data-v2.json');
      const serialized = JSON.stringify(v2Data);
      const deserialized = deserialize(serialized);
      
      assert.strictEqual(deserialized.id, 'root-v2');
      assert.strictEqual(deserialized.properties.version, '2.0');
      
      // Check enhanced features are preserved
      const enhancedTask = deserialized.children[0];
      assert.strictEqual(enhancedTask.properties.priority, 'high');
      assert.strictEqual(enhancedTask.hooks.length, 2);
      assert.strictEqual(enhancedTask.host_url, 'https://example.com/task');
      
      // Check network tray features
      const networkTray = deserialized.children[1];
      assert.strictEqual(networkTray.properties.auto_upload, true);
      assert.strictEqual(networkTray.children[0].flexDirection, 'row');
    });
    
    test('should handle legacy data format gracefully', () => {
      const legacyData = loadTestData('test-data-legacy.json');
      const serialized = JSON.stringify(legacyData);
      const deserialized = deserialize(serialized);
      
      assert.strictEqual(deserialized.id, 'root-legacy');
      
      // Check legacy URL field is mapped to host_url
      const oldTask = deserialized.children[0];
      assert.strictEqual(oldTask.host_url, 'https://legacy-url.com');
      
      // Check minimal task gets default values
      const minimalTask = deserialized.children[1];
      assert.strictEqual(typeof minimalTask.properties, 'object');
      assert.strictEqual(Array.isArray(minimalTask.hooks), true);
      
      // Check malformed date is handled
      const badDateTask = deserialized.children[2];
      assert.strictEqual(badDateTask.created_dt instanceof Date, true);
      assert.strictEqual(isNaN(badDateTask.created_dt.getTime()), false);
    });
    
    test('should load current version data with all features', () => {
      const currentData = loadTestData('test-data-current.json');
      const serialized = JSON.stringify(currentData);
      const deserialized = deserialize(serialized);
      
      assert.strictEqual(deserialized.id, 'root-current');
      assert.strictEqual(deserialized.properties.schema_version, 3);
      
      // Check complex nested properties are preserved
      const modernTask = deserialized.children[0];
      const nestedTask = modernTask.children[0];
      assert.strictEqual(nestedTask.properties.metadata.version, 3);
      assert.strictEqual(nestedTask.properties.dependencies.length, 2);
      
      // Check plugin integration features
      const pluginTask = deserialized.children[1];
      assert.strictEqual(pluginTask.properties.plugin_config.enabled_plugins.length, 3);
      
      // Check performance test data is handled
      const perfSection = deserialized.children[2];
      assert.strictEqual(perfSection.properties.large_data.array_data.length, 1000);
      
      // Check analytics on completed task
      const completedTask = deserialized.children[3];
      assert.strictEqual(completedTask.isDone, true);
      assert.strictEqual(completedTask.properties.completion_analytics.efficiency_score, 0.85);
    });
    
  });
  
  describe('Data Integrity Tests', () => {
    
    test('should maintain data consistency through version migrations', () => {
      const testVersions = [
        'test-data-v1.json',
        'test-data-v2.json', 
        'test-data-legacy.json',
        'test-data-current.json'
      ];
      
      testVersions.forEach(filename => {
        const originalData = loadTestData(filename);
        const serialized = JSON.stringify(originalData);
        const deserialized = deserialize(serialized);
        const reSerialized = serialize(deserialized);
        const reDeserialized = deserialize(reSerialized);
        
        // Core properties should be preserved
        assert.strictEqual(reDeserialized.id, originalData.id);
        assert.strictEqual(reDeserialized.name, originalData.name);
        assert.strictEqual(reDeserialized.children.length, originalData.children.length);
        
        // Properties should be object (even if originally undefined)
        assert.strictEqual(typeof reDeserialized.properties, 'object');
        assert.strictEqual(Array.isArray(reDeserialized.hooks), true);
        assert.strictEqual(typeof reDeserialized.isDone, 'boolean');
      });
    });
    
    test('should preserve hook parsing from task names', () => {
      const testCases = [
        { name: 'Task @urgent @work', expectedHooks: ['urgent', 'work'] },
        { name: 'No hooks here', expectedHooks: [] },
        { name: 'Single @hook', expectedHooks: ['hook'] },
        { name: '@start and @end hooks', expectedHooks: ['start', 'end'] },
        { name: 'Done task @@', expectedHooks: [] } // @@ is done marker, not hook
      ];
      
      testCases.forEach(({ name, expectedHooks }) => {
        const taskData = {
          id: 'test-task',
          name: name,
          parentId: '',
          children: [],
          borderColor: '#ffffff',
          created_dt: new Date().toISOString(),
          flexDirection: 'column',
          host_url: null,
          filename: null,
          isFolded: false,
          properties: {},
          hooks: [], // Will be parsed from name
          isDone: false
        };
        
        const serialized = JSON.stringify(taskData);
        const deserialized = deserialize(serialized);
        
        assert.deepStrictEqual(deserialized.hooks, expectedHooks);
        assert.strictEqual(deserialized.isDone, name.includes('@@'));
      });
    });
    
    test('should handle complex nested structures consistently', () => {
      // Create a complex nested structure
      const createNestedStructure = (depth, breadth) => {
        const base = {
          id: `node-${depth}`,
          name: `Node Depth ${depth}`,
          parentId: '',
          children: [],
          borderColor: '#ffffff',
          created_dt: new Date().toISOString(),
          flexDirection: 'column',
          host_url: null,
          filename: null,
          isFolded: false,
          properties: { depth: depth },
          hooks: [`level-${depth}`],
          isDone: false
        };
        
        if (depth > 0) {
          for (let i = 0; i < breadth; i++) {
            base.children.push(createNestedStructure(depth - 1, breadth));
          }
        }
        
        return base;
      };
      
      const complexStructure = createNestedStructure(4, 3); // 4 levels deep, 3 children each
      const serialized = JSON.stringify(complexStructure);
      const deserialized = deserialize(serialized);
      
      // Verify structure is preserved
      const countNodes = (node) => {
        return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
      };
      
      const originalCount = countNodes(complexStructure);
      const deserializedCount = countNodes(deserialized);
      
      assert.strictEqual(deserializedCount, originalCount);
      assert.strictEqual(deserialized.children.length, 3);
      assert.strictEqual(deserialized.children[0].children.length, 3);
      assert.strictEqual(deserialized.children[0].children[0].children.length, 3);
    });
    
  });
  
  describe('Error Handling and Recovery', () => {
    
    test('should handle partially corrupted data gracefully', () => {
      const partiallyCorruptedData = {
        id: 'corrupted-root',
        name: 'Corrupted Root',
        parentId: '',
        children: [
          {
            id: 'good-task',
            name: 'Good Task',
            parentId: 'corrupted-root',
            children: [],
            borderColor: '#ffffff',
            created_dt: new Date().toISOString(),
            flexDirection: 'column',
            host_url: null,
            filename: null,
            isFolded: false,
            properties: {},
            hooks: [],
            isDone: false
          },
          {
            id: 'bad-task',
            name: 'Bad Task',
            parentId: 'corrupted-root',
            children: [], 
            // Missing required fields
            created_dt: null,
            flexDirection: null
          }
        ],
        borderColor: '#ffffff',
        created_dt: new Date().toISOString(),
        flexDirection: 'column',
        host_url: null,
        filename: null,
        isFolded: false,
        properties: {},
        hooks: [],
        isDone: false
      };
      
      const serialized = JSON.stringify(partiallyCorruptedData);
      
      // Should not throw an error
      let deserialized;
      assert.doesNotThrow(() => {
        deserialized = deserialize(serialized);
      });
      
      // Good data should be preserved
      assert.strictEqual(deserialized.children[0].name, 'Good Task');
      
      // Bad data should have sensible defaults
      assert.strictEqual(deserialized.children[1].created_dt instanceof Date, true);
      assert.strictEqual(typeof deserialized.children[1].flexDirection, 'string');
    });
    
    test('should provide meaningful error information for completely invalid data', () => {
      const invalidDataCases = [
        'not-json-at-all',
        '{"incomplete": json',
        'null',
        '[]', // Array instead of object
        '{"id": null}' // Missing required fields
      ];
      
      invalidDataCases.forEach(invalidData => {
        assert.throws(() => {
          deserialize(invalidData);
        }, Error);
      });
    });
    
  });
  
});