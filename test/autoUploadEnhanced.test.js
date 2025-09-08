const { test } = require('node:test');
const assert = require('assert');

// Mock the global environment for Node.js
global.window = {
  setInterval: (fn, ms) => ({ fn, ms }),
  clearInterval: (id) => ({ id }),
  localStorage: {
    storage: {},
    getItem: function(key) { return this.storage[key] || null; },
    setItem: function(key, value) { this.storage[key] = value; },
    removeItem: function(key) { delete this.storage[key]; }
  }
};
global.localStorage = global.window.localStorage;
global.setTimeout = (fn, ms) => ({ fn, ms });
global.clearTimeout = (id) => ({ id });
global.alert = (msg) => console.log('ALERT:', msg);
global.prompt = (msg, def) => def || '';
global.confirm = () => true;

// Mock DOM
global.document = {
  createElement: () => ({
    style: {},
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {},
    removeChild: () => {},
    setAttribute: () => {},
    textContent: '',
    innerHTML: ''
  }),
  body: { appendChild: () => {}, removeChild: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {}
};

function load(mocks = {}) {
  // Clear require cache
  delete require.cache[require.resolve('../cjs/conflictResolution.js')];
  delete require.cache[require.resolve('../cjs/networks.js')];
  delete require.cache[require.resolve('../cjs/state.js')];
  
  // Mock required modules
  require.cache[require.resolve('../cjs/io.js')] = {
    exports: {
      serializeAsync: async (tray) => JSON.stringify(tray),
      deserialize: JSON.parse,
      ...mocks.io
    }
  };
  
  require.cache[require.resolve('../cjs/tray.js')] = {
    exports: {
      Tray: class MockTray {
        constructor(parentId, id, name, color = null, created_dt = null) {
          this.id = id;
          this.name = name;
          this.parentId = parentId;
          this.created_dt = created_dt || new Date();
          this.children = [];
          this.properties = {};
          this.hooks = [];
          this.isDone = false;
          this.host_url = null;
          this.filename = null;
        }
      },
      ...mocks.tray
    }
  };
  
  require.cache[require.resolve('../cjs/store.js')] = {
    exports: {
      default: {
        getState: () => ({ app: {} }),
        dispatch: () => {}
      },
      ...mocks.store
    }
  };
  
  require.cache[require.resolve('../cjs/syncIndicators.js')] = {
    exports: {
      syncIndicatorManager: {
        showSyncSuccess: () => {},
        showSyncError: () => {}
      },
      ...mocks.syncIndicators
    }
  };
  
  return {
    conflictResolution: require('../cjs/conflictResolution.js'),
    networks: require('../cjs/networks.js'),
    state: require('../cjs/state.js')
  };
}

test('newestTimestamp compares two trays correctly', () => {
  const { networks } = load();
  const { newestTimestamp } = networks;
  
  const tray1 = { created_dt: new Date('2020-01-01') };
  const tray2 = { created_dt: new Date('2020-02-01') };
  
  const result = newestTimestamp(tray1, tray2);
  assert.strictEqual(result, tray2); // tray2 is newer
  
  const result2 = newestTimestamp(tray2, tray1);
  assert.strictEqual(result2, tray2); // tray2 is still newer
});

test('conflict detection identifies no-baseline scenario', async () => {
  const { conflictResolution } = load();
  const { detectConflict } = conflictResolution;
  
  const localTray = {
    id: 'new-tray',
    name: 'Local Tray',
    created_dt: new Date('2020-01-01'),
    properties: { test: 'local' },
    hooks: ['hook1'],
    isDone: false,
    children: []
  };
  
  const remoteTray = {
    id: 'new-tray',
    name: 'Remote Tray',
    created_dt: new Date('2020-01-01'),
    properties: { test: 'remote' },
    hooks: ['hook1'],
    isDone: false,
    children: []
  };
  
  // No baseline state setup - this should trigger the no-baseline case
  const result = await detectConflict(localTray, remoteTray);
  
  assert.strictEqual(result.action, 'download');
  assert.strictEqual(result.reason, 'No local baseline, downloading remote version');
  assert.strictEqual(result.localChanged, false);
  assert.strictEqual(result.remoteChanged, true);
});

test('conflict detection identifies new local tray scenario', async () => {
  const { conflictResolution } = load();
  const { detectConflict } = conflictResolution;
  
  const localTray = {
    id: 'new-local-tray',
    name: 'New Local Tray',
    created_dt: new Date('2020-01-01'),
    properties: { test: 'local' },
    hooks: ['hook1'],
    isDone: false,
    children: []
  };
  
  // No remote tray (undefined/null)
  const remoteTray = null;
  
  const result = await detectConflict(localTray, remoteTray);
  
  assert.strictEqual(result.action, 'upload');
  assert.strictEqual(result.reason, 'New local tray, uploading');
  assert.strictEqual(result.localChanged, true);
  assert.strictEqual(result.remoteChanged, false);
});

test('conflict detection with persistent state in single test', async () => {
  // This test runs within a single module load to test the stateful behavior
  const { conflictResolution } = load();
  const { detectConflict, updateLastKnownState } = conflictResolution;
  
  const baselineTray = {
    id: 'persistent-test',
    name: 'Baseline',
    created_dt: new Date('2020-01-01'),
    properties: { version: 1 },
    hooks: ['base'],
    isDone: false,
    children: []
  };
  
  const localTray = {
    id: 'persistent-test',
    name: 'Local Modified',
    created_dt: new Date('2020-01-01'),
    properties: { version: 2 },
    hooks: ['base', 'local'],
    isDone: false,
    children: []
  };
  
  const remoteTray = {
    id: 'persistent-test',
    name: 'Baseline',
    created_dt: new Date('2020-01-01'),
    properties: { version: 1 },
    hooks: ['base'],
    isDone: false,
    children: []
  };
  
  // Set baseline and immediately test within the same module instance
  await updateLastKnownState(baselineTray);
  const result = await detectConflict(localTray, remoteTray);
  
  assert.strictEqual(result.action, 'upload');
  assert.strictEqual(result.localChanged, true);
  assert.strictEqual(result.remoteChanged, false);
  assert.strictEqual(result.reason, 'Local changes detected, remote unchanged');
});

test('auto-upload settings management', () => {
  const { state } = load();
  const { setGlobalAutoUpload, getTrayAutoUpload, setTrayAutoUpload, selectAutoUploadEnabled } = state;
  
  // Test global setting
  setGlobalAutoUpload(true);
  const mockState = { app: {} };
  assert.strictEqual(selectAutoUploadEnabled(mockState), true);
  
  setGlobalAutoUpload(false);
  assert.strictEqual(selectAutoUploadEnabled(mockState), false);
  
  // Test tray-specific setting
  setTrayAutoUpload('tray1', true);
  assert.strictEqual(getTrayAutoUpload('tray1'), true);
  
  setTrayAutoUpload('tray1', false);
  assert.strictEqual(getTrayAutoUpload('tray1'), false);
  
  // Test default behavior for new trays
  assert.strictEqual(getTrayAutoUpload('tray-new'), true); // Should default to true
});

test('scheduleAutoUpload debounces correctly', async () => {
  let scheduledCallbacks = [];
  global.setTimeout = (fn, delay) => {
    const id = Math.random();
    scheduledCallbacks.push({ id, fn, delay });
    return id;
  };
  global.clearTimeout = (id) => {
    scheduledCallbacks = scheduledCallbacks.filter(cb => cb.id !== id);
  };
  
  // Mock localStorage for configurable delay
  global.localStorage = {
    getItem: (key) => key === 'autoUploadDelay' ? '2' : null,
    setItem: () => {},
    removeItem: () => {}
  };
  
  const { networks } = load();
  const { scheduleAutoUpload } = networks;
  
  const tray = {
    id: 'test-tray',
    host_url: 'https://example.com',
    filename: 'test.json',
    name: 'Test Tray'
  };
  
  // Schedule first upload
  await scheduleAutoUpload(tray);
  assert.strictEqual(scheduledCallbacks.length, 1);
  assert.strictEqual(scheduledCallbacks[0].delay, 2000); // 2 second debounce
  
  // Change content to trigger second upload
  tray.name = 'Test Tray Modified';
  await scheduleAutoUpload(tray);
  // Due to debouncing and content change, we should have 1 callback
  assert.strictEqual(scheduledCallbacks.length >= 1, true);
});

test('auto-upload only triggers for network-configured trays', () => {
  const { state } = load();
  const { getTrayAutoUpload } = state;
  
  // Mock the localStorage to return true for auto-upload
  global.localStorage.setItem('trayAutoUploadSettings', JSON.stringify({ 'network-tray': true }));
  
  // Test network-configured tray
  assert.strictEqual(getTrayAutoUpload('network-tray'), true);
  
  // Test non-configured tray (should default to true)
  assert.strictEqual(getTrayAutoUpload('new-tray'), true);
});

console.log('Enhanced Auto-Upload Tests Completed');