const assert = require('assert');
const { test } = require('node:test');

let confirmed = true;

global.confirm = () => confirmed;

global.document = {
  body: { appendChild(el){ if(el.onload) el.onload(); } },
  createElement(){ return { set src(v){}, onload:null, onerror:null }; }
};

global.gapi = { load: (_,cb)=>cb(), client:{ load: async()=>{}, request: async ()=>({result:{}, body:''}) } };

global.google = { accounts:{ oauth2:{ initTokenClient: () => ({ callback:null, requestAccessToken(){ this.callback({}); } }) } } };

global.localStorage = {
  data:{},
  getItem(k){ return this.data[k] || null; },
  setItem(k,v){ this.data[k]=v; },
  removeItem(k){ delete this.data[k]; }
};

const gd = require('../cjs/googleDrive.js');

test('autoConnectDrive connects when confirmed', async () => {
  global.localStorage.setItem('gdrive_client_id','cid');
  confirmed = true;
  await gd.autoConnectDrive();
  assert.ok(gd.tokenClient);
});

test('autoConnectDrive skips when cancelled', async () => {
  gd.tokenClient = null;
  global.localStorage.setItem('gdrive_client_id','cid');
  confirmed = false;
  await gd.autoConnectDrive();
  assert.strictEqual(gd.tokenClient, null);
});

test('autoConnectDrive does nothing without id', async () => {
  gd.tokenClient = null;
  global.localStorage.data = {};
  confirmed = true;
  await gd.autoConnectDrive();
  assert.strictEqual(gd.tokenClient, null);
});
