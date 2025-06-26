const assert = require('assert');
const { test } = require('node:test');

// minimal DOM stubs
const body = {
  children: [],
  appendChild(el){ this.children.push(el); el.parent = this; },
  removeChild(el){ this.children = this.children.filter(c => c !== el); }
};
function createElement(tag='div'){
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    style: {},
    dataset: {},
    id: '',
    classList: { _cls:new Set(), add(c){ this._cls.add(c); }, remove(c){ this._cls.delete(c); }, contains(c){ return this._cls.has(c); } },
    appendChild(child){ child.parent=this; this.children.push(child); },
    removeChild(child){ this.children = this.children.filter(c => c!==child); },
    addEventListener(type, fn){ this['on'+type] = fn; },
    contains(node){ if(this===node) return true; return this.children.some(c => c === node || (typeof c.contains==='function' && c.contains(node))); },
    querySelector(sel){ if(sel.startsWith('#')){ const id = sel.slice(1); return this.children.find(c => c.id === id) || null; } return null; },
    set innerHTML(html){
      this.children = [];
      const hook = createElement('div'); hook.id = 'hook-content';
      const btn = createElement('button'); btn.id = 'close-hook-view';
      this.appendChild(hook); this.appendChild(btn);
    },
    get innerHTML(){ return ''; },
    remove(){ if(this.parent) this.parent.removeChild(this); }
  };
  return el;
}
const documentStub = {
  body,
  createElement,
  querySelector(sel){ if(sel === 'body > div.tray') return rootTrayElement; return null; },
  addEventListener(type, fn){ this['on'+type] = fn; },
  removeEventListener(type){ delete this['on'+type]; }
};
const windowStub = { addEventListener(){}, location:{} };

global.document = documentStub;
global.window = windowStub;

const rootTrayElement = createElement('div');
rootTrayElement.classList.add('tray');
body.appendChild(rootTrayElement);
const rootTray = { id:'r', name:'root', children:[], hooks:[], isDone:false, borderColor:'#000', created_dt:new Date() };

// load modules with stubs
delete require.cache[require.resolve('../cjs/utils.js')];
const utils = require('../cjs/utils.js');
utils.getRootElement = () => rootTrayElement;

delete require.cache[require.resolve('../cjs/app.js')];
const app = require('../cjs/app.js');
app.element2TrayMap.set(rootTrayElement, rootTray);

delete require.cache[require.resolve('../cjs/hamburger.js')];
const ham = require('../cjs/hamburger.js');

function lastDialog(){
  return body.children.find(el => el.classList && el.classList._cls && el.classList._cls.has('hook-view-dialog'));
}

test('dialog closes on Escape', () => {
  ham.showHookViewDialog();
  const dialog = lastDialog();
  assert.ok(dialog, 'dialog should be added');
  documentStub.onkeydown({ key:'Escape' });
  assert.ok(!body.children.includes(dialog), 'dialog removed on escape');
});

test('dialog closes on outside click', () => {
  ham.showHookViewDialog();
  const dialog = lastDialog();
  assert.ok(dialog, 'dialog should be added');
  documentStub.onclick({ target: {} });
  assert.ok(!body.children.includes(dialog), 'dialog removed on outside click');
});
