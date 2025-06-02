const assert = require('assert');
const { test } = require('node:test');

// stub DOM
const body = { children: [], appendChild(el){ this.children.push(el); }, removeChild(el){ this.children = this.children.filter(c=>c!==el); } };
const doc = { body, createElement(){ return { style:{}, textContent:'', appendChild(){}, classList:{add(){}} }; } };
const win = { addEventListener(){}, location:{ href:'', replace(){} } };

global.document = doc;
global.window = win;

const { uploadData } = require('../cjs/networks.js');

test('uploadData calls fetch and shows notification', async () => {
  let called;
  global.fetch = async (url, opts) => { called = { url, opts }; return { ok:true, text: async ()=>'ok' }; };
  const start = body.children.length;
  await uploadData({ host_url:'http://x', filename:'f.json', id:'1', name:'t', children:[] });
  assert.ok(called);
  assert.strictEqual(called.url, 'http://x/tray/save');
  assert.strictEqual(called.opts.method, 'POST');
  const el = body.children[body.children.length - 1];
  assert.strictEqual(el.textContent, 'Data uploaded successfully.');
  assert.strictEqual(body.children.length, start + 1);
});
