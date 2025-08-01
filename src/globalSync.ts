/**
 * Global Sync Manager
 * 
 * Manages automatic synchronization for all network-enabled trays in the application.
 * Provides centralized control, scheduling, and cleanup for sync operations.
 */

import { Tray } from './tray';
import { syncTray, stopAllAutoUploads } from './networks';
import { getRootElement } from './utils';
import { element2TrayMap } from './app';
import store from './store';
import { selectAutoUploadEnabled, selectTrayAutoUpload, setTraySyncStatus, setNetworkError } from './state';
import { ConflictError } from './conflictResolution';
import { syncIndicatorManager } from './syncIndicators';
import { dataIntegrityManager } from './dataIntegrity';

interface SyncQueueItem {
  tray: Tray;
  priority: number; // Higher number = higher priority
  lastAttempt?: Date;
  retryCount: number;
}

export class GlobalSyncManager {
  private static instance: GlobalSyncManager | null = null;
  private syncInterval: any = null;
  private syncQueue: SyncQueueItem[] = [];
  private activeSyncs = new Set<string>(); // Track active sync operations by tray ID
  private readonly DEFAULT_SYNC_INTERVAL = 60000; // 60 seconds
  private readonly MAX_CONCURRENT_SYNCS = 3;
  private readonly MAX_RETRY_COUNT = 3;
  private isRunning = false;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): GlobalSyncManager {
    if (!GlobalSyncManager.instance) {
      GlobalSyncManager.instance = new GlobalSyncManager();
    }
    return GlobalSyncManager.instance;
  }

  /**
   * Start the global sync scheduler
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }

    console.log('Starting global sync manager');
    this.isRunning = true;
    
    // Stop individual tray auto-uploads to avoid conflicts
    stopAllAutoUploads();
    
    // Start the main sync loop
    const setIntervalFn = (typeof window !== 'undefined' && window.setInterval) || setInterval;
    this.syncInterval = setIntervalFn(() => {
      this.processSync();
    }, this.DEFAULT_SYNC_INTERVAL);

    // Process initial sync
    this.processSync();
  }

  /**
   * Stop the global sync scheduler
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping global sync manager');
    this.isRunning = false;

    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Clear any pending syncs
    this.syncQueue = [];
    this.activeSyncs.clear();
  }

  /**
   * Force a sync check immediately
   */
  public forceSyncCheck(): void {
    if (this.isRunning) {
      this.processSync();
    }
  }

  /**
   * Add a tray to the sync queue with priority
   */
  public queueTraySync(tray: Tray, priority = 1): void {
    if (!this.shouldSyncTray(tray)) {
      return;
    }

    // Remove existing queue item for this tray
    this.syncQueue = this.syncQueue.filter(item => item.tray.id !== tray.id);

    // Add to queue
    this.syncQueue.push({
      tray,
      priority,
      retryCount: 0
    });

    // Sort queue by priority (highest first)
    this.syncQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a tray from sync operations
   */
  public removeTrayFromSync(trayId: string): void {
    this.syncQueue = this.syncQueue.filter(item => item.tray.id !== trayId);
    this.activeSyncs.delete(trayId);
  }

  /**
   * Get current sync status information
   */
  public getSyncStatus(): {
    isRunning: boolean;
    queueLength: number;
    activeSyncs: number;
    networkTrays: number;
    autoSyncTrays: number;
  } {
    const rootTray = element2TrayMap.get(getRootElement() as HTMLDivElement);
    const networkTrays = rootTray ? this.getAllNetworkTrays(rootTray) : [];
    const autoSyncTrays = networkTrays.filter(tray => this.shouldSyncTray(tray));

    return {
      isRunning: this.isRunning,
      queueLength: this.syncQueue.length,
      activeSyncs: this.activeSyncs.size,
      networkTrays: networkTrays.length,
      autoSyncTrays: autoSyncTrays.length
    };
  }

  /**
   * Get detailed resource usage statistics for debugging
   */
  public getResourceStats(): {
    queueItems: number;
    activeSyncs: number;
    intervalActive: boolean;
    memoryEstimate: string;
  } {
    const queueMemory = this.syncQueue.length * 200; // Rough estimate per queue item
    const activeSyncMemory = this.activeSyncs.size * 100; // Rough estimate per active sync
    const totalMemory = queueMemory + activeSyncMemory;

    return {
      queueItems: this.syncQueue.length,
      activeSyncs: this.activeSyncs.size,
      intervalActive: this.syncInterval != null,
      memoryEstimate: `~${totalMemory} bytes`
    };
  }

  /**
   * Perform comprehensive data integrity check on all network trays
   */
  public async performIntegrityCheck(): Promise<{
    totalTrays: number;
    validTrays: number;
    invalidTrays: number;
    warnings: number;
    details: Array<{
      trayId: string;
      trayName: string;
      isValid: boolean;
      errorCount: number;
      warningCount: number;
    }>;
  }> {
    const rootTray = element2TrayMap.get(getRootElement() as HTMLDivElement);
    if (!rootTray) {
      return {
        totalTrays: 0,
        validTrays: 0,
        invalidTrays: 0,
        warnings: 0,
        details: []
      };
    }

    const networkTrays = this.getAllNetworkTrays(rootTray);
    const results = {
      totalTrays: networkTrays.length,
      validTrays: 0,
      invalidTrays: 0,
      warnings: 0,
      details: [] as Array<{
        trayId: string;
        trayName: string;
        isValid: boolean;
        errorCount: number;
        warningCount: number;
      }>
    };

    for (const tray of networkTrays) {
      const validation = dataIntegrityManager.validateTray(tray);
      
      results.details.push({
        trayId: tray.id,
        trayName: tray.name,
        isValid: validation.isValid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length
      });

      if (validation.isValid) {
        results.validTrays++;
      } else {
        results.invalidTrays++;
      }
      
      results.warnings += validation.warnings.length;
    }

    console.log('Data integrity check completed:', results);
    return results;
  }

  /**
   * Get recovery options for a specific tray
   */
  public async getRecoveryOptions(trayId: string): Promise<Array<{
    id: string;
    label: string;
    description: string;
    riskLevel: 'low' | 'medium' | 'high';
  }>> {
    return dataIntegrityManager.getRecoveryOptions(trayId);
  }

  /**
   * Recover a tray from backup
   */
  public async recoverTrayFromBackup(backupId: string): Promise<void> {
    try {
      const recoveredTray = await dataIntegrityManager.recoverFromBackup(backupId);
      console.log(`Successfully recovered tray ${recoveredTray.name} from backup ${backupId}`);
      
      // Force sync check to update UI
      this.forceSyncCheck();
    } catch (error) {
      console.error('Tray recovery failed:', error);
      throw error;
    }
  }

  /**
   * Main sync processing loop
   */
  private async processSync(): Promise<void> {
    const state = store.getState();
    const globalAutoSyncEnabled = selectAutoUploadEnabled(state);

    if (!globalAutoSyncEnabled) {
      return;
    }

    // Periodic cleanup to prevent memory leaks
    this.cleanupStaleItems();

    // Discover and queue network-enabled trays
    this.discoverAndQueueTrays();

    // Process queue items
    await this.processQueue();
  }

  /**
   * Discover network-enabled trays and add them to queue
   */
  private discoverAndQueueTrays(): void {
    const rootTray = element2TrayMap.get(getRootElement() as HTMLDivElement);
    if (!rootTray) {
      return;
    }

    const networkTrays = this.getAllNetworkTrays(rootTray);
    
    networkTrays.forEach(tray => {
      if (this.shouldSyncTray(tray) && !this.activeSyncs.has(tray.id)) {
        // Calculate priority based on last modification or other factors
        const priority = this.calculatePriority(tray);
        this.queueTraySync(tray, priority);
      }
    });
  }

  /**
   * Process items in the sync queue
   */
  private async processQueue(): Promise<void> {
    // Limit concurrent syncs
    const availableSlots = this.MAX_CONCURRENT_SYNCS - this.activeSyncs.size;
    if (availableSlots <= 0) {
      return;
    }

    const itemsToProcess = this.syncQueue.splice(0, availableSlots);

    for (const item of itemsToProcess) {
      this.processSyncItem(item);
    }
  }

  /**
   * Process a single sync item
   */
  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    const { tray } = item;
    
    if (this.activeSyncs.has(tray.id)) {
      return; // Already syncing
    }

    this.activeSyncs.add(tray.id);
    
    try {
      // Create pre-sync backup for data safety
      let backupId: string | null = null;
      try {
        backupId = await dataIntegrityManager.createPreSyncBackup(tray);
        console.log(`Pre-sync backup created for ${tray.name}: ${backupId}`);
      } catch (backupError) {
        console.warn(`Failed to create pre-sync backup for ${tray.name}:`, backupError);
        // Continue with sync even if backup fails, but log the issue
      }

      // Validate tray data before sync
      const validation = dataIntegrityManager.validateTray(tray);
      if (!validation.isValid) {
        const errorSummary = validation.errors.map(e => e.message).join(', ');
        throw new Error(`Tray validation failed before sync: ${errorSummary}`);
      }

      if (validation.warnings.length > 0) {
        console.warn(`Tray validation warnings for ${tray.name}:`, validation.warnings);
      }

      // Update UI to show syncing status
      store.dispatch(setTraySyncStatus({ id: tray.id, status: 'syncing' }));
      
      // Perform the actual sync
      await syncTray(tray);
      
      // Update UI to show success
      store.dispatch(setTraySyncStatus({ id: tray.id, status: 'synced' }));
      syncIndicatorManager.showSyncSuccess(`Synced: ${tray.name}`);
      
      console.log(`Successfully synced tray: ${tray.name} (${tray.id})`);
      
    } catch (error) {
      console.error(`Sync failed for tray ${tray.name} (${tray.id}):`, error);
      
      if (error instanceof ConflictError) {
        // Handle conflict errors differently - they need user intervention
        console.log(`Conflict detected for tray ${tray.name}, requiring manual resolution`);
        store.dispatch(setTraySyncStatus({ id: tray.id, status: 'error' }));
        store.dispatch(setNetworkError(`Sync conflict: ${error.message}`));
        syncIndicatorManager.showSyncError(`Conflict: ${tray.name}`, 'Manual resolution required');
        
        // Don't retry conflict errors automatically
        // User needs to resolve the conflict manually
        
      } else {
        // Handle regular sync errors with retry logic
        store.dispatch(setTraySyncStatus({ id: tray.id, status: 'error' }));
        store.dispatch(setNetworkError(error instanceof Error ? error.message : 'Sync failed'));
        syncIndicatorManager.showSyncError(`Sync failed: ${tray.name}`, error instanceof Error ? error.message : 'Unknown error');
        
        // Handle retry logic
        item.retryCount++;
        item.lastAttempt = new Date();
        
        if (item.retryCount < this.MAX_RETRY_COUNT) {
          // Re-queue with lower priority and exponential backoff
          setTimeout(() => {
            item.priority = Math.max(1, item.priority - 1);
            this.syncQueue.push(item);
            this.syncQueue.sort((a, b) => b.priority - a.priority);
          }, this.calculateBackoffDelay(item.retryCount));
        }
      }
      
    } finally {
      this.activeSyncs.delete(tray.id);
    }
  }

  /**
   * Check if a tray should be synced
   */
  private shouldSyncTray(tray: Tray): boolean {
    // Must have network configuration
    if (!tray.host_url || !tray.filename) {
      return false;
    }

    // Check individual tray auto-upload setting
    const state = store.getState();
    const trayAutoUpload = selectTrayAutoUpload(state, tray.id);
    
    // Use tray-specific setting if available, otherwise use tray's autoUpload property
    return trayAutoUpload !== undefined ? trayAutoUpload : tray.autoUpload;
  }

  /**
   * Get all network-enabled trays recursively
   */
  private getAllNetworkTrays(tray: Tray): Tray[] {
    const networkTrays: Tray[] = [];
    
    if (tray.host_url && tray.filename) {
      networkTrays.push(tray);
    }
    
    tray.children.forEach(child => {
      networkTrays.push(...this.getAllNetworkTrays(child));
    });
    
    return networkTrays;
  }

  /**
   * Calculate priority for a tray (higher = more important)
   */
  private calculatePriority(tray: Tray): number {
    let priority = 1;
    
    // Higher priority for recently modified trays
    const now = Date.now();
    const ageMs = now - (tray.created_dt?.getTime() || now);
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    if (ageDays < 1) priority += 3;      // Created today
    else if (ageDays < 7) priority += 2;  // Created this week
    else if (ageDays < 30) priority += 1; // Created this month
    
    // Higher priority for trays with children (more complex)
    if (tray.children.length > 0) {
      priority += Math.min(tray.children.length, 3);
    }
    
    // Higher priority for trays with hooks (active/important)
    if (tray.hooks && tray.hooks.length > 0) {
      priority += 2;
    }
    
    return priority;
  }

  /**
   * Calculate exponential backoff delay for retries
   */
  private calculateBackoffDelay(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const baseDelay = 1000;
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000);
    return delay;
  }

  /**
   * Clean up stale queue items to prevent memory leaks
   */
  private cleanupStaleItems(): void {
    const now = Date.now();
    const MAX_QUEUE_AGE = 10 * 60 * 1000; // 10 minutes
    const MAX_QUEUE_SIZE = 100;

    // Remove items that have been in queue too long
    this.syncQueue = this.syncQueue.filter(item => {
      if (item.lastAttempt) {
        const age = now - item.lastAttempt.getTime();
        if (age > MAX_QUEUE_AGE) {
          console.log(`Removing stale queue item for tray ${item.tray.id}`);
          return false;
        }
      }
      return true;
    });

    // Limit queue size to prevent unbounded growth
    if (this.syncQueue.length > MAX_QUEUE_SIZE) {
      console.log(`Queue size ${this.syncQueue.length} exceeds limit, trimming to ${MAX_QUEUE_SIZE}`);
      this.syncQueue = this.syncQueue.slice(0, MAX_QUEUE_SIZE);
    }

    // Clean up orphaned active syncs (should not happen, but defensive programming)
    const activeIds = Array.from(this.activeSyncs);
    activeIds.forEach(id => {
      const rootTray = element2TrayMap.get(getRootElement() as HTMLDivElement);
      if (rootTray) {
        const allTrays = this.getAllNetworkTrays(rootTray);
        const trayExists = allTrays.some(tray => tray.id === id);
        if (!trayExists) {
          console.log(`Cleaning up orphaned active sync for tray ${id}`);
          this.activeSyncs.delete(id);
        }
      }
    });
  }
}

// Export singleton instance
export const globalSyncManager = GlobalSyncManager.getInstance();

// Auto-start function to be called after all modules are loaded
export function initializeGlobalSync() {
  if (typeof window !== 'undefined') {
    const state = store.getState();
    if (selectAutoUploadEnabled(state)) {
      globalSyncManager.start();
    }
  }
}

// Listen for global auto-sync state changes
store.subscribe(() => {
  const currentState = store.getState();
  const autoSyncEnabled = selectAutoUploadEnabled(currentState);
  
  if (autoSyncEnabled && !globalSyncManager.getSyncStatus().isRunning) {
    globalSyncManager.start();
  } else if (!autoSyncEnabled && globalSyncManager.getSyncStatus().isRunning) {
    globalSyncManager.stop();
  }
});

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalSyncManager.stop();
  });
}