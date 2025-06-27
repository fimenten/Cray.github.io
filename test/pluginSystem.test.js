const assert = require('assert');
const { test } = require('node:test');

// Setup minimal DOM before requiring modules
const body = { children: [], appendChild(el){ this.children.push(el); }, removeChild(el){ this.children = this.children.filter(c=>c!==el); } };
const doc = { 
  body, 
  createElement(tag){ 
    return { 
      style:{}, 
      classList: { add(){}, remove(){}, contains(){ return false; } },
      appendChild(){}, 
      querySelector(){return null;},
      addEventListener(){},
      setAttribute(){},
      getAttribute(){ return null; },
      innerHTML: '',
      textContent: '',
      tagName: tag
    }; 
  }, 
  querySelector(){ return null; },
  addEventListener(){}
};
const win = { 
  addEventListener(){}, 
  location:{ href:'', search:'', replace(u){ this.href = u; } },
  Notification: { permission: 'granted', requestPermission(){ return Promise.resolve('granted'); } },
  indexedDB: {
    open(){ 
      return { 
        onupgradeneeded: null, 
        onsuccess: null, 
        onerror: null,
        result: {
          objectStoreNames: { contains(){ return false; } },
          createObjectStore(){ return { createIndex(){} }; },
          transaction(){ 
            return { 
              objectStore(){ 
                return { 
                  put(){ return { onsuccess: null, onerror: null }; },
                  get(){ return { onsuccess: null, onerror: null, result: null }; },
                  getAll(){ return { onsuccess: null, onerror: null, result: [] }; },
                  delete(){ return { onsuccess: null, onerror: null }; },
                  index(){ return { getAll(){ return { onsuccess: null, onerror: null, result: [] }; } }; }
                }; 
              } 
            }; 
          }
        }
      };
    }
  }
};
const nav = { clipboard: { writeText(){ return Promise.resolve(); }, readText(){ return Promise.resolve(''); } } };
const storage = new Map();
const localStorage = { 
  getItem(k){ return storage.get(k); }, 
  setItem(k,v){ storage.set(k,v); }, 
  removeItem(k){ storage.delete(k); } 
};

global.document = doc;
global.window = win;
global.navigator = nav;
global.localStorage = localStorage;
global.Notification = win.Notification;
global.fetch = () => Promise.resolve({ ok: true, json(){ return Promise.resolve({}); } });

// Require modules after DOM setup
const { PluginManager } = require('../cjs/pluginManager.js');
const { PluginSandbox } = require('../cjs/pluginSandbox.js');
const { PluginStorage } = require('../cjs/pluginStorage.js');

test('PluginManager can register and unregister plugins', async () => {
  const manager = new PluginManager();
  
  const storedPlugin = {
    id: 'test-plugin',
    manifest: {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      permissions: []
    },
    code: `{
      hooks: {
        onTaskHooked: (task, context) => {
          console.log('Task hooked');
        }
      }
    }`,
    enabled: true,
    installDate: Date.now(),
    lastUpdated: Date.now()
  };

  await manager.registerPlugin(storedPlugin);
  const plugin = manager.getPlugin('test-plugin');
  assert.ok(plugin);
  assert.strictEqual(plugin.manifest.name, 'Test Plugin');
  
  await manager.unregisterPlugin('test-plugin');
  assert.strictEqual(manager.getPlugin('test-plugin'), undefined);
});

test('PluginManager validates permissions', async () => {
  const manager = new PluginManager();
  
  const invalidPlugin = {
    id: 'bad-plugin',
    manifest: {
      id: 'bad-plugin',
      name: 'Bad Plugin',
      version: '1.0.0',
      permissions: ['invalid-permission']
    },
    code: '{ hooks: {} }',
    enabled: true,
    installDate: Date.now(),
    lastUpdated: Date.now()
  };

  await assert.rejects(
    async () => await manager.registerPlugin(invalidPlugin),
    /Invalid permission/
  );
});

test('PluginManager executes hooks with timeout', async () => {
  const manager = new PluginManager();
  let executed = false;
  
  const plugin = {
    id: 'timeout-test',
    manifest: {
      id: 'timeout-test',
      name: 'Timeout Test',
      version: '1.0.0',
      permissions: []
    },
    code: `{
      hooks: {
        onTaskHooked: async (task, context) => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'executed';
        }
      }
    }`,
    enabled: true,
    installDate: Date.now(),
    lastUpdated: Date.now()
  };

  await manager.registerPlugin(plugin);
  manager.setPluginTimeout('timeout-test', 200); // Set timeout longer than execution
  
  const results = await manager.executeHook('onTaskHooked', 
    { id: '1', text: 'Test', completed: false, createdAt: Date.now() },
    { trayId: '1', trayName: 'Test', sessionId: 'test' }
  );
  
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].success, true);
});

