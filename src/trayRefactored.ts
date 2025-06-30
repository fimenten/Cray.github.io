// Refactored Tray class using separated data model and UI state
// This version composes TrayData and TrayUIState instead of mixing concerns

import { getRandomColor, getWhiteColor, generateUUID, getRootElement, getUrlParameter } from "./utils";
import { getTrayFromId } from "./trayOperations";
import { cloneTray } from "./trayFactory";
import {
  serialize,
  deserialize,
  loadFromIndexedDB,
  saveToIndexedDB,
} from "./io";
import { createHamburgerMenu, selected_trays, showHookNotification } from "./hamburger";
import {
  downloadData,
  showUploadNotification,
  uploadData,
  fetchTrayList,
  setNetworkOption,
  updateData,
  startAutoUpload,
  stopAutoUpload,
} from "./networks";
import { meltTray } from "./functions";
import { id2TrayData, element2TrayMap} from "./app";
import { colorPalette } from "./const";
import { handleKeyDown } from "./keyboardInteraction";
import { setLastFocused } from "./state";
import store from "./store";
import { openContextMenu } from "./contextMenu";
import { pluginManager } from "./pluginManager";
import { HookedTask, PluginContext } from "./pluginTypes";
import { TrayId, ITrayData, ITrayUIState } from "./types";

// Import the new separated concerns
import { TrayData } from "./dataModel";
import { TrayUIState, uiStateManager } from "./uiState";

/**
 * Refactored Tray class that composes data model and UI state
 * This class is now primarily responsible for UI operations and delegates data operations
 */
export class TrayRefactored {
  // Core composition - data and UI state are separate
  private _data: TrayData;
  private _uiState: TrayUIState;

  // DOM element reference
  private _element: HTMLDivElement | null = null;

  constructor(
    parentId: TrayId,
    id: TrayId,
    name: string,
    color: string | null = null,
    created_dt: Date | null = null,
    flexDirection: "column" | "row" = "column",
    host_url: string | null = null,
    filename: string | null = null,
    isFold: boolean = true,
    properties: Record<string, any> = {},
    hooks: string[] = [],
    isDone: boolean = false
  ) {
    // Initialize data model
    this._data = new TrayData({
      id,
      name,
      parentId,
      borderColor: color || getWhiteColor(),
      created_dt: created_dt || new Date(),
      flexDirection,
      host_url,
      filename,
      isFolded: isFold,
      properties,
      hooks,
      isDone,
      children: []
    });

    // Initialize UI state
    this._uiState = uiStateManager.getState(id);
    this._uiState.isExpanded = !isFold;
    this._uiState.showDoneMarker = false;
    this._uiState.autoUpload = false;

    // Initialize UI
    this.updateAppearance();
    this.updateBorderColor(this._data.borderColor);
  }

  // === Data Model Proxies ===
  // These properties delegate to the data model

  get id(): TrayId { return this._data.id; }
  
  get name(): string { return this._data.name; }
  set name(value: string) { 
    this._data.updateName(value);
    this.updateAppearance();
  }

  get parentId(): TrayId | null { return this._data.parentId; }
  set parentId(value: TrayId | null) { this._data.parentId = value; }

  get borderColor(): string { return this._data.borderColor; }
  set borderColor(value: string) { 
    this._data.borderColor = value;
    this.updateBorderColor(value);
  }

  get created_dt(): Date | string { return this._data.created_dt; }
  set created_dt(value: Date | string) { this._data.created_dt = value; }

  get flexDirection(): "column" | "row" { return this._data.flexDirection; }
  set flexDirection(value: "column" | "row") { 
    this._data.flexDirection = value;
    this.updateFlexDirection();
  }

  get host_url(): string | null { return this._data.host_url; }
  set host_url(value: string | null) { this._data.host_url = value; }

  get filename(): string | null { return this._data.filename; }
  set filename(value: string | null) { this._data.filename = value; }

  get isFolded(): boolean { return this._data.isFolded; }
  set isFolded(value: boolean) { 
    this._data.isFolded = value;
    this._uiState.isExpanded = !value;
    this.updateAppearance();
  }

