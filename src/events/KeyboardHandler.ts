import { TrayId } from "../types";

export interface IKeyboardCallbacks {
  onEnter?: (trayId: TrayId, shiftKey: boolean, ctrlKey: boolean) => void;
  onDelete?: (trayId: TrayId) => void;
  onArrowUp?: (trayId: TrayId) => void;
  onArrowDown?: (trayId: TrayId) => void;
  onArrowLeft?: (trayId: TrayId) => void;
  onArrowRight?: (trayId: TrayId) => void;
  onTab?: (trayId: TrayId, shiftKey: boolean) => void;
  onSpace?: (trayId: TrayId) => void;
  onCtrlX?: (trayId: TrayId) => void;
  onCtrlC?: (trayId: TrayId) => void;
  onCtrlV?: (trayId: TrayId) => void;
  onCtrlZ?: (trayId: TrayId) => void;
  onCtrlY?: (trayId: TrayId) => void;
  onCtrlA?: (trayId: TrayId) => void;
  onCtrlJ?: (trayId: TrayId) => void;
  onCtrlT?: (trayId: TrayId) => void;
  onCtrlH?: (trayId: TrayId) => void;
  onCtrlSlash?: (trayId: TrayId) => void;
  onEscape?: (trayId: TrayId) => void;
  onPageUp?: (trayId: TrayId) => void;
  onPageDown?: (trayId: TrayId) => void;
  onHome?: (trayId: TrayId) => void;
  onEnd?: (trayId: TrayId) => void;
}

export class KeyboardHandler {
  private callbacks: IKeyboardCallbacks = {};
  private boundHandler: ((e: KeyboardEvent) => void) | null = null;
  private currentTrayId: TrayId | null = null;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  attachGlobalKeyboard(callbacks: IKeyboardCallbacks): void {
    this.callbacks = callbacks;
    
    if (!this.boundHandler) {
      this.boundHandler = this.handleKeyDown;
      document.addEventListener("keydown", this.boundHandler);
    }
  }

  detachGlobalKeyboard(): void {
    if (this.boundHandler) {
      document.removeEventListener("keydown", this.boundHandler);
      this.boundHandler = null;
    }
    this.callbacks = {};
  }

  setFocusedTray(trayId: TrayId | null): void {
    this.currentTrayId = trayId;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.currentTrayId) return;

    // Don't handle if we're in an input field (unless it's a tray title)
    const target = e.target as HTMLElement;
    const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
    const isTrayTitle = target.classList.contains("tray-title");
    
    if (isInput && !isTrayTitle) return;

    const trayId = this.currentTrayId;
    const handled = this.processKeyboardEvent(e, trayId);
    
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private processKeyboardEvent(e: KeyboardEvent, trayId: TrayId): boolean {
    // Handle modifier + key combinations first
    if (e.ctrlKey || e.metaKey) {
      return this.handleCtrlCombinations(e, trayId);
    }

    // Handle single keys and shift combinations
    switch (e.key) {
      case "Enter":
        if (e.shiftKey) {
          this.callbacks.onEnter?.(trayId, true, false);
        } else if (e.ctrlKey) {
          this.callbacks.onEnter?.(trayId, false, true);
        } else {
          this.callbacks.onEnter?.(trayId, false, false);
        }
        return true;

      case "Delete":
      case "Backspace":
        if (!this.isEditing(e.target as HTMLElement)) {
          this.callbacks.onDelete?.(trayId);
          return true;
        }
        return false;

      case "ArrowUp":
        this.callbacks.onArrowUp?.(trayId);
        return true;

      case "ArrowDown":
        this.callbacks.onArrowDown?.(trayId);
        return true;

      case "ArrowLeft":
        this.callbacks.onArrowLeft?.(trayId);
        return true;

      case "ArrowRight":
        this.callbacks.onArrowRight?.(trayId);
        return true;

      case "Tab":
        this.callbacks.onTab?.(trayId, e.shiftKey);
        return true;

      case " ": // Space
        if (!this.isEditing(e.target as HTMLElement)) {
          this.callbacks.onSpace?.(trayId);
          return true;
        }
        return false;

      case "Escape":
        this.callbacks.onEscape?.(trayId);
        return true;

      case "PageUp":
        this.callbacks.onPageUp?.(trayId);
        return true;

      case "PageDown":
        this.callbacks.onPageDown?.(trayId);
        return true;

      case "Home":
        this.callbacks.onHome?.(trayId);
        return true;

      case "End":
        this.callbacks.onEnd?.(trayId);
        return true;

      default:
        return false;
    }
  }

  private handleCtrlCombinations(e: KeyboardEvent, trayId: TrayId): boolean {
    const key = e.key.toLowerCase();

    switch (key) {
      case "x":
        this.callbacks.onCtrlX?.(trayId);
        return true;

      case "c":
        this.callbacks.onCtrlC?.(trayId);
        return true;

      case "v":
        this.callbacks.onCtrlV?.(trayId);
        return true;

      case "z":
        this.callbacks.onCtrlZ?.(trayId);
        return true;

      case "y":
        this.callbacks.onCtrlY?.(trayId);
        return true;

      case "a":
        this.callbacks.onCtrlA?.(trayId);
        return true;

      case "j":
        this.callbacks.onCtrlJ?.(trayId);
        return true;

      case "t":
        this.callbacks.onCtrlT?.(trayId);
        return true;

      case "h":
        this.callbacks.onCtrlH?.(trayId);
        return true;

      case "/":
        this.callbacks.onCtrlSlash?.(trayId);
        return true;

      default:
        return false;
    }
  }

  private isEditing(element: HTMLElement): boolean {
    return element.contentEditable === "true" || 
           element.classList.contains("tray-title") && element.contentEditable === "true";
  }

  // Utility methods for common keyboard navigation patterns
  
  findNextSibling(element: HTMLElement): HTMLElement | null {
    const parent = element.parentElement;
    if (!parent) return null;
    
    const siblings = Array.from(parent.children) as HTMLElement[];
    const currentIndex = siblings.indexOf(element);
    
    if (currentIndex === -1 || currentIndex === siblings.length - 1) {
      return null;
    }
    
    return siblings[currentIndex + 1];
  }

  findPreviousSibling(element: HTMLElement): HTMLElement | null {
    const parent = element.parentElement;
    if (!parent) return null;
    
    const siblings = Array.from(parent.children) as HTMLElement[];
    const currentIndex = siblings.indexOf(element);
    
    if (currentIndex <= 0) {
      return null;
    }
    
    return siblings[currentIndex - 1];
  }

  findFirstChild(element: HTMLElement): HTMLElement | null {
    const childrenContainer = element.querySelector(".tray-children");
    if (!childrenContainer) return null;
    
    const firstChild = childrenContainer.querySelector(".tray");
    return firstChild as HTMLElement | null;
  }

  findParentTray(element: HTMLElement): HTMLElement | null {
    let parent = element.parentElement;
    
    while (parent && !parent.classList.contains("tray")) {
      parent = parent.parentElement;
    }
    
    return parent;
  }

  // Method to simulate keyboard events (useful for testing)
  simulateKeyPress(key: string, options: {
    shiftKey?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
  } = {}): void {
    const event = new KeyboardEvent("keydown", {
      key,
      shiftKey: options.shiftKey || false,
      ctrlKey: options.ctrlKey || false,
      altKey: options.altKey || false,
      metaKey: options.metaKey || false,
      bubbles: true,
      cancelable: true
    });
    
    document.dispatchEvent(event);
  }
}

// Singleton instance
export const keyboardHandler = new KeyboardHandler();