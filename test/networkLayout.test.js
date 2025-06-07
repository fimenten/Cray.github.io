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
      const i=this.children.indexOf(ref);
      if(i>=0) this.children.splice(i,0,child); else this.children.push(child);
    },
    removeChild(child){ this.children = this.children.filter(c=>c!==child); },
    setAttribute(name, value){ if(name.startsWith('data-')) this.dataset[name.slice(5)] = value; },
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
const { Tray } = require('../cjs/tray.js');

test('checkbox comes after datetime in network tray', () => {
  const t = new Tray('0','n','N', null, null, 'column', 'http://h','file');
  const titleContainer = t.element.children[0];
  const idxCreated = titleContainer.children.findIndex(c => c.classList && c.classList.contains('tray-created-time'));
  const idxCheckbox = titleContainer.children.findIndex(c => c.classList && c.classList.contains('tray-checkbox-container'));
  assert.ok(idxCreated >= 0 && idxCheckbox >= 0);
  assert.ok(idxCheckbox > idxCreated); // checkbox should be after created time
});
