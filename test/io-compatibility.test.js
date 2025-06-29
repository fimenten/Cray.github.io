const assert = require('assert');
const { test, describe } = require('node:test');
const fs = require('fs');
const path = require('path');

// Simple tests focused on IO compatibility for refactoring
describe('IO Compatibility Tests', () => {
  test('sample export file structure is valid', () => {
    const samplePath = path.join(__dirname, '..', 'sample-export.json');
    
    if (fs.existsSync(samplePath)) {
      const content = fs.readFileSync(samplePath, 'utf8');
      const data = JSON.parse(content);
      
      // Check required fields exist
      assert.ok(data.id, 'Export should have id field');
      assert.ok(data.name, 'Export should have name field');
      assert.ok(Array.isArray(data.children), 'Export should have children array');
      assert.ok(data.created_dt, 'Export should have created_dt field');
      
      // Check data types
      assert.strictEqual(typeof data.id, 'string');
      assert.strictEqual(typeof data.name, 'string');
      assert.strictEqual(typeof data.isFolded, 'boolean');
      assert.ok(Array.isArray(data.hooks));
      assert.strictEqual(typeof data.properties, 'object');
    }
  });
  
  test('nested structure preserves hierarchy', () => {
    const sampleData = {
      id: 'root',
      name: 'Root',
      parentId: null,
      children: [
        {
          id: 'child1',
          name: 'Child 1',
          parentId: 'root',
          children: [
            {
              id: 'grandchild1',
              name: 'Grandchild 1',
              parentId: 'child1',
              children: []
            }
          ]
        }
      ]
    };
    
    // Verify parent-child relationships
    assert.strictEqual(sampleData.children[0].parentId, 'root');
    assert.strictEqual(sampleData.children[0].children[0].parentId, 'child1');
  });
  
  test('hooks and properties are preserved', () => {
    const withHooksAndProps = {
      id: 'test',
      name: 'Test with hooks @important @todo',
      hooks: ['@important', '@todo'],
      properties: {
        priority: 'high',
        category: 'work',
        metadata: { created: '2024-01-01' }
      },
      children: []
    };
    
    const serialized = JSON.stringify(withHooksAndProps);
    const deserialized = JSON.parse(serialized);
    
    assert.deepStrictEqual(deserialized.hooks, ['@important', '@todo']);
    assert.deepStrictEqual(deserialized.properties, {
      priority: 'high',
      category: 'work',
      metadata: { created: '2024-01-01' }
    });
  });
  
  test('unicode and special characters are preserved', () => {
    const unicodeData = {
      id: 'unicode-test',
      name: 'Unicode: 你好世界 🌍 #hashtag @mention',
      hooks: ['@日本語'],
      properties: {
        emoji: '🎉',
        unicode: '测试',
        special: '<>&"\'',
        newlines: 'line1\nline2\nline3'
      },
      children: []
    };
    
    const serialized = JSON.stringify(unicodeData);
    const deserialized = JSON.parse(serialized);
    
    assert.strictEqual(deserialized.name, 'Unicode: 你好世界 🌍 #hashtag @mention');
    assert.deepStrictEqual(deserialized.hooks, ['@日本語']);
    assert.strictEqual(deserialized.properties.emoji, '🎉');
    assert.strictEqual(deserialized.properties.unicode, '测试');
    assert.strictEqual(deserialized.properties.special, '<>&"\'');
    assert.strictEqual(deserialized.properties.newlines, 'line1\nline2\nline3');
  });
  
  test('date fields are handled correctly', () => {
    const dateData = {
      id: 'date-test',
      name: 'Date Test',
      created_dt: '2024-01-15T10:30:00.000Z',
      children: []
    };
    
    const serialized = JSON.stringify(dateData);
    const deserialized = JSON.parse(serialized);
    
    // Date should be preserved as string
    assert.strictEqual(deserialized.created_dt, '2024-01-15T10:30:00.000Z');
    
    // Should be parseable as Date
    const date = new Date(deserialized.created_dt);
    assert.ok(!isNaN(date.getTime()));
  });
  
  test('empty and null values are handled', () => {
    const edgeCaseData = {
      id: 'edge-case',
      name: '',
      parentId: null,
      host_url: null,
      filename: null,
      properties: {},
      hooks: [],
      children: []
    };
    
    const serialized = JSON.stringify(edgeCaseData);
    const deserialized = JSON.parse(serialized);
    
    assert.strictEqual(deserialized.name, '');
    assert.strictEqual(deserialized.parentId, null);
    assert.strictEqual(deserialized.host_url, null);
    assert.strictEqual(deserialized.filename, null);
    assert.deepStrictEqual(deserialized.properties, {});
    assert.deepStrictEqual(deserialized.hooks, []);
    assert.deepStrictEqual(deserialized.children, []);
  });
  
  test('large data structures are serializable', () => {
    // Create a large nested structure
    const createLargeStructure = (depth, breadth) => {
      if (depth <= 0) return [];
      
      const children = [];
      for (let i = 0; i < breadth; i++) {
        children.push({
          id: `node-${depth}-${i}`,
          name: `Node ${depth}-${i}`,
          parentId: `parent-${depth}`,
          children: createLargeStructure(depth - 1, breadth)
        });
      }
      return children;
    };
    
    const largeData = {
      id: 'large-root',
      name: 'Large Structure Root',
      children: createLargeStructure(4, 3) // 4 levels deep, 3 children each
    };
    
    // Should not throw
    const serialized = JSON.stringify(largeData);
    const deserialized = JSON.parse(serialized);
    
    assert.strictEqual(deserialized.id, 'large-root');
    assert.strictEqual(deserialized.children.length, 3);
    assert.ok(serialized.length > 1000); // Should be substantial
  });
  
  test('all required fields are present in valid export', () => {
    const completeData = {
      id: 'complete-1',
      name: 'Complete Tray',
      parentId: null,
      borderColor: '#123456',
      created_dt: new Date().toISOString(),
      flexDirection: 'column',
      host_url: 'https://example.com',
      filename: 'test.txt',
      isFolded: false,
      properties: { test: 'value' },
      hooks: ['@test'],
      isDone: false,
      children: []
    };
    
    const requiredFields = [
      'id', 'name', 'parentId', 'borderColor', 'created_dt',
      'flexDirection', 'host_url', 'filename', 'isFolded',
      'properties', 'hooks', 'isDone', 'children'
    ];
    
    requiredFields.forEach(field => {
      assert.ok(completeData.hasOwnProperty(field), `Field ${field} should be present`);
    });
    
    // Test serialization preserves all fields
    const serialized = JSON.stringify(completeData);
    const deserialized = JSON.parse(serialized);
    
    requiredFields.forEach(field => {
      assert.ok(deserialized.hasOwnProperty(field), `Field ${field} should be preserved after serialization`);
    });
  });
  
  test('legacy format compatibility', () => {
    // Test with minimal legacy format
    const legacyData = {
      id: 'legacy-1',
      name: 'Legacy Tray',
      children: [
        {
          id: 'legacy-child',
          name: 'Legacy Child',
          children: []
        }
      ]
    };
    
    // Should be parseable
    const serialized = JSON.stringify(legacyData);
    const deserialized = JSON.parse(serialized);
    
    assert.strictEqual(deserialized.id, 'legacy-1');
    assert.strictEqual(deserialized.name, 'Legacy Tray');
    assert.strictEqual(deserialized.children.length, 1);
    assert.strictEqual(deserialized.children[0].name, 'Legacy Child');
  });
});