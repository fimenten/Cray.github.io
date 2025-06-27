import { Plugin, PluginPermission, HookedTask, PluginContext } from './pluginTypes';

interface SandboxAPI {
  console: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
  };
  storage?: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    remove: (key: string) => Promise<void>;
  };
  network?: {
    fetch: (url: string, options?: RequestInit) => Promise<Response>;
  };
  clipboard?: {
    writeText: (text: string) => Promise<void>;
    readText: () => Promise<string>;
  };
  notifications?: {
    show: (title: string, options?: NotificationOptions) => Promise<void>;
  };
}

export class PluginSandbox {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingMessages: Map<number, { resolve: Function; reject: Function }> = new Map();

  async executePluginCode(
    code: string,
    manifest: any,
    permissions: PluginPermission[] = []
  ): Promise<Plugin> {
    // For now, use a simpler sandbox approach with restricted scope
    // In production, this should use Web Workers or iframes
    const sandboxedCode = this.createSandboxedCode(code, permissions);
    const sandboxedFunction = new Function('api', 'manifest', sandboxedCode);
    
    const api = this.createSandboxAPI(permissions);
    return sandboxedFunction(api, manifest);
  }

  private createSandboxedCode(code: string, permissions: PluginPermission[]): string {
    return `
      'use strict';
      
      // Remove access to global objects
      const window = undefined;
      const document = undefined;
      const global = undefined;
      const globalThis = undefined;
      
      // Create plugin with restricted scope
      const plugin = (function() {
        return ${code};
      })();
      
      // Validate and return plugin
      if (!plugin || typeof plugin !== 'object') {
        throw new Error('Plugin must export an object');
      }
      
      if (!plugin.hooks || typeof plugin.hooks !== 'object') {
        throw new Error('Plugin must have a hooks object');
      }
      
      // Wrap hooks to ensure they're safe
      const safeHooks = {};
      for (const [hookName, hookFn] of Object.entries(plugin.hooks)) {
        if (typeof hookFn === 'function') {
          safeHooks[hookName] = async function(task, context) {
            // Ensure task and context are read-only
            const safeTask = Object.freeze({...task});
            const safeContext = Object.freeze({...context});
            
            return await hookFn.call(plugin, safeTask, safeContext);
          };
        }
      }
      
      return {
        manifest: manifest,
        hooks: safeHooks,
        initialize: plugin.initialize ? plugin.initialize.bind(plugin) : undefined,
        destroy: plugin.destroy ? plugin.destroy.bind(plugin) : undefined
      };
    `;
  }

  private createSandboxAPI(permissions: PluginPermission[]): SandboxAPI {
    const api: SandboxAPI = {
      console: {
        log: (...args) => console.log('[Plugin]', ...args),
        error: (...args) => console.error('[Plugin]', ...args),
        warn: (...args) => console.warn('[Plugin]', ...args)
      }
    };

    if (permissions.includes('storage')) {
      api.storage = {
        get: async (key: string) => {
          // Implement plugin-specific storage
          const storage = localStorage.getItem(`plugin_storage_${key}`);
          return storage ? JSON.parse(storage) : null;
        },
        set: async (key: string, value: any) => {
          localStorage.setItem(`plugin_storage_${key}`, JSON.stringify(value));
        },
        remove: async (key: string) => {
          localStorage.removeItem(`plugin_storage_${key}`);
        }
      };
    }

    if (permissions.includes('network')) {
      api.network = {
        fetch: async (url: string, options?: RequestInit) => {
          // Add CORS proxy or restrictions as needed
          return fetch(url, options);
        }
      };
    }

    if (permissions.includes('clipboard')) {
      api.clipboard = {
        writeText: async (text: string) => {
          return navigator.clipboard.writeText(text);
        },
        readText: async () => {
          return navigator.clipboard.readText();
        }
      };
    }

    if (permissions.includes('notifications')) {
      api.notifications = {
        show: async (title: string, options?: NotificationOptions) => {
          if (Notification.permission === 'granted') {
            new Notification(title, options);
          } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              new Notification(title, options);
            }
          }
        }
      };
    }

    return api;
  }

  // Future: Web Worker implementation for better isolation
  async initializeWorkerSandbox(): Promise<void> {
    const workerCode = `
      self.onmessage = function(e) {
        const { id, type, payload } = e.data;
        
        try {
          switch (type) {
            case 'execute':
              // Execute plugin code in worker context
              const result = executePlugin(payload);
              self.postMessage({ id, success: true, result });
              break;
            default:
              throw new Error('Unknown message type: ' + type);
          }
        } catch (error) {
          self.postMessage({ id, success: false, error: error.message });
        }
      };
      
      function executePlugin(payload) {
        // Implementation here
        return { success: true };
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    this.worker = new Worker(workerUrl);
    
    this.worker.onmessage = (e) => {
      const { id, success, result, error } = e.data;
      const pending = this.pendingMessages.get(id);
      
      if (pending) {
        if (success) {
          pending.resolve(result);
        } else {
          pending.reject(new Error(error));
        }
        this.pendingMessages.delete(id);
      }
    };
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingMessages.clear();
  }
}

export const pluginSandbox = new PluginSandbox();