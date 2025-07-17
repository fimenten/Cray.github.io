const { test, describe } = require('node:test');
const assert = require('node:assert');
// Import standalone test implementation that doesn't require DOM
const { deserialize, serialize } = require('./test-deserialize');

// Mock IndexedDB for testing
global.indexedDB = {
  open: () => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      objectStoreNames: { contains: () => false },
      createObjectStore: () => ({}),
      transaction: () => ({
        objectStore: () => ({
          put: () => ({ onsuccess: null, onerror: null }),
          get: () => ({ onsuccess: null, onerror: null, result: null })
        })
      })
    }
  })
};

// Mock DOM methods
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
    click: () => {},
    textContent: '',
    innerHTML: '',
    checked: false,
    value: '',
    type: '',
    title: '',
    href: '',
    target: '',
    alt: '',
    src: ''
  }),
  body: { appendChild: () => {}, innerHTML: '' }
};

global.window = {
  getSelection: () => ({
    removeAllRanges: () => {},
    addRange: () => {}
  }),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: clearTimeout
};

global.HTMLElement = class {};
global.HTMLDivElement = class {};
global.HTMLInputElement = class {};

describe('Migration Tests', () => {
  
  describe('Data Format Compatibility', () => {
    
    test('should deserialize basic tray structure', () => {
      const basicTrayData = {
        id: 'test-1',
        name: 'Test Tray',
        parentId: '',
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
      };
      
      const serialized = JSON.stringify(basicTrayData);
      const deserialized = deserialize(serialized);
      
      assert.strictEqual(deserialized.id, basicTrayData.id);
      assert.strictEqual(deserialized.name, basicTrayData.name);
      assert.strictEqual(deserialized.children.length, 0);
    });
    
    test('should handle legacy tray data without optional fields', () => {
      const legacyTrayData = {
        id: 'legacy-1',
        name: 'Legacy Tray',
        parentId: '',
        children: [],
        borderColor: '#ffffff',
        created_dt: new Date().toISOString(),
        flexDirection: 'column',
        host_url: null,
        filename: null,
        isFolded: false
        // Missing: properties, hooks, isDone
      };
      
      const serialized = JSON.stringify(legacyTrayData);
      const deserialized = deserialize(serialized);
      
      assert.strictEqual(deserialized.id, legacyTrayData.id);
      assert.strictEqual(deserialized.name, legacyTrayData.name);
      assert.strictEqual(typeof deserialized.properties, 'object');
      assert.strictEqual(Array.isArray(deserialized.hooks), true);
      assert.strictEqual(typeof deserialized.isDone, 'boolean');
    });
    
    test('should deserialize nested tray hierarchy', () => {
      const nestedTrayData = {
        id: 'root',
        name: 'Root Tray',
        parentId: '',
        children: [
          {
            id: 'child-1',
            name: 'Child 1',
            parentId: 'root',
            children: [
              {
                id: 'grandchild-1',
                name: 'Grandchild 1',
                parentId: 'child-1',
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
      
      const serialized = JSON.stringify(nestedTrayData);
      const deserialized = deserialize(serialized);
      
      assert.strictEqual(deserialized.children.length, 1);
      assert.strictEqual(deserialized.children[0].children.length, 1);
      assert.strictEqual(deserialized.children[0].children[0].name, 'Grandchild 1');
    });
    
    test('should handle tray with hooks and properties', () => {
      const hookTrayData = {
        id: 'hook-tray',
        name: 'Hook Tray @urgent @project',
        parentId: '',
        children: [],
        borderColor: '#ff0000',
        created_dt: new Date().toISOString(),
        flexDirection: 'row',
        host_url: 'https://example.com',
        filename: 'test.json',
        isFolded: true,
        properties: {
          priority: 'high',
          category: 'work',
          customField: 'test value'
        },
        hooks: ['urgent', 'project'],
        isDone: false
      };
      
      const serialized = JSON.stringify(hookTrayData);
      const deserialized = deserialize(serialized);
      
      assert.strictEqual(deserialized.properties.priority, 'high');
      assert.strictEqual(deserialized.hooks.length, 2);
      assert.strictEqual(deserialized.hooks[0], 'urgent');
      assert.strictEqual(deserialized.flexDirection, 'row');
      assert.strictEqual(deserialized.host_url, 'https://example.com');
    });
    
    test('should handle done tasks with @@ marker', () => {
      const doneTrayData = {
        id: 'done-task',
        name: 'Completed Task @@',
        parentId: '',
        children: [],
        borderColor: '#ffffff',
        created_dt: new Date().toISOString(),
        flexDirection: 'column',
        host_url: null,
        filename: null,
        isFolded: false,
        properties: {},
        hooks: [],
        isDone: true
      };
      
      const serialized = JSON.stringify(doneTrayData);
      const deserialized = deserialize(serialized);
      
      assert.strictEqual(deserialized.isDone, true);
      assert.strictEqual(deserialized.name.includes('@@'), true);
    });
    
  });
  
  describe('Serialization Round-trip Tests', () => {
    
    test('should maintain data integrity through serialize/deserialize cycle', () => {
      const originalData = {
        id: 'round-trip-test',
        name: 'Round Trip Test @test',
        parentId: '',
        children: [],
        borderColor: '#123456',
        created_dt: new Date().toISOString(),
        flexDirection: 'row',
        host_url: 'https://test.com',
        filename: 'test.json',
        isFolded: true,
        properties: { test: 'value', number: 42 },
        hooks: ['test'],
        isDone: false
      };
      
      const serialized = JSON.stringify(originalData);
      const deserialized = deserialize(serialized);
      const reSerialized = serialize(deserialized);
      const reDeserialized = deserialize(reSerialized);
      
      assert.strictEqual(reDeserialized.id, originalData.id);
      assert.strictEqual(reDeserialized.name, originalData.name);
      assert.strictEqual(reDeserialized.borderColor, originalData.borderColor);
      assert.strictEqual(reDeserialized.flexDirection, originalData.flexDirection);
      assert.strictEqual(reDeserialized.properties.test, originalData.properties.test);
      assert.strictEqual(reDeserialized.properties.number, originalData.properties.number);
    });
    
  });
  
  describe('Version Compatibility Edge Cases', () => {
    
    test('should handle missing borderColor field', () => {
      const noBorderColorData = {
        id: 'no-border',
        name: 'No Border Color',
        parentId: '',
        children: [],
        // borderColor: missing
        created_dt: new Date().toISOString(),
        flexDirection: 'column',
        host_url: null,
        filename: null,
        isFolded: false,
        properties: {},
        hooks: [],
        isDone: false
      };
      
      const serialized = JSON.stringify(noBorderColorData);
      const deserialized = deserialize(serialized);
      
      assert.strictEqual(typeof deserialized.borderColor, 'string');
      assert.notStrictEqual(deserialized.borderColor, undefined);
    });
    
    test('should handle legacy url field (renamed to host_url)', () => {
      const legacyUrlData = {
        id: 'legacy-url',
        name: 'Legacy URL Field',
        parentId: '',
        children: [],
        borderColor: '#ffffff',
        created_dt: new Date().toISOString(),
        flexDirection: 'column',
        url: 'https://legacy.com', // Old field name
        filename: null,
        isFolded: false,
        properties: {},
        hooks: [],
        isDone: false
      };
      
      const serialized = JSON.stringify(legacyUrlData);
      const deserialized = deserialize(serialized);
      
      assert.strictEqual(deserialized.host_url, 'https://legacy.com');
    });
    
    test('should handle malformed date strings', () => {
      const badDateData = {
        id: 'bad-date',
        name: 'Bad Date',
        parentId: '',
        children: [],
        borderColor: '#ffffff',
        created_dt: 'invalid-date-string',
        flexDirection: 'column',
        host_url: null,
        filename: null,
        isFolded: false,
        properties: {},
        hooks: [],
        isDone: false
      };
      
      const serialized = JSON.stringify(badDateData);
      const deserialized = deserialize(serialized);
      
      assert.strictEqual(deserialized.created_dt instanceof Date, true);
      assert.strictEqual(isNaN(deserialized.created_dt.getTime()), false);
    });
    
  });
  
});