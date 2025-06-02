const assert = require('assert');
const { test } = require('node:test');

// minimal DOM stubs
const body = {
  children: [],
  appendChild(el) { this.children.push(el); el.parent = this; },
  removeChild(el) { this.children = this.children.filter(c => c !== el); }
};
function createElement() {
  const el = {
    children: [],
    style: {},
    dataset: {},
    classList: {
      _cls: new Set(),
      add(c){ this._cls.add(c); },
      remove(c){ this._cls.delete(c); },
      contains(c){ return this._cls.has(c); }
    },
    appendChild(child){ child.parent = this; this.children.push(child); },
    querySelector(selector){
      if(selector === '#borderColorPicker'){
        return this.children.flatMap(c=>c.children || []).find(c=>c.id === 'borderColorPicker') || null;
      }
      return null;
    },
    querySelectorAll(sel){
      if(sel === '.menu-item') return this.children.filter(c=>c.className==='menu-item');
      return [];
    },
    getBoundingClientRect(){ return { width:100, height:100 }; },
    addEventListener(){},
    removeEventListener(){},
    focus(){}
  };
  return el;
}
const documentStub = {
  body,
  createElement,
  querySelector(){return null;},
  addEventListener(){},
  removeEventListener(){},
};
const windowStub = { innerWidth: 800, innerHeight: 600, addEventListener(){} };

global.document = documentStub;
global.window = windowStub;

delete require.cache[require.resolve('../cjs/contextMenu.js')];
const ctx = require('../cjs/contextMenu.js');

test('buildMenu creates items', () => {
  const m = ctx.buildMenu();
  assert.strictEqual(m.children.length, ctx.CONTEXT_MENU_ITEMS.length + 1);
});

test('open and close context menu', () => {
  const menuBefore = body.children.length;
  const tray = { borderColor: '#000', changeBorderColor(){} };
  class MouseEventStub{}
  global.MouseEvent = MouseEventStub;
  const ev = new MouseEventStub();
  ev.clientX = 10; ev.clientY = 10;
  ctx.openContextMenu(tray, ev);
  assert.strictEqual(body.children.length, menuBefore + 1);
  const menu = body.children[body.children.length - 1];
  assert.strictEqual(menu.style.display, 'block');
  ctx.closeContextMenu();
  assert.strictEqual(menu.style.display, 'none');
});

test('keyboard navigation opens menu and focuses first item', () => {
  const tray = { borderColor: '#000', changeBorderColor(){}, element:{ getBoundingClientRect(){ return { left:0, top:0, width:50, height:20 }; } } };
  ctx.openContextMenuKeyboard(tray);
  const menu = body.children[body.children.length - 1];
  const first = menu.children[0];
  assert.ok(first.classList.contains('focused'));
  ctx.closeContextMenu();
});
