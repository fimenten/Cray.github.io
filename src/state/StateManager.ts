import { ITrayData, ITrayUIState, TrayId } from "../types";
import { UIStateManager } from "../uiState";
import { TrayCache } from "../cache/TrayCache";

export interface IAppState {
  focusedTrayId: TrayId | null;
  selectedTrayIds: Set<TrayId>;
  rootTrayId: TrayId | null;
  clipboardData: ITrayData | null;
  isLoading: boolean;
  lastSaveTime: Date | null;
  isDirty: boolean;
  viewMode: "tree" | "kanban" | "timeline";
  zoomLevel: number;
  sidebarVisible: boolean;
  searchQuery: string;
  searchResults: TrayId[];
  theme: "light" | "dark" | "auto";
  autoSaveEnabled: boolean;
  collaborationMode: boolean;
}

export interface IStateSubscriber {
  onStateChange(newState: Readonly<IAppState>, changedKeys: string[]): void;
}

export class StateManager {
  private state: IAppState = {
    focusedTrayId: null,
    selectedTrayIds: new Set<TrayId>(),
    rootTrayId: null,
    clipboardData: null,
    isLoading: false,
    lastSaveTime: null,
    isDirty: false,
    viewMode: "tree",
    zoomLevel: 1.0,
    sidebarVisible: true,
    searchQuery: "",
    searchResults: [],
    theme: "auto",
    autoSaveEnabled: true,
    collaborationMode: false
  };

  private subscribers = new Set<IStateSubscriber>();
  private stateHistory: Array<{ state: IAppState; timestamp: number }> = [];
  private maxHistorySize = 100;

  constructor(
    private uiStateManager: UIStateManager,
    private cache: TrayCache
  ) {
    this.addToHistory();
  }

  // State access
  getState(): Readonly<IAppState> {
    return { 
      ...this.state,
      selectedTrayIds: new Set(this.state.selectedTrayIds) // Create new Set to prevent mutations
    };
  }

  getStateValue<K extends keyof IAppState>(key: K): IAppState[K] {
    return this.state[key];
  }

  // State mutation with change tracking
  setState<K extends keyof IAppState>(
    updates: Partial<Pick<IAppState, K>> | ((prevState: IAppState) => Partial<IAppState>)
  ): void {
    const previousState = { ...this.state };
    
    if (typeof updates === "function") {
      const partialUpdates = updates(previousState);
      Object.assign(this.state, partialUpdates);
    } else {
      Object.assign(this.state, updates);
    }

    // Track what changed
    const changedKeys = this.getChangedKeys(previousState, this.state);
    
    if (changedKeys.length > 0) {
      this.addToHistory();
      this.notifySubscribers(changedKeys);
      
      // Mark as dirty if it's a meaningful change
      if (this.isMeaningfulChange(changedKeys)) {
        this.state.isDirty = true;
      }
    }
  }

  // Focus management
  setFocusedTray(trayId: TrayId | null): void {
    if (this.state.focusedTrayId !== trayId) {
      this.setState({ focusedTrayId: trayId });
      this.uiStateManager.setFocused(trayId);
    }
  }

  getFocusedTray(): TrayId | null {
    return this.state.focusedTrayId;
  }

  // Selection management
  selectTray(trayId: TrayId, extend: boolean = false): void {
    const newSelection = new Set(extend ? this.state.selectedTrayIds : []);
    newSelection.add(trayId);
    
    this.setState({ selectedTrayIds: newSelection });
    
    // Update UI states
    for (const id of this.state.selectedTrayIds) {
      this.uiStateManager.removeFromSelection(id);
    }
    for (const id of newSelection) {
      this.uiStateManager.addToSelection(id);
    }
  }

  deselectTray(trayId: TrayId): void {
    const newSelection = new Set(this.state.selectedTrayIds);
    newSelection.delete(trayId);
    
    this.setState({ selectedTrayIds: newSelection });
    this.uiStateManager.removeFromSelection(trayId);
  }

  clearSelection(): void {
    this.uiStateManager.clearSelection();
    this.setState({ selectedTrayIds: new Set<TrayId>() });
  }

  isSelected(trayId: TrayId): boolean {
    return this.state.selectedTrayIds.has(trayId);
  }

  getSelectedTrayIds(): TrayId[] {
    return Array.from(this.state.selectedTrayIds);
  }

  // Clipboard operations
  copyToClipboard(trayData: ITrayData): void {
    const clonedData = JSON.parse(JSON.stringify(trayData));
    this.setState({ clipboardData: clonedData });
  }

  getClipboardData(): ITrayData | null {
    return this.state.clipboardData;
  }

  clearClipboard(): void {
    this.setState({ clipboardData: null });
  }

