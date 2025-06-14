const assert = require('assert');
const { test } = require('node:test');

// minimal DOM and storage stubs
global.document = { body:{ appendChild(){} } };
global.localStorage = {
  data:{},
  getItem(k){ return this.data[k] || null; },
  setItem(k,v){ this.data[k]=v; },
  removeItem(k){ delete this.data[k]; }
};

let requests = [];
const gapiClient = {
  request: async (opts) => {
    requests.push(opts);
    if (opts.path === '/drive/v3/files' && opts.method === 'GET') {
      return { result:{ files: [] } };
    }
    if ((opts.path === '/drive/v3/files' || opts.path === '/upload/drive/v3/files') && opts.method === 'POST') {
      if(opts.body && opts.body.mimeType === 'application/vnd.google-apps.folder')
        return { result:{ id:'folder123' } };
      return { result:{ id:'file123' } };
    }
    if (opts.path.startsWith('/drive/v3/files/') && opts.method === 'PATCH') {
      return { result:{ id: opts.path.split('/').pop() } };
    }
    return { result:{} };
  }
};

global.gapi = {
  load: (_,cb)=>cb(),
  client: { load: async ()=>{}, ...gapiClient }
};

global.google = {
  accounts:{ oauth2:{ initTokenClient: () => ({ callback:null, requestAccessToken(){ this.callback({}); } }) } }
};

delete require.cache[require.resolve('../cjs/googleDrive.js')];
const gd = require('../cjs/googleDrive.js');

async function setup(){
  requests = [];
  await gd.initGoogleDrive('id');
}

test('ensureTrayFolderExists creates folder and caches id', async () => {
  await setup();
  const id = await gd.ensureTrayFolderExists();
  assert.strictEqual(id, 'folder123');
  assert.strictEqual(global.localStorage.getItem('gdrive_tray_folder'), 'folder123');
});

test('uploadToDrive attaches folder', async () => {
  await setup();
  global.localStorage.setItem('gdrive_tray_folder', 'folder123');
  const id = await gd.uploadToDrive('{}','t.json');
  const patch = requests.find(r=>r.method==='PATCH' && r.path.startsWith('/drive/v3/files/'));
  assert.ok(patch.body.parents.includes('folder123'));
  assert.strictEqual(id, 'file123');
});
