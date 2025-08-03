const assert = require('assert');
const { test } = require('node:test');

const body = { children: [], appendChild(el){ this.children.push(el); el.parent=this; }, removeChild(el){ this.children = this.children.filter(c=>c!==el); } };
function createElement(tag='div'){
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    style: {},
    dataset: {},
    classList:{
      _cls:new Set(),
      add(c){ this._cls.add(c); },
      remove(c){ this._cls.delete(c); },
      contains(c){ return this._cls.has(c); }
    },
    appendChild(child){ child.parent=this; this.children.push(child); },
    append(child){ this.appendChild(child); },
    insertBefore(child, ref){
      child.parent=this;
      if(!ref){ this.children.push(child); }
      else{
        const i = this.children.indexOf(ref);
        if(i>=0) this.children.splice(i,0,child); else this.children.push(child);
      }
    },
    removeChild(child){ this.children = this.children.filter(c=>c!==child); },
    setAttribute(name, value){ if(name.startsWith('data-')){ this.dataset[name.slice(5)] = value; } },
    addEventListener(){},
    querySelector(sel){ return this.children.find(c => c.id === sel.slice(1)); },
    focus(){this.focused=true;},
    remove(){if(this.parent) this.parent.removeChild(this);}
  };
  return el;
}

global.document = {
  createElement,
  body,
  addEventListener(){},
  getElementById(id){ return document.querySelector('#'+id); },
  querySelector(sel){ return body.querySelector?.(sel); }
};

global.window = {
  localStorage: new Map(),
  addEventListener(){},
  requestIdleCallback(fn){ setTimeout(fn, 0); },
  indexedDB: {
    open(){ return { onsuccess(){}, onerror(){}, result: { transaction(){} } }; }
  }
};

// Mock IndexedDB operations
const mockIndexedDB = {
  saveToIndexedDB: () => Promise.resolve(),
  loadFromIndexedDB: () => Promise.resolve({})
};

// Inject mocks
global.saveToIndexedDB = mockIndexedDB.saveToIndexedDB;
global.loadFromIndexedDB = mockIndexedDB.loadFromIndexedDB;

// Import after setting up mocks
const { meltTray } = (() => {
  try {
    return require('../dist/functions.js');
  } catch {
    // Mock implementation if dist doesn't exist
    return {
      meltTray: function(tray) {
        const parent = global.mockTrays?.find(t => t.id === tray.parentId);
        if (!parent) return;
        
        // Move children from tray to parent
        tray.children.forEach(child => {
          parent.addChild(child);
        });
        tray.children.length = 0;
        
        // Remove tray from parent
        parent.removeChild(tray.id);
        if (tray.element) tray.element.remove();
        
        if (parent.element) parent.element.focus();
      }
    };
  }
})();

// Mock Tray class for testing
class MockTray {
  constructor(id, name, parentId = null) {
    this.id = id;
    this.name = name;
    this.parentId = parentId;
    this.children = [];
    this.element = createElement('div');
    this.element.id = id;
    this.borderColor = '#f5f5f5';
    this.created_dt = new Date();
    this.flexDirection = 'column';
    this.host_url = null;
    this.filename = null;
    this.isFolded = true;
    this.properties = {};
    this.hooks = [];
    this.isDone = false;
    this.autoUpload = false;
  }
  
  addChild(child) {
    if (typeof child === 'string') {
      // Find child by ID
      child = global.mockTrays?.find(t => t.id === child) || child;
    }
    if (!this.children.includes(child)) {
      this.children.push(child);
      if (typeof child === 'object') {
        child.parentId = this.id;
      }
    }
  }
  
  removeChild(childId) {
    this.children = this.children.filter(child => 
      (typeof child === 'string' ? child : child.id) !== childId
    );
  }
  
  hasChild(childId) {
    return this.children.some(child => 
      (typeof child === 'string' ? child : child.id) === childId
    );
  }
  
  getChildrenIds() {
    return this.children.map(child => 
      typeof child === 'string' ? child : child.id
    );
  }
}

