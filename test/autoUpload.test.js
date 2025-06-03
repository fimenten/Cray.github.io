const assert = require('assert');
const { test } = require('node:test');

const body = { children: [], appendChild(el){ this.children.push(el); }, removeChild(el){ this.children = this.children.filter(c=>c!==el); } };
const doc = { body, createElement(){ return { style:{}, textContent:'', appendChild(){}, classList:{add(){}}, remove(){ body.removeChild(this); } }; } };
const win = { addEventListener(){}, location:{ href:'', replace(){} } };
global.document = doc;
global.window = win;

function load(stubs){
  Object.keys(stubs).forEach(m=>{
    require.cache[require.resolve('../cjs/'+m+'.js')] = { exports: stubs[m] };
  });
  delete require.cache[require.resolve('../cjs/networks.js')];
  return require('../cjs/networks.js');
}

test('newestTimestamp finds latest date', () => {
  const { newestTimestamp } = load({io:{}, utils:{}, functions:{}});
  const tree = {created_dt:new Date('2020-01-01'),children:[
    {created_dt:new Date('2020-01-03'),children:[]},
    {created_dt:new Date('2020-01-02'),children:[{created_dt:new Date('2020-01-04'),children:[]}]}
  ]};
  const ts = newestTimestamp(tree);
  assert.strictEqual(new Date(ts).toISOString(), new Date('2020-01-04').toISOString());
});

test('syncTray adopts newer remote data', async () => {
  let posted = false;
  global.fetch = async (url, opts)=>{
    if(opts.method==='GET') return { ok:true, json: async ()=>({id:'1',parentId:'p',name:'r',created_dt:new Date('2020-02-01'),children:[]}) };
    if(opts.method==='POST'){ posted=true; return {ok:true,text:async()=>''}; }
  };
  const parent = {child:null,removed:null,addChild(t){this.child=t;},updateAppearance(){}};
  const tray = {id:'1',parentId:'p',host_url:'u',filename:'f',created_dt:new Date('2020-01-01'),children:[],element:{remove(){}}};
  const nets = load({io:{serialize:JSON.stringify,deserialize:JSON.parse},utils:{getTrayFromId:()=>parent},functions:{deleteTray:t=>{parent.removed=t;}}});
  await nets.syncTray(tray);
  assert.ok(parent.child); // replaced
  assert.strictEqual(posted,false);
});

test('syncTray uploads when local newer', async () => {
  let posted = false;
  global.fetch = async (url, opts)=>{
    if(opts.method==='GET') return { ok:true, json: async ()=>({id:'1',parentId:'p',name:'r',created_dt:new Date('2020-01-01'),children:[]}) };
    if(opts.method==='POST'){ posted=true; return {ok:true,text:async()=>''}; }
  };
  const parent = {child:null,removed:null,addChild(t){this.child=t;},updateAppearance(){}};
  const tray = {id:'1',parentId:'p',host_url:'u',filename:'f',created_dt:new Date('2020-02-01'),children:[],element:{remove(){}}};
  const nets = load({io:{serialize:JSON.stringify,deserialize:JSON.parse},utils:{getTrayFromId:()=>parent},functions:{deleteTray:t=>{parent.removed=t;}}});
  await nets.syncTray(tray);
  assert.strictEqual(parent.child,null);
  assert.strictEqual(posted,true);
});

test('startAutoUpload schedules sync and stopAutoUpload clears it', () => {
  let callback;
  let cleared;
  global.setInterval = (fn, ms) => { callback = fn; return 123; };
  global.clearInterval = id => { cleared = id; };
  win.setInterval = global.setInterval;
  win.clearInterval = global.clearInterval;
  const nets = load({io:{serialize:JSON.stringify,deserialize:JSON.parse},utils:{getTrayFromId:()=>({})},functions:{deleteTray(){}}});
  const tray = {id:'1',parentId:'p',host_url:'u',filename:'f',created_dt:new Date(),children:[],element:{remove(){}}};
  nets.startAutoUpload(tray);
  assert.ok(callback);
  nets.stopAutoUpload(tray);
  assert.strictEqual(cleared,123);
});