test('PluginManager handles hook execution errors gracefully', async () => {
  const manager = new PluginManager();
  
  const errorPlugin = {
    id: 'error-plugin',
    manifest: {
      id: 'error-plugin',
      name: 'Error Plugin',
      version: '1.0.0',
      permissions: []
    },
    code: `{
      hooks: {
        onTaskHooked: (task, context) => {
          throw new Error('Plugin error');
        }
      }
    }`,
    enabled: true,
    installDate: Date.now(),
    lastUpdated: Date.now()
  };

  await manager.registerPlugin(errorPlugin);
  
  const results = await manager.executeHook('onTaskHooked',
    { id: '1', text: 'Test', completed: false, createdAt: Date.now() },
    { trayId: '1', trayName: 'Test', sessionId: 'test' }
  );
  
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].success, false);
  assert.ok(results[0].error.includes('Plugin error'));
});

test('PluginSandbox creates safe execution environment', async () => {
  const sandbox = new PluginSandbox();
  
  const code = `{
    hooks: {
      onTaskHooked: (task, context) => {
        // Try to access global objects (should be undefined)
        if (typeof window !== 'undefined') throw new Error('window accessible');
        if (typeof document !== 'undefined') throw new Error('document accessible');
        return 'safe';
      }
    }
  }`;
  
  const plugin = await sandbox.executePluginCode(code, { id: 'safe-plugin' }, []);
  assert.ok(plugin);
  assert.ok(plugin.hooks.onTaskHooked);
});

test('PluginSandbox provides API based on permissions', async () => {
  const sandbox = new PluginSandbox();
  
  const codeWithStorage = `{
    hooks: {
      onTaskHooked: async (task, context) => {
        if (!api.storage) throw new Error('Storage not available');
        await api.storage.set('test', 'value');
        const val = await api.storage.get('test');
        return val;
      }
    }
  }`;
  
  const plugin = await sandbox.executePluginCode(
    codeWithStorage, 
    { id: 'storage-plugin' }, 
    ['storage']
  );
  
  // The plugin should have access to storage API
  assert.ok(plugin);
  assert.ok(plugin.hooks.onTaskHooked);
});

test('Plugin hooks receive frozen task and context objects', async () => {
  const sandbox = new PluginSandbox();
  
  const code = `{
    hooks: {
      onTaskHooked: (task, context) => {
        try {
          task.text = 'modified';
          return 'mutable';
        } catch (e) {
          return 'immutable';
        }
      }
    }
  }`;
  
  const plugin = await sandbox.executePluginCode(code, { id: 'immutable-test' }, []);
  const result = await plugin.hooks.onTaskHooked(
    { id: '1', text: 'Original', completed: false, createdAt: Date.now() },
    { trayId: '1', trayName: 'Test', sessionId: 'test' }
  );
  
  assert.strictEqual(result, 'immutable');
});

test('PluginManager enables and disables plugins', () => {
  const manager = new PluginManager();
  
  // Manually add a plugin to test enable/disable
  const plugin = {
    manifest: { id: 'toggle-test', name: 'Toggle Test', version: '1.0.0' },
    hooks: {}
  };
  
  manager['plugins'].set('toggle-test', plugin);
  assert.strictEqual(manager.getEnabledPlugins().length, 0);
  
  manager.enablePlugin('toggle-test');
  assert.strictEqual(manager.getEnabledPlugins().length, 1);
  
  manager.disablePlugin('toggle-test');
  assert.strictEqual(manager.getEnabledPlugins().length, 0);
});

test('Plugin validation rejects invalid structures', async () => {
  const sandbox = new PluginSandbox();
  
  // Test non-object plugin
  await assert.rejects(
    async () => await sandbox.executePluginCode('null', { id: 'null-plugin' }, []),
    /Plugin must export an object/
  );
  
  // Test plugin without hooks
  await assert.rejects(
    async () => await sandbox.executePluginCode('{ foo: "bar" }', { id: 'no-hooks' }, []),
    /Plugin must have a hooks object/
  );
});