  get properties(): Record<string, any> { return this._data.properties; }
  set properties(value: Record<string, any>) { this._data.properties = value; }

  get hooks(): string[] { return this._data.hooks; }
  set hooks(value: string[]) { this._data.hooks = value; }

  get isDone(): boolean { return this._data.isDone; }
  set isDone(value: boolean) { 
    this._data.isDone = value;
    this.updateAppearance();
  }

  // === UI State Proxies ===
  // These properties delegate to the UI state

  get isEditing(): boolean { return this._uiState.isEditing; }
  set isEditing(value: boolean) { 
    uiStateManager.setEditing(this.id, value);
    this.updateEditingAppearance();
  }

  get isSelected(): boolean { return this._uiState.isSelected; }
  set isSelected(value: boolean) { 
    if (value) {
      uiStateManager.addToSelection(this.id);
    } else {
      uiStateManager.removeFromSelection(this.id);
    }
    this.updateSelectionAppearance();
  }

  get showDoneMarker(): boolean { return this._uiState.showDoneMarker; }
  set showDoneMarker(value: boolean) { 
    this._uiState.showDoneMarker = value;
    this.updateAppearance();
  }

  get autoUpload(): boolean { return this._uiState.autoUpload; }
  set autoUpload(value: boolean) { this._uiState.autoUpload = value; }

  // === Children Management ===
  // These delegate to the data model but return Tray instances for backward compatibility

  get children(): TrayRefactored[] {
    // Convert data children to Tray instances on demand
    return this._data.children.map(childData => {
      // Try to find existing Tray instance first
      const existingElement = document.querySelector(`[data-tray-id="${childData.id}"]`) as HTMLElement;
      if (existingElement && element2TrayMap.has(existingElement)) {
        const existing = element2TrayMap.get(existingElement);
        if (existing instanceof TrayRefactored) {
          return existing;
        }
      }
      
      // Create new Tray instance from data
      return this.createTrayFromData(childData);
    });
  }

  // === DOM Element Management ===
  
  get element(): HTMLDivElement {
    if (!this._element) {
      this._element = this.createElement();
      this._uiState.element = this._element;
    }
    return this._element;
  }

  // === Data Access Methods ===

  /**
   * Get the underlying data model
   */
  getData(): TrayData {
    return this._data;
  }

  /**
   * Get the UI state
   */
  getUIState(): TrayUIState {
    return this._uiState;
  }

  /**
   * Update data model
   */
  updateData(updates: Partial<ITrayData>): void {
    Object.assign(this._data, updates);
    this.updateAppearance();
  }

  // === Child Management Methods ===

  addChild(child: TrayRefactored): void {
    // Add to data model
    this._data.addChild(child.getData());
    
    // Update child's parent reference
    child._data.parentId = this.id;
    
    // Update UI
    this.updateChildrenAppearance();
  }

  removeChild(childId: TrayId): boolean {
    const removed = this._data.removeChild(childId);
    if (removed) {
      // Clean up UI state
      uiStateManager.removeState(childId);
      this.updateChildrenAppearance();
    }
    return removed;
  }

  insertChild(child: TrayRefactored, index: number): void {
    // Remove from current position if already a child
    this.removeChild(child.id);
    
    // Insert at specific position
    this._data.children.splice(index, 0, child.getData());
    child._data.parentId = this.id;
    
    this.updateChildrenAppearance();
  }

  // === Property Management ===

  addProperty(key: string, value: any): void {
    this._data.addProperty(key, value);
  }

  removeProperty(key: string): boolean {
    return this._data.removeProperty(key);
  }

  getProperty(key: string): any {
    return this._data.getProperty(key);
  }

  // === Hook Management ===

  parseHooksFromName(name?: string): string[] {
    return this._data.parseHooksFromName(name || this.name);
  }

  // === Legacy Methods (for backward compatibility) ===

  checkDoneStateFromName(name?: string): boolean {
    return this._data.checkDoneStateFromName(name || this.name);
  }

  sortChildren(property: string, descending: boolean = false): void {
    this._data.sortChildren(property, descending);
    this.updateChildrenAppearance();
  }

  // === UI Methods ===

