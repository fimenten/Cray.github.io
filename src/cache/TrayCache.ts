import { ITrayData, TrayId } from "../types";
import { TrayData } from "../dataModel";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

interface ICacheOptions {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  enableStats: boolean;
}

export class TrayCache {
  private cache = new Map<TrayId, CacheEntry<ITrayData>>();
  private accessOrder: TrayId[] = [];
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    puts: 0
  };

  constructor(private options: ICacheOptions = {
    maxSize: 1000,
    ttl: 5 * 60 * 1000, // 5 minutes
    enableStats: true
  }) {}

  get(id: TrayId): ITrayData | null {
    const entry = this.cache.get(id);
    
    if (!entry) {
      if (this.options.enableStats) this.stats.misses++;
      return null;
    }

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.cache.delete(id);
      this.removeFromAccessOrder(id);
      if (this.options.enableStats) this.stats.misses++;
      return null;
    }

    // Update access order and hits
    entry.hits++;
    this.updateAccessOrder(id);
    if (this.options.enableStats) this.stats.hits++;

    return entry.data;
  }

  set(id: TrayId, data: ITrayData): void {
    // Check if we need to evict
    if (this.cache.size >= this.options.maxSize && !this.cache.has(id)) {
      this.evictLRU();
    }

    const entry: CacheEntry<ITrayData> = {
      data: this.cloneTrayData(data),
      timestamp: Date.now(),
      hits: 0
    };

    this.cache.set(id, entry);
    this.updateAccessOrder(id);
    if (this.options.enableStats) this.stats.puts++;
  }

  delete(id: TrayId): boolean {
    const result = this.cache.delete(id);
    if (result) {
      this.removeFromAccessOrder(id);
    }
    return result;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    if (this.options.enableStats) {
      this.stats = { hits: 0, misses: 0, evictions: 0, puts: 0 };
    }
  }

  // Batch operations for performance
  getMany(ids: TrayId[]): Map<TrayId, ITrayData> {
    const result = new Map<TrayId, ITrayData>();
    
    for (const id of ids) {
      const data = this.get(id);
      if (data) {
        result.set(id, data);
      }
    }
    
    return result;
  }

  setMany(entries: Array<[TrayId, ITrayData]>): void {
    for (const [id, data] of entries) {
      this.set(id, data);
    }
  }

  // Cache warming
  warm(trays: ITrayData[]): void {
    for (const tray of trays) {
      this.warmRecursive(tray);
    }
  }

  private warmRecursive(tray: ITrayData): void {
    this.set(tray.id, tray);
    
    for (const child of tray.children) {
      this.warmRecursive(child);
    }
  }

  // Invalidation strategies
  invalidate(id: TrayId, cascade: boolean = false): void {
    const data = this.get(id);
    this.delete(id);
    
    if (cascade && data) {
      // Invalidate all children
      for (const child of data.children) {
        this.invalidate(child.id, true);
      }
    }
  }

  invalidateByPattern(pattern: RegExp): number {
    let count = 0;
    
    for (const [id, entry] of this.cache.entries()) {
      if (pattern.test(entry.data.name)) {
        this.delete(id);
        count++;
      }
    }
    
    return count;
  }

  // Performance monitoring
  getStats(): Readonly<typeof this.stats> & {
    hitRate: number;
    size: number;
    memoryUsage: number;
  } {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
    
    return {
      ...this.stats,
      hitRate,
      size: this.cache.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  // Memory management
  private estimateMemoryUsage(): number {
    let bytes = 0;
    
    for (const entry of this.cache.values()) {
      // Rough estimation of object size
      bytes += JSON.stringify(entry.data).length * 2; // Unicode chars = 2 bytes
      bytes += 16; // Overhead for timestamp and hits
    }
    
    return bytes;
  }

  // LRU eviction
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    
    const lruId = this.accessOrder[0];
    this.cache.delete(lruId);
    this.accessOrder.shift();
    
    if (this.options.enableStats) this.stats.evictions++;
  }

  private updateAccessOrder(id: TrayId): void {
    this.removeFromAccessOrder(id);
    this.accessOrder.push(id);
  }

  private removeFromAccessOrder(id: TrayId): void {
    const index = this.accessOrder.indexOf(id);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private isExpired(entry: CacheEntry<ITrayData>): boolean {
    return Date.now() - entry.timestamp > this.options.ttl;
  }

  private cloneTrayData(data: ITrayData): ITrayData {
    // Deep clone to prevent mutations affecting cache
    return JSON.parse(JSON.stringify(data));
  }

  // Serialization for persistence
  serialize(): string {
    const entries: Array<[TrayId, CacheEntry<ITrayData>]> = [];
    
    for (const [id, entry] of this.cache.entries()) {
      if (!this.isExpired(entry)) {
        entries.push([id, entry]);
      }
    }
    
    return JSON.stringify({
      entries,
      accessOrder: this.accessOrder,
      stats: this.stats
    });
  }

  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      this.clear();
      
      for (const [id, entry] of parsed.entries) {
        this.cache.set(id, entry);
      }
      
      this.accessOrder = parsed.accessOrder || [];
      if (parsed.stats && this.options.enableStats) {
        this.stats = parsed.stats;
      }
    } catch (error) {
      console.error("Failed to deserialize cache:", error);
    }
  }
}

// Factory function with common presets
export function createTrayCache(preset: "small" | "medium" | "large" | "custom" = "medium", customOptions?: Partial<ICacheOptions>): TrayCache {
  const presets: Record<string, ICacheOptions> = {
    small: {
      maxSize: 100,
      ttl: 2 * 60 * 1000, // 2 minutes
      enableStats: false
    },
    medium: {
      maxSize: 1000,
      ttl: 5 * 60 * 1000, // 5 minutes
      enableStats: true
    },
    large: {
      maxSize: 10000,
      ttl: 10 * 60 * 1000, // 10 minutes
      enableStats: true
    },
    custom: {
      maxSize: 1000,
      ttl: 5 * 60 * 1000,
      enableStats: true,
      ...customOptions
    }
  };
  
  return new TrayCache(presets[preset]);
}

// Singleton instance for global cache
export const globalTrayCache = createTrayCache("medium");