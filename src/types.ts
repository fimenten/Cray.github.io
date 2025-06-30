// Core type definitions for Cray application

export type TrayId = string;

// Main Tray data interface
export interface ITrayData {
  id: TrayId;
  name: string;
  parentId: TrayId | null;
  children: ITrayData[];
  borderColor: string;
  created_dt: Date | string;
  flexDirection: "column" | "row";
  host_url: string | null;
  filename: string | null;
  isFolded: boolean;
  properties: Record<string, unknown>;
  hooks: string[];
  isDone: boolean;
}

// Serialization format (for export/import)
export interface ISerializedTrayData {
  id: TrayId;
  name: string;
  parentId: TrayId | null;
  children: ISerializedTrayData[];
  borderColor: string;
  created_dt: string; // Always string in serialized format
  flexDirection: "column" | "row";
  host_url: string | null;
  filename: string | null;
  isFolded: boolean;
  properties: Record<string, unknown>;
  hooks: string[];
  isDone: boolean;
}

// JSONL format (alternative serialization)
export interface IJSONLTrayData {
  id: TrayId;
  name: string;
  childrenIds: TrayId[];
  parentId: TrayId | null;
  borderColor: string;
  created_dt: Date;
  flexDirection: "column" | "row";
  host_url: string | null;
  filename: string | null;
  isFolded: boolean;
  properties: Record<string, unknown>;
  hooks: string[];
  isDone: boolean;
}

// UI State interfaces
export interface ITrayUIState {
  id: TrayId;
  isEditing: boolean;
  isSelected: boolean;
  isFocused: boolean;
  isExpanded: boolean;
  showDoneMarker: boolean;
  autoUpload: boolean;
  lastInteractionTime: Date;
}

// Plugin system interfaces
export interface IHookedTask {
  id: TrayId;
  name: string;
  hooks: string[];
  isDone: boolean;
  parentId: TrayId | null;
}

export interface IPluginContext {
  getTrayById(id: TrayId): ITrayData | null;
  getAllHookedTasks(): IHookedTask[];
  createTray(parentId: TrayId, name: string): TrayId;
  updateTray(id: TrayId, updates: Partial<ITrayData>): boolean;
  deleteTray(id: TrayId): boolean;
}

// State management interfaces
export interface IAppState {
  lastFocused: TrayId | null;
  hamburgerMenuOpen: boolean;
  contextMenuOpen: boolean;
  hookDialogOpen: boolean;
  autoUploadEnabled: boolean;
}

// Network/IO interfaces
export interface INetworkOptions {
  serverUrl: string;
  username: string;
  password: string;
  autoSync: boolean;
}

export interface IUploadResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

export interface IDownloadResponse {
  success: boolean;
  data: ISerializedTrayData | null;
  message: string;
  timestamp: string;
}

// Event system interfaces
export interface ITrayEvent {
  type: string;
  trayId: TrayId;
  data?: unknown;
  timestamp: Date;
}

export interface IKeyboardEvent extends ITrayEvent {
  type: 'keyboard';
  key: string;
  modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  };
}

export interface ITrayChangeEvent extends ITrayEvent {
  type: 'tray-change';
  changeType: 'create' | 'update' | 'delete' | 'move';
  oldData?: Partial<ITrayData>;
  newData?: Partial<ITrayData>;
}

// Error types
export interface IAppError {
  code: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

export interface ITrayError extends IAppError {
  trayId?: TrayId;
  operation?: string;
}

export interface IIOError extends IAppError {
  operation: 'save' | 'load' | 'export' | 'import';
  dataType?: 'indexeddb' | 'localstorage' | 'file' | 'network';
}

export interface INetworkError extends IAppError {
  url?: string;
  statusCode?: number;
  operation?: 'upload' | 'download' | 'sync';
}

// Configuration interfaces
export interface IAppConfig {
  maxTrayDepth: number;
  autoSaveInterval: number;
  defaultTrayColor: string;
  enablePlugins: boolean;
  debugMode: boolean;
}

// Menu system interfaces
export interface IMenuItem {
  id: string;
  label: string;
  action: string;
  enabled: boolean;
  visible: boolean;
  shortcut?: string;
}

export interface IContextMenuOptions {
  x: number;
  y: number;
  items: IMenuItem[];
  targetTrayId?: TrayId;
}

// Search interfaces
export interface ISearchOptions {
  query: string;
  includeContent: boolean;
  includeHooks: boolean;
  includeProperties: boolean;
  caseSensitive: boolean;
}

export interface ISearchResult {
  trayId: TrayId;
  name: string;
  matches: {
    field: 'name' | 'hooks' | 'properties';
    value: string;
    positions: number[];
  }[];
  score: number;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type TrayEventHandler<T extends ITrayEvent = ITrayEvent> = (event: T) => void;

export type ValidationResult<T> = {
  isValid: boolean;
  errors: string[];
  data?: T;
};

// Legacy compatibility types (to be removed in later phases)
export type LegacyTrayData = {
  id: string;
  name: string;
  children?: LegacyTrayData[];
  [key: string]: unknown;
};

// Constants
export const TRAY_EVENTS = {
  CREATE: 'tray-create',
  UPDATE: 'tray-update',
  DELETE: 'tray-delete',
  MOVE: 'tray-move',
  FOCUS: 'tray-focus',
  EDIT_START: 'tray-edit-start',
  EDIT_END: 'tray-edit-end',
  FOLD: 'tray-fold',
  UNFOLD: 'tray-unfold',
} as const;

export const ERROR_CODES = {
  TRAY_NOT_FOUND: 'TRAY_NOT_FOUND',
  INVALID_TRAY_DATA: 'INVALID_TRAY_DATA',
  CIRCULAR_REFERENCE: 'CIRCULAR_REFERENCE',
  SAVE_FAILED: 'SAVE_FAILED',
  LOAD_FAILED: 'LOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PLUGIN_ERROR: 'PLUGIN_ERROR',
} as const;

export type TrayEventType = typeof TRAY_EVENTS[keyof typeof TRAY_EVENTS];
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];