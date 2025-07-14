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
  toggleSelected,
  setSelected,
  clearSelected,
  setEditing,
  toggleCollapsed,
  setCollapsed,
  setVisible,
  setTrayAutoUpload,
  setTraySyncStatus,
  loadAppState,
  resetState,
  selectTrayData,
  selectAllTrays,
  selectHierarchy,
  selectRootId,
  selectFocused,
  selectSelected,
  selectTrayChildren,
  selectTrayParent
} from "./state";
import { TrayData, TrayId, AppState } from "./types";
import { trayManager } from "./trayManager";

/**
 * StateManager - Central coordinator between Redux state and TrayManager
 * Provides high-level state management operations with automatic synchronization
 */
export class StateManager {
  private static instance: StateManager;

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Create a new tray and update both Redux state and TrayManager
   */
  createTray(
    name: string, 
    parentId: TrayId | null = null,
    options: Partial<TrayData> = {}
  ): TrayId {
    // Create in TrayManager
    const id = trayManager.createTray(name, parentId, options);
    
    // Update Redux state
    const trayData = trayManager.getTrayData(id)!;
    store.dispatch(setTrayData({ id, data: trayData }));
    
    // Update hierarchy
    if (parentId) {
      store.dispatch(addChildToParent({ parentId, childId: id }));
    } else {
      // Set as root if no root exists
      const currentRoot = this.getRootId();
      if (!currentRoot) {
        store.dispatch(setRootId(id));
        trayManager.setRootId(id);
      }
    }
    
    return id;
  }

  /**
   * Update tray data with synchronization
   */
  updateTray(id: TrayId, updates: Partial<TrayData>): boolean {
    // Update TrayManager
    const success = trayManager.updateTrayData(id, updates);
    if (!success) return false;
    
    // Update Redux state
    store.dispatch(updateTrayData({ id, updates }));
    
    // Handle parent changes
    if ('parentId' in updates) {
      const oldParent = this.getTrayParent(id);
      const newParent = updates.parentId;
      
      // Remove from old parent
      if (oldParent) {
        store.dispatch(removeChildFromParent({ parentId: oldParent, childId: id }));
      }
      
      // Add to new parent
      if (newParent) {
        store.dispatch(addChildToParent({ parentId: newParent, childId: id }));
      }
    }
    
    return true;
  }

  /**
   * Delete tray and all descendants
   */
  deleteTray(id: TrayId): TrayId[] {
    // Get all IDs that will be removed
    const removedIds = trayManager.deleteTray(id);
    
    // Remove from Redux state
    for (const removedId of removedIds) {
      store.dispatch(removeTrayData(removedId));
      
      // Remove from parent's children list
      const parent = this.getTrayParent(removedId);
      if (parent) {
        store.dispatch(removeChildFromParent({ parentId: parent, childId: removedId }));
      }
    }
    
    // Update root if necessary
    if (this.getRootId() === id) {
      const newRoot = trayManager.getRootId();
      store.dispatch(setRootId(newRoot));
    }
    
    return removedIds;
  }

  /**
   * Move tray to new parent
   */
  moveTray(trayId: TrayId, newParentId: TrayId | null): boolean {
    const oldParent = this.getTrayParent(trayId);
    
    // Update TrayManager
    const success = trayManager.moveTray(trayId, newParentId);
    if (!success) return false;
    
    // Update Redux state
    this.updateTray(trayId, { parentId: newParentId });
    
    return true;
  }

  /**
   * Set focus to a tray
   */
  setFocus(trayId: TrayId | null): void {
    store.dispatch(setFocused(trayId));
    
    if (trayId) {
      // Update UI state in TrayManager
      trayManager.updateTrayUIState(trayId, { isFocused: true });
    }
    
    // Clear focus from other trays
    const currentFocus = this.getFocused();
    if (currentFocus && currentFocus !== trayId) {
      trayManager.updateTrayUIState(currentFocus, { isFocused: false });
    }
  }

  /**
   * Toggle tray selection
   */
  toggleSelection(trayId: TrayId): void {
    store.dispatch(toggleSelected(trayId));
    
    // Sync with TrayManager
    const isSelected = this.isSelected(trayId);
    trayManager.updateTrayUIState(trayId, { isSelected });
  }

  /**
   * Set multiple trays as selected
   */
  setSelection(trayIds: TrayId[]): void {
    // Clear current selection in TrayManager
    const currentSelection = this.getSelected();
    for (const id of currentSelection) {
      trayManager.updateTrayUIState(id, { isSelected: false });
    }
    
    // Set new selection
    store.dispatch(setSelected(trayIds));
    
    // Update TrayManager
    for (const id of trayIds) {
      trayManager.updateTrayUIState(id, { isSelected: true });
    }
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    const currentSelection = this.getSelected();
    
    store.dispatch(clearSelected());
    
    // Update TrayManager
    for (const id of currentSelection) {
      trayManager.updateTrayUIState(id, { isSelected: false });
    }
  }

  /**
   * Set editing state
   */
  setEditing(trayId: TrayId | null): void {
    const currentEditing = this.getEditing();
    
    store.dispatch(setEditing(trayId));
    
    // Update TrayManager
    if (currentEditing) {
      trayManager.updateTrayUIState(currentEditing, { isEditing: false });
    }
    
    if (trayId) {
      trayManager.updateTrayUIState(trayId, { isEditing: true });
    }
  }

  /**
   * Toggle collapsed state
   */
  toggleCollapsed(trayId: TrayId): void {
    const isCollapsed = this.isCollapsed(trayId);
    const newCollapsedState = !isCollapsed;
    
    store.dispatch(setCollapsed({ id: trayId, collapsed: newCollapsedState }));
    
    // Update tray data
    this.updateTray(trayId, { isFolded: newCollapsedState });
  }

