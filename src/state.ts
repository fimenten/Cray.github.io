import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Tray } from "./tray";
import { TrayId, TrayData, AppState } from "./types";
import { trayManager } from "./trayManager";

// Legacy interface for backward compatibility
interface LegacyAppState {
  lastFocused: string | null;
  menuOpening: boolean;
  autoUpload: boolean;
}

const initialState: AppState = {
  // Data layer
  trays: {},
  hierarchy: {
    rootId: null,
    parentToChildren: {},
    childToParent: {},
  },
  
  // UI state layer
  ui: {
    focused: null,
    selected: new Set(),
    editing: null,
    collapsed: new Set(),
    visible: new Set(),
  },
  
  // App state
  app: {
    hamburgerMenuOpen: false,
    contextMenuOpen: false,
    hookDialogOpen: false,
    autoUploadEnabled: true,
    lastSyncTime: null,
  },
  
  // Network state
  network: {
    autoUpload: {},
    syncStatus: {},
    lastError: null,
  },
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    // Tray data management
    setTrayData(state, action: PayloadAction<{ id: TrayId; data: TrayData }>) {
      state.trays[action.payload.id] = action.payload.data;
    },
    updateTrayData(state, action: PayloadAction<{ id: TrayId; updates: Partial<TrayData> }>) {
      const { id, updates } = action.payload;
      if (state.trays[id]) {
        state.trays[id] = { ...state.trays[id], ...updates };
      }
    },
    removeTrayData(state, action: PayloadAction<TrayId>) {
      delete state.trays[action.payload];
    },
    
    // Hierarchy management
    setHierarchy(state, action: PayloadAction<AppState['hierarchy']>) {
      state.hierarchy = action.payload;
    },
    setRootId(state, action: PayloadAction<TrayId | null>) {
      state.hierarchy.rootId = action.payload;
    },
    addChildToParent(state, action: PayloadAction<{ parentId: TrayId; childId: TrayId }>) {
      const { parentId, childId } = action.payload;
      if (!state.hierarchy.parentToChildren[parentId]) {
        state.hierarchy.parentToChildren[parentId] = [];
      }
      if (!state.hierarchy.parentToChildren[parentId].includes(childId)) {
        state.hierarchy.parentToChildren[parentId].push(childId);
      }
      state.hierarchy.childToParent[childId] = parentId;
    },
    removeChildFromParent(state, action: PayloadAction<{ parentId: TrayId; childId: TrayId }>) {
      const { parentId, childId } = action.payload;
      if (state.hierarchy.parentToChildren[parentId]) {
        state.hierarchy.parentToChildren[parentId] = state.hierarchy.parentToChildren[parentId].filter(id => id !== childId);
      }
      delete state.hierarchy.childToParent[childId];
    },
    
    // UI state management
    setFocused(state, action: PayloadAction<TrayId | null>) {
      state.ui.focused = action.payload;
    },
    toggleSelected(state, action: PayloadAction<TrayId>) {
      const id = action.payload;
      if (state.ui.selected.has(id)) {
        state.ui.selected.delete(id);
      } else {
        state.ui.selected.add(id);
      }
    },
    setSelected(state, action: PayloadAction<TrayId[]>) {
      state.ui.selected = new Set(action.payload);
    },
    clearSelected(state) {
      state.ui.selected.clear();
    },
    setEditing(state, action: PayloadAction<TrayId | null>) {
      state.ui.editing = action.payload;
    },
    toggleCollapsed(state, action: PayloadAction<TrayId>) {
      const id = action.payload;
      if (state.ui.collapsed.has(id)) {
        state.ui.collapsed.delete(id);
      } else {
        state.ui.collapsed.add(id);
      }
    },
    setCollapsed(state, action: PayloadAction<{ id: TrayId; collapsed: boolean }>) {
      const { id, collapsed } = action.payload;
      if (collapsed) {
        state.ui.collapsed.add(id);
      } else {
        state.ui.collapsed.delete(id);
      }
    },
    setVisible(state, action: PayloadAction<TrayId[]>) {
      state.ui.visible = new Set(action.payload);
    },
    
    // App state management
    toggleMenuOpening(state) {
      state.app.hamburgerMenuOpen = !state.app.hamburgerMenuOpen;
    },
    openMenu(state) {
      state.app.hamburgerMenuOpen = true;
    },
    closeMenu(state) {
      state.app.hamburgerMenuOpen = false;
    },
    setContextMenuOpen(state, action: PayloadAction<boolean>) {
      state.app.contextMenuOpen = action.payload;
    },
    setHookDialogOpen(state, action: PayloadAction<boolean>) {
      state.app.hookDialogOpen = action.payload;
    },
    toggleAutoUpload(state) {
      state.app.autoUploadEnabled = !state.app.autoUploadEnabled;
    },
    setLastSyncTime(state, action: PayloadAction<Date | null>) {
      state.app.lastSyncTime = action.payload;
    },
    
    // Network state management
    setTrayAutoUpload(state, action: PayloadAction<{ id: TrayId; autoUpload: boolean }>) {
      const { id, autoUpload } = action.payload;
      state.network.autoUpload[id] = autoUpload;
    },
    setTraySyncStatus(state, action: PayloadAction<{ id: TrayId; status: 'syncing' | 'synced' | 'error' }>) {
      const { id, status } = action.payload;
      state.network.syncStatus[id] = status;
    },
    setNetworkError(state, action: PayloadAction<string | null>) {
      state.network.lastError = action.payload;
    },
    
    // Legacy compatibility reducers
    setLastFocused(state, action: PayloadAction<Tray | TrayId>) {
      const id = typeof action.payload === 'string' ? action.payload : action.payload.id;
      if (id) {
        state.ui.focused = id;
      }
    },
    
    // Bulk operations
    loadAppState(state, action: PayloadAction<Partial<AppState>>) {
      const newState = action.payload;
      if (newState.trays) state.trays = newState.trays;
      if (newState.hierarchy) state.hierarchy = newState.hierarchy;
      if (newState.ui) {
        state.ui = {
          ...state.ui,
          ...newState.ui,
          selected: new Set(Array.from(newState.ui.selected || [])),
          collapsed: new Set(Array.from(newState.ui.collapsed || [])),
          visible: new Set(Array.from(newState.ui.visible || [])),
        };
      }
      if (newState.app) state.app = { ...state.app, ...newState.app };
      if (newState.network) state.network = { ...state.network, ...newState.network };
    },
    
    resetState(state) {
      return initialState;
    },
  },
});

