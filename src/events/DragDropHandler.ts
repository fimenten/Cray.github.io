import { TrayId } from "../types";

export interface IDragDropCallbacks {
  onDragStart?: (draggedId: TrayId) => void;
  onDragEnd?: (draggedId: TrayId) => void;
  onDragEnter?: (targetId: TrayId) => void;
  onDragLeave?: (targetId: TrayId) => void;
  onDragOver?: (targetId: TrayId, position: DropPosition) => void;
  onDrop?: (draggedId: TrayId, targetId: TrayId, position: DropPosition) => void;
}

export type DropPosition = "before" | "after" | "inside";

export class DragDropHandler {
  private draggedTrayId: TrayId | null = null;
  private draggedElement: HTMLElement | null = null;
  private dropIndicator: HTMLElement | null = null;
  private callbacks: IDragDropCallbacks = {};
  private lastDropTarget: HTMLElement | null = null;
  private lastDropPosition: DropPosition | null = null;

  constructor() {
    this.createDropIndicator();
  }

  initialize(callbacks: IDragDropCallbacks): void {
    this.callbacks = callbacks;
  }

  handleDragStart(element: HTMLElement, trayId: TrayId, event: DragEvent): void {
    this.draggedTrayId = trayId;
    this.draggedElement = element;
    
    // Add dragging class
    element.classList.add("dragging");
    
    // Set drag image (optional - browser default is often fine)
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", trayId);
      
      // Create custom drag image
      const dragImage = this.createDragImage(element);
      event.dataTransfer.setDragImage(dragImage, 20, 20);
      
      // Remove drag image after a frame
      requestAnimationFrame(() => {
        dragImage.remove();
      });
    }
    
