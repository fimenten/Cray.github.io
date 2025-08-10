import store from "./store";
import { 
  setTrayData, 
  updateTrayData, 
  removeTrayData,
  setHierarchy,
  setRootId,
  addChildToParent,
  removeChildFromParent,
  setFocused,
  setEditing,
  setSelected,
  toggleSelected,
  clearSelected,
  selectAllTrays,
  toggleCollapsed,
  setCollapsed,
  setVisible,
  setTraySyncStatus,
  loadAppState,
  resetState,
  selectTrayData,
  selectAllTrays as selectAllTraysFromState,
  selectHierarchy,
  selectRootId,
  selectFocused,
  selectEditing,
  selectSelected,
  selectCollapsed,
  selectVisible,
  selectTraySyncStatus as selectTraySyncStatusFromState,
  selectTrayChildren,
  selectTrayParent,
  selectTrayDescendants,
  selectTrayDepth,
  selectNetworkError,
} from "./state";

import { TrayId, TrayData, ITrayData, IAppState } from "./types";

/**
 * Enhanced state manager that provides higher-level operations
 * and coordinates between different state layers
 */
export class StateManager {
  /**
   * Create a new tray
   */
  createTray(data: Partial<TrayData>): TrayId {
    const trayData: TrayData = {
      id: data.id || crypto.randomUUID(),
      name: data.name || "New Tray",
      parentId: data.parentId || null,
      borderColor: data.borderColor || "#000000",
      created_dt: data.created_dt || new Date(),
      flexDirection: data.flexDirection || "column",
      host_url: data.host_url || null,
      filename: data.filename || null,
      isFolded: data.isFolded || false,
      properties: data.properties || {},
      hooks: data.hooks || [],
      isDone: data.isDone || false,
      showDoneMarker: data.showDoneMarker !== undefined ? data.showDoneMarker : true,
      version: 1,
    };

    store.dispatch(setTrayData({ id: trayData.id, data: trayData }));
    
    if (trayData.parentId) {
      store.dispatch(addChildToParent({ parentId: trayData.parentId, childId: trayData.id }));
    }

    return trayData.id;
  }

  /**
   * Update tray data
   */
  updateTray(id: TrayId, updates: Partial<TrayData>): void {
    store.dispatch(updateTrayData({ id, updates }));
  }

  /**
   * Delete a tray and all its children
   */
  deleteTray(id: TrayId): void {
    const state = store.getState();
    const children = selectTrayChildren(state, id);
    
    // Recursively delete children
    children.forEach(childId => this.deleteTray(childId));
    
    // Remove from parent
    const parentId = selectTrayParent(state, id);
    if (parentId) {
      store.dispatch(removeChildFromParent({ parentId, childId: id }));
    }
    
    // Remove the tray itself
    store.dispatch(removeTrayData(id));
  }

  /**
   * Move a tray to a new parent
   */
  moveTray(trayId: TrayId, newParentId: TrayId | null): void {
    const state = store.getState();
    const currentParentId = selectTrayParent(state, trayId);
    
    // Remove from current parent
    if (currentParentId) {
      store.dispatch(removeChildFromParent({ parentId: currentParentId, childId: trayId }));
    }
    
    // Add to new parent
    if (newParentId) {
      store.dispatch(addChildToParent({ parentId: newParentId, childId: trayId }));
    }
    
    // Update tray's parent reference
    store.dispatch(updateTrayData({ id: trayId, updates: { parentId: newParentId } }));
  }

  /**
   * Set focus to a tray
   */
  focusTray(trayId: TrayId | null): void {
    store.dispatch(setFocused(trayId));
  }

  /**
   * Start editing a tray
   */
  startEditing(trayId: TrayId): void {
    store.dispatch(setEditing(trayId));
  }

  /**
   * Stop editing
   */
  stopEditing(): void {
    store.dispatch(setEditing(null));
  }

  /**
   * Toggle tray selection
   */
  toggleTraySelection(trayId: TrayId): void {
    store.dispatch(toggleSelected(trayId));
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    store.dispatch(clearSelected());
  }

  /**
   * Toggle tray collapsed state
   */
  toggleCollapsed(trayId: TrayId): void {
    store.dispatch(toggleCollapsed(trayId));
  }

  /**
   * Set tray visibility
   */
  setVisible(trayId: TrayId, visible: boolean): void {
    store.dispatch(setVisible([trayId])); // Fixed format
  }

  /**
   * Set sync status for a tray
   */
  setSyncStatus(trayId: TrayId, status: 'syncing' | 'synced' | 'error'): void {
    store.dispatch(setTraySyncStatus({ id: trayId, status }));
  }

  /**
   * Get current state snapshot
   */
  getState() {
    return store.getState();
  }

  /**
   * Load state from serialized data
   */
  loadState(state: any): void {
    store.dispatch(loadAppState(state));
  }

  /**
   * Reset all state
   */
  resetAllState(): void {
    store.dispatch(resetState());
  }

  /**
   * Export current state
   */
  exportState(): any {
    return store.getState();
  }

  /**
   * Initialize with default state
   */
  initialize(): void {
    // Create root tray if needed
    const state = store.getState();
    const rootId = selectRootId(state);
    
    if (!rootId) {
      const newRootId = this.createTray({
        name: "Root",
        parentId: null,
      });
      store.dispatch(setRootId(newRootId));
    }
  }

  /**
   * Get all tray data
   */
  getAllTrays(): Record<TrayId, TrayData> {
    const state = store.getState();
    return state.app.trays;
  }

  /**
   * Get tray by ID
   */
  getTray(id: TrayId): TrayData | null {
    const state = store.getState();
    return selectTrayData(state, id) || null;
  }

  /**
   * Validate state integrity
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const state = store.getState();
      const trays = state.app.trays;
      const hierarchy = state.app.hierarchy;
      
      // Check hierarchy consistency
      for (const [parentId, children] of Object.entries(hierarchy.parentToChildren)) {
        if (!trays[parentId]) {
          errors.push(`Parent tray ${parentId} not found in trays`);
        }
        
        for (const childId of children) {
          if (!trays[childId]) {
            errors.push(`Child tray ${childId} not found in trays`);
          }
          
          if (hierarchy.childToParent[childId] !== parentId) {
            errors.push(`Inconsistent parent-child relationship: ${childId} -> ${parentId}`);
          }
        }
      }
      
    } catch (e: any) {
      errors.push(`State validation error: ${e.message}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    totalTrays: number;
    maxDepth: number;
    selectedCount: number;
    visibleCount: number;
  } {
    const state = store.getState();
    
    return {
      totalTrays: Object.keys(state.app.trays).length,
      maxDepth: 0, // Simplified for now
      selectedCount: state.app.ui.selected.size,
      visibleCount: state.app.ui.visible.size,
    };
  }
}

// Export singleton instance
export const stateManager = new StateManager();