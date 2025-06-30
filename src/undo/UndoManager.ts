import { ITrayData, TrayId } from "../types";

export interface IUndoAction {
  type: string;
  timestamp: number;
  description: string;
  undo(): void;
  redo(): void;
}

export interface IUndoManagerOptions {
  maxHistorySize: number;
  enableCompression: boolean;
  groupingTimeWindow: number; // milliseconds
}

export class TrayAction implements IUndoAction {
  constructor(
    public type: string,
    public timestamp: number,
    public description: string,
    private undoFn: () => void,
    private redoFn: () => void
  ) {}

  undo(): void {
    this.undoFn();
  }

  redo(): void {
    this.redoFn();
  }
}

export class CompositeAction implements IUndoAction {
  constructor(
    public type: string,
    public timestamp: number,
    public description: string,
    public actions: IUndoAction[]
  ) {}

  undo(): void {
    // Undo in reverse order
    for (let i = this.actions.length - 1; i >= 0; i--) {
      this.actions[i].undo();
    }
  }

  redo(): void {
    // Redo in forward order
    for (const action of this.actions) {
      action.redo();
    }
  }
}

export class UndoManager {
  private undoStack: IUndoAction[] = [];
  private redoStack: IUndoAction[] = [];
  private isExecuting = false;
  private currentTransaction: IUndoAction[] | null = null;

  constructor(private options: IUndoManagerOptions = {
    maxHistorySize: 100,
    enableCompression: true,
    groupingTimeWindow: 1000
  }) {}

  // Basic undo/redo operations
  execute(action: IUndoAction): void {
    if (this.isExecuting) return;

    try {
      this.isExecuting = true;
      action.redo(); // Execute the action
      
      // Add to undo stack
      this.addToUndoStack(action);
      
      // Clear redo stack since we're on a new path
      this.redoStack = [];
      
    } finally {
      this.isExecuting = false;
    }
  }

  undo(): boolean {
    if (this.undoStack.length === 0 || this.isExecuting) return false;

    const action = this.undoStack.pop()!;
    
    try {
      this.isExecuting = true;
      action.undo();
      this.redoStack.push(action);
      return true;
    } catch (error) {
      console.error("Undo failed:", error);
      // Put action back on stack
      this.undoStack.push(action);
      return false;
    } finally {
      this.isExecuting = false;
    }
  }

  redo(): boolean {
    if (this.redoStack.length === 0 || this.isExecuting) return false;

    const action = this.redoStack.pop()!;
    
    try {
      this.isExecuting = true;
      action.redo();
      this.undoStack.push(action);
      return true;
    } catch (error) {
      console.error("Redo failed:", error);
      // Put action back on stack
      this.redoStack.push(action);
      return false;
    } finally {
      this.isExecuting = false;
    }
  }

  // Transaction support for grouping actions
  beginTransaction(): void {
    this.currentTransaction = [];
  }

  endTransaction(description: string = "Transaction"): void {
    if (!this.currentTransaction || this.currentTransaction.length === 0) {
      this.currentTransaction = null;
      return;
    }

    const compositeAction = new CompositeAction(
      "transaction",
      Date.now(),
      description,
      [...this.currentTransaction]
    );

    this.addToUndoStack(compositeAction);
    this.currentTransaction = null;
  }

  cancelTransaction(): void {
    this.currentTransaction = null;
  }

  // Factory methods for common tray operations
  createEditAction(trayId: TrayId, oldName: string, newName: string, updateFn: (name: string) => void): TrayAction {
    return new TrayAction(
      "edit",
      Date.now(),
      `Edit tray: "${oldName}" → "${newName}"`,
      () => updateFn(oldName),
      () => updateFn(newName)
    );
  }

  createDeleteAction(trayData: ITrayData, restoreFn: (data: ITrayData) => void, deleteFn: (id: TrayId) => void): TrayAction {
    return new TrayAction(
      "delete",
      Date.now(),
      `Delete tray: "${trayData.name}"`,
      () => restoreFn(trayData),
      () => deleteFn(trayData.id)
    );
  }

  createMoveAction(
    trayId: TrayId, 
    oldParentId: TrayId, 
    newParentId: TrayId,
    oldIndex: number,
    newIndex: number,
    moveFn: (id: TrayId, parentId: TrayId, index: number) => void
  ): TrayAction {
    return new TrayAction(
      "move",
      Date.now(),
      `Move tray`,
      () => moveFn(trayId, oldParentId, oldIndex),
      () => moveFn(trayId, newParentId, newIndex)
    );
  }