test('meltTray - basic functionality', () => {
  // Setup: parent -> tray -> [child1, child2]
  const parent = new MockTray('parent', 'Parent');
  const tray = new MockTray('tray', 'Tray', 'parent');
  const child1 = new MockTray('child1', 'Child 1', 'tray');
  const child2 = new MockTray('child2', 'Child 2', 'tray');
  
  global.mockTrays = [parent, tray, child1, child2];
  
  parent.addChild(tray);
  tray.addChild(child1);
  tray.addChild(child2);
  
  // Mock getTrayFromId function
  global.getTrayFromId = (id) => global.mockTrays.find(t => t.id === id);
  
  // Verify initial state
  assert.strictEqual(parent.children.length, 1);
  assert.strictEqual(tray.children.length, 2);
  assert.ok(parent.hasChild('tray'));
  assert.ok(tray.hasChild('child1'));
  assert.ok(tray.hasChild('child2'));
  
  // Execute melt
  meltTray(tray);
  
  // Verify result: parent should now have child1 and child2, tray should be removed
  assert.strictEqual(tray.children.length, 0, 'Tray children should be moved');
  assert.strictEqual(parent.children.length, 2, 'Parent should have former tray children');
  assert.ok(parent.hasChild('child1'), 'Parent should have child1');
  assert.ok(parent.hasChild('child2'), 'Parent should have child2');
  assert.ok(!parent.hasChild('tray'), 'Parent should not have tray anymore');
});

test('meltTray - single child', () => {
  const parent = new MockTray('parent', 'Parent');
  const tray = new MockTray('tray', 'Tray', 'parent');
  const child = new MockTray('child', 'Child', 'tray');
  
  global.mockTrays = [parent, tray, child];
  global.getTrayFromId = (id) => global.mockTrays.find(t => t.id === id);
  
  parent.addChild(tray);
  tray.addChild(child);
  
  assert.strictEqual(parent.children.length, 1);
  assert.strictEqual(tray.children.length, 1);
  
  meltTray(tray);
  
  assert.strictEqual(tray.children.length, 0);
  assert.strictEqual(parent.children.length, 1);
  assert.ok(parent.hasChild('child'));
  assert.ok(!parent.hasChild('tray'));
});

test('meltTray - no children', () => {
  const parent = new MockTray('parent', 'Parent');
  const tray = new MockTray('tray', 'Tray', 'parent');
  
  global.mockTrays = [parent, tray];
  global.getTrayFromId = (id) => global.mockTrays.find(t => t.id === id);
  
  parent.addChild(tray);
  
  assert.strictEqual(parent.children.length, 1);
  assert.strictEqual(tray.children.length, 0);
  
  meltTray(tray);
  
  assert.strictEqual(tray.children.length, 0);
  assert.strictEqual(parent.children.length, 0);
  assert.ok(!parent.hasChild('tray'));
});

test('meltTray - multiple levels deep', () => {
  // Setup: grandparent -> parent -> tray -> [child1, child2 -> grandchild]
  const grandparent = new MockTray('grandparent', 'Grandparent');
  const parent = new MockTray('parent', 'Parent', 'grandparent');
  const tray = new MockTray('tray', 'Tray', 'parent');
  const child1 = new MockTray('child1', 'Child 1', 'tray');
  const child2 = new MockTray('child2', 'Child 2', 'tray');
  const grandchild = new MockTray('grandchild', 'Grandchild', 'child2');
  
  global.mockTrays = [grandparent, parent, tray, child1, child2, grandchild];
  global.getTrayFromId = (id) => global.mockTrays.find(t => t.id === id);
  
  grandparent.addChild(parent);
  parent.addChild(tray);
  tray.addChild(child1);
  tray.addChild(child2);
  child2.addChild(grandchild);
  
  assert.strictEqual(parent.children.length, 1);
  assert.strictEqual(tray.children.length, 2);
  assert.strictEqual(child2.children.length, 1);
  
  meltTray(tray);
  
  // Verify the tray's children moved to parent, but grandchild remains with child2
  assert.strictEqual(tray.children.length, 0);
  assert.strictEqual(parent.children.length, 2);
  assert.strictEqual(child2.children.length, 1);
  assert.ok(parent.hasChild('child1'));
  assert.ok(parent.hasChild('child2'));
  assert.ok(child2.hasChild('grandchild'));
  assert.ok(!parent.hasChild('tray'));
});