  /**
   * Set auto upload for a tray
   */
  setAutoUpload(trayId: TrayId, autoUpload: boolean): void {
    store.dispatch(setTrayAutoUpload({ id: trayId, autoUpload }));
    
    // Update TrayManager
    trayManager.updateTrayUIState(trayId, { autoUpload });
  }

  /**
   * Set sync status for a tray
   */
  setSyncStatus(trayId: TrayId, status: 'syncing' | 'synced' | 'error'): void {
    store.dispatch(setTraySyncStatus({ id: trayId, status }));
  }

  /**
   * Load complete state from external source
   */
  loadState(newState: Partial<AppState>): void {
    // Load into Redux
    store.dispatch(loadAppState(newState));
    
    // Sync with TrayManager
    trayManager.loadFromState(newState);
  }

  /**
   * Reset all state
   */
  resetState(): void {
    store.dispatch(resetState());
    trayManager.clear();
  }

  /**
   * Export current state
   */
  exportState(): AppState {
    return store.getState().app;
  }

  /**
   * Sync TrayManager state to Redux
   */
  syncFromTrayManager(): void {
    const managerState = trayManager.exportToState();
    this.loadState(managerState);
  }

  /**
   * Sync Redux state to TrayManager
   */
  syncToTrayManager(): void {
    const reduxState = this.exportState();
    trayManager.loadFromState(reduxState);
  }

  // Getter methods for common state access
  getTrayData(id: TrayId): TrayData | null {
    return selectTrayData(store.getState(), id) || null;
  }

  getAllTrays(): Record<TrayId, TrayData> {
    return selectAllTrays(store.getState());
  }

  getHierarchy(): AppState['hierarchy'] {
    return selectHierarchy(store.getState());
  }

  getRootId(): TrayId | null {
    return selectRootId(store.getState());
  }

  getFocused(): TrayId | null {
    return selectFocused(store.getState());
  }

  getSelected(): TrayId[] {
    return Array.from(selectSelected(store.getState()));
  }

  isSelected(trayId: TrayId): boolean {
    return selectSelected(store.getState()).has(trayId);
  }

  getEditing(): TrayId | null {
    return selectSelected(store.getState()) as unknown as TrayId | null; // Type assertion needed due to selector complexity
  }

  getTrayChildren(trayId: TrayId): TrayId[] {
    return selectTrayChildren(store.getState(), trayId);
  }

  getTrayParent(trayId: TrayId): TrayId | null {
    return selectTrayParent(store.getState(), trayId);
  }

  isCollapsed(trayId: TrayId): boolean {
    const trayData = this.getTrayData(trayId);
    return trayData?.isFolded || false;
  }

  /**
   * Get flat list of all tray IDs in tree order
   */
  getFlatTrayList(): TrayId[] {
    const rootId = this.getRootId();
    if (!rootId) return [];

    const result: TrayId[] = [];
    const traverse = (trayId: TrayId) => {
      result.push(trayId);
      const children = this.getTrayChildren(trayId);
      for (const childId of children) {
        traverse(childId);
      }
    };

    traverse(rootId);
    return result;
  }

  /**
   * Validate state consistency between Redux and TrayManager
   */
  validateConsistency(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate TrayManager
    const managerValidation = trayManager.validate();
    if (!managerValidation.isValid) {
      errors.push(...managerValidation.errors.map(e => `TrayManager: ${e}`));
    }

    // Compare Redux and TrayManager states
    const reduxTrays = this.getAllTrays();
    const managerTrays = trayManager.getAllTrayData();

    // Check for mismatched trays
    const reduxIds = new Set(Object.keys(reduxTrays));
    const managerIds = new Set(Object.keys(managerTrays));

    for (const id of reduxIds) {
      if (!managerIds.has(id)) {
        errors.push(`Redux has tray ${id} but TrayManager doesn't`);
      }
    }

    for (const id of managerIds) {
      if (!reduxIds.has(id)) {
        errors.push(`TrayManager has tray ${id} but Redux doesn't`);
      }
    }

    // Check for data consistency
    for (const id of reduxIds) {
      if (managerIds.has(id)) {
        const reduxData = reduxTrays[id];
        const managerData = managerTrays[id];
        
        // Compare key fields
        if (reduxData.name !== managerData.name) {
          errors.push(`Name mismatch for tray ${id}: Redux='${reduxData.name}', Manager='${managerData.name}'`);
        }
        
        if (reduxData.parentId !== managerData.parentId) {
          errors.push(`Parent mismatch for tray ${id}: Redux='${reduxData.parentId}', Manager='${managerData.parentId}'`);
        }
      }
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
    reduxTrays: number;
    managerTrays: number;
    selectedCount: number;
    focusedTray: TrayId | null;
    maxDepth: number;
  } {
    const reduxTrays = Object.keys(this.getAllTrays()).length;
    const managerMetrics = trayManager.getMetrics();
    const selected = this.getSelected();
    const focused = this.getFocused();
    
    // Calculate max depth
    let maxDepth = 0;
    const allIds = Object.keys(this.getAllTrays());
    for (const id of allIds) {
      let depth = 0;
      let currentId: TrayId | null = id;
      while (currentId) {
        const parent = this.getTrayParent(currentId);
        if (parent) {
          depth++;
          currentId = parent;
        } else {
          break;
        }
      }
      maxDepth = Math.max(maxDepth, depth);
    }

    return {
      reduxTrays,
      managerTrays: managerMetrics.totalTrays,
      selectedCount: selected.length,
      focusedTray: focused,
      maxDepth
    };
  }
}

// Export singleton instance
export const stateManager = StateManager.getInstance();