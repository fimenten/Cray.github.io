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
      if(!ref){ this.children.push(child); }
      else{
        const i=this.children.indexOf(ref);
        if(i>=0) this.children.splice(i,0,child); else this.children.push(child);
      }
    },
    removeChild(child){ this.children = this.children.filter(c=>c!==child); },
    setAttribute(name,value){ if(name.startsWith('data-')) this.dataset[name.slice(5)] = value; },
    addEventListener(type,fn){ this['on'+type]=fn; },
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
  if(tag==='input'){ el.type=''; el.checked=false; }
  return el;
}
const documentStub = { body, createElement, querySelector(){return null;}, createRange(){ return { selectNodeContents(){}, }; } };
const windowStub = { addEventListener(){}, location:{}, getSelection(){ return { removeAllRanges(){}, addRange(){} }; }, requestIdleCallback:(cb)=>setTimeout(cb,0) };

global.document = documentStub;
global.window = windowStub;
global.HTMLDivElement = function() {};

const { Tray } = require('../cjs/tray.js');

test('tray title hides @@ by default and toggles on click', () => {
  const tray = new Tray('p','1','Task @@done');
  const title = tray.element.querySelector('.tray-title');
  assert.strictEqual(title.textContent, 'Task done');

  title.onclick({});
  assert.strictEqual(title.textContent, 'Task @@done');

  title.onclick({});
  assert.strictEqual(title.textContent, 'Task done');
});