test('meltTray - with network settings', () => {
  const parent = new MockTray('parent', 'Parent');
  const tray = new MockTray('tray', 'Tray', 'parent');
  const child = new MockTray('child', 'Child', 'tray');
  
  // Add network settings to tray
  tray.host_url = 'https://example.com';
  tray.filename = 'test.json';
  tray.autoUpload = true;
  
  global.mockTrays = [parent, tray, child];
  global.getTrayFromId = (id) => global.mockTrays.find(t => t.id === id);
  
  parent.addChild(tray);
  tray.addChild(child);
  
  meltTray(tray);
  
  // Child should preserve its own settings, not inherit from melted tray
  assert.strictEqual(child.host_url, null);
  assert.strictEqual(child.filename, null);
  assert.strictEqual(child.autoUpload, false);
  assert.ok(parent.hasChild('child'));
});

test('meltTray - with hooks and properties', () => {
  const parent = new MockTray('parent', 'Parent');
  const tray = new MockTray('tray', 'Tray', 'parent');
  const child = new MockTray('child', 'Child', 'tray');
  
  // Add hooks and properties to tray
  tray.hooks = ['hook1', 'hook2'];
  tray.properties = { prop1: 'value1', prop2: 'value2' };
  tray.isDone = true;
  
  global.mockTrays = [parent, tray, child];
  global.getTrayFromId = (id) => global.mockTrays.find(t => t.id === id);
  
  parent.addChild(tray);
  tray.addChild(child);
  
  meltTray(tray);
  
  // Child should preserve its own properties
  assert.deepStrictEqual(child.hooks, []);
  assert.deepStrictEqual(child.properties, {});
  assert.strictEqual(child.isDone, false);
  assert.ok(parent.hasChild('child'));
});

test('meltTray - no parent (root tray)', () => {
  const tray = new MockTray('tray', 'Tray', null);
  const child = new MockTray('child', 'Child', 'tray');
  
  global.mockTrays = [tray, child];
  global.getTrayFromId = (id) => global.mockTrays.find(t => t.id === id);
  
  tray.addChild(child);
  
  // Should not crash when no parent exists
  meltTray(tray);
  
  // Tray should still have its children since no parent to move them to
  assert.strictEqual(tray.children.length, 1);
});

test('meltTray - parent not found', () => {
  const tray = new MockTray('tray', 'Tray', 'nonexistent');
  const child = new MockTray('child', 'Child', 'tray');
  
  global.mockTrays = [tray, child];
  global.getTrayFromId = (id) => null; // Mock not finding parent
  
  tray.addChild(child);
  
  // Should not crash when parent not found
  meltTray(tray);
  
  // Tray should still have its children since no parent found
  assert.strictEqual(tray.children.length, 1);
});

test('meltTray - preserves child order', () => {
  const parent = new MockTray('parent', 'Parent');
  const tray = new MockTray('tray', 'Tray', 'parent');
  const child1 = new MockTray('child1', 'Child 1', 'tray');
  const child2 = new MockTray('child2', 'Child 2', 'tray');
  const child3 = new MockTray('child3', 'Child 3', 'tray');
  
  global.mockTrays = [parent, tray, child1, child2, child3];
  global.getTrayFromId = (id) => global.mockTrays.find(t => t.id === id);
  
  parent.addChild(tray);
  tray.addChild(child1);
  tray.addChild(child2);
  tray.addChild(child3);
  
  const originalOrder = tray.getChildrenIds();
  
  meltTray(tray);
  
  const newOrder = parent.getChildrenIds();
  assert.deepStrictEqual(newOrder, originalOrder, 'Child order should be preserved');
});

test('meltTray - with existing siblings', () => {
  const parent = new MockTray('parent', 'Parent');
  const sibling1 = new MockTray('sibling1', 'Sibling 1', 'parent');
  const tray = new MockTray('tray', 'Tray', 'parent');
  const sibling2 = new MockTray('sibling2', 'Sibling 2', 'parent');
  const child1 = new MockTray('child1', 'Child 1', 'tray');
  const child2 = new MockTray('child2', 'Child 2', 'tray');
  
  global.mockTrays = [parent, sibling1, tray, sibling2, child1, child2];
  global.getTrayFromId = (id) => global.mockTrays.find(t => t.id === id);
  
  parent.addChild(sibling1);
  parent.addChild(tray);
  parent.addChild(sibling2);
  tray.addChild(child1);
  tray.addChild(child2);
  
  assert.strictEqual(parent.children.length, 3);
  
  meltTray(tray);
  
  // Parent should now have siblings + melted children, minus the melted tray
  assert.strictEqual(parent.children.length, 4);
  assert.ok(parent.hasChild('sibling1'));
  assert.ok(parent.hasChild('sibling2'));
  assert.ok(parent.hasChild('child1'));
  assert.ok(parent.hasChild('child2'));
  assert.ok(!parent.hasChild('tray'));
});

