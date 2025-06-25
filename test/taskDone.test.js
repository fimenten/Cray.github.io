const assert = require('assert');
const { test } = require('node:test');

// Mock DOM globals for testing
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
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    setAttribute(){},
    getAttribute(){ return null; },
    addEventListener(){},
    removeEventListener(){},
    innerHTML: '',
    textContent: '',
    contentEditable: false
  };
  return el;
}
const doc = { 
  body, 
  createElement, 
  querySelector(){ return null; } 
};
const win = { 
  addEventListener(){}, 
  location:{ href:'', search:'', replace(u){ this.href = u; } },
  requestIdleCallback: (callback) => setTimeout(callback, 0)
};
global.document = doc;
global.window = win;
global.HTMLDivElement = function() {};

const { Tray } = require('../cjs/tray.js');

test('Tray detects @@ done marker in name', () => {
  const tray = new Tray("parent", "test", "Task with @@ done marker");
  assert.strictEqual(tray.isDone, true, 'Tray should be marked as done when name contains @@');
});

test('Tray without @@ is not marked as done', () => {
  const tray = new Tray("parent", "test", "Regular task @hook");
  assert.strictEqual(tray.isDone, false, 'Tray should not be marked as done without @@');
});

test('checkDoneStateFromName method works correctly', () => {
  const tray = new Tray("parent", "test", "Test task");
  
  assert.strictEqual(tray.checkDoneStateFromName("Task with @@ done"), true, 'Should detect @@ in name');
  assert.strictEqual(tray.checkDoneStateFromName("Task without done marker"), false, 'Should not detect done marker');
  assert.strictEqual(tray.checkDoneStateFromName("@@"), true, 'Should detect bare @@ marker');
  assert.strictEqual(tray.checkDoneStateFromName("@hook @@done"), true, 'Should detect @@ with hooks');
});

test('Tray can be explicitly set as done', () => {
  const tray = new Tray("parent", "test", "Regular task", null, null, "column", null, null, true, {}, [], true);
  assert.strictEqual(tray.isDone, true, 'Tray should be marked as done when explicitly set');
});

test('Tray combines explicit isDone and name detection', () => {
  // If explicitly set to false but name has @@, it should still be true due to name check
  const tray = new Tray("parent", "test", "Task with @@ marker", null, null, "column", null, null, true, {}, [], false);
  assert.strictEqual(tray.isDone, true, 'Name-based detection should override explicit false setting');
});

console.log('All task done tests passed!');