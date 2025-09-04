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

// Legacy updateData tests removed - incompatible with new enhanced conflict detection system
// The updateData function now uses sophisticated conflict detection instead of simple timestamp merging
// See test/autoUploadEnhanced.test.js for current conflict detection tests
