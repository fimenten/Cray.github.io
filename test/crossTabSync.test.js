const assert = require('assert');
const { test } = require('node:test');

const body = { appendChild(){}, children:[] };
const documentStub = { body, createElement(){ return {}; }, querySelector(){ return null; } };
const windowStub = {
  events:{},
  addEventListener(type, fn){ this.events[type] = fn; },
  location:{ search:'?sessionId=abc123' }
};

global.document = documentStub;
global.window = windowStub;

global.localStorage = {
  data:{},
  setItem(key, val){ this.data[key] = val; this.last = { key, val }; },
  getItem(key){ return this.data[key] || null; },
  removeItem(key){ delete this.data[key]; }
};

let openReq, putReq;
global.indexedDB = {
  open(){
    openReq = {
      result:{
        objectStoreNames:{ contains(){ return true; } },
        createObjectStore(){},
        transaction(){ return { objectStore(){ return { put(){ putReq = { onsuccess:null, onerror:null }; return putReq; } }; } }; }
      },
      onupgradeneeded:null,
      onsuccess:null,
      onerror:null
    };
    return openReq;
  }
};

// stub modules before loading
require.cache[require.resolve('../cjs/history.js')] = { exports:{ recordState(){} } };
require.cache[require.resolve('../cjs/networks.js')] = { exports:{
  downloadData(){}, showUploadNotification(){}, uploadData(){},
  fetchTrayList(){}, setNetworkOption(){}, startAutoUpload(){}, syncTray(){}
} };
require.cache[require.resolve('../cjs/hamburger.js')] = { exports:{ createHamburgerMenu(){}, selected_trays:[] } };
require.cache[require.resolve('../cjs/functions.js')] = { exports:{ meltTray(){} } };
require.cache[require.resolve('../cjs/tray.js')] = { exports:{ Tray: class{} } };
require.cache[require.resolve('../cjs/store.js')] = { exports:{} };
require.cache[require.resolve('../cjs/state.js')] = { exports:{ setLastFocused(){} } };
require.cache[require.resolve('../cjs/actionbotton.js')] = { exports:{ createActionButtons(){ return {}; } } };

delete require.cache[require.resolve('../cjs/utils.js')];
const utils = require('../cjs/utils.js');
utils.getRootElement = () => ({ });

delete require.cache[require.resolve('../cjs/io.js')];
const io = require('../cjs/io.js');

delete require.cache[require.resolve('../cjs/app.js')];
require('../cjs/app.js');


test('saveToIndexedDB notifies other tabs', async () => {
  const p = io.saveToIndexedDB('abc123', '{}');
  openReq.onsuccess();
  putReq.onsuccess();
  await p;
  assert.strictEqual(global.localStorage.last.key, 'update_abc123');
});

test('storage event triggers reload', async () => {
  let called = false;
  io.loadFromIndexedDB = async (key) => { called = key; };
  windowStub.events.storage({ key: 'update_abc123' });
  assert.strictEqual(called, 'abc123');
});