  focus(): void {
    uiStateManager.setFocused(this.id);
    this.element.focus();
  }

  blur(): void {
    if (uiStateManager.getFocused() === this.id) {
      uiStateManager.setFocused(null);
    }
  }

  toggleFold(): void {
    this.isFolded = !this.isFolded;
    this.updateAppearance();
  }

  expand(): void {
    this.isFolded = false;
    this.updateAppearance();
  }

  collapse(): void {
    this.isFolded = true;
    this.updateAppearance();
  }

  // === Serialization Methods ===

  toJSON(): string {
    return JSON.stringify(this._data.toSerializable());
  }

  clone(): TrayRefactored {
    const clonedData = this._data.clone();
    const clonedTray = this.createTrayFromData(clonedData);
    
    // Clone UI state
    uiStateManager.cloneState(this.id, clonedData.id);
    
    return clonedTray;
  }

  // === Private Helper Methods ===

  private createTrayFromData(data: ITrayData): TrayRefactored {
    return new TrayRefactored(
      data.parentId || '',
      data.id,
      data.name,
      data.borderColor,
      data.created_dt instanceof Date ? data.created_dt : new Date(data.created_dt),
      data.flexDirection,
      data.host_url,
      data.filename,
      data.isFolded,
      data.properties,
      data.hooks,
      data.isDone
    );
  }

  private updateEditingAppearance(): void {
    if (!this._element) return;
    
    const titleElement = this._element.querySelector('.tray-title') as HTMLElement;
    if (titleElement) {
      titleElement.contentEditable = this.isEditing ? 'true' : 'false';
      if (this.isEditing) {
        titleElement.focus();
        titleElement.classList.add('editing');
      } else {
        titleElement.classList.remove('editing');
      }
    }
  }

  private updateSelectionAppearance(): void {
    if (!this._element) return;
    
    if (this.isSelected) {
      this._element.classList.add('selected');
    } else {
      this._element.classList.remove('selected');
    }
  }

  private updateFlexDirection(): void {
    if (!this._element) return;
    
    const contentElement = this._element.querySelector('.tray-content') as HTMLElement;
    if (contentElement) {
      contentElement.style.flexDirection = this.flexDirection;
    }
  }

  // === Legacy DOM Methods (kept for compatibility) ===
  // TODO: These should be refactored in Phase 3

  createElement(): HTMLDivElement {
    const tray = document.createElement("div");
    tray.className = "tray";
    tray.setAttribute("data-tray-id", this.id);
    tray.draggable = true;
    
    element2TrayMap.set(tray, this as any); // TODO: Fix type issue in Phase 3

    const foldButton = document.createElement("button");
    foldButton.className = "tray-fold-button";
    foldButton.textContent = this.isFolded ? "▶" : "▼";
    
    const title = document.createElement("div");
    title.className = "tray-title";
    title.textContent = this.name;
    title.contentEditable = "true";

    const content = document.createElement("div");
    content.className = "tray-content";
    content.style.flexDirection = this.flexDirection;

    // Event listeners (simplified for now)
    this.setupEventListeners(tray, foldButton, title, content);

    tray.append(foldButton, title, content);
    
    return tray;
  }

  private setupEventListeners(tray: HTMLDivElement, foldButton: HTMLButtonElement, title: HTMLDivElement, content: HTMLDivElement): void {
    // Fold button
    foldButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleFold();
    });

    // Title editing
    title.addEventListener("blur", () => {
      if (this.isEditing) {
        this.name = title.textContent || "";
        this.isEditing = false;
      }
    });

    title.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        title.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        title.textContent = this.name;
        title.blur();
      }
    });

    // Focus handling
    tray.addEventListener("focus", () => {
      this.focus();
    });

    // Context menu
    tray.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      openContextMenu(this as any, e); // TODO: Fix type issue in Phase 3
    });

    // Keyboard interaction
    tray.addEventListener("keydown", (e) => {
      handleKeyDown(this as any, e); // TODO: Fix type issue in Phase 3
    });

    // Drag and drop (simplified)
    tray.addEventListener("dragstart", (e) => {
      this.onDragStart(e);
    });

    tray.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    tray.addEventListener("drop", (e) => {
      this.onDrop(e);
    });
  }

  updateAppearance(): void {
    if (!this._element) return;

    const foldButton = this._element.querySelector('.tray-fold-button') as HTMLButtonElement;
    const title = this._element.querySelector('.tray-title') as HTMLElement;
    const content = this._element.querySelector('.tray-content') as HTMLElement;

    if (foldButton) {
      foldButton.textContent = this.isFolded ? "▶" : "▼";
      foldButton.style.display = this.children.length > 0 ? "inline-block" : "none";
    }

    if (title) {
      title.textContent = this.name;
      if (this.isDone) {
        title.classList.add('done');
      } else {
        title.classList.remove('done');
      }
    }

    if (content) {
      content.style.display = this.isFolded ? "none" : "flex";
      content.style.flexDirection = this.flexDirection;
    }

    // Update border color
    this._element.style.borderColor = this.borderColor;

    // Update children
    this.updateChildrenAppearance();
  }

  updateChildrenAppearance(): void {
    const content = this._element?.querySelector('.tray-content') as HTMLElement;
    if (!content) return;

    // Clear existing children
    content.innerHTML = "";

    // Add current children
    for (const child of this.children) {
      content.appendChild(child.element);
    }
  }

  updateBorderColor(color: string): void {
    if (this._element) {
      this._element.style.borderColor = color;
    }
  }

  // === Legacy Drag & Drop Methods ===

  onDragStart(e: DragEvent): void {
    if (!e.dataTransfer) return;
    
    e.dataTransfer.effectAllowed = "move";
    
    // Handle multi-selection
    const selectedTrays = uiStateManager.getSelected();
    if (selectedTrays.includes(this.id)) {
      e.dataTransfer.setData("text/plain", JSON.stringify(selectedTrays));
    } else {
      e.dataTransfer.setData("text/plain", JSON.stringify([this.id]));
    }
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    
    if (!e.dataTransfer) return;
    
    try {
      const draggedIds = JSON.parse(e.dataTransfer.getData("text/plain")) as TrayId[];
      
      for (const draggedId of draggedIds) {
        const draggedTray = getTrayFromId(draggedId);
        if (draggedTray && draggedTray.id !== this.id) {
          // Remove from current parent
          if (draggedTray.parentId) {
            const currentParent = getTrayFromId(draggedTray.parentId);
            if (currentParent) {
              (currentParent as any).removeChild(draggedId);
            }
          }
          
          // Add to this tray
          this.addChild(draggedTray as any);
        }
      }
      
      saveToIndexedDB();
    } catch (error) {
      console.error("Drop operation failed:", error);
    }
  }

  // === Additional Legacy Methods for Compatibility ===

  insertParentTray(): void {
    // Implementation would go here
    // For now, keeping the interface for compatibility
  }

  insertChildTray(): void {
    // Implementation would go here
    // For now, keeping the interface for compatibility
  }

  toggleFlexDirection(): void {
    this.flexDirection = this.flexDirection === "column" ? "row" : "column";
  }

  changeBorderColor(color: string): void {
    this.borderColor = color;
  }
}

// === Factory Functions for Migration ===

/**
 * Create a TrayRefactored from legacy Tray data
 */
export function createTrayFromLegacyData(legacyData: any): TrayRefactored {
  return new TrayRefactored(
    legacyData.parentId || '',
    legacyData.id,
    legacyData.name,
    legacyData.borderColor,
    legacyData.created_dt,
    legacyData.flexDirection,
    legacyData.host_url,
    legacyData.filename,
    legacyData.isFolded,
    legacyData.properties || {},
    legacyData.hooks || [],
    legacyData.isDone || false
  );
}

/**
 * Create a TrayRefactored from TrayData
 */
export function createTrayFromData(data: TrayData): TrayRefactored {
  return new TrayRefactored(
    data.parentId || '',
    data.id,
    data.name,
    data.borderColor,
    data.created_dt instanceof Date ? data.created_dt : new Date(data.created_dt),
    data.flexDirection,
    data.host_url,
    data.filename,
    data.isFolded,
    data.properties,
    data.hooks,
    data.isDone
  );
}