const assert = require('assert');
const { test } = require('node:test');

// DOM and IndexedDB stubs similar to other tests
const body = { children: [], appendChild(el){ this.children.push(el); el.parent=this; }, removeChild(el){ this.children = this.children.filter(c=>c!==el); }};
function createElement(tag='div'){
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    style:{},
    dataset:{},
    classList:{ add(){}, remove(){}, contains(){ return false; } },
    appendChild(child){ child.parent=this; this.children.push(child); },
    append(child){ this.appendChild(child); },
    querySelector(){ return null; },
    setAttribute(){},
    addEventListener(){},
    textContent:'',
  };
  if(tag==='input') el.type='';
  if(tag==='img') el.src='';
  if(tag==='a') el.href='';
  return el;
}
const documentStub = { body, createElement, querySelector(){ return null; }, createRange(){ return { selectNodeContents(){} }; } };
const windowStub = { addEventListener(){}, location:{}, getSelection(){ return { removeAllRanges(){}, addRange(){} }; } };

global.document = documentStub;
global.window = windowStub;

global.indexedDB = { open(){ return { result:{ objectStoreNames:{ contains(){return false;}}, createObjectStore(){}, transaction(){ return { objectStore(){ return { put(){ return { onsuccess:null }; } }; } }; }}, onupgradeneeded:null, onsuccess:null, onerror:null }; } };

delete require.cache[require.resolve('../cjs/io.js')];
const io = require('../cjs/io.js');

test('deserialize preserves child order', () => {
  const data = {
    parentId: '0',
    id: 'root',
    name: 'root',
    borderColor: '#ffffff',
    created_dt: '2024-01-01T00:00:00.000Z',
    flexDirection: 'column',
    url: null,
    filename: null,
    isFolded: false,
    properties: {},
    children: [
      {
        parentId: 'root',
        id: 'c1',
        name: 'first',
        borderColor: '#ffffff',
        created_dt: '2024-01-02T00:00:00.000Z',
        flexDirection: 'column',
        url: null,
        filename: null,
        isFolded: false,
        properties: {},
        children: []
      },
      {
        parentId: 'root',
        id: 'c2',
        name: 'second',
        borderColor: '#ffffff',
        created_dt: '2024-01-03T00:00:00.000Z',
        flexDirection: 'column',
        url: null,
        filename: null,
        isFolded: false,
        properties: {},
        children: []
      }
    ]
  };

  const restored = io.deserialize(JSON.stringify(data));
  assert.deepStrictEqual(restored.children.map(t => t.id), ['c1','c2']);
});