  // Search functionality
  search(query: string): Promise<TrayId[]> {
    this.setState({ searchQuery: query });
    
    if (!query.trim()) {
      this.setState({ searchResults: [] });
      return Promise.resolve([]);
    }

    // Simple search implementation - can be enhanced
    return new Promise((resolve) => {
      setTimeout(() => {
        const results: TrayId[] = [];
        const normalizedQuery = query.toLowerCase();
        
        // Search through cache first for performance
        const cacheStats = this.cache.getStats();
        if (cacheStats.size > 0) {
          // Implementation would search cached tray names
          // This is a placeholder
        }
        
        this.setState({ searchResults: results });
        resolve(results);
      }, 100); // Debounce
    });
  }

  // View management
  setViewMode(mode: IAppState["viewMode"]): void {
    this.setState({ viewMode: mode });
  }

  setZoomLevel(level: number): void {
    const clampedLevel = Math.max(0.5, Math.min(3.0, level));
    this.setState({ zoomLevel: clampedLevel });
  }

  toggleSidebar(): void {
    this.setState({ sidebarVisible: !this.state.sidebarVisible });
  }

  // Loading state
  setLoading(isLoading: boolean): void {
    this.setState({ isLoading });
  }

  // Save state tracking
  markSaved(): void {
    this.setState({ 
      isDirty: false, 
      lastSaveTime: new Date() 
    });
  }

  // Theme management
  setTheme(theme: IAppState["theme"]): void {
    this.setState({ theme });
    
    // Apply theme to document
    document.documentElement.setAttribute("data-theme", theme);
    
    // Handle auto theme
    if (theme === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const applyAutoTheme = () => {
        document.documentElement.setAttribute("data-theme", mediaQuery.matches ? "dark" : "light");
      };
      
      applyAutoTheme();
      mediaQuery.addEventListener("change", applyAutoTheme);
    }
  }

  // Subscription management
  subscribe(subscriber: IStateSubscriber): () => void {
    this.subscribers.add(subscriber);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  // Persistence
  serialize(): string {
    return JSON.stringify({
      state: {
        ...this.state,
        selectedTrayIds: Array.from(this.state.selectedTrayIds) // Convert Set to Array
      },
      timestamp: Date.now()
    });
  }

  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.state) {
        const restoredState = {
          ...parsed.state,
          selectedTrayIds: new Set(parsed.state.selectedTrayIds || []) // Convert Array back to Set
        };
        
        this.state = restoredState;
        this.addToHistory();
        this.notifySubscribers(Object.keys(this.state));
      }
    } catch (error) {
      console.error("Failed to deserialize state:", error);
    }
  }

  // State validation
  validateState(): string[] {
    const errors: string[] = [];
    
    if (this.state.zoomLevel < 0.5 || this.state.zoomLevel > 3.0) {
      errors.push("Invalid zoom level");
    }
    
    if (this.state.focusedTrayId && this.state.selectedTrayIds.size > 0 && 
        !this.state.selectedTrayIds.has(this.state.focusedTrayId)) {
      errors.push("Focused tray should be in selection");
    }
    
    return errors;
  }

  // Development utilities
  getStateHistory(): Array<{ state: IAppState; timestamp: number }> {
    return [...this.stateHistory];
  }

  resetState(): void {
    this.state = {
      focusedTrayId: null,
      selectedTrayIds: new Set<TrayId>(),
      rootTrayId: null,
      clipboardData: null,
      isLoading: false,
      lastSaveTime: null,
      isDirty: false,
      viewMode: "tree",
      zoomLevel: 1.0,
      sidebarVisible: true,
      searchQuery: "",
      searchResults: [],
      theme: "auto",
      autoSaveEnabled: true,
      collaborationMode: false
    };
    
    this.addToHistory();
    this.notifySubscribers(Object.keys(this.state));
  }

  // Private helper methods
  private getChangedKeys(oldState: IAppState, newState: IAppState): string[] {
    const changed: string[] = [];
    
    for (const key of Object.keys(newState) as Array<keyof IAppState>) {
      if (key === "selectedTrayIds") {
        // Special handling for Set comparison
        const oldSet = oldState[key];
        const newSet = newState[key];
        if (oldSet.size !== newSet.size || 
            !Array.from(oldSet).every(id => newSet.has(id))) {
          changed.push(key);
        }
      } else if (oldState[key] !== newState[key]) {
        changed.push(key);
      }
    }
    
    return changed;
  }

  private isMeaningfulChange(changedKeys: string[]): boolean {
    const meaningfulKeys = [
      "focusedTrayId", "selectedTrayIds", "rootTrayId", 
      "viewMode", "searchQuery"
    ];
    
    return changedKeys.some(key => meaningfulKeys.includes(key));
  }

  private addToHistory(): void {
    this.stateHistory.push({
      state: JSON.parse(JSON.stringify(this.state)),
      timestamp: Date.now()
    });
    
    // Maintain max history size
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  private notifySubscribers(changedKeys: string[]): void {
    const currentState = this.getState();
    
    for (const subscriber of this.subscribers) {
      try {
        subscriber.onStateChange(currentState, changedKeys);
      } catch (error) {
        console.error("Error in state subscriber:", error);
      }
    }
  }
}

// Factory function
export function createStateManager(uiStateManager: UIStateManager, cache: TrayCache): StateManager {
  return new StateManager(uiStateManager, cache);
}