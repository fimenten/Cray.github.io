const assert = require('assert');
const { test } = require('node:test');

// DOM stubs
const body = {
  children: [],
  appendChild(el){ this.children.push(el); el.parent = this; },
  removeChild(el){ this.children = this.children.filter(c=>c!==el); }
};
function createElement(){
  return {
    children: [],
    style: {},
    dataset: {},
    classList:{ add(){} },
    appendChild(child){ child.parent=this; this.children.push(child); },
    addEventListener(type,fn){ this['on'+type]=fn; },
    getBoundingClientRect(){ return { right:0, top:0 }; },
    querySelectorAll(sel){
      if(sel === '.menu-item') return this.children.filter(c=>c.className==='menu-item');
      return [];
    }
  };
}
const documentStub = {
  body,
  createElement,
  querySelector(){return null;},
  addEventListener(){},
};
const windowStub = { 
  addEventListener(){},
  location:{ pathname:'/page', href:'' }
};

global.window = windowStub;

global.document = documentStub;

delete require.cache[require.resolve('../cjs/hamburger.js')];
const ham = require('../cjs/hamburger.js');

test('createHamburgerMenu adds items', () => {
  const { hamburger, menu, selectionMenu } = ham.createHamburgerMenu();
  assert.strictEqual(menu.children.length, ham.GENERAL_MENU_ITEMS.length);
  assert.strictEqual(selectionMenu.children.length, ham.SELECTION_MENU_ITEMS.length);
  // trigger click
  hamburger.onclick({ stopPropagation(){} });
  assert.strictEqual(menu.style.display, 'block');
  hamburger.onclick({ stopPropagation(){} });
  assert.strictEqual(menu.style.display, 'none');
});

test('new session menu updates location', () => {
  ham.openNewSession();
  const match = window.location.href.match(/\/page\?sessionId=([0-9a-f-]{36})$/);
  assert.ok(match, 'location should include UUID');
});
