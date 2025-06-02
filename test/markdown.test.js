const assert = require('assert');
const { test } = require('node:test');

// minimal DOM and clipboard stubs
let clipboardText;
const navigatorStub = { clipboard: { writeText(t){ clipboardText = t; return Promise.resolve(); } } };
const body = {
  children: [],
  appendChild(el){ this.children.push(el); el.parent = this; },
  removeChild(el){ this.children = this.children.filter(c=>c!==el); }
};
function createElement(tag){
  const el = {
    children: [],
    style: {},
    dataset: {},
    classList:{
      _cls: new Set(),
      add(c){ this._cls.add(c); },
      remove(c){ this._cls.delete(c); },
      contains(c){ return this._cls.has(c); }
    },
    appendChild(child){ child.parent=this; this.children.push(child); },
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    getBoundingClientRect(){ return { width:100, height:100 }; },
    addEventListener(){},
    removeEventListener(){},
    focus(){}
  };
  if(tag === 'a'){
    el.href = '';
    el.download = '';
    el.clickCalled = false;
    el.click = function(){ this.clickCalled = true; };
  }
  return el;
}
let createdAnchor;
const documentStub = {
  body,
  createElement(tag){
    const el = createElement(tag);
    if(tag === 'a') createdAnchor = el;
    return el;
  },
  querySelector(){return null;},
  addEventListener(){},
  removeEventListener(){},
};
const urlStub = { createObjectURL(){ return 'blob:1'; }, revokeObjectURL(){} };
const windowStub = { addEventListener(){}, location:{ href:'', replace(){}, pathname:'' } };

Object.defineProperty(global, 'navigator', { configurable: true, value: navigatorStub });
global.document = documentStub;
global.URL = urlStub;
global.window = windowStub;

delete require.cache[require.resolve('../cjs/functions.js')];
const fns = require('../cjs/functions.js');

test('copyMarkdownToClipboard writes markdown', async () => {
  clipboardText = undefined;
  const tray = { name:'root', children:[{ name:'child', children:[] }] };
  await fns.copyMarkdownToClipboard(tray);
  assert.strictEqual(clipboardText, '- root\n  - child\n');
});

test('downloadMarkdown triggers anchor click', () => {
  createdAnchor = undefined;
  const tray = { name:'root', children:[] };
  const start = body.children.length;
  fns.downloadMarkdown(tray);
  assert.ok(createdAnchor.clickCalled);
  assert.strictEqual(createdAnchor.download, 'tray_structure.md');
  assert.strictEqual(createdAnchor.href, 'blob:1');
  assert.strictEqual(body.children.length, start);
});
