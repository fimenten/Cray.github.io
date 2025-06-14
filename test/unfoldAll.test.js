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
        const i=this.children.indexOf(ref);
        if(i>=0) this.children.splice(i,0,child); else this.children.push(child);
      }
    },
    removeChild(child){ this.children = this.children.filter(c=>c!==child); },
    setAttribute(name,value){ if(name.startsWith('data-')) this.dataset[name.slice(5)] = value; },
    addEventListener(type,fn){ this['on'+type]=fn; },
    querySelector(sel){
      if(sel.startsWith('.')){
        const cls = sel.slice(1);
        if(this.classList.contains(cls)) return this;
        for(const ch of this.children){ const r = ch.querySelector(sel); if(r) return r; }
      }
      return null;
    },
    querySelectorAll(sel){ return this.children.filter(c=>c.classList && c.classList.contains(sel.slice(1))); },
    focus(){}
  };
  if(tag==='input'){ el.type=''; el.checked=false; }
  return el;
}
const documentStub = { body, createElement, querySelector(){return null;}, createRange(){return { selectNodeContents(){} };} };
const windowStub = { addEventListener(){}, location:{}, getSelection(){ return { removeAllRanges(){}, addRange(){} }; } };

global.document = documentStub;
global.window = windowStub;

global.indexedDB = { open(){ return { result:{ objectStoreNames:{ contains(){return false;}}, createObjectStore(){}, transaction(){ return { objectStore(){ return { put(){ return { onsuccess:null }; } }; } }; }}, onupgradeneeded:null, onsuccess:null, onerror:null }; } };

// reload modules
delete require.cache[require.resolve('../cjs/io.js')];
const io = require('../cjs/io.js');
io.saveToIndexedDB = () => Promise.resolve('');

delete require.cache[require.resolve('../cjs/tray.js')];
delete require.cache[require.resolve('../cjs/keyboardInteraction.js')];
delete require.cache[require.resolve('../cjs/utils.js')];
const utils = require('../cjs/utils.js');
const idMap = new Map();
utils.getTrayFromId = (id) => idMap.get(id);
const { Tray } = require('../cjs/tray.js');
const ki = require('../cjs/keyboardInteraction.js');

test('double click unfold button expands all children', () => {
  const root = new Tray('0','r1','root'); idMap.set(root.id, root);
  const child = new Tray(root.id,'c1','child'); idMap.set(child.id, child);
  const grand = new Tray(child.id,'g1','grand'); idMap.set(grand.id, grand);
  root.addChild(child);
  child.addChild(grand);

  const btn = child.element.querySelector('.tray-fold-button');
  btn.onclick({ detail:1, stopPropagation(){} });
  btn.onclick({ detail:2, stopPropagation(){} });

  assert.strictEqual(child.isFolded, false);
  assert.strictEqual(grand.isFolded, false);
});

test('double enter unfolds all children', () => {
  const root = new Tray('0','r2','root'); idMap.set(root.id, root);
  const child = new Tray(root.id,'c2','child'); idMap.set(child.id, child);
  const grand = new Tray(child.id,'g2','grand'); idMap.set(grand.id, grand);
  root.addChild(child);
  child.addChild(grand);

  const origNow = Date.now;
  Date.now = () => 1000;
  ki.handleKeyDown(child, { key:'Enter', ctrlKey:false, shiftKey:false, preventDefault(){}, stopPropagation(){} });
  Date.now = () => 1100;
  ki.handleKeyDown(child, { key:'Enter', ctrlKey:false, shiftKey:false, preventDefault(){}, stopPropagation(){} });
  Date.now = origNow;

  assert.strictEqual(child.isFolded, false);
  assert.strictEqual(grand.isFolded, false);
});