export const {
  // Tray data
  setTrayData,
  updateTrayData,
  removeTrayData,
  
  // Hierarchy
  setHierarchy,
  setRootId,
  addChildToParent,
  removeChildFromParent,
  
  // UI state
  setFocused,
  toggleSelected,
  setSelected,
  clearSelected,
  setEditing,
  toggleCollapsed,
  setCollapsed,
  setVisible,
  
  // App state
  toggleMenuOpening,
  openMenu,
  closeMenu,
  setContextMenuOpen,
  setHookDialogOpen,
  toggleAutoUpload,
  setLastSyncTime,
  
  // Network state
  setTrayAutoUpload,
  setTraySyncStatus,
  setNetworkError,
  
  // Legacy compatibility
  setLastFocused,
  
  // Bulk operations
  loadAppState,
  resetState,
} = appSlice.actions;

// Selectors
export const selectTrayData = (state: { app: AppState }, trayId: TrayId) => state.app.trays[trayId];
export const selectAllTrays = (state: { app: AppState }) => state.app.trays;
export const selectHierarchy = (state: { app: AppState }) => state.app.hierarchy;
export const selectRootId = (state: { app: AppState }) => state.app.hierarchy.rootId;
export const selectFocused = (state: { app: AppState }) => state.app.ui.focused;
export const selectSelected = (state: { app: AppState }) => state.app.ui.selected;
export const selectEditing = (state: { app: AppState }) => state.app.ui.editing;
export const selectCollapsed = (state: { app: AppState }) => state.app.ui.collapsed;
export const selectVisible = (state: { app: AppState }) => state.app.ui.visible;
export const selectMenuOpen = (state: { app: AppState }) => state.app.app.hamburgerMenuOpen;
export const selectAutoUploadEnabled = (state: { app: AppState }) => state.app.app.autoUploadEnabled;
export const selectTrayAutoUpload = (state: { app: AppState }, trayId: TrayId) => state.app.network.autoUpload[trayId];
export const selectTraySyncStatus = (state: { app: AppState }, trayId: TrayId) => state.app.network.syncStatus[trayId];
export const selectNetworkError = (state: { app: AppState }) => state.app.network.lastError;

// Complex selectors
export const selectTrayChildren = (state: { app: AppState }, trayId: TrayId) => 
  state.app.hierarchy.parentToChildren[trayId] || [];

export const selectTrayParent = (state: { app: AppState }, trayId: TrayId) => 
  state.app.hierarchy.childToParent[trayId] || null;

export const selectTrayDepth = (state: { app: AppState }, trayId: TrayId): number => {
  let depth = 0;
  let currentId = trayId;
  
  while (currentId) {
    const parent = selectTrayParent(state, currentId);
    if (parent) {
      depth++;
      currentId = parent;
    } else {
      break;
    }
  }
  
  return depth;
};

export const selectTrayDescendants = (state: { app: AppState }, trayId: TrayId): TrayId[] => {
  const descendants: TrayId[] = [];
  const queue = [...(selectTrayChildren(state, trayId))];
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    descendants.push(currentId);
    queue.push(...selectTrayChildren(state, currentId));
  }
  
  return descendants;
};

export default appSlice.reducer;
