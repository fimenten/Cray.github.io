import { ITrayData, ITrayUIState, TrayId } from "../types";
import { UIStateManager } from "../uiState";

export interface ITrayEventCallbacks {
  onTitleClick?: (trayId: TrayId) => void;
  onTitleDoubleClick?: (trayId: TrayId) => void;
  onTitleEdit?: (trayId: TrayId, newValue: string) => void;
  onFoldToggle?: (trayId: TrayId) => void;
  onCheckboxToggle?: (trayId: TrayId, checked: boolean) => void;
  onDragStart?: (trayId: TrayId, event: DragEvent) => void;
  onDragEnd?: (trayId: TrayId, event: DragEvent) => void;
  onDragOver?: (trayId: TrayId, event: DragEvent) => void;
  onDrop?: (trayId: TrayId, event: DragEvent) => void;
  onContextMenu?: (trayId: TrayId, event: MouseEvent) => void;
  onFocus?: (trayId: TrayId) => void;
  onBlur?: (trayId: TrayId) => void;
}

export class TrayEventHandler {
  private callbacks: ITrayEventCallbacks = {};
  private boundHandlers = new WeakMap<HTMLElement, Map<string, EventListener>>();

  constructor(private uiStateManager: UIStateManager) {}

  attachEvents(element: HTMLElement, trayId: TrayId, callbacks: ITrayEventCallbacks): void {
    this.callbacks = callbacks;
    const handlers = new Map<string, EventListener>();

    // Title events
    const titleElement = element.querySelector(".tray-title") as HTMLDivElement;
    if (titleElement) {
      const titleClickHandler = this.createTitleClickHandler(trayId);
      const titleDoubleClickHandler = this.createTitleDoubleClickHandler(trayId);
      const titleEditHandlers = this.createTitleEditHandlers(trayId);

      titleElement.addEventListener("click", titleClickHandler);
      titleElement.addEventListener("dblclick", titleDoubleClickHandler);
      titleElement.addEventListener("blur", titleEditHandlers.blur);
      titleElement.addEventListener("keydown", titleEditHandlers.keydown);
      titleElement.addEventListener("focus", () => this.callbacks.onFocus?.(trayId));

      handlers.set("title-click", titleClickHandler);
      handlers.set("title-dblclick", titleDoubleClickHandler);
      handlers.set("title-blur", titleEditHandlers.blur);
      handlers.set("title-keydown", titleEditHandlers.keydown);
    }

    // Fold button events
    const foldButton = element.querySelector(".tray-fold-button") as HTMLButtonElement;
    if (foldButton) {
      const foldHandler = () => this.callbacks.onFoldToggle?.(trayId);
      foldButton.addEventListener("click", foldHandler);
      handlers.set("fold-click", foldHandler);
    }

    // Checkbox events
    const checkbox = element.querySelector(".tray-checkbox") as HTMLInputElement;
    if (checkbox) {
      const checkboxHandler = (e: Event) => {
        const target = e.target as HTMLInputElement;
        this.callbacks.onCheckboxToggle?.(trayId, target.checked);
      };
      checkbox.addEventListener("change", checkboxHandler);
      handlers.set("checkbox-change", checkboxHandler);
    }

    // Drag handle events
    const dragHandle = element.querySelector(".tray-drag-handle") as HTMLDivElement;
    if (dragHandle) {
      dragHandle.draggable = true;
      const dragHandlers = this.createDragHandlers(trayId);
      
      dragHandle.addEventListener("dragstart", dragHandlers.dragstart);
      dragHandle.addEventListener("dragend", dragHandlers.dragend);
      
      handlers.set("drag-start", dragHandlers.dragstart);
      handlers.set("drag-end", dragHandlers.dragend);
    }

    // Drop zone events on the element itself
    const dropHandlers = this.createDropHandlers(trayId);
    element.addEventListener("dragover", dropHandlers.dragover);
    element.addEventListener("drop", dropHandlers.drop);
    
    handlers.set("dragover", dropHandlers.dragover);
    handlers.set("drop", dropHandlers.drop);

    // Context menu
    const contextMenuHandler = (e: Event) => {
      e.preventDefault();
      this.callbacks.onContextMenu?.(trayId, e as MouseEvent);
    };
    element.addEventListener("contextmenu", contextMenuHandler);
    handlers.set("contextmenu", contextMenuHandler);

    // Store handlers for cleanup
    this.boundHandlers.set(element, handlers);
  }

