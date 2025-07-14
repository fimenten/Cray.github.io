import { TrayData, TrayUIState, TrayId, AppState } from "./types";
import { TrayComponent } from "./trayComponent";
import { TrayGraph } from "./trayGraph";
import { migrationService, convertTrayToData } from "./migration";
import { Tray } from "./tray";
import { generateUUID } from "./utils";

/**
 * TrayManager - Central coordinator for tray data and relationships
 * Manages the transition between old Tray class and new TrayData/TrayComponent architecture
 */
export class TrayManager {
  private static instance: TrayManager;
  private graph: TrayGraph;
  private dataStore: Map<TrayId, TrayData>;
  private componentStore: Map<TrayId, TrayComponent>;
  private uiStateStore: Map<TrayId, TrayUIState>;
  
  private constructor() {
    this.graph = new TrayGraph();
    this.dataStore = new Map();
    this.componentStore = new Map();
    this.uiStateStore = new Map();
  }

  static getInstance(): TrayManager {
    if (!TrayManager.instance) {
      TrayManager.instance = new TrayManager();
    }
    return TrayManager.instance;
  }

  /**
   * Create a new tray with modern architecture
   */
  createTray(
    name: string, 
    parentId: TrayId | null = null,
    options: Partial<TrayData> = {}
  ): TrayId {
    const id = generateUUID();
    
    const trayData: TrayData = {
      id,
      name,
      parentId,
      borderColor: options.borderColor || "#ffffff",
      created_dt: new Date(),
      flexDirection: options.flexDirection || "column",
      host_url: options.host_url || null,
      filename: options.filename || null,
      isFolded: options.isFolded !== undefined ? options.isFolded : true,
      properties: options.properties || {},
      hooks: options.hooks || [],
      isDone: options.isDone || false,
      showDoneMarker: options.showDoneMarker || false,
      version: 1
    };

    // Store data
    this.dataStore.set(id, trayData);
    
    // Add to graph
    this.graph.addTray(id, parentId);
    
    // Create UI state
    const uiState: TrayUIState = {
      id,
      isEditing: false,
      isSelected: false,
      isFocused: false,
      isExpanded: !trayData.isFolded,
      autoUpload: false,
      lastInteractionTime: new Date()
    };
    this.uiStateStore.set(id, uiState);

    return id;
  }

  /**
   * Get tray data by ID
   */
  getTrayData(id: TrayId): TrayData | null {
    return this.dataStore.get(id) || null;
  }

  /**
   * Update tray data
   */
  updateTrayData(id: TrayId, updates: Partial<TrayData>): boolean {
    const existing = this.dataStore.get(id);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    this.dataStore.set(id, updated);

    // Update component if it exists
    const component = this.componentStore.get(id);
    if (component) {
      component.updateData(updates);
    }

    return true;
  }

  /**
   * Get tray component (creates if not exists)
   */
  getTrayComponent(id: TrayId): TrayComponent | null {
    const data = this.dataStore.get(id);
    if (!data) return null;

    let component = this.componentStore.get(id);
    if (!component) {
      const uiState = this.uiStateStore.get(id);
      component = new TrayComponent(data, uiState);
      this.componentStore.set(id, component);
    }

    return component;
  }

  /**
   * Get tray UI state
   */
  getTrayUIState(id: TrayId): TrayUIState | null {
    return this.uiStateStore.get(id) || null;
  }

  /**
   * Update tray UI state
   */
  updateTrayUIState(id: TrayId, updates: Partial<TrayUIState>): boolean {
    const existing = this.uiStateStore.get(id);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    this.uiStateStore.set(id, updated);

    // Update component if it exists
    const component = this.componentStore.get(id);
    if (component) {
      component.updateUIState(updates);
    }

    return true;
  }

  /**
   * Delete a tray and all its descendants
   */
  deleteTray(id: TrayId): TrayId[] {
    const removedIds = this.graph.removeTray(id);
    
    for (const removedId of removedIds) {
      // Clean up data
      this.dataStore.delete(removedId);
      this.uiStateStore.delete(removedId);
      
      // Clean up component
      const component = this.componentStore.get(removedId);
      if (component) {
        component.dispose();
        this.componentStore.delete(removedId);
      }
    }

    return removedIds;
  }

  /**
   * Move a tray to a new parent
   */
  moveTray(trayId: TrayId, newParentId: TrayId | null): boolean {
    // Update graph
    const success = this.graph.moveTray(trayId, newParentId);
    if (!success) return false;

    // Update data
    this.updateTrayData(trayId, { parentId: newParentId });

    return true;
  }

  /**
   * Get children of a tray
   */
  getChildren(trayId: TrayId): TrayId[] {
    return this.graph.getChildren(trayId);
  }

  /**
   * Get parent of a tray
   */
  getParent(trayId: TrayId): TrayId | null {
    return this.graph.getParent(trayId);
  }

  /**
   * Get all descendants of a tray
   */
  getDescendants(trayId: TrayId): TrayId[] {
    return this.graph.getDescendants(trayId);
  }

  /**
   * Get root tray ID
   */
  getRootId(): TrayId | null {
    return this.graph.getRootId();
  }

  /**
   * Set root tray ID
   */
  setRootId(trayId: TrayId | null): void {
    this.graph.setRootId(trayId);
  }

  /**
   * Get all tray IDs
   */
  getAllTrayIds(): TrayId[] {
    return this.graph.getAllTrayIds();
  }