  createCreateAction(trayData: ITrayData, createFn: (data: ITrayData) => void, deleteFn: (id: TrayId) => void): TrayAction {
    return new TrayAction(
      "create",
      Date.now(),
      `Create tray: "${trayData.name}"`,
      () => deleteFn(trayData.id),
      () => createFn(trayData)
    );
  }

  createPropertyChangeAction<T>(
    trayId: TrayId,
    property: string,
    oldValue: T,
    newValue: T,
    updateFn: (value: T) => void
  ): TrayAction {
    return new TrayAction(
      "property-change",
      Date.now(),
      `Change ${property}: ${oldValue} → ${newValue}`,
      () => updateFn(oldValue),
      () => updateFn(newValue)
    );
  }

  // Batch operations
  executeBatch(actions: IUndoAction[], description: string = "Batch operation"): void {
    this.beginTransaction();
    
    for (const action of actions) {
      if (this.currentTransaction) {
        this.currentTransaction.push(action);
      }
      
      try {
        action.redo();
      } catch (error) {
        console.error("Batch action failed:", error);
        this.cancelTransaction();
        return;
      }
    }
    
    this.endTransaction(description);
  }

  // State inspection
  canUndo(): boolean {
    return this.undoStack.length > 0 && !this.isExecuting;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0 && !this.isExecuting;
  }

  getUndoDescription(): string | null {
    const action = this.undoStack[this.undoStack.length - 1];
    return action ? action.description : null;
  }

  getRedoDescription(): string | null {
    const action = this.redoStack[this.redoStack.length - 1];
    return action ? action.description : null;
  }

  getHistorySize(): { undo: number; redo: number } {
    return {
      undo: this.undoStack.length,
      redo: this.redoStack.length
    };
  }

  // History management
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.currentTransaction = null;
  }

  // Memory optimization
  compress(): void {
    if (!this.options.enableCompression) return;

    // Group consecutive similar actions
    const compressedStack: IUndoAction[] = [];
    
    for (const action of this.undoStack) {
      const lastAction = compressedStack[compressedStack.length - 1];
      
      if (lastAction && this.canGroupActions(lastAction, action)) {
        // Replace last action with composite
        compressedStack[compressedStack.length - 1] = new CompositeAction(
          "grouped",
          action.timestamp,
          `${lastAction.description} (grouped)`,
          lastAction instanceof CompositeAction ? [...lastAction.actions, action] : [lastAction, action]
        );
      } else {
        compressedStack.push(action);
      }
    }
    
    this.undoStack = compressedStack;
  }

  // Serialization for persistence
  serialize(): string {
    // Note: We can't serialize function references, so this would need
    // a more sophisticated approach in a real implementation
    const data = {
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
      undoDescriptions: this.undoStack.map(a => a.description),
      redoDescriptions: this.redoStack.map(a => a.description)
    };
    
    return JSON.stringify(data);
  }

  // Performance monitoring
  getStats(): {
    undoStackSize: number;
    redoStackSize: number;
    memoryUsage: number;
    averageActionAge: number;
  } {
    const now = Date.now();
    const totalAge = this.undoStack.reduce((sum, action) => sum + (now - action.timestamp), 0);
    
    return {
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
      memoryUsage: this.estimateMemoryUsage(),
      averageActionAge: this.undoStack.length > 0 ? totalAge / this.undoStack.length : 0
    };
  }

  // Private helper methods
  private addToUndoStack(action: IUndoAction): void {
    if (this.currentTransaction) {
      this.currentTransaction.push(action);
      return;
    }

    // Check if we can group with the last action
    const lastAction = this.undoStack[this.undoStack.length - 1];
    if (lastAction && this.canGroupActions(lastAction, action)) {
      // Create or extend composite action
      if (lastAction instanceof CompositeAction) {
        lastAction.actions.push(action);
      } else {
        const composite = new CompositeAction(
          "grouped",
          action.timestamp,
          `${lastAction.description} (grouped)`,
          [lastAction, action]
        );
        this.undoStack[this.undoStack.length - 1] = composite;
      }
    } else {
      this.undoStack.push(action);
    }

    // Maintain max stack size
    if (this.undoStack.length > this.options.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  private canGroupActions(action1: IUndoAction, action2: IUndoAction): boolean {
    // Group actions of the same type that happen within the time window
    return action1.type === action2.type &&
           action2.timestamp - action1.timestamp < this.options.groupingTimeWindow;
  }

  private estimateMemoryUsage(): number {
    // Rough estimation
    return (this.undoStack.length + this.redoStack.length) * 1024; // Assume 1KB per action
  }

  // Helper property for composite actions
  get actions(): IUndoAction[] {
    return [...this.undoStack];
  }
}

// Singleton instance
export const undoManager = new UndoManager();