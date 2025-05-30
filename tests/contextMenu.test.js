import test from 'node:test';
import assert from 'node:assert/strict';
import { setupDom } from './setupDom.js';

async function loadModules() {
  const TrayMod = await import('../dist/tray.js');
  const MenuMod = await import('../dist/contextMenu.js');
  const StoreMod = await import('../dist/store.js');
  return { Tray: TrayMod.Tray, openContextMenu: MenuMod.openContextMenu, store: StoreMod.default };
}

test('context menu toggleFlexDirection action', async () => {
  setupDom();
  const { Tray, openContextMenu, store } = await loadModules();

  const tray = new Tray('0', 't1', 'Tray');
  document.body.appendChild(tray.element);

  let called = false;
  tray.toggleFlexDirection = function() { called = true; this.flexDirection = this.flexDirection === 'column' ? 'row' : 'column'; };

  const evt = new MouseEvent('contextmenu', { clientX: 10, clientY: 10 });
  openContextMenu(tray, evt);
  assert.equal(store.getState().app.menuOpening, true);

  const menu = document.querySelector('.context-menu');
  const item = menu.querySelector('[data-act="toggleFlexDirection"]');
  menu.onclick({ target: item, type: 'click' });

  assert.ok(called);
  assert.equal(tray.flexDirection, 'row');
  assert.equal(menu.style.display, 'none');
  assert.equal(store.getState().app.menuOpening, false);
});
