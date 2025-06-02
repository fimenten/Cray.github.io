const assert = require('assert');
const { test } = require('node:test');

// setup minimal DOM before requiring utils
const body = { children: [], appendChild(el){ this.children.push(el); }, removeChild(el){ this.children = this.children.filter(c=>c!==el); } };
const doc = { body, createElement(){ return { style:{}, appendChild(){}, querySelector(){return null;} }; }, querySelector(){ return null; } };
const win = { addEventListener(){}, location:{ href:'', replace(u){ this.href = u; } } };
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
