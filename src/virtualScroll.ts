import { Tray } from "./tray";

interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  buffer: number;
}

export class VirtualScroller {
  private container: HTMLElement;
  private items: Tray[];
  private options: VirtualScrollOptions;
  private scrollTop = 0;
  private visibleRange = { start: 0, end: 0 };
  private renderedElements = new Map<string, HTMLElement>();
  private placeholder: HTMLElement;

  constructor(container: HTMLElement, items: Tray[], options: Partial<VirtualScrollOptions> = {}) {
    this.container = container;
    this.items = items;
    this.options = {
      itemHeight: options.itemHeight || 40,
      containerHeight: options.containerHeight || 600,
      buffer: options.buffer || 5
    };

    this.placeholder = this.createPlaceholder();
    this.setupScrollListener();
    this.render();
  }

  private createPlaceholder(): HTMLElement {
    const placeholder = document.createElement("div");
    placeholder.style.height = `${this.items.length * this.options.itemHeight}px`;
    placeholder.style.position = "relative";
    return placeholder;
  }

  private setupScrollListener(): void {
    let ticking = false;
    
    this.container.addEventListener("scroll", () => {
      this.scrollTop = this.container.scrollTop;
      
      if (!ticking) {
        requestAnimationFrame(() => {
          this.updateVisibleRange();
          this.render();
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  private updateVisibleRange(): void {
    const { itemHeight, containerHeight, buffer } = this.options;
    
    const scrollTop = this.scrollTop;
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    const visible = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(this.items.length, start + visible + buffer * 2);
    
    this.visibleRange = { start, end };
  }

  private render(): void {
    const { start, end } = this.visibleRange;
    const { itemHeight } = this.options;
    
    // Clear container
    this.container.innerHTML = "";
    this.container.appendChild(this.placeholder);
    
    // Render only visible items
    for (let i = start; i < end; i++) {
      const tray = this.items[i];
      if (!tray) continue;
      
      let element = this.renderedElements.get(tray.id);
      
      if (!element) {
        element = tray.element;
        this.renderedElements.set(tray.id, element);
      }
      
      // Position element
      element.style.position = "absolute";
      element.style.top = `${i * itemHeight}px`;
      element.style.left = "0";
      element.style.right = "0";
      element.style.height = `${itemHeight}px`;
      
      this.placeholder.appendChild(element);
    }
    
    // Clean up elements outside visible range
    for (const [id, element] of this.renderedElements) {
      if (!element.parentElement) {
        continue;
      }
      
      const index = this.items.findIndex(t => t.id === id);
      if (index < start || index >= end) {
        element.remove();
      }
    }
  }

  updateItems(items: Tray[]): void {
    this.items = items;
    this.placeholder.style.height = `${items.length * this.options.itemHeight}px`;
    this.updateVisibleRange();
    this.render();
  }

  scrollToItem(index: number): void {
    const { itemHeight } = this.options;
    this.container.scrollTop = index * itemHeight;
  }
}