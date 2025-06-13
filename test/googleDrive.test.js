const assert = require('assert');
const { test } = require('node:test');

// DOM stubs similar to other tests
const body = { children: [], appendChild(el){ this.children.push(el); el.parent=this; }, removeChild(el){ this.children = this.children.filter(c=>c!==el); } };
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
    textContent:''
  };
  if(tag==='input') el.type='';
  if(tag==='img') el.src='';
  if(tag==='a') el.href='';
  return el;
}
const doc = { body, createElement, querySelector(){ return null; }, createRange(){ return { selectNodeContents(){} }; } };
const win = { addEventListener(){}, location:{ href:'', replace(){} }, getSelection(){ return { removeAllRanges(){}, addRange(){} }; } };

global.document = doc;
global.window = win;

global.localStorage = {
  data:{},
  getItem(k){ return this.data[k] || null; },
  setItem(k,v){ this.data[k]=v; },
  removeItem(k){ delete this.data[k]; }
};

let uploaded = false;
let downloaded = false;
require.cache[require.resolve('../cjs/googleDrive.js')] = { exports:{
  uploadToDrive: async ()=>{ uploaded = true; return 'fileid'; },
  downloadFromDrive: async ()=>{ downloaded = true; return '{"id":"1","parentId":"0","name":"t","borderColor":"#fff","created_dt":"2024-01-01T00:00:00.000Z","flexDirection":"column","host_url":null,"filename":null,"isFolded":false,"properties":{},"children":[]}'; }
} };

delete require.cache[require.resolve('../cjs/networks.js')];
const nets = require('../cjs/networks.js');

test('uploadData uses google drive when host_url is gdrive', async () => {
  const tray = { host_url:'gdrive', filename:null, id:'1', name:'t', children:[] };
  await nets.uploadData(tray);
  assert.ok(uploaded);
  assert.strictEqual(tray.filename, 'fileid');
});

test('downloadData uses google drive when host_url is gdrive', async () => {
  const tray = { host_url:'gdrive', filename:'fileid', id:'1', name:'t' };
  const t = await nets.downloadData(tray);
  assert.ok(downloaded);
  assert.strictEqual(typeof t, 'object');
});
