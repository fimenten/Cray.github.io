function createFakeDom() {
  class Element {
    constructor(tagName) {
      this.tagName = tagName.toUpperCase();
      this.children = [];
      this.parentElement = null;
      this.style = {};
      this.attributes = {};
      this.eventListeners = {};
      this.isConnected = false;
      this._text = '';
      this.attributes.class = '';
    }
    appendChild(child) {
      child.parentElement = this;
      child.isConnected = true;
      this.children.push(child);
      return child;
    }
    append(...nodes) {
      nodes.forEach(n => this.appendChild(n));
    }
    insertBefore(child, before) {
      child.parentElement = this;
      child.isConnected = true;
      if (!before) {
        this.children.unshift(child);
      } else {
        const idx = this.children.indexOf(before);
        if (idx >= 0) this.children.splice(idx, 0, child);
        else this.children.push(child);
      }
      return child;
    }
    remove() {
      if (this.parentElement) {
        const idx = this.parentElement.children.indexOf(this);
        if (idx >= 0) this.parentElement.children.splice(idx, 1);
      }
      this.isConnected = false;
      this.parentElement = null;
    }
    querySelector(selector) {
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        if ((this.attributes.class || '').split(/\s+/).includes(cls)) {
          return this;
        }
      } else if (selector.startsWith('#')) {
        const id = selector.slice(1);
        if (this.attributes.id === id) {
          return this;
        }
      } else if (/^\[[^=]+=".*"\]$/.test(selector)) {
        const [attr, val] = selector.slice(1, -1).split('=');
        const v = val.replace(/^"|"$/g, '');
        if (this.attributes[attr] === v) {
          return this;
        }
      }
      for (const c of this.children) {
        const found = c.querySelector(selector);
        if (found) return found;
      }
      return null;
    }
    querySelectorAll(selector) {
      let arr = [];
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        if ((this.attributes.class || '').split(/\s+/).includes(cls)) {
          arr.push(this);
        }
      } else if (selector.startsWith('#')) {
        const id = selector.slice(1);
        if (this.attributes.id === id) arr.push(this);
      } else if (/^\[[^=]+=".*"\]$/.test(selector)) {
        const [attr, val] = selector.slice(1, -1).split('=');
        const v = val.replace(/^"|"$/g, '');
        if (this.attributes[attr] === v) arr.push(this);
      }
      for (const c of this.children) {
        arr = arr.concat(c.querySelectorAll(selector));
      }
      return arr;
    }
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    }
    getAttribute(name) {
      return this.attributes[name];
    }
    get className() {
      return this.attributes.class;
    }
    set className(v) {
      this.attributes.class = v;
    }
    get classList() {
      const self = this;
      return {
        add(...cls) {
          const classes = (self.attributes.class || '').split(/\s+/).filter(Boolean);
          cls.forEach((c) => { if (!classes.includes(c)) classes.push(c); });
          self.attributes.class = classes.join(' ');
        },
        remove(...cls) {
          let classes = (self.attributes.class || '').split(/\s+/).filter(Boolean);
          classes = classes.filter((c) => !cls.includes(c));
          self.attributes.class = classes.join(' ');
        }
      };
    }
    addEventListener(type, handler) {
      this.eventListeners[type] = this.eventListeners[type] || [];
      this.eventListeners[type].push(handler);
    }
    removeEventListener(type, handler) {
      if (!this.eventListeners[type]) return;
      this.eventListeners[type] = this.eventListeners[type].filter((h) => h !== handler);
    }
    dispatchEvent(event) {
      const handlers = this.eventListeners[event.type] || [];
      handlers.forEach((h) => h.call(this, event));
    }
    focus() {}
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 0, height: 0 };
    }
    set textContent(t) { this._text = t; }
    get textContent() { return this._text; }
    set innerHTML(html) {
      // Very naive parser tailored for menu HTML
      this.children = [];
      const divRegex = /<div class="menu-item"(?:\s+data-act="([^"]+)")?>([\s\S]*?)<\/div>/g;
      let m;
      while ((m = divRegex.exec(html)) !== null) {
        const el = new Element('div');
        el.classList.add('menu-item');
        if (m[1]) el.setAttribute('data-act', m[1]);
        const inner = m[2].trim();
        if (inner.startsWith('<input')) {
          const input = new Element('input');
          const idMatch = /id="([^"]+)"/.exec(inner);
          if (idMatch) input.setAttribute('id', idMatch[1]);
          const typeMatch = /type="([^"]+)"/.exec(inner);
          if (typeMatch) input.setAttribute('type', typeMatch[1]);
          el.appendChild(input);
        } else {
          el.textContent = inner;
        }
        this.appendChild(el);
      }
    }
  }
  class Document extends Element {
    constructor() {
      super('#document');
      this.body = new Element('body');
      this.appendChild(this.body);
    }
    createElement(tag) { return new Element(tag); }
    querySelector(selector) { return this.body.querySelector(selector); }
    addEventListener() {}
    removeEventListener() {}
  }
  const document = new Document();
  const window = { document, innerWidth: 800, innerHeight: 600 };
  return { document, window, Element };
}

export function setupDom() {
  const { document, window, Element } = createFakeDom();
  global.document = document;
  global.window = window;
  global.window.addEventListener = () => {};
  global.window.removeEventListener = () => {};
  global.HTMLElement = Element;
  global.MouseEvent = class {
    constructor(type, opts = {}) { this.type = type; this.clientX = opts.clientX || 0; this.clientY = opts.clientY || 0; }
  };
  Object.defineProperty(global, 'navigator', {
    configurable: true,
    writable: true,
    value: { clipboard: { writeText() {}, readText() { return Promise.resolve(''); } } }
  });
  global.indexedDB = { open() { return { onerror:()=>{}, onsuccess:()=>{}, onupgradeneeded:()=>{} }; } };
}
