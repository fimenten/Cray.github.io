import { ITrayData, ITrayUIState, TrayId } from "../types";
import { TrayRenderer } from "./TrayRenderer";

interface VirtualItem {
  id: TrayId;
  height: number;
  top: number;
  data: ITrayData;
  uiState: ITrayUIState;
  depth: number;
}

export interface IVirtualRendererOptions {
  containerHeight: number;
  itemHeight: number;
  overscan: number;
  getItemHeight?: (item: ITrayData, depth: number) => number;
}

export class VirtualRenderer {
  private items: VirtualItem[] = [];
  private visibleRange = { start: 0, end: 0 };
  private scrollTop = 0;
  private totalHeight = 0;
  private container: HTMLElement | null = null;
  private contentWrapper: HTMLElement | null = null;
  private renderer: TrayRenderer;
  private renderedElements = new Map<TrayId, HTMLElement>();

  constructor(private options: IVirtualRendererOptions) {
    this.renderer = new TrayRenderer();
  }

  initialize(container: HTMLElement): void {
    this.container = container;
    
    // Create content wrapper for virtual scrolling
    this.contentWrapper = document.createElement("div");
    this.contentWrapper.className = "virtual-content";
    this.contentWrapper.style.position = "relative";
    
    container.appendChild(this.contentWrapper);
    container.addEventListener("scroll", this.handleScroll.bind(this));
  }

  setItems(rootTray: ITrayData, uiStates: Map<TrayId, ITrayUIState>): void {
    this.items = [];
    this.flattenTrayHierarchy(rootTray, uiStates, 0);
    this.calculatePositions();
    this.updateVisibleRange();
    this.render();
  }

  updateItem(trayId: TrayId, data: ITrayData, uiState: ITrayUIState): void {
    const itemIndex = this.items.findIndex(item => item.id === trayId);
    if (itemIndex === -1) return;

    const item = this.items[itemIndex];
    item.data = data;
    item.uiState = uiState;

    // If item is visible, update its element
    if (this.isItemVisible(itemIndex)) {
      const element = this.renderedElements.get(trayId);
      if (element) {
        this.renderer.update(element, data, uiState);
      }
    }

    // Recalculate if expansion state changed
    if (uiState.isExpanded !== item.uiState.isExpanded) {
      this.setItems(this.items[0].data, this.getUIStatesMap());
    }
  }

  scrollToItem(trayId: TrayId): void {
    const itemIndex = this.items.findIndex(item => item.id === trayId);
    if (itemIndex === -1 || !this.container) return;

    const item = this.items[itemIndex];
    const containerHeight = this.container.clientHeight;
    
    // Calculate scroll position to center the item
    const targetScrollTop = item.top - (containerHeight - item.height) / 2;
    
    this.container.scrollTop = Math.max(0, Math.min(targetScrollTop, this.totalHeight - containerHeight));
  }

  private flattenTrayHierarchy(
    tray: ITrayData, 
    uiStates: Map<TrayId, ITrayUIState>, 
    depth: number
  ): void {
    const uiState = uiStates.get(tray.id) || this.createDefaultUIState(tray.id);
    const height = this.options.getItemHeight?.(tray, depth) || this.options.itemHeight;

    this.items.push({
      id: tray.id,
      height,
      top: 0, // Will be calculated later
      data: tray,
      uiState,
      depth
    });

    // Only add children if expanded
    if (uiState.isExpanded && tray.children.length > 0) {
      for (const child of tray.children) {
        this.flattenTrayHierarchy(child, uiStates, depth + 1);
      }
    }
  }

  private calculatePositions(): void {
    let top = 0;
    
    for (const item of this.items) {
      item.top = top;
      top += item.height;
    }
    
    this.totalHeight = top;
    
    // Update container height
    if (this.contentWrapper) {
      this.contentWrapper.style.height = `${this.totalHeight}px`;
    }
  }

