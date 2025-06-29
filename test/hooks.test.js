const assert = require('assert');
const { test } = require('node:test');

// Setup minimal DOM and global objects before requiring modules
const body = { children: [], appendChild(el){ this.children.push(el); }, removeChild(el){ this.children = this.children.filter(c=>c!==el); } };
const doc = { 
  body, 
  createElement(tag){ 
    return { 
      tagName: tag,
      style:{}, 
      appendChild(){}, 
      append(){},
      querySelector(){return null;},
      addEventListener(){},
      setAttribute(){},
      classList: { add(){}, remove(){}, contains(){return false;} },
      dataset: {},
      children: [],
      textContent: '',
      remove(){},
      getBoundingClientRect(){ return { left:0, top:0, width:100, height:20 }; }
    }; 
  }, 
  querySelector(){ return null; },
  getElementById(){ return null; }
};
const win = { 
  addEventListener(){}, 
  location:{ href:'', search:'', replace(u){ this.href = u; } },
  requestIdleCallback(cb){ cb(); },
  cancelIdleCallback(){}
};
global.document = doc;
global.window = win;
global.requestIdleCallback = win.requestIdleCallback;
global.cancelIdleCallback = win.cancelIdleCallback;
global.indexedDB = { open(){ return { onsuccess(){}, onerror(){} }; } };

// Mock other dependencies
const mockElement2TrayMap = new WeakMap();
global.element2TrayMap = mockElement2TrayMap;

const { Tray } = require('../cjs/tray.js');

test('parseHooksFromName handles basic ASCII hooks', () => {
  const tray = new Tray('parent', 'test', 'Test');
  
  const hooks = tray.parseHooksFromName('Test @hello @world');
  assert.deepStrictEqual(hooks, ['hello', 'world']);
});

test('parseHooksFromName handles Japanese characters', () => {
  const tray = new Tray('parent', 'test', 'Test');
  
  const hooks = tray.parseHooksFromName('Test @日本語 @テスト');
  assert.deepStrictEqual(hooks, ['日本語', 'テスト']);
});

test('parseHooksFromName handles emojis', () => {
  const tray = new Tray('parent', 'test', 'Test');
  
  const hooks = tray.parseHooksFromName('Test @hello🎉 @world😀');
  assert.deepStrictEqual(hooks, ['hello🎉', 'world😀']);
});

test('parseHooksFromName handles hyphens and special characters', () => {
  const tray = new Tray('parent', 'test', 'Test');
  
  const hooks = tray.parseHooksFromName('Test @test-case @under_score @dot.notation');
  assert.deepStrictEqual(hooks, ['test-case', 'under_score', 'dot.notation']);
});

test('parseHooksFromName handles mixed Unicode', () => {
  const tray = new Tray('parent', 'test', 'Test');
  
  const hooks = tray.parseHooksFromName('Test @中文 @한글 @العربية');
  assert.deepStrictEqual(hooks, ['中文', '한글', 'العربية']);
});

test('parseHooksFromName stops at whitespace', () => {
  const tray = new Tray('parent', 'test', 'Test');
  
  const hooks = tray.parseHooksFromName('Test @hello world @another test');
  assert.deepStrictEqual(hooks, ['hello', 'another']);
});

test('parseHooksFromName handles empty case', () => {
  const tray = new Tray('parent', 'test', 'Test');
  
  const hooks = tray.parseHooksFromName('Test without hooks');
  assert.deepStrictEqual(hooks, []);
});