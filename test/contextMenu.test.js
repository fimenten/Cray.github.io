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
    classList: { add(){} },
    appendChild(child){ child.parent = this; this.children.push(child); },
    querySelector(selector){
      if(selector === '#borderColorPicker'){
        return this.children.flatMap(c=>c.children || []).find(c=>c.id === 'borderColorPicker') || null;
      }
      return null;
    },
    getBoundingClientRect(){ return { width:100, height:100 }; },
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
