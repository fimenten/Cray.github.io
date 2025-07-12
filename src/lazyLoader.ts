import { Tray } from "./tray";
import { ISerializedTrayData } from "./types";
import { element2TrayMap } from "./app";

interface LoadOptions {
  batchSize?: number;
  onProgress?: (loaded: number, total: number) => void;
  abortSignal?: AbortSignal;
}

export class LazyTrayLoader {
  private static pendingLoads = new Map<string, Promise<Tray>>();
  
  static async parseJSONStreaming(text: string, options?: LoadOptions): Promise<any> {
    const { onProgress } = options || {};
    
    // For now, parse synchronously but in chunks
    // Future: implement actual streaming JSON parser
    const chunkSize = 1024 * 1024; // 1MB chunks
    let parsed: any;
    
    if (text.length > chunkSize) {
      // Parse in requestIdleCallback for large files
      parsed = await new Promise((resolve, reject) => {
        requestIdleCallback(() => {
          try {
            const result = JSON.parse(text);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        });
      });
    } else {
      parsed = JSON.parse(text);
    }
    
    return parsed;
  }

  static async deserializeLazy(
    data: string,
    options?: LoadOptions
  ): Promise<Tray> {
    const { batchSize = 100, onProgress, abortSignal } = options || {};
    
    const parsed = await this.parseJSONStreaming(data, options);
    const rootTray = await this.createTrayTreeLazy(parsed, onProgress, abortSignal);
    
    return rootTray;
  }

  private static async createTrayTreeLazy(
    data: ISerializedTrayData,
    onProgress?: (loaded: number, total: number) => void,
    abortSignal?: AbortSignal
  ): Promise<Tray> {
    let totalNodes = 0;
    let loadedNodes = 0;

    // Count total nodes
    const countNodes = (node: ISerializedTrayData): number => {
      let count = 1;
      if (node.children?.length) {
        for (const child of node.children) {
          count += countNodes(child);
        }
      }
      return count;
    };
    
    totalNodes = countNodes(data);

    // Create tray tree with lazy loading
    const createTrayLazy = async (
      trayData: ISerializedTrayData,
      depth: number = 0
    ): Promise<Tray> => {
      if (abortSignal?.aborted) {
        throw new Error("Loading aborted");
      }

      // Create tray without DOM element
      const tray = new Tray(
        trayData.parentId || "",
        trayData.id,
        trayData.name,
        trayData.borderColor,
        new Date(trayData.created_dt),
        trayData.flexDirection,
        trayData.host_url,
        trayData.filename,
        trayData.isFolded ?? true,
        trayData.properties ?? {},
        trayData.hooks ?? [],
        trayData.isDone ?? false
      );

      // Don't create element yet - lazy creation on access
      tray._element = null;

      loadedNodes++;
      if (onProgress && loadedNodes % 10 === 0) {
        onProgress(loadedNodes, totalNodes);
      }

      // Load children in batches
      if (trayData.children?.length) {
        const children = trayData.children as ISerializedTrayData[];
        
        // For deeply nested or many children, defer loading
        if (depth > 2 || children.length > 50) {
          // Mark for lazy loading
          tray.properties._lazyChildren = children;
          tray.properties._childrenLoaded = false;
        } else {
          // Load children immediately for shallow trees
          for (let i = children.length - 1; i >= 0; i--) {
            const childTray = await createTrayLazy(children[i], depth + 1);
            tray.children.unshift(childTray);
          }
        }
      }

      // Yield to browser periodically
      if (loadedNodes % 100 === 0) {
        await new Promise(resolve => requestIdleCallback(resolve));
      }

      return tray;
    };

    return createTrayLazy(data);
  }

  static async loadChildrenIfNeeded(tray: Tray): Promise<void> {
    if (!tray.properties._lazyChildren || tray.properties._childrenLoaded) {
      return;
    }

    const children = tray.properties._lazyChildren as ISerializedTrayData[];
    
    // Load children in background
    const loadPromise = (async () => {
      for (let i = children.length - 1; i >= 0; i--) {
        const childTray = await this.createTrayTreeLazy(children[i]);
        tray.children.unshift(childTray);
      }
      
      tray.properties._childrenLoaded = true;
      delete tray.properties._lazyChildren;
      
      // Update UI if element exists
      if (tray._element) {
        tray.updateChildrenAppearance();
      }
    })();

    // We don't need to store this promise since it returns void
    try {
      await loadPromise;
    } finally {
      // Clean up any pending loads if needed
    }
  }
}