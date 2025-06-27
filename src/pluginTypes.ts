export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  permissions?: PluginPermission[];
}

export type PluginPermission = 
  | 'storage'
  | 'network'
  | 'clipboard'
  | 'notifications';

export interface PluginContext {
  trayId: string;
  trayName: string;
  sessionId: string;
  parentTrayId?: string;
}

export interface HookedTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface PluginHooks {
  onTaskHooked?: (task: HookedTask, context: PluginContext) => void | Promise<void>;
  onTaskUnhooked?: (task: HookedTask, context: PluginContext) => void | Promise<void>;
  onTaskCompleted?: (task: HookedTask, context: PluginContext) => void | Promise<void>;
  onTaskUpdated?: (task: HookedTask, context: PluginContext) => void | Promise<void>;
}

export interface Plugin {
  manifest: PluginManifest;
  hooks: PluginHooks;
  initialize?: () => void | Promise<void>;
  destroy?: () => void | Promise<void>;
}

export interface PluginExecutionResult {
  success: boolean;
  error?: string;
  executionTime?: number;
}

export interface StoredPlugin {
  id: string;
  manifest: PluginManifest;
  code: string;
  enabled: boolean;
  installDate: number;
  lastUpdated: number;
}