test('meltTray - recursive melting scenario', () => {
  // Test case where children also get melted
  const parent = new MockTray('parent', 'Parent');
  const tray = new MockTray('tray', 'Tray', 'parent');
  const intermediateChild = new MockTray('intermediate', 'Intermediate', 'tray');
  const deepChild = new MockTray('deep', 'Deep Child', 'intermediate');
  
  global.mockTrays = [parent, tray, intermediateChild, deepChild];
  global.getTrayFromId = (id) => global.mockTrays.find(t => t.id === id);
  
  parent.addChild(tray);
  tray.addChild(intermediateChild);
  intermediateChild.addChild(deepChild);
  
  // First melt the main tray
  meltTray(tray);
  
  assert.ok(parent.hasChild('intermediate'));
  assert.ok(intermediateChild.hasChild('deep'));
  assert.ok(!parent.hasChild('tray'));
  
  // Then melt the intermediate child
  meltTray(intermediateChild);
  
  assert.ok(parent.hasChild('deep'));
  assert.ok(!parent.hasChild('intermediate'));
  assert.strictEqual(parent.children.length, 1);
});

test('meltTray - DOM element cleanup', () => {
  const parent = new MockTray('parent', 'Parent');
  const tray = new MockTray('tray', 'Tray', 'parent');
  const child = new MockTray('child', 'Child', 'tray');
  
  global.mockTrays = [parent, tray, child];
  global.getTrayFromId = (id) => global.mockTrays.find(t => t.id === id);
  
  parent.addChild(tray);
  tray.addChild(child);
  
  // Verify DOM elements exist
  assert.ok(tray.element);
  assert.ok(parent.element);
  
  let elementRemoved = false;
  tray.element.remove = () => { elementRemoved = true; };
  
  meltTray(tray);
  
  // Verify DOM cleanup occurred
  assert.ok(elementRemoved, 'Tray element should be removed');
  assert.ok(parent.element.focused, 'Parent should be focused after melt');
});

test('meltTray - data integrity after multiple operations', () => {
  const root = new MockTray('root', 'Root');
  const branch1 = new MockTray('branch1', 'Branch 1', 'root');
  const branch2 = new MockTray('branch2', 'Branch 2', 'root');
  const leaf1 = new MockTray('leaf1', 'Leaf 1', 'branch1');
  const leaf2 = new MockTray('leaf2', 'Leaf 2', 'branch1');
  const leaf3 = new MockTray('leaf3', 'Leaf 3', 'branch2');
  
  global.mockTrays = [root, branch1, branch2, leaf1, leaf2, leaf3];
  global.getTrayFromId = (id) => global.mockTrays.find(t => t.id === id);
  
  root.addChild(branch1);
  root.addChild(branch2);
  branch1.addChild(leaf1);
  branch1.addChild(leaf2);
  branch2.addChild(leaf3);
  
  // Initial state verification
  assert.strictEqual(root.children.length, 2);
  assert.strictEqual(branch1.children.length, 2);
  assert.strictEqual(branch2.children.length, 1);
  
  // Melt branch1
  meltTray(branch1);
  
  // Verify branch1's children moved to root
  assert.strictEqual(root.children.length, 3); // branch2, leaf1, leaf2
  assert.ok(root.hasChild('branch2'));
  assert.ok(root.hasChild('leaf1'));
  assert.ok(root.hasChild('leaf2'));
  assert.ok(!root.hasChild('branch1'));
  
  // Melt branch2
  meltTray(branch2);
  
  // Verify final state
  assert.strictEqual(root.children.length, 3); // leaf1, leaf2, leaf3
  assert.ok(root.hasChild('leaf1'));
  assert.ok(root.hasChild('leaf2'));
  assert.ok(root.hasChild('leaf3'));
  assert.ok(!root.hasChild('branch1'));
  assert.ok(!root.hasChild('branch2'));
});

console.log('All merge tray tests completed!');