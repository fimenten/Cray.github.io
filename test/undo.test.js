const assert = require('assert');
const { test } = require('node:test');

// minimal DOM stubs similar to contextMenu tests
const body = {
  children: [],
  appendChild(el){ this.children.push(el); el.parent = this; },
  removeChild(el){ this.children = this.children.filter(c=>c!==el); }
};
function createElement(){
  return {
    children: [],
    style: {},
    dataset: {},
    classList:{ add(){}, remove(){} },
    appendChild(child){ child.parent=this; this.children.push(child); },
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    getBoundingClientRect(){ return { width:100, height:100 }; },
    addEventListener(){},
    removeEventListener(){},
    focus(){}
  };
}
global.document = { body, createElement, querySelector(){return null;}, addEventListener(){}, removeEventListener(){} };
global.window = { addEventListener(){}, innerWidth:800, innerHeight:600 };
global.location = { search: "" };

delete require.cache[require.resolve('../cjs/history.js')];
const history = require('../cjs/history.js');
const io = require('../cjs/io.js');

// stub io functions used by undo
io.renderRootTray = (tray) => { io._rendered = tray; };
io.deserialize = (data) => JSON.parse(data);

const state1 = JSON.stringify({ name: 'first' });
const state2 = JSON.stringify({ name: 'second' });

history.recordState(state1);
history.recordState(state2);

test('undo restores previous state', () => {
  history.undo();
  assert.strictEqual(io._rendered.name, 'first');
});

test('recordState captures root state automatically', () => {
  // reset module state
  delete require.cache[require.resolve('../cjs/history.js')];
  delete require.cache[require.resolve('../cjs/app.js')];
  delete require.cache[require.resolve('../cjs/utils.js')];
  delete require.cache[require.resolve('../cjs/io.js')];

  const app = require('../cjs/app.js');
  const utils = require('../cjs/utils.js');
  const io = require('../cjs/io.js');
  const history = require('../cjs/history.js');

  const rootEl = createElement();
  rootEl.className = 'tray';
  document.querySelector = () => rootEl;
  utils.getRootElement = () => rootEl;
  const tray = { name: 'root' };
  app.element2TrayMap.set(rootEl, tray);
  io.serialize = () => 'root-serialized';

  history.recordState();
  assert.strictEqual(history._getHistoryLength(), 1);
});



test('handleKeyDown ctrl+z calls undo', () => {
  delete require.cache[require.resolve('../cjs/history.js')];
  delete require.cache[require.resolve('../cjs/keyboardInteraction.js')];

  const history = require('../cjs/history.js');
  let called = false;
  history.undo = () => { called = true; };

  const ki = require('../cjs/keyboardInteraction.js');
  const tray = { isEditing: false, element: { focus(){} } };
  ki.handleKeyDown(tray, { key: 'z', ctrlKey: true, preventDefault(){}, stopPropagation(){} });
  assert.ok(called);
});

