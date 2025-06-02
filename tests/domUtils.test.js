import test from 'node:test';
import assert from 'node:assert/strict';
import { isElementInDocument } from '../dist/domUtils.js';

test('isElementInDocument handles null', () => {
  assert.strictEqual(isElementInDocument(null), false);
});

test('isElementInDocument detects connected element', () => {
  const elem = { isConnected: true };
  assert.strictEqual(isElementInDocument(elem), true);
});

test('isElementInDocument detects disconnected element', () => {
  const elem = { isConnected: false };
  assert.strictEqual(isElementInDocument(elem), false);
});