  /**
   * Import legacy Tray class instance
   */
  async importLegacyTray(legacyTray: Tray): Promise<TrayId> {
    // Convert to modern format
    const trayData = convertTrayToData(legacyTray);
    
    // Store data
    this.dataStore.set(trayData.id, trayData);
    
    // Add to graph
    this.graph.addTray(trayData.id, trayData.parentId);
    
    // Create UI state from legacy tray
    const uiState: TrayUIState = {
      id: trayData.id,
      isEditing: legacyTray.isEditing,
      isSelected: legacyTray.isSelected,
      isFocused: false,
      isExpanded: !trayData.isFolded,
      autoUpload: legacyTray.autoUpload,
      lastInteractionTime: new Date()
    };
    this.uiStateStore.set(trayData.id, uiState);

    return trayData.id;
  }

  /**
   * Import legacy hierarchical data
   */
  async importLegacyHierarchy(legacyRoot: any): Promise<TrayId | null> {
    try {
      const migrationResult = await migrationService.migrateHierarchical(legacyRoot);
      const { root, allTrays } = migrationResult;

      // Clear existing data
      this.clear();

      // Import all trays
      for (const [id, trayData] of Object.entries(allTrays)) {
        this.dataStore.set(id, trayData);
        this.graph.addTray(id, trayData.parentId);
        
        // Create default UI state
        const uiState: TrayUIState = {
          id,
          isEditing: false,
          isSelected: false,
          isFocused: false,
          isExpanded: !trayData.isFolded,
          autoUpload: false,
          lastInteractionTime: new Date()
        };
        this.uiStateStore.set(id, uiState);
      }

      // Set root
      this.setRootId(root.id);

      return root.id;
    } catch (error) {
      console.error('Failed to import legacy hierarchy:', error);
      return null;
    }
  }

  /**
   * Export current state as legacy format for compatibility
   */
  exportAsLegacyFormat(): any {
    const rootId = this.getRootId();
    if (!rootId) return null;

    const buildLegacyTree = (trayId: TrayId): any => {
      const data = this.getTrayData(trayId);
      if (!data) return null;

      const legacy = migrationService.convertToLegacyFormat(data);
      const children = this.getChildren(trayId);
      
      if (children.length > 0) {
        legacy.children = children.map(childId => buildLegacyTree(childId)).filter(Boolean);
      }

      return legacy;
    };

    return buildLegacyTree(rootId);
  }

  /**
   * Get flat representation for storage
   */
  getAllTrayData(): Record<TrayId, TrayData> {
    const result: Record<TrayId, TrayData> = {};
    for (const [id, data] of this.dataStore) {
      result[id] = { ...data };
    }
    return result;
  }

  /**
   * Get hierarchy representation
   */
  getHierarchy(): {
    rootId: TrayId | null;
    parentToChildren: Record<TrayId, TrayId[]>;
    childToParent: Record<TrayId, TrayId>;
  } {
    return this.graph.toHierarchy();
  }

  /**
   * Load from app state
   */
  loadFromState(state: Partial<AppState>): void {
    if (!state.trays || !state.hierarchy) return;

    // Clear current state
    this.clear();

    // Load data
    for (const [id, data] of Object.entries(state.trays)) {
      this.dataStore.set(id, data);
    }

    // Rebuild graph
    this.graph = TrayGraph.fromHierarchy(state.hierarchy);

    // Create default UI states
    for (const id of this.getAllTrayIds()) {
      const data = this.getTrayData(id);
      if (data) {
        const uiState: TrayUIState = {
          id,
          isEditing: false,
          isSelected: false,
          isFocused: false,
          isExpanded: !data.isFolded,
          autoUpload: false,
          lastInteractionTime: new Date()
        };
        this.uiStateStore.set(id, uiState);
      }
    }
  }

  /**
   * Export to app state format
   */
  exportToState(): Partial<AppState> {
    return {
      trays: this.getAllTrayData(),
      hierarchy: this.getHierarchy()
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    // Dispose all components
    for (const component of this.componentStore.values()) {
      component.dispose();
    }

    this.dataStore.clear();
    this.componentStore.clear();
    this.uiStateStore.clear();
    this.graph = new TrayGraph();
  }

  /**
   * Validate data integrity
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate graph
    const graphValidation = this.graph.validate();
    if (!graphValidation.isValid) {
      errors.push(...graphValidation.errors);
    }

    // Validate data consistency
    const graphIds = new Set(this.graph.getAllTrayIds());
    const dataIds = new Set(this.dataStore.keys());

    // Check for data without graph entries
    for (const id of dataIds) {
      if (!graphIds.has(id)) {
        errors.push(`Data exists for tray ${id} but not in graph`);
      }
    }

    // Check for graph entries without data
    for (const id of graphIds) {
      if (!dataIds.has(id)) {
        errors.push(`Graph contains tray ${id} but no data exists`);
      }
    }

    // Check parent-child consistency
    for (const [id, data] of this.dataStore) {
      const graphParent = this.graph.getParent(id);
      if (data.parentId !== graphParent) {
        errors.push(`Parent mismatch for tray ${id}: data says ${data.parentId}, graph says ${graphParent}`);
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
    totalTrays: number;
    totalComponents: number;
    maxDepth: number;
    orphanedComponents: number;
  } {
    const allIds = this.getAllTrayIds();
    let maxDepth = 0;
    let orphanedComponents = 0;

    for (const id of allIds) {
      const depth = this.graph.getDepth(id);
      maxDepth = Math.max(maxDepth, depth);
    }

    for (const id of this.componentStore.keys()) {
      if (!this.dataStore.has(id)) {
        orphanedComponents++;
      }
    }

    return {
      totalTrays: this.dataStore.size,
      totalComponents: this.componentStore.size,
      maxDepth,
      orphanedComponents
    };
  }
}

// Export singleton instance
export const trayManager = TrayManager.getInstance();