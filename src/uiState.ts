// UI state management - separate from data model
// This module handles UI-specific state that doesn't belong in the data model

import { TrayId, ITrayUIState } from "./types";

/**
 * UI state for a tray - everything related to display and interaction
 * This is separate from the data model and handles only UI concerns
 */
export class TrayUIState implements ITrayUIState {
  id: TrayId;
  isEditing: boolean;
  isSelected: boolean;
  isFocused: boolean;
  isExpanded: boolean;
  showDoneMarker: boolean;
  lastInteractionTime: Date;

  // DOM element reference (weak reference to avoid memory leaks)
  private _element: HTMLDivElement | null = null;

  constructor(id: TrayId, options: Partial<ITrayUIState> = {}) {
    this.id = id;
    this.isEditing = options.isEditing || false;
    this.isSelected = options.isSelected || false;
    this.isFocused = options.isFocused || false;
    this.isExpanded = options.isExpanded || false;
    this.showDoneMarker = options.showDoneMarker !== undefined ? options.showDoneMarker : true;
    this.lastInteractionTime = options.lastInteractionTime || new Date();
  }

  /**
   * Get the DOM element (lazy getter)
   */
  get element(): HTMLDivElement | null {
    return this._element;
  }

  /**
   * Set the DOM element
   */
  set element(el: HTMLDivElement | null) {
    this._element = el;
  }

  /**
   * Update the last interaction time
   */
  updateInteractionTime(): void {
    this.lastInteractionTime = new Date();
  }

  /**
   * Reset to default state
   */
  reset(): void {
    this.isEditing = false;
    this.isSelected = false;
    this.isFocused = false;
    this.updateInteractionTime();
  }

  /**
   * Clone the UI state (for a new tray)
   */
  clone(newId: TrayId): TrayUIState {
    return new TrayUIState(newId, {
      isEditing: false, // New trays shouldn't be editing
      isSelected: false, // New trays shouldn't be selected
      isFocused: false, // New trays shouldn't be focused
      isExpanded: this.isExpanded,
      showDoneMarker: this.showDoneMarker,
      lastInteractionTime: new Date()
    });
  }

  /**
   * Convert to JSON (excluding DOM element)
   */
  toJSON(): Omit<ITrayUIState, 'element'> {
    return {
      id: this.id,
      isEditing: this.isEditing,
      isSelected: this.isSelected,
      isFocused: this.isFocused,
      isExpanded: this.isExpanded,
      showDoneMarker: this.showDoneMarker,
      lastInteractionTime: this.lastInteractionTime
    };
  }
}

/**
 * Global UI state manager for all trays
 */
export class UIStateManager {
  private states = new Map<TrayId, TrayUIState>();
  private focusedTrayId: TrayId | null = null;
  private selectedTrayIds = new Set<TrayId>();

  /**
   * Get UI state for a tray, create if doesn't exist
   */
  getState(trayId: TrayId): TrayUIState {
    if (!this.states.has(trayId)) {
      this.states.set(trayId, new TrayUIState(trayId));
    }
    return this.states.get(trayId)!;
  }

  /**
   * Set UI state for a tray
   */
  setState(trayId: TrayId, state: TrayUIState): void {
    this.states.set(trayId, state);
  }

  /**
   * Remove UI state for a tray
   */
  removeState(trayId: TrayId): void {
    const state = this.states.get(trayId);
    if (state) {
      // Clean up references
      if (this.focusedTrayId === trayId) {
        this.focusedTrayId = null;
      }
      this.selectedTrayIds.delete(trayId);
      this.states.delete(trayId);
    }
  }

  /**
   * Get all states
   */
  getAllStates(): Map<TrayId, TrayUIState> {
    return new Map(this.states);
  }

  /**
   * Clear all states
   */
  clearAll(): void {
    this.states.clear();
    this.focusedTrayId = null;
    this.selectedTrayIds.clear();
  }

  /**
   * Focus management
   */
  setFocused(trayId: TrayId | null): void {
    // Clear previous focus
    if (this.focusedTrayId) {
      const prevState = this.states.get(this.focusedTrayId);
      if (prevState) {
        prevState.isFocused = false;
      }
    }

    // Set new focus
    this.focusedTrayId = trayId;
    if (trayId) {
      const state = this.getState(trayId);
      state.isFocused = true;
      state.updateInteractionTime();
    }
  }

  /**
   * Get currently focused tray
   */
  getFocused(): TrayId | null {
    return this.focusedTrayId;
  }

