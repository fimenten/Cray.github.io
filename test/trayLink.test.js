const assert = require('assert');
const { test } = require('node:test');

const body = { children: [], appendChild(el){ this.children.push(el); el.parent=this; }, removeChild(){}}

function createElement(tag='div'){
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    style: {},
    dataset: {},
    classList: {
      _cls: new Set(),
      add(c){ this._cls.add(c); },
      contains(c){ return this._cls.has(c); }
    },
    appendChild(child){ child.parent=this; this.children.push(child); },
    append(child){ this.appendChild(child); },
    setAttribute(){},
    addEventListener(){},
    querySelector(sel){
      if(sel.startsWith('.')){
        const cls = sel.slice(1);
        if(this.classList.contains(cls)) return this;
        for(const ch of this.children){ const r = ch.querySelector(sel); if(r) return r; }
      }
      return null;
    },
    textContent: ''
  };
  if(tag === 'a') el.href = '';
  if(tag === 'input') el.type = '';
  return el;
}

const documentStub = { 
  body, 
  createElement, 
  querySelector(){return null;},
  createRange(){ return { selectNodeContents(){}, }; }
};
const windowStub = { 
  addEventListener(){}, 
  location:{},
  getSelection(){ return { removeAllRanges(){}, addRange(){} }; }
};

global.document = documentStub;
global.window = windowStub;
global.indexedDB = { open(){ return { result:{ objectStoreNames:{ contains(){return false;}}, createObjectStore(){}, transaction(){ return { objectStore(){ return { put(){ return { onsuccess:null }; } }; } }; }}, onupgradeneeded:null, onsuccess:null, onerror:null }; } };

// stub saveToIndexedDB before loading Tray
delete require.cache[require.resolve('../cjs/io.js')];
const io = require('../cjs/io.js');
io.saveToIndexedDB = () => Promise.resolve('');

// reload module with stubs
delete require.cache[require.resolve('../cjs/tray.js')];
const { Tray } = require('../cjs/tray.js');

test('tray name as url renders anchor', () => {
  const t = new Tray('0','1','https://example.com');
  const title = t.element.querySelector('.tray-title');
  const a = title.children[0];
  assert.ok(a);
  assert.strictEqual(a.href, 'https://example.com');
});

test('finishTitleEdit converts to link', () => {
  const t = new Tray('0','2','first');
  let title = t.element.querySelector('.tray-title');
  t.startTitleEdit(title);
  title.textContent = 'https://foo.com';
  t.finishTitleEdit(title);
  title = t.element.querySelector('.tray-title');
  const a = title.children[0];
  assert.ok(a);
  assert.strictEqual(a.href, 'https://foo.com');
});

test('non url name stays text', () => {
  const t = new Tray('0','3','hello');
  const title = t.element.querySelector('.tray-title');
  assert.strictEqual(title.textContent, 'hello');
});
