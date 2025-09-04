const assert = require('assert');
const { test } = require('node:test');

const body = { children: [], appendChild(el){ this.children.push(el); }, removeChild(el){ this.children = this.children.filter(c=>c!==el); } };
const doc = { body, createElement(){ return { style:{}, textContent:'', appendChild(){}, classList:{add(){}}, remove(){ body.removeChild(this); } }; } };
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

// Legacy auto-upload tests removed - incompatible with new enhanced auto-upload system
// See test/autoUploadEnhanced.test.js for current implementation tests
