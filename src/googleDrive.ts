declare const gapi: any;
declare const google: any;

export let tokenClient: any = null;
let initialized = false;

export async function initGoogleDrive(clientId: string) {
  if (initialized) return;
  await new Promise<void>((resolve, reject) => {
    const g: any = (globalThis as any).gapi;
    if (!g) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => (globalThis as any).gapi.load('client', resolve);
      script.onerror = () => reject(new Error('gapi load failed'));
      document.body.appendChild(script);
    } else {
      g.load('client', resolve);
    }
  });
  await (globalThis as any).gapi.client.load('drive', 'v3');
  tokenClient = (globalThis as any).google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback: ''
  });
  initialized = true;
}

export function signIn() {
  if (!initialized || !tokenClient) throw new Error('Google Drive not initialized');
  return new Promise<void>((resolve, reject) => {
    tokenClient.callback = (resp: any) => {
      if (resp.error) reject(resp);
      else resolve();
    };
    tokenClient.requestAccessToken();
  });
}

export async function ensureTrayFolderExists(): Promise<string> {
  const cached = localStorage.getItem('gdrive_tray_folder');
  if (cached) return cached;
  await signIn();
  const list = await (globalThis as any).gapi.client.request({
    path: '/drive/v3/files',
    method: 'GET',
    params: {
      q: "mimeType='application/vnd.google-apps.folder' and name='tray' and trashed=false",
      fields: 'files(id,name)'
    }
  });
  let folderId;
  if (list.result.files && list.result.files.length) {
    folderId = list.result.files[0].id;
  } else {
    const create = await (globalThis as any).gapi.client.request({
      path: '/drive/v3/files',
      method: 'POST',
      body: { name: 'tray', mimeType: 'application/vnd.google-apps.folder' }
    });
    folderId = create.result.id;
  }
  localStorage.setItem('gdrive_tray_folder', folderId);
  return folderId;
}

export async function connectGoogleDrive(clientId: string): Promise<void> {
  await initGoogleDrive(clientId);
  await signIn();
  await ensureTrayFolderExists();
}

export async function uploadToDrive(data: string, fileName: string, fileId?: string): Promise<string> {
  await signIn();
  const body = new Blob([data], { type: 'application/json' });
  const folderId = await ensureTrayFolderExists();
  if (fileId) {
    const res = await (globalThis as any).gapi.client.request({
      path: `/upload/drive/v3/files/${fileId}`,
      method: 'PATCH',
      params: { uploadType: 'media' },
      body
    });
    return res.result.id as string;
  } else {
    const res = await (globalThis as any).gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'media' },
      body
    });
    const id = res.result.id as string;
    await (globalThis as any).gapi.client.request({
      path: `/drive/v3/files/${id}`,
      method: 'PATCH',
      body: { name: fileName, parents: [folderId] }
    });
    return id;
  }
}

export async function downloadFromDrive(fileId: string): Promise<string> {
  await signIn();
  const res = await (globalThis as any).gapi.client.request({
    path: `/drive/v3/files/${fileId}`,
    method: 'GET',
    params: { alt: 'media' }
  });
  return res.body as string;
}
