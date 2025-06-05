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
    setAttribute(name, value){ if(name.startsWith('data-')){ this.dataset[name.slice(5)] = value; } },
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
    focus(){}
  };
  if(tag==='a') el.href='';
  if(tag==='input') el.type='';
  if(tag==='img') el.src='';
  return el;
}
const documentStub = { body, createElement, querySelector(){return null;}, createRange(){return { selectNodeContents(){} };} };
const windowStub = { addEventListener(){}, location:{}, getSelection(){ return { removeAllRanges(){}, addRange(){} }; } };

global.document = documentStub;
global.window = windowStub;
global.indexedDB = { open(){ return { result:{ objectStoreNames:{ contains(){return false;}}, createObjectStore(){}, transaction(){ return { objectStore(){ return { put(){ return { onsuccess:null }; } }; } }; }}, onupgradeneeded:null, onsuccess:null, onerror:null }; } };

delete require.cache[require.resolve('../cjs/io.js')];
const io = require('../cjs/io.js');
io.saveToIndexedDB = () => Promise.resolve('');

delete require.cache[require.resolve('../cjs/tray.js')];
delete require.cache[require.resolve('../cjs/keyboardInteraction.js')];
const utils = require('../cjs/utils.js');
const idMap = new Map();
utils.getTrayFromId = (id) => idMap.get(id);
const { Tray } = require('../cjs/tray.js');
const ki = require('../cjs/keyboardInteraction.js');

test('ctrl+ArrowDown moves tray down', () => {
  const parent = new Tray('0','p','parent');
  idMap.set(parent.id, parent);
  const c = new Tray(parent.id,'c','C');
  idMap.set(c.id, c);
  const b = new Tray(parent.id,'b','B');
  idMap.set(b.id, b);
  const a = new Tray(parent.id,'a','A');
  idMap.set(a.id, a);
  parent.addChild(c);
  parent.addChild(b);
  parent.addChild(a); // order a,b,c

  ki.handleKeyDown(b, { key:'ArrowDown', ctrlKey:true, preventDefault(){}, stopPropagation(){} });

  assert.deepStrictEqual(parent.children.map(t=>t.id), [a.id,c.id,b.id]);
});

test('ctrl+ArrowUp moves tray up', () => {
  const parent = new Tray('0','p2','parent');
  idMap.set(parent.id, parent);
  const c = new Tray(parent.id,'c2','C');
  idMap.set(c.id, c);
  const b = new Tray(parent.id,'b2','B');
  idMap.set(b.id, b);
  const a = new Tray(parent.id,'a2','A');
  idMap.set(a.id, a);
  parent.addChild(c);
  parent.addChild(b);
  parent.addChild(a); // order a,b,c

  ki.handleKeyDown(c, { key:'ArrowUp', ctrlKey:true, preventDefault(){}, stopPropagation(){} });

  assert.deepStrictEqual(parent.children.map(t=>t.id), [a.id,c.id,b.id]);
});

test('ctrl+ArrowDown keeps focus on moved tray', () => {
  const parent = new Tray('0','p3','parent');
  idMap.set(parent.id, parent);
  const first = new Tray(parent.id,'f3','F');
  idMap.set(first.id, first);
  const target = new Tray(parent.id,'t3','T');
  idMap.set(target.id, target);
  parent.addChild(first);
  parent.addChild(target);
  let focused = null;
  target.element.focus = () => { focused = target.element; };

  ki.handleKeyDown(target, { key:'ArrowDown', ctrlKey:true, preventDefault(){}, stopPropagation(){} });

  assert.strictEqual(focused, target.element);
});

test('ctrl+ArrowUp keeps focus on moved tray', () => {
  const parent = new Tray('0','p4','parent');
  idMap.set(parent.id, parent);
  const target = new Tray(parent.id,'t4','T');
  idMap.set(target.id, target);
  const last = new Tray(parent.id,'l4','L');
  idMap.set(last.id, last);
  parent.addChild(target);
  parent.addChild(last);
  let focused = null;
  target.element.focus = () => { focused = target.element; };

  ki.handleKeyDown(target, { key:'ArrowUp', ctrlKey:true, preventDefault(){}, stopPropagation(){} });

  assert.strictEqual(focused, target.element);
});

test('ctrl+ArrowRight nests tray under next sibling', () => {
  const parent = new Tray('0','p5','parent');
  idMap.set(parent.id, parent);
  const first = new Tray(parent.id,'f5','F'); idMap.set(first.id, first);
  const target = new Tray(parent.id,'t5','T'); idMap.set(target.id, target);
  const next = new Tray(parent.id,'n5','N'); idMap.set(next.id, next);
  parent.addChild(next);
  parent.addChild(target);
  parent.addChild(first); // order first, target, next

  ki.handleKeyDown(target, { key:'ArrowRight', ctrlKey:true, preventDefault(){}, stopPropagation(){} });

  assert.ok(!parent.children.includes(target));
  assert.strictEqual(next.children[0], target);
  assert.strictEqual(target.parentId, next.id);
});

test('ctrl+ArrowLeft moves tray above parent', () => {
  const root = new Tray('0','root','root'); idMap.set(root.id, root);
  const parent = new Tray(root.id,'p6','parent'); idMap.set(parent.id, parent);
  const target = new Tray(parent.id,'t6','T'); idMap.set(target.id, target);
  root.addChild(parent);
  parent.addChild(target);

  ki.handleKeyDown(target, { key:'ArrowLeft', ctrlKey:true, preventDefault(){}, stopPropagation(){} });

  assert.ok(!parent.children.includes(target));
  assert.strictEqual(root.children[0], target);
  assert.strictEqual(root.children[1], parent);
  assert.strictEqual(target.parentId, root.id);
});
