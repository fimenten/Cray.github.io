const assert = require('assert');
const { test } = require('node:test');

// minimal DOM stubs
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
    insertBefore(child, ref){ child.parent=this; if(!ref){ this.children.push(child); } else{ const i=this.children.indexOf(ref); if(i>=0) this.children.splice(i,0,child); else this.children.push(child);} },
    removeChild(child){ this.children = this.children.filter(c=>c!==child); },
    setAttribute(name, value){ if(name.startsWith('data-')) this.dataset[name.slice(5)] = value; },
    addEventListener(){},
    querySelector(sel){ if(sel.startsWith('.')){ const cls=sel.slice(1); if(this.classList.contains(cls)) return this; for(const ch of this.children){ const r=ch.querySelector(sel); if(r) return r; } } return null; },
    querySelectorAll(sel){ return this.children.filter(c=>c.classList && c.classList.contains(sel.slice(1))); },
    focus(){},
  };
  if(tag==='input') el.type='';
  return el;
}
const documentStub = { body, createElement, querySelector(){return null;}, createRange(){return { selectNodeContents(){} };} };
const windowStub = { addEventListener(){}, location:{}, getSelection(){ return { removeAllRanges(){}, addRange(){} }; } };

global.document = documentStub;
global.window = windowStub;
// stub indexedDB used by io.js
global.indexedDB = { open(){ return { result:{ objectStoreNames:{ contains(){return false;}}, createObjectStore(){}, transaction(){ return { objectStore(){ return { put(){ return { onsuccess:null }; } }; } }; }}, onupgradeneeded:null, onsuccess:null, onerror:null }; } };

delete require.cache[require.resolve('../cjs/io.js')];
const io = require('../cjs/io.js');
io.saveToIndexedDB = () => Promise.resolve('');

delete require.cache[require.resolve('../cjs/hamburger.js')];
const hamburger = require('../cjs/hamburger.js');
const selected_trays = hamburger.selected_trays;

delete require.cache[require.resolve('../cjs/tray.js')];
const utils = require('../cjs/utils.js');
const idMap = new Map();
utils.getTrayFromId = (id) => idMap.get(id);
const { Tray } = require('../cjs/tray.js');

test('dragging one of multiple selected trays moves them all', () => {
  const root = new Tray('0','root','root');
  idMap.set(root.id, root);
  const a = new Tray(root.id,'a','A'); idMap.set(a.id,a); root.addChild(a);
  const b = new Tray(root.id,'b','B'); idMap.set(b.id,b); root.addChild(b);
  const target = new Tray(root.id,'t','T'); idMap.set(target.id,target); root.addChild(target);

  selected_trays.push(a, b);

  const dragEv = { stopPropagation(){}, dataTransfer:{ effectAllowed:'', setData(type,data){ this.data=data; }, getData(){ return this.data; } } };
  a.onDragStart(dragEv);

  const dropEv = { preventDefault(){}, stopPropagation(){}, dataTransfer:{ getData(){ return dragEv.dataTransfer.data; } } };
  target.onDrop(dropEv);

  assert(target.children.includes(a));
  assert(target.children.includes(b));
  assert(!root.children.includes(a));
  assert(!root.children.includes(b));
});
