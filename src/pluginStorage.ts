import { StoredPlugin, PluginManifest } from './pluginTypes';

const DB_NAME = 'TrayDatabase';
const DB_VERSION = 4; // Increment to ensure plugins store is created
const PLUGIN_STORE_NAME = 'plugins';

export class PluginStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Ensure trays store exists (from existing code)
        if (!db.objectStoreNames.contains('trays')) {
          db.createObjectStore('trays', { keyPath: 'id' });
        }
        
        // Create plugins store if it doesn't exist
        if (!db.objectStoreNames.contains(PLUGIN_STORE_NAME)) {
          const pluginStore = db.createObjectStore(PLUGIN_STORE_NAME, { keyPath: 'id' });
          pluginStore.createIndex('name', 'manifest.name', { unique: false });
          pluginStore.createIndex('enabled', 'enabled', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  async savePlugin(plugin: StoredPlugin): Promise<void> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PLUGIN_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(PLUGIN_STORE_NAME);
      
      const request = store.put({
        ...plugin,
        lastUpdated: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPlugin(pluginId: string): Promise<StoredPlugin | null> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PLUGIN_STORE_NAME, 'readonly');
      const store = transaction.objectStore(PLUGIN_STORE_NAME);
      const request = store.get(pluginId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPlugins(): Promise<StoredPlugin[]> {
    try {
      const db = await this.openDatabase();
      
      // Check if the plugins store exists
      if (!db.objectStoreNames.contains(PLUGIN_STORE_NAME)) {
        console.warn('Plugins store not found, returning empty array');
        return [];
      }
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(PLUGIN_STORE_NAME, 'readonly');
        const store = transaction.objectStore(PLUGIN_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting all plugins:', error);
      return [];
    }
  }

  async getEnabledPlugins(): Promise<StoredPlugin[]> {
    const allPlugins = await this.getAllPlugins();
    return allPlugins.filter(plugin => plugin.enabled);
  }

  async deletePlugin(pluginId: string): Promise<void> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PLUGIN_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(PLUGIN_STORE_NAME);
      const request = store.delete(pluginId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updatePluginStatus(pluginId: string, enabled: boolean): Promise<void> {
    const plugin = await this.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    plugin.enabled = enabled;
    plugin.lastUpdated = Date.now();
    await this.savePlugin(plugin);
  }

  async installPlugin(manifest: PluginManifest, code: string): Promise<StoredPlugin> {
    const storedPlugin: StoredPlugin = {
      id: manifest.id,
      manifest,
      code,
      enabled: false,
      installDate: Date.now(),
      lastUpdated: Date.now()
    };

    await this.savePlugin(storedPlugin);
    return storedPlugin;
  }
}

// Singleton instance
export const pluginStorage = new PluginStorage();