  private updateVisibleRange(): void {
    if (!this.container) return;

    const containerHeight = this.container.clientHeight;
    const overscan = this.options.overscan;
    
    // Find first visible item
    let start = 0;
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].top + this.items[i].height > this.scrollTop - overscan) {
        start = i;
        break;
      }
    }
    
    // Find last visible item
    let end = this.items.length - 1;
    for (let i = start; i < this.items.length; i++) {
      if (this.items[i].top > this.scrollTop + containerHeight + overscan) {
        end = i - 1;
        break;
      }
    }
    
    this.visibleRange = { start, end };
  }

  private handleScroll(): void {
    if (!this.container) return;
    
    const newScrollTop = this.container.scrollTop;
    if (Math.abs(newScrollTop - this.scrollTop) < 5) {
      return; // Ignore small scroll changes
    }
    
    this.scrollTop = newScrollTop;
    this.updateVisibleRange();
    this.render();
  }

  private render(): void {
    if (!this.contentWrapper) return;

    // Remove elements that are no longer visible
    const visibleIds = new Set<TrayId>();
    for (let i = this.visibleRange.start; i <= this.visibleRange.end; i++) {
      visibleIds.add(this.items[i].id);
    }

    for (const [id, element] of this.renderedElements) {
      if (!visibleIds.has(id)) {
        element.remove();
        this.renderedElements.delete(id);
      }
    }

    // Render visible items
    for (let i = this.visibleRange.start; i <= this.visibleRange.end; i++) {
      const item = this.items[i];
      let element = this.renderedElements.get(item.id);

      if (!element) {
        // Create new element
        element = this.renderer.render(item.data, item.uiState);
        element.style.position = "absolute";
        element.style.top = `${item.top}px`;
        element.style.left = `${item.depth * 20}px`; // Indent based on depth
        element.style.right = "0";
        
        this.contentWrapper.appendChild(element);
        this.renderedElements.set(item.id, element);
      } else {
        // Update existing element
        this.renderer.update(element, item.data, item.uiState);
        element.style.top = `${item.top}px`;
        element.style.left = `${item.depth * 20}px`;
      }
    }
  }

  private isItemVisible(index: number): boolean {
    return index >= this.visibleRange.start && index <= this.visibleRange.end;
  }

  private createDefaultUIState(id: TrayId): ITrayUIState {
    return {
      id,
      isEditing: false,
      isSelected: false,
      isFocused: false,
      isExpanded: true,
      showDoneMarker: false,
      autoUpload: false,
      lastInteractionTime: new Date()
    };
  }

  private getUIStatesMap(): Map<TrayId, ITrayUIState> {
    const map = new Map<TrayId, ITrayUIState>();
    for (const item of this.items) {
      map.set(item.id, item.uiState);
    }
    return map;
  }

  destroy(): void {
    if (this.container) {
      this.container.removeEventListener("scroll", this.handleScroll.bind(this));
    }
    
    for (const element of this.renderedElements.values()) {
      element.remove();
    }
    
    this.renderedElements.clear();
    this.contentWrapper?.remove();
    
    this.container = null;
    this.contentWrapper = null;
  }

  // Performance optimization methods
  
  measureItemHeights(): void {
    // Measure actual heights of rendered items and update stored heights
    for (const [id, element] of this.renderedElements) {
      const item = this.items.find(i => i.id === id);
      if (item) {
        const actualHeight = element.offsetHeight;
        if (Math.abs(actualHeight - item.height) > 1) {
          item.height = actualHeight;
        }
      }
    }
    
    // Recalculate positions if heights changed
    this.calculatePositions();
  }

  // Batch update for performance
  batchUpdate(updates: Array<{ id: TrayId; data: ITrayData; uiState: ITrayUIState }>): void {
    for (const update of updates) {
      const itemIndex = this.items.findIndex(item => item.id === update.id);
      if (itemIndex !== -1) {
        const item = this.items[itemIndex];
        item.data = update.data;
        item.uiState = update.uiState;
      }
    }
    
    this.render();
  }
}

// Factory function for creating virtual renderer
export function createVirtualRenderer(options: Partial<IVirtualRendererOptions> = {}): VirtualRenderer {
  const defaultOptions: IVirtualRendererOptions = {
    containerHeight: 600,
    itemHeight: 30,
    overscan: 100,
    ...options
  };
  
  return new VirtualRenderer(defaultOptions);
}