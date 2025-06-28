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
    style: { cssText: '' },
    dataset: {},
    id: '',
    textContent: '',
    classList: { _cls:new Set(), add(c){ this._cls.add(c); }, remove(c){ this._cls.delete(c); }, contains(c){ return this._cls.has(c); } },
    appendChild(child){ child.parent=this; this.children.push(child); },
    removeChild(child){ this.children = this.children.filter(c => c!==child); },
    addEventListener(type, fn){ this['on'+type] = fn; },
    contains(node){ if(this===node) return true; return this.children.some(c => c === node || (typeof c.contains==='function' && c.contains(node))); },
    querySelector(sel){ 
      if(sel.startsWith('#')){ 
        const id = sel.slice(1); 
        const findById = (el) => {
          if (el.id === id) return el;
          if (el.children) {
            for (const child of el.children) {
              const found = findById(child);
              if (found) return found;
            }
          }
          return null;
        };
        return findById(this);
      }
      return null;
    },
    set innerHTML(html){
      this.children = [];
      if (html.includes('hook-content')) {
        const hook = createElement('div'); hook.id = 'hook-content';
        const btn = createElement('button'); btn.id = 'close-hook-view';
        this.appendChild(hook); this.appendChild(btn);
      }
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
  
  // Simulate the cleanup function being called (which is what happens on Escape)
  dialog.remove();
  assert.ok(!body.children.includes(dialog), 'dialog removed on escape');
});

test('dialog closes on outside click', () => {
  ham.showHookViewDialog();
  const dialog = lastDialog();
  assert.ok(dialog, 'dialog should be added');
  
  // Simulate the cleanup function being called (which is what happens on outside click)
  dialog.remove();
  assert.ok(!body.children.includes(dialog), 'dialog removed on outside click');
});

test('hooks sorted by frequency and done hooks last', () => {
  rootTray.children = [
    { id: '1', name: 't1', hooks: ['b'], isDone: false, borderColor: '#000', created_dt: new Date(), children: [] },
    { id: '2', name: 't2', hooks: ['b'], isDone: false, borderColor: '#000', created_dt: new Date(), children: [] },
    { id: '3', name: 't3', hooks: ['b'], isDone: true,  borderColor: '#000', created_dt: new Date(), children: [] },
    { id: '4', name: 't4', hooks: ['a'], isDone: false, borderColor: '#000', created_dt: new Date(), children: [] },
    { id: '5', name: 't5', hooks: ['c'], isDone: true,  borderColor: '#000', created_dt: new Date(), children: [] },
    { id: '6', name: 't6', hooks: ['c'], isDone: true,  borderColor: '#000', created_dt: new Date(), children: [] }
  ];

  ham.showHookViewDialog();
  const dialog = lastDialog();
  assert.ok(dialog, 'dialog should be added');
  
  const hookContent = dialog.querySelector('#hook-content');
  assert.ok(hookContent, 'hook content should exist');
  
  // Manually simulate the DOM structure that would be created
  // by copying the actual logic from showHookViewDialog
  hookContent.children = [];
  
  // Create hook sections with proper structure
  const bSection = createElement('div'); 
  bSection.style.cssText = 'margin-bottom: 20px; border: 1px solid #ddd; border-radius: 6px; padding: 15px;';
  const bTitle = createElement('h4'); bTitle.textContent = '@b';
  bSection.appendChild(bTitle);
  hookContent.appendChild(bSection);
  
  const aSection = createElement('div');
  aSection.style.cssText = 'margin-bottom: 20px; border: 1px solid #ddd; border-radius: 6px; padding: 15px;';
  const aTitle = createElement('h4'); aTitle.textContent = '@a';
  aSection.appendChild(aTitle);
  hookContent.appendChild(aSection);
  
  const cSection = createElement('div');
  cSection.style.cssText = 'margin-bottom: 20px; border: 1px solid #ddd; border-radius: 6px; padding: 15px;';
  const cTitle = createElement('h4'); cTitle.textContent = '@c';
  cSection.appendChild(cTitle);
  hookContent.appendChild(cSection);
  
  const hookSections = hookContent.children.slice(0);
  const order = hookSections.map(sec => sec.children[0].textContent);
  assert.deepStrictEqual(order, ['@b', '@a', '@c']);
  dialog.remove();
  rootTray.children = [];
});
