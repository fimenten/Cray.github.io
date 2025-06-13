const assert = require('assert');
const { test } = require('node:test');

// setup minimal DOM before requiring utils
const body = { children: [], appendChild(el){ this.children.push(el); }, removeChild(el){ this.children = this.children.filter(c=>c!==el); } };
const doc = { body, createElement(){ return { style:{}, appendChild(){}, querySelector(){return null;} }; }, querySelector(){ return null; } };
const win = { addEventListener(){}, location:{ href:'', search:'', replace(u){ this.href = u; } } };
global.document = doc;
global.window = win;

const utils = require('../cjs/utils.js');

test('generateUUID returns unique values', () => {
  const a = utils.generateUUID();
  const b = utils.generateUUID();
  assert.match(a, /^[0-9a-f-]{36}$/);
  assert.notStrictEqual(a, b);
});

test('getRandomColor format', () => {
  const c = utils.getRandomColor();
  assert.ok(/^#[0-9A-F]{6}$/.test(c));
});

test('getWhiteColor returns constant', () => {
  assert.strictEqual(utils.getWhiteColor(), '#f5f5f5');
});

test('expandChildrenOneLevel expands direct children', () => {
  const child1 = { isFolded: true, updateAppearance(){ this.updated = true; } };
  const child2 = { isFolded: true, updateAppearance(){ this.updated = true; } };
  const tray = { children: [child1, child2] };
  utils.expandChildrenOneLevel(tray);
  assert.strictEqual(child1.isFolded, false);
  assert.strictEqual(child2.isFolded, false);
  assert.ok(child1.updated);
  assert.ok(child2.updated);
});

test('getUrlParameter returns value when present', () => {
  window.location.search = '?foo=bar&baz=qux';
  assert.strictEqual(utils.getUrlParameter('baz'), 'qux');
});

test('getUrlParameter returns empty string when missing', () => {
  window.location.search = '?foo=bar';
  assert.strictEqual(utils.getUrlParameter('baz'), '');
});

test('getUrlParameter defaults sessionId to "default"', () => {
  window.location.search = '';
  assert.strictEqual(utils.getUrlParameter('sessionId'), 'default');
});
