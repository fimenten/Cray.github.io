import test from 'node:test';
import assert from 'node:assert/strict';
import { generateUUID } from '../dist/uuid.js';

test('generateUUID produces unique ids', () => {
  const ids = new Set();
  for (let i = 0; i < 1000; i++) {
    const id = generateUUID();
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert(!ids.has(id));
    ids.add(id);
  }
});
