const assert = require('assert');
const { test } = require('node:test');

const timeouts = [];
// override setTimeout to capture callbacks
global.setTimeout = (fn, ms) => { timeouts.push(fn); return 1; };

// minimal DOM
const body = { children: [], appendChild(el){ this.children.push(el); }, removeChild(el){ this.children = this.children.filter(c=>c!==el); } };
const doc = { body, createElement(tag){ return { tagName:tag, style:{}, textContent:'', appendChild(){}, classList:{add(){}}, remove(){ body.removeChild(this); } }; } };
const win = { addEventListener(){}, location:{ href:'', replace(){} } };

global.document = doc;
global.window = win;

const { showUploadNotification } = require('../cjs/networks.js');

test('showUploadNotification adds and removes element', () => {
  const start = body.children.length;
  showUploadNotification('Hello');
  assert.strictEqual(body.children.length, start + 1);
  const el = body.children[body.children.length - 1];
  assert.strictEqual(el.textContent, 'Hello');
  // run scheduled callbacks
  while(timeouts.length) timeouts.shift()();
  assert.strictEqual(body.children.length, start);
});