  detachEvents(element: HTMLElement): void {
    const handlers = this.boundHandlers.get(element);
    if (!handlers) return;

    // Remove title events
    const titleElement = element.querySelector(".tray-title") as HTMLDivElement;
    if (titleElement) {
      titleElement.removeEventListener("click", handlers.get("title-click")!);
      titleElement.removeEventListener("dblclick", handlers.get("title-dblclick")!);
      titleElement.removeEventListener("blur", handlers.get("title-blur")!);
      titleElement.removeEventListener("keydown", handlers.get("title-keydown")!);
    }

    // Remove fold button events
    const foldButton = element.querySelector(".tray-fold-button") as HTMLButtonElement;
    if (foldButton) {
      foldButton.removeEventListener("click", handlers.get("fold-click")!);
    }

    // Remove checkbox events
    const checkbox = element.querySelector(".tray-checkbox") as HTMLInputElement;
    if (checkbox) {
      checkbox.removeEventListener("change", handlers.get("checkbox-change")!);
    }

    // Remove drag handle events
    const dragHandle = element.querySelector(".tray-drag-handle") as HTMLDivElement;
    if (dragHandle) {
      dragHandle.removeEventListener("dragstart", handlers.get("drag-start")!);
      dragHandle.removeEventListener("dragend", handlers.get("drag-end")!);
    }

    // Remove drop zone events
    element.removeEventListener("dragover", handlers.get("dragover")!);
    element.removeEventListener("drop", handlers.get("drop")!);

    // Remove context menu
    element.removeEventListener("contextmenu", handlers.get("contextmenu")!);

    this.boundHandlers.delete(element);
  }

  private createTitleClickHandler(trayId: TrayId): EventListener {
    return (e: Event) => {
      e.stopPropagation();
      this.callbacks.onTitleClick?.(trayId);
    };
  }

  private createTitleDoubleClickHandler(trayId: TrayId): EventListener {
    return (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      this.callbacks.onTitleDoubleClick?.(trayId);
    };
  }

  private createTitleEditHandlers(trayId: TrayId): { blur: EventListener; keydown: EventListener } {
    return {
      blur: (e: Event) => {
        const target = e.target as HTMLDivElement;
        if (target.contentEditable === "true") {
          const newValue = target.textContent || "";
          this.callbacks.onTitleEdit?.(trayId, newValue);
          target.contentEditable = "false";
          this.uiStateManager.setEditing(trayId, false);
        }
      },
      keydown: (e: Event) => {
        const keyEvent = e as KeyboardEvent;
        const target = keyEvent.target as HTMLDivElement;
        
        if (target.contentEditable === "true") {
          if (keyEvent.key === "Enter") {
            keyEvent.preventDefault();
            target.blur();
          } else if (keyEvent.key === "Escape") {
            keyEvent.preventDefault();
            // Cancel editing - restore original text
            target.blur();
            this.callbacks.onBlur?.(trayId);
          }
        }
      }
    };
  }

  private createDragHandlers(trayId: TrayId): { dragstart: EventListener; dragend: EventListener } {
    return {
      dragstart: (e: Event) => {
        const dragEvent = e as DragEvent;
        if (dragEvent.dataTransfer) {
          dragEvent.dataTransfer.effectAllowed = "move";
          dragEvent.dataTransfer.setData("text/plain", trayId);
        }
        this.callbacks.onDragStart?.(trayId, dragEvent);
      },
      dragend: (e: Event) => {
        const dragEvent = e as DragEvent;
        this.callbacks.onDragEnd?.(trayId, dragEvent);
      }
    };
  }

  private createDropHandlers(trayId: TrayId): { dragover: EventListener; drop: EventListener } {
    return {
      dragover: (e: Event) => {
        const dragEvent = e as DragEvent;
        dragEvent.preventDefault();
        dragEvent.stopPropagation();
        
        if (dragEvent.dataTransfer) {
          dragEvent.dataTransfer.dropEffect = "move";
        }
        
        this.callbacks.onDragOver?.(trayId, dragEvent);
      },
      drop: (e: Event) => {
        const dragEvent = e as DragEvent;
        dragEvent.preventDefault();
        dragEvent.stopPropagation();
        
        this.callbacks.onDrop?.(trayId, dragEvent);
      }
    };
  }

  // Utility method to enable editing mode
  enableEditMode(element: HTMLElement): void {
    const titleElement = element.querySelector(".tray-title") as HTMLDivElement;
    if (titleElement) {
      titleElement.contentEditable = "true";
      titleElement.focus();
      
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(titleElement);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  // Utility method to disable editing mode
  disableEditMode(element: HTMLElement): void {
    const titleElement = element.querySelector(".tray-title") as HTMLDivElement;
    if (titleElement) {
      titleElement.contentEditable = "false";
    }
  }
}