const assert = require('assert');
const { test } = require('node:test');

// stub dependencies used by io.js to avoid DOM requirements
require.cache[require.resolve('../cjs/const.js')] = { exports:{} };
require.cache[require.resolve('../cjs/app.js')] = { exports:{ element2TrayMap:new WeakMap() } };
require.cache[require.resolve('../cjs/utils.js')] = { exports:{} };
require.cache[require.resolve('../cjs/hamburger.js')] = { exports:{} };
require.cache[require.resolve('../cjs/tray.js')] = { exports:{} };
require.cache[require.resolve('../cjs/actionbotton.js')] = { exports:{} };
require.cache[require.resolve('../cjs/render.js')] = { exports:{} };
require.cache[require.resolve('../cjs/history.js')] = { exports:{} };

const { serializeAsync } = require('../cjs/io.js');

test('serializeAsync returns JSON string asynchronously', async () => {
  const obj = { a: 1 };
  const result = await serializeAsync(obj);
  assert.strictEqual(result, JSON.stringify(obj));
});
