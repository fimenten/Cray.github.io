import { Plugin, StoredPlugin, PluginExecutionResult, HookedTask, PluginContext, PluginPermission } from './pluginTypes';
import { pluginSandbox } from './pluginSandbox';

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private enabledPlugins: Set<string> = new Set();
  private executionTimeouts: Map<string, number> = new Map();
  private readonly DEFAULT_TIMEOUT = 5000; // 5 seconds

  async registerPlugin(storedPlugin: StoredPlugin): Promise<void> {
    try {
      const plugin = await this.loadPluginFromCode(storedPlugin.code, storedPlugin.manifest);
      
      // Validate permissions
      this.validatePermissions(plugin.manifest.permissions || []);
      
      this.plugins.set(storedPlugin.id, plugin);
      if (storedPlugin.enabled) {
        this.enabledPlugins.add(storedPlugin.id);
        if (plugin.initialize) {
          await this.executeWithTimeout(plugin.initialize.bind(plugin), this.DEFAULT_TIMEOUT);
        }
      }
    } catch (error) {
      throw new Error(`Failed to register plugin ${storedPlugin.manifest.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (plugin && plugin.destroy) {
      await this.executeWithTimeout(plugin.destroy.bind(plugin), this.DEFAULT_TIMEOUT);
    }
    this.plugins.delete(pluginId);
    this.enabledPlugins.delete(pluginId);
  }

  enablePlugin(pluginId: string): void {
    if (this.plugins.has(pluginId)) {
      this.enabledPlugins.add(pluginId);
    }
  }

  disablePlugin(pluginId: string): void {
    this.enabledPlugins.delete(pluginId);
  }

  async executeHook(
    hookName: keyof Plugin['hooks'],
    task: HookedTask,
    context: PluginContext
  ): Promise<PluginExecutionResult[]> {
    const results: PluginExecutionResult[] = [];
    
    for (const [pluginId, plugin] of this.plugins) {
      if (!this.enabledPlugins.has(pluginId)) continue;
      
      const hook = plugin.hooks[hookName];
      if (!hook) continue;
      
      const startTime = Date.now();
      try {
        await this.executeWithTimeout(
          () => hook(task, context),
          this.executionTimeouts.get(pluginId) || this.DEFAULT_TIMEOUT
        );
        
        results.push({
          success: true,
          executionTime: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime
        });
        console.error(`Plugin ${plugin.manifest.name} hook ${hookName} failed:`, error);
      }
    }
    
    return results;
  }

  private async loadPluginFromCode(code: string, manifest: any): Promise<Plugin> {
    // Use the sandbox to execute plugin code securely
    return pluginSandbox.executePluginCode(code, manifest, manifest.permissions || []);
  }

  private validatePermissions(permissions: PluginPermission[]): void {
    const validPermissions: PluginPermission[] = ['storage', 'network', 'clipboard', 'notifications'];
    
    for (const permission of permissions) {
      if (!validPermissions.includes(permission)) {
        throw new Error(`Invalid permission: ${permission}`);
      }
    }
  }

  private async executeWithTimeout<T>(
    fn: () => T | Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Plugin execution timeout'));
      }, timeout);
      
      Promise.resolve(fn())
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getEnabledPlugins(): Plugin[] {
    return Array.from(this.plugins.entries())
      .filter(([id]) => this.enabledPlugins.has(id))
      .map(([, plugin]) => plugin);
  }

  setPluginTimeout(pluginId: string, timeout: number): void {
    this.executionTimeouts.set(pluginId, timeout);
  }
}

// Singleton instance
export const pluginManager = new PluginManager();