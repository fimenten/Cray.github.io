export const ivLength = 12;

async function getKeyMaterial(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
}

async function deriveKey(password: string): Promise<CryptoKey> {
  const keyMaterial = await getKeyMaterial(password);
  const enc = new TextEncoder();
  const salt = enc.encode('staticSalt');
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptString(data: string, password: string): Promise<string> {
  const key = await deriveKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(ivLength));
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(data));
  const buff = new Uint8Array(ivLength + encrypted.byteLength);
  buff.set(iv, 0);
  buff.set(new Uint8Array(encrypted), ivLength);
  return btoa(String.fromCharCode(...buff));
}

export async function decryptString(data: string, password: string): Promise<string> {
  const buff = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  const iv = buff.slice(0, ivLength);
  const encrypted = buff.slice(ivLength);
  const key = await deriveKey(password);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  const dec = new TextDecoder();
  return dec.decode(decrypted);
}
