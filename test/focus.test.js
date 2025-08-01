const assert = require('assert');
const { test } = require('node:test');

const body = { children: [], appendChild(el){ this.children.push(el); el.parent=this; }, removeChild(el){ this.children = this.children.filter(c=>c!==el); } };
function createElement(tag='div'){
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    style: {},
    dataset: {},
    classList:{
      _cls:new Set(),
      add(c){ this._cls.add(c); },
      remove(c){ this._cls.delete(c); },
      contains(c){ return this._cls.has(c); }
    },
    appendChild(child){ child.parent=this; this.children.push(child); },
    append(child){ this.appendChild(child); },
    insertBefore(child, ref){
      child.parent=this;
      if(!ref){ this.children.push(child); }
      else{
        const i = this.children.indexOf(ref);
        if(i>=0) this.children.splice(i,0,child); else this.children.push(child);
      }
    },
    removeChild(child){ this.children = this.children.filter(c=>c!==child); },
    setAttribute(name,value){ if(name.startsWith('data-')) this.dataset[name.slice(5)] = value; },
    addEventListener(){},
    querySelector(sel){
      if(sel.startsWith('.')){
        const cls = sel.slice(1);
        if(this.classList.contains(cls)) return this;
        for(const ch of this.children){ const r = ch.querySelector(sel); if(r) return r; }
      }
      return null;
    },
    querySelectorAll(sel){ return this.children.filter(c=>c.classList && c.classList.contains(sel.slice(1))); },
    getBoundingClientRect(){ return { left:0, top:0, width:100, height:20 }; },
    focus(){},
    remove(){ if(this.parent){ this.parent.removeChild(this); } },
  };
  if(tag==='input') el.type='';
  if(tag==='a') el.href='';
  return el;
}
const documentStub = { body, createElement, querySelector(){return null;}, createRange(){ return { selectNodeContents(){} }; } };
const windowStub = { addEventListener(){}, location:{}, getSelection(){ return { removeAllRanges(){}, addRange(){} }; } };

global.document = documentStub;
global.window = windowStub;
global.indexedDB = { open(){ return { result:{ objectStoreNames:{ contains(){return false;}}, createObjectStore(){}, transaction(){ return { objectStore(){ return { put(){ return { onsuccess:null }; } }; } }; }}, onupgradeneeded:null, onsuccess:null, onerror:null }; } };

delete require.cache[require.resolve('../cjs/io.js')];
const io = require('../cjs/io.js');
io.saveToIndexedDB = () => Promise.resolve('');

delete require.cache[require.resolve('../cjs/tray.js')];
const trayOperations = require('../cjs/trayOperations.js');
const idMap = new Map();
trayOperations.getTrayFromId = (id) => idMap.get(id);
const { Tray } = require('../cjs/tray.js');

delete require.cache[require.resolve('../cjs/functions.js')];
const fns = require('../cjs/functions.js');


test('indentRight keeps focus on tray', () => {
  const parent = new Tray('0','p','parent'); idMap.set(parent.id,parent);
  const next = new Tray(parent.id,'n','N'); idMap.set(next.id,next);
  const target = new Tray(parent.id,'t','T'); idMap.set(target.id,target);
  parent.addChild(next);
  parent.addChild(target); // target has next sibling
  let focused = null;
  target.element.focus = () => { focused = target.element; };

  target.indentRight();

  assert.strictEqual(focused, target.element);
});

test('indentLeft keeps focus on tray', () => {
  const root = new Tray('0','root','root'); idMap.set(root.id,root);
  const parent = new Tray(root.id,'p','P'); idMap.set(parent.id,parent);
  const target = new Tray(parent.id,'t','T'); idMap.set(target.id,target);
  root.addChild(parent);
  parent.addChild(target);
  let focused = null;
  target.element.focus = () => { focused = target.element; };

  target.indentLeft();

  assert.strictEqual(focused, target.element);
});

test('deleteTray focuses next sibling', () => {
  const parent = new Tray('0','p2','parent'); idMap.set(parent.id,parent);
  const after = new Tray(parent.id,'a2','A'); idMap.set(after.id,after);
  const target = new Tray(parent.id,'t2','T'); idMap.set(target.id,target);
  const before = new Tray(parent.id,'b2','B'); idMap.set(before.id,before);
  parent.addChild(after);
  parent.addChild(target);
  parent.addChild(before); // order before,target,after
  let focused = null;
  after.element.focus = () => { focused = after.element; };

  fns.deleteTray(target);

  assert.strictEqual(focused, after.element);
  assert.ok(!parent.children.includes(target));
});

test('meltTray focuses parent tray', () => {
  const root = new Tray('0','root2','root'); idMap.set(root.id,root);
  const child = new Tray(root.id,'c2','child'); idMap.set(child.id,child);
  const grand = new Tray(child.id,'g2','grand'); idMap.set(grand.id,grand);
  root.addChild(child);
  child.addChild(grand);

  let focused = null;
  root.element.focus = () => { focused = root.element; };

  fns.meltTray(child);

  assert.strictEqual(focused, root.element);
  assert.ok(!root.children.includes(child));
  assert.ok(root.children.includes(grand));
});

test('insertParentTray wraps tray correctly', () => {
  const root = new Tray('0','r3','root'); idMap.set(root.id,root);
  const child = new Tray(root.id,'c3','child'); idMap.set(child.id,child);
  root.addChild(child);

  child.insertParentTray();

  const newParent = root.children[0];
  assert.notStrictEqual(newParent, child);
  assert.strictEqual(newParent.children[0], child);
  assert.strictEqual(child.parentId, newParent.id);
});

test('insertChildTray nests children correctly', () => {
  const root = new Tray('0','r4','root'); idMap.set(root.id,root);
  const child1 = new Tray(root.id,'c4','c1'); idMap.set(child1.id,child1);
  const child2 = new Tray(root.id,'c5','c2'); idMap.set(child2.id,child2);
  root.addChild(child1);
  root.addChild(child2);

  root.insertChildTray();

  const newChild = root.children[0];
  assert.notStrictEqual(newChild, child1);
  assert.ok(newChild.children.includes(child1));
  assert.ok(newChild.children.includes(child2));
  assert.strictEqual(child1.parentId, newChild.id);
  assert.strictEqual(child2.parentId, newChild.id);
});
