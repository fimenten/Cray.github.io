const assert = require('assert');
const { test } = require('node:test');

// stub DOM
const body = { children: [], appendChild(el){ this.children.push(el); }, removeChild(el){ this.children = this.children.filter(c=>c!==el); } };
const doc = { body, createElement(){ return { style:{}, textContent:'', appendChild(){}, classList:{add(){}} }; } };
const win = { addEventListener(){}, location:{ href:'', replace(){} } };

global.document = doc;
global.window = win;
global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; }
};

const { uploadData } = require('../cjs/networks.js');

test('uploadData calls fetch with auth and shows notification', async () => {
  let called;
  global.fetch = async (url, opts) => { called = { url, opts }; return { ok:true, text: async ()=>'ok' }; };
  global.localStorage.setItem('trayPassword', 'test-password');
  const start = body.children.length;
  await uploadData({ host_url:'http://x', filename:'f.json', id:'1', name:'t', children:[] });
  assert.ok(called);
  assert.strictEqual(called.url, 'http://x/tray/upload_auth');
  assert.strictEqual(called.opts.method, 'POST');
  assert.strictEqual(called.opts.headers['Authorization'], 'test-password');
  assert.strictEqual(called.opts.headers['filename'], 'f.json');
  const el = body.children[body.children.length - 1];
  assert.strictEqual(el.textContent, 'Data uploaded successfully.');
  assert.strictEqual(body.children.length, start + 1);
});

test('uploadData shows error when no password', async () => {
  global.localStorage.removeItem('trayPassword');
  const start = body.children.length;
  await uploadData({ host_url:'http://x', filename:'f.json', id:'1', name:'t', children:[] });
  const el = body.children[body.children.length - 1];
  assert.strictEqual(el.textContent, 'Password is required for secure upload.');
  assert.strictEqual(body.children.length, start + 1);
});