    this.callbacks.onDragStart?.(trayId);
  }

  handleDragEnd(element: HTMLElement, trayId: TrayId): void {
    // Clean up
    element.classList.remove("dragging");
    this.hideDropIndicator();
    
    // Remove any drop target highlights
    document.querySelectorAll(".drop-target").forEach(el => {
      el.classList.remove("drop-target", "drop-before", "drop-after", "drop-inside");
    });
    
    this.draggedTrayId = null;
    this.draggedElement = null;
    this.lastDropTarget = null;
    this.lastDropPosition = null;
    
    this.callbacks.onDragEnd?.(trayId);
  }

  handleDragOver(element: HTMLElement, trayId: TrayId, event: DragEvent): void {
    if (!this.draggedTrayId || this.draggedTrayId === trayId) {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    
    // Calculate drop position
    const position = this.calculateDropPosition(element, event);
    
    // Update visual feedback
    this.updateDropFeedback(element, position);
    
    // Store last target for drop handling
    this.lastDropTarget = element;
    this.lastDropPosition = position;
    
    this.callbacks.onDragOver?.(trayId, position);
  }

  handleDragEnter(element: HTMLElement, trayId: TrayId): void {
    if (!this.draggedTrayId || this.draggedTrayId === trayId) {
      return;
    }
    
    element.classList.add("drop-target");
    this.callbacks.onDragEnter?.(trayId);
  }

  handleDragLeave(element: HTMLElement, trayId: TrayId, event?: DragEvent): void {
    // Only remove classes if we're actually leaving this element
    // (not just moving to a child element)
    const relatedTarget = (event as any)?.relatedTarget as HTMLElement;
    if (!element.contains(relatedTarget)) {
      element.classList.remove("drop-target", "drop-before", "drop-after", "drop-inside");
      
      if (this.lastDropTarget === element) {
        this.hideDropIndicator();
        this.lastDropTarget = null;
        this.lastDropPosition = null;
      }
    }
    
    this.callbacks.onDragLeave?.(trayId);
  }

  handleDrop(element: HTMLElement, targetId: TrayId, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.draggedTrayId || !this.lastDropPosition) {
      return;
    }
    
    // Clean up visual feedback
    element.classList.remove("drop-target", "drop-before", "drop-after", "drop-inside");
    this.hideDropIndicator();
    
    // Perform the drop
    this.callbacks.onDrop?.(this.draggedTrayId, targetId, this.lastDropPosition);
  }

  private calculateDropPosition(element: HTMLElement, event: DragEvent): DropPosition {
    const rect = element.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;
    
    // Define zones for drop positions
    const topThreshold = height * 0.25;
    const bottomThreshold = height * 0.75;
    
    if (y < topThreshold) {
      return "before";
    } else if (y > bottomThreshold) {
      return "after";
    } else {
      // Check if the element can accept children
      const canHaveChildren = !element.classList.contains("no-children");
      return canHaveChildren ? "inside" : "after";
    }
  }

  private updateDropFeedback(element: HTMLElement, position: DropPosition): void {
    // Remove previous position classes
    element.classList.remove("drop-before", "drop-after", "drop-inside");
    
    // Add new position class
    element.classList.add(`drop-${position}`);
    
    // Update drop indicator
    this.showDropIndicator(element, position);
  }

  private createDropIndicator(): void {
    this.dropIndicator = document.createElement("div");
    this.dropIndicator.className = "drop-indicator";
    this.dropIndicator.style.cssText = `
      position: absolute;
      height: 2px;
      background-color: #007bff;
      pointer-events: none;
      z-index: 1000;
      transition: all 0.2s ease;
    `;
    document.body.appendChild(this.dropIndicator);
    this.hideDropIndicator();
  }

  private showDropIndicator(element: HTMLElement, position: DropPosition): void {
    if (!this.dropIndicator) return;
    
    const rect = element.getBoundingClientRect();
    
    switch (position) {
      case "before":
        this.dropIndicator.style.top = `${rect.top + window.scrollY}px`;
        this.dropIndicator.style.left = `${rect.left}px`;
        this.dropIndicator.style.width = `${rect.width}px`;
        this.dropIndicator.style.height = "2px";
        break;
        
      case "after":
        this.dropIndicator.style.top = `${rect.bottom + window.scrollY}px`;
        this.dropIndicator.style.left = `${rect.left}px`;
        this.dropIndicator.style.width = `${rect.width}px`;
        this.dropIndicator.style.height = "2px";
        break;
        
      case "inside":
        this.dropIndicator.style.top = `${rect.top + window.scrollY}px`;
        this.dropIndicator.style.left = `${rect.left}px`;
        this.dropIndicator.style.width = `${rect.width}px`;
        this.dropIndicator.style.height = `${rect.height}px`;
        this.dropIndicator.style.border = "2px solid #007bff";
        this.dropIndicator.style.backgroundColor = "rgba(0, 123, 255, 0.1)";
        break;
    }
    
    this.dropIndicator.style.display = "block";
  }

  private hideDropIndicator(): void {
    if (this.dropIndicator) {
      this.dropIndicator.style.display = "none";
      this.dropIndicator.style.border = "none";
      this.dropIndicator.style.backgroundColor = "transparent";
    }
  }

  private createDragImage(element: HTMLElement): HTMLElement {
    const dragImage = element.cloneNode(true) as HTMLElement;
    dragImage.style.cssText = `
      position: absolute;
      top: -1000px;
      left: -1000px;
      opacity: 0.8;
      transform: rotate(2deg);
      pointer-events: none;
    `;
    document.body.appendChild(dragImage);
    return dragImage;
  }

  // Utility methods for drag and drop operations
  
  isValidDropTarget(draggedId: TrayId, targetId: TrayId): boolean {
    // Prevent dropping on self
    if (draggedId === targetId) {
      return false;
    }
    
    // Add more validation logic as needed
    // For example, prevent dropping parent into its own child
    
    return true;
  }

  canAcceptChildren(element: HTMLElement): boolean {
    // Check if element can accept children based on its state
    return !element.classList.contains("no-children") &&
           !element.classList.contains("max-depth");
  }

  destroy(): void {
    this.dropIndicator?.remove();
    this.dropIndicator = null;
    this.callbacks = {};
  }
}

// Singleton instance
export const dragDropHandler = new DragDropHandler();