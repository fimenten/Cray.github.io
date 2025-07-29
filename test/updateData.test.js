const assert = require('assert');
const { test } = require('node:test');

const body = { children: [], appendChild(){}, removeChild(){}};
const doc = { body, createElement(){ return { style:{}, textContent:'', appendChild(){}, remove(){}, classList:{add(){}} }; } };
const win = { addEventListener(){}, location:{ href:'', replace(){} } };

global.document = doc;
global.window = win;
global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; }
};

function load(stubs){
  Object.keys(stubs).forEach(m=>{
    require.cache[require.resolve('../cjs/'+m+'.js')] = { exports: stubs[m] };
  });
  delete require.cache[require.resolve('../cjs/networks.js')];
  return require('../cjs/networks.js');
}

// helper to build a tray object
function tray(created){
  return {id:'1',parentId:'p',host_url:'u',filename:'f',created_dt:new Date(created),children:[],element:{remove(){}}};
}

// baseline remote object used in fetch responses
function remote(created){
  return {id:'1',parentId:'p',name:'r',created_dt:new Date(created),children:[]};
}

test('updateData merges remote when no local change', async () => {
  let posted = false;
  global.localStorage.setItem('trayPassword', 'test-password');
  global.fetch = async (url, opts)=>{
    if(opts.method==='GET') return { ok:true, json: async ()=>remote('2020-02-01') };
    if(opts.method==='POST'){ posted=true; return {ok:true,text:async()=>''}; }
  };
  const parent = {child:null,addChild(t){this.child=t;},updateAppearance(){}};
  const nets = load({io:{serialize:JSON.stringify,serializeAsync:async t=>JSON.stringify(t),deserialize:JSON.parse},trayOperations:{getTrayFromId:()=>parent},functions:{deleteTray:t=>{}}});
  const t = tray('2020-01-01');
  await nets.updateData(t);
  assert.strictEqual(new Date(t.created_dt).toISOString(), new Date('2020-02-01').toISOString());
  assert.strictEqual(posted,true);
});

test('updateData uploads when only local changed', async () => {
  let posted = false;
  global.localStorage.setItem('trayPassword', 'test-password');
  // first call for baseline
  global.fetch = async (url, opts)=>{
    if(opts.method==='GET') return { ok:true, json: async ()=>remote('2020-01-01') };
    if(opts.method==='POST'){ posted=true; return {ok:true,text:async()=>''}; }
  };
  const parent = {child:null,addChild(t){this.child=t;},updateAppearance(){}};
  const nets = load({io:{serialize:JSON.stringify,serializeAsync:async t=>JSON.stringify(t),deserialize:JSON.parse},trayOperations:{getTrayFromId:()=>parent},functions:{deleteTray:t=>{}}});
  const t = tray('2020-01-01');
  await nets.updateData(t); // sets baseline

  // modify local newer
  t.created_dt = new Date('2020-02-01');
  global.fetch = async (url, opts)=>{
    if(opts.method==='GET') return { ok:true, json: async ()=>remote('2020-01-01') };
    if(opts.method==='POST'){ posted=true; return {ok:true,text:async()=>''}; }
  };
  const before = parent.child;
  await nets.updateData(t);
  assert.strictEqual(parent.child, before); // not replaced
  assert.strictEqual(posted,true);
});

test('updateData merges when both changed', async () => {
  global.localStorage.setItem('trayPassword', 'test-password');
  global.fetch = async (url, opts)=>{
    if(opts.method==='GET') return { ok:true, json: async ()=>remote('2020-01-01') };
    if(opts.method==='POST') return { ok:true, text:async()=>'' };
  };
  const parent = {child:null,addChild(t){this.child=t;},updateAppearance(){}};
  const nets = load({io:{serialize:JSON.stringify,serializeAsync:async t=>JSON.stringify(t),deserialize:JSON.parse},trayOperations:{getTrayFromId:()=>parent},functions:{deleteTray:t=>{}}});
  const t = tray('2020-01-01');
  await nets.updateData(t); // baseline

  // both changed: remote newer & local newer
  t.created_dt = new Date('2020-02-01');
  t.children.push({id:'c1',parentId:'1',created_dt:new Date('2020-02-01'),children:[]});
  global.fetch = async (url, opts)=>{
    if(opts.method==='GET') return { ok:true, json: async ()=>{
      const r = remote('2020-02-02');
      r.children = [{id:'c2',parentId:'1',created_dt:new Date('2020-02-02'),children:[]}];
      return r;
    } };
    if(opts.method==='POST') return { ok:true,text:async()=>'' };
  };
  await nets.updateData(t);
  assert.strictEqual(t.children.length, 2);
});
