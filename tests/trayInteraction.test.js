import test from 'node:test';
import assert from 'node:assert/strict';
import { setupDom } from './setupDom.js';

// Helper to dynamically import modules after DOM setup
async function loadModules() {
  const TrayMod = await import('../dist/tray.js');
  const StoreMod = await import('../dist/store.js');
  return { Tray: TrayMod.Tray, store: StoreMod.default };
}

test('addChild appends element and toggleFold toggles state', async () => {
  setupDom();
  const { Tray } = await loadModules();

  const root = new Tray('0', 'root', 'Root');
  document.body.appendChild(root.element);
  const child = new Tray(root.id, 'c1', 'Child');
  root.addChild(child);

  assert.equal(root.children.length, 1);
  const content = root.element.querySelector('.tray-content');
  assert.ok(content.children.includes(child.element));

  const initial = root.isFolded;
  root.toggleFold();
  assert.equal(root.isFolded, !initial);
});
