import { Tray } from "./tray";

export class MemoryOptimizer {
  private static readonly CLEANUP_INTERVAL = 30000; // 30 seconds
  private static readonly MAX_INACTIVE_TIME = 60000; // 1 minute
  private static inactiveTrays = new WeakMap<Tray, number>();
  private static cleanupTimer: NodeJS.Timeout | null = null;

  static init(): void {
    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);

    // Listen for memory pressure events
    if ('memory' in performance) {
      (performance as any).addEventListener('memory-pressure', () => {
        this.aggressiveCleanup();
      });
    }
  }

  static markActive(tray: Tray): void {
    this.inactiveTrays.delete(tray);
  }

  static markInactive(tray: Tray): void {
    this.inactiveTrays.set(tray, Date.now());
  }

  private static cleanup(): void {
    const now = Date.now();
    const traysToClean: Tray[] = [];

    // Note: WeakMap doesn't allow iteration, so we need another approach
    // This is a conceptual implementation
  }

  private static aggressiveCleanup(): void {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  static releaseElement(tray: Tray): void {
    if (tray._element && tray.isFolded) {
      // Remove element from DOM
      tray._element.remove();
      // Clear reference
      tray._element = null;
    }
  }

  static releaseChildrenElements(tray: Tray): void {
    if (tray.isFolded && tray.children.length > 0) {
      tray.children.forEach(child => {
        this.releaseElement(child);
        this.releaseChildrenElements(child);
      });
    }
  }

  static destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Intersection Observer for viewport-based loading
export class ViewportLoader {
  private observer: IntersectionObserver;
  private loadingQueue = new Set<Tray>();

  constructor() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const element = entry.target as HTMLElement;
          const tray = element.dataset.trayId ? 
            this.getTrayById(element.dataset.trayId) : null;
          
          if (tray && entry.isIntersecting) {
            this.loadTrayContent(tray);
          } else if (tray && !entry.isIntersecting) {
            this.unloadTrayContent(tray);
          }
        });
      },
      {
        rootMargin: '100px', // Load 100px before entering viewport
        threshold: 0.01
      }
    );
  }

  observe(element: HTMLElement): void {
    this.observer.observe(element);
  }

  unobserve(element: HTMLElement): void {
    this.observer.unobserve(element);
  }

  private async loadTrayContent(tray: Tray): Promise<void> {
    if (this.loadingQueue.has(tray)) return;
    
    this.loadingQueue.add(tray);
    
    try {
      // Load lazy children if needed
      if (tray.properties._lazyChildren && !tray.properties._childrenLoaded) {
        const { LazyTrayLoader } = await import("./lazyLoader");
        await LazyTrayLoader.loadChildrenIfNeeded(tray);
      }
      
      // Ensure element is created
      if (!tray._element) {
        tray._element = tray.createElement();
      }
    } finally {
      this.loadingQueue.delete(tray);
    }
  }

  private unloadTrayContent(tray: Tray): void {
    // Mark for potential cleanup
    MemoryOptimizer.markInactive(tray);
  }

  private getTrayById(id: string): Tray | null {
    // This would need access to the tray registry
    // Implementation depends on your app structure
    return null;
  }

  destroy(): void {
    this.observer.disconnect();
  }
}