  /**
   * Selection management
   */
  addToSelection(trayId: TrayId): void {
    this.selectedTrayIds.add(trayId);
    const state = this.getState(trayId);
    state.isSelected = true;
    state.updateInteractionTime();
  }

  /**
   * Remove from selection
   */
  removeFromSelection(trayId: TrayId): void {
    this.selectedTrayIds.delete(trayId);
    const state = this.states.get(trayId);
    if (state) {
      state.isSelected = false;
    }
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    for (const trayId of this.selectedTrayIds) {
      const state = this.states.get(trayId);
      if (state) {
        state.isSelected = false;
      }
    }
    this.selectedTrayIds.clear();
  }

  /**
   * Get all selected tray IDs
   */
  getSelected(): TrayId[] {
    return Array.from(this.selectedTrayIds);
  }

  /**
   * Check if a tray is selected
   */
  isSelected(trayId: TrayId): boolean {
    return this.selectedTrayIds.has(trayId);
  }

  /**
   * Toggle selection of a tray
   */
  toggleSelection(trayId: TrayId): boolean {
    if (this.isSelected(trayId)) {
      this.removeFromSelection(trayId);
      return false;
    } else {
      this.addToSelection(trayId);
      return true;
    }
  }

  /**
   * Set multiple trays as selected
   */
  setSelection(trayIds: TrayId[]): void {
    this.clearSelection();
    for (const trayId of trayIds) {
      this.addToSelection(trayId);
    }
  }

  /**
   * Editing state management
   */
  setEditing(trayId: TrayId, isEditing: boolean): void {
    const state = this.getState(trayId);
    state.isEditing = isEditing;
    if (isEditing) {
      state.updateInteractionTime();
    }
  }

  /**
   * Get all trays that are currently being edited
   */
  getEditing(): TrayId[] {
    const editing: TrayId[] = [];
    for (const [trayId, state] of this.states) {
      if (state.isEditing) {
        editing.push(trayId);
      }
    }
    return editing;
  }

  /**
   * Stop editing for all trays
   */
  stopAllEditing(): void {
    for (const state of this.states.values()) {
      state.isEditing = false;
    }
  }

  /**
   * Expansion state management
   */
  setExpanded(trayId: TrayId, isExpanded: boolean): void {
    const state = this.getState(trayId);
    state.isExpanded = isExpanded;
    state.updateInteractionTime();
  }

  /**
   * Toggle expansion state
   */
  toggleExpanded(trayId: TrayId): boolean {
    const state = this.getState(trayId);
    state.isExpanded = !state.isExpanded;
    state.updateInteractionTime();
    return state.isExpanded;
  }

  /**
   * Get recently interacted trays
   */
  getRecentlyInteracted(limit: number = 10): TrayId[] {
    const sorted = Array.from(this.states.entries())
      .sort(([, a], [, b]) => b.lastInteractionTime.getTime() - a.lastInteractionTime.getTime())
      .slice(0, limit);
    
    return sorted.map(([trayId]) => trayId);
  }

  /**
   * Clone state for a new tray (used when duplicating)
   */
  cloneState(sourceTrayId: TrayId, newTrayId: TrayId): TrayUIState {
    const sourceState = this.states.get(sourceTrayId);
    if (sourceState) {
      const clonedState = sourceState.clone(newTrayId);
      this.setState(newTrayId, clonedState);
      return clonedState;
    } else {
      return this.getState(newTrayId);
    }
  }

  /**
   * Bulk update states
   */
  updateStates(updates: Array<{ trayId: TrayId; updates: Partial<ITrayUIState> }>): void {
    for (const { trayId, updates: stateUpdates } of updates) {
      const state = this.getState(trayId);
      Object.assign(state, stateUpdates);
      if (Object.keys(stateUpdates).length > 0) {
        state.updateInteractionTime();
      }
    }
  }

  /**
   * Get states summary for debugging
   */
  getSummary(): {
    totalStates: number;
    focused: TrayId | null;
    selected: TrayId[];
    editing: TrayId[];
    expanded: TrayId[];
  } {
    const expanded = Array.from(this.states.entries())
      .filter(([, state]) => state.isExpanded)
      .map(([trayId]) => trayId);

    return {
      totalStates: this.states.size,
      focused: this.focusedTrayId,
      selected: this.getSelected(),
      editing: this.getEditing(),
      expanded
    };
  }
}

// Global UI state manager instance
export const uiStateManager = new UIStateManager();