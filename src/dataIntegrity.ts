/**
 * Data Integrity Manager
 * 
 * Provides comprehensive data backup, validation, and recovery mechanisms
 * to ensure data safety during sync operations and prevent data corruption.
 */

import { Tray } from './tray';
// Note: serialize/deserialize functions are passed as parameters to avoid circular dependency
import { element2TrayMap } from './app';
import { getRootElement } from './utils';
import { syncIndicatorManager } from './syncIndicators';

export interface BackupEntry {
  id: string;
  timestamp: Date;
  trayId: string;
  trayName: string;
  operation: 'pre-sync' | 'pre-conflict' | 'manual' | 'scheduled';
  data: string; // Serialized tray data
  checksum: string;
  metadata: {
    version: string;
    size: number;
    childCount: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'structure' | 'reference' | 'data' | 'checksum';
  message: string;
  trayId?: string;
  field?: string;
}

export interface ValidationWarning {
  type: 'performance' | 'compatibility' | 'data';
  message: string;
  trayId?: string;
}

export interface RecoveryOption {
  id: string;
  label: string;
  description: string;
  backupEntry: BackupEntry;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Main data integrity manager
 */
export class DataIntegrityManager {
  private static instance: DataIntegrityManager | null = null;
  private readonly BACKUP_STORAGE_KEY = 'tray_backups';
  private readonly MAX_BACKUPS_PER_TRAY = 10;
  private readonly MAX_TOTAL_BACKUPS = 100;
  private readonly BACKUP_CLEANUP_DAYS = 30;

  private constructor() {}

  public static getInstance(): DataIntegrityManager {
    if (!DataIntegrityManager.instance) {
      DataIntegrityManager.instance = new DataIntegrityManager();
    }
    return DataIntegrityManager.instance;
  }

  /**
   * Create a backup of a tray before potentially risky operations
   */
  public async createBackup(
    tray: Tray, 
    operation: BackupEntry['operation'] = 'manual',
    serializeFn?: (tray: Tray) => string
  ): Promise<string> {
    try {
      const serializedData = serializeFn ? serializeFn(tray) : JSON.stringify(tray);
      const checksum = await this.calculateChecksum(serializedData);
      
      const backupEntry: BackupEntry = {
        id: `backup_${tray.id}_${Date.now()}`,
        timestamp: new Date(),
        trayId: tray.id,
        trayName: tray.name,
        operation,
        data: serializedData,
        checksum,
        metadata: {
          version: '1.0', // Application version
          size: serializedData.length,
          childCount: this.countChildren(tray)
        }
      };

      await this.storeBackup(backupEntry);
      console.log(`Backup created for tray ${tray.name}: ${backupEntry.id}`);
      
      return backupEntry.id;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error(`Backup creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate tray data integrity
   */
  public validateTray(tray: Tray): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Structure validation
    if (!tray.id || typeof tray.id !== 'string') {
      errors.push({
        type: 'structure',
        message: 'Tray ID is missing or invalid',
        trayId: tray.id
      });
    }

    if (!tray.name || typeof tray.name !== 'string') {
      errors.push({
        type: 'structure',
        message: 'Tray name is missing or invalid',
        trayId: tray.id
      });
    }

    if (!Array.isArray(tray.children)) {
      errors.push({
        type: 'structure',
        message: 'Tray children array is invalid',
        trayId: tray.id
      });
    }

    // Reference validation
    if (tray.children && Array.isArray(tray.children)) {
      tray.children.forEach((child, index) => {
        if (!child || typeof child !== 'object') {
          errors.push({
            type: 'reference',
            message: `Child at index ${index} is null or invalid`,
            trayId: tray.id
          });
        } else if (child.parentId !== tray.id) {
          errors.push({
            type: 'reference',
            message: `Child ${child.id} has incorrect parentId`,
            trayId: tray.id
          });
        }
      });
    }

    // Data validation
    if (tray.created_dt && !(tray.created_dt instanceof Date)) {
      warnings.push({
        type: 'data',
        message: 'Created date is not a Date object',
        trayId: tray.id
      });
    }

    if (tray.borderColor && !/^#[0-9A-Fa-f]{6}$/.test(tray.borderColor)) {
      warnings.push({
        type: 'data',
        message: 'Border color format may be invalid',
        trayId: tray.id
      });
    }

    // Performance warnings
    const childCount = this.countChildren(tray);
    if (childCount > 1000) {
      warnings.push({
        type: 'performance',
        message: `Large number of children (${childCount}) may impact performance`,
        trayId: tray.id
      });
    }

    const serializedSize = JSON.stringify(tray).length;
    if (serializedSize > 1024 * 1024) { // 1MB
      warnings.push({
        type: 'performance',
        message: `Large tray size (${Math.round(serializedSize / 1024)}KB) may impact sync performance`,
        trayId: tray.id
      });
    }

    // Recursive validation for children
    if (tray.children && Array.isArray(tray.children)) {
      tray.children.forEach(child => {
        const childResult = this.validateTray(child);
        errors.push(...childResult.errors);
        warnings.push(...childResult.warnings);
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get recovery options for a tray
   */
  public async getRecoveryOptions(trayId: string): Promise<RecoveryOption[]> {
    const backups = await this.getBackupsForTray(trayId);
    
    return backups.map(backup => ({
      id: backup.id,
      label: `${backup.operation} - ${backup.timestamp.toLocaleString()}`,
      description: `Backup from ${backup.operation} operation at ${backup.timestamp.toLocaleString()}`,
      backupEntry: backup,
      riskLevel: this.assessRecoveryRisk(backup)
    }));
  }

  /**
   * Recover a tray from backup
   */
  public async recoverFromBackup(backupId: string, deserializeFn?: (data: string) => Tray): Promise<Tray> {
    try {
      const backup = await this.getBackup(backupId);
      if (!backup) {
        throw new Error(`Backup ${backupId} not found`);
      }

      // Validate backup integrity
      const calculatedChecksum = await this.calculateChecksum(backup.data);
      if (calculatedChecksum !== backup.checksum) {
        throw new Error('Backup data integrity check failed - checksum mismatch');
      }

      // Deserialize tray data
      const recoveredTray = deserializeFn ? deserializeFn(backup.data) : JSON.parse(backup.data) as Tray;
      
      // Validate recovered tray
      const validation = this.validateTray(recoveredTray);
      if (!validation.isValid) {
        const errorSummary = validation.errors.map(e => e.message).join(', ');
        throw new Error(`Recovered tray validation failed: ${errorSummary}`);
      }

      console.log(`Successfully recovered tray ${recoveredTray.name} from backup ${backupId}`);
      syncIndicatorManager.showSyncSuccess(`Recovered: ${recoveredTray.name}`);
      
      return recoveredTray;
    } catch (error) {
      console.error('Recovery failed:', error);
      syncIndicatorManager.showSyncError('Recovery failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Create pre-sync backup automatically
   */
  public async createPreSyncBackup(tray: Tray, serializeFn?: (tray: Tray) => string): Promise<string> {
    return this.createBackup(tray, 'pre-sync', serializeFn);
  }

  /**
   * Create pre-conflict backup automatically
   */
  public async createPreConflictBackup(tray: Tray, serializeFn?: (tray: Tray) => string): Promise<string> {
    return this.createBackup(tray, 'pre-conflict', serializeFn);
  }

  /**
   * Cleanup old backups to prevent storage bloat
   */
  public async cleanupBackups(): Promise<void> {
    try {
      const allBackups = await this.getAllBackups();
      const now = Date.now();
      const cutoffTime = now - (this.BACKUP_CLEANUP_DAYS * 24 * 60 * 60 * 1000);

      // Remove old backups
      const backupsToKeep = allBackups.filter(backup => 
        backup.timestamp.getTime() > cutoffTime
      );

      // Sort by timestamp (newest first) and limit per tray
      const trayBackupCounts = new Map<string, number>();
      const finalBackups = backupsToKeep
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .filter(backup => {
          const count = trayBackupCounts.get(backup.trayId) || 0;
          if (count < this.MAX_BACKUPS_PER_TRAY) {
            trayBackupCounts.set(backup.trayId, count + 1);
            return true;
          }
          return false;
        });

      // Limit total backups
      const limitedBackups = finalBackups.slice(0, this.MAX_TOTAL_BACKUPS);

      // Store filtered backups
      await this.storeAllBackups(limitedBackups);
      
      const removedCount = allBackups.length - limitedBackups.length;
      console.log(`Backup cleanup completed: removed ${removedCount} old backups`);
    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  }

  /**
   * Get backup statistics
   */
  public async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
    backupsByOperation: Record<string, number>;
  }> {
    const backups = await this.getAllBackups();
    
    const stats = {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, backup) => sum + backup.data.length, 0),
      oldestBackup: backups.length > 0 ? new Date(Math.min(...backups.map(b => b.timestamp.getTime()))) : undefined,
      newestBackup: backups.length > 0 ? new Date(Math.max(...backups.map(b => b.timestamp.getTime()))) : undefined,
      backupsByOperation: {} as Record<string, number>
    };

    backups.forEach(backup => {
      stats.backupsByOperation[backup.operation] = (stats.backupsByOperation[backup.operation] || 0) + 1;
    });

    return stats;
  }

  // Private helper methods

  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private countChildren(tray: Tray): number {
    let count = tray.children ? tray.children.length : 0;
    if (tray.children) {
      tray.children.forEach(child => {
        count += this.countChildren(child);
      });
    }
    return count;
  }

  private async storeBackup(backup: BackupEntry): Promise<void> {
    const backups = await this.getAllBackups();
    backups.push(backup);
    await this.storeAllBackups(backups);
  }

  private async getAllBackups(): Promise<BackupEntry[]> {
    try {
      const stored = localStorage.getItem(this.BACKUP_STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return parsed.map((backup: any) => ({
        ...backup,
        timestamp: new Date(backup.timestamp)
      }));
    } catch (error) {
      console.error('Failed to load backups:', error);
      return [];
    }
  }

  private async storeAllBackups(backups: BackupEntry[]): Promise<void> {
    try {
      localStorage.setItem(this.BACKUP_STORAGE_KEY, JSON.stringify(backups));
    } catch (error) {
      console.error('Failed to store backups:', error);
      throw new Error('Failed to store backup data');
    }
  }

  private async getBackupsForTray(trayId: string): Promise<BackupEntry[]> {
    const allBackups = await this.getAllBackups();
    return allBackups
      .filter(backup => backup.trayId === trayId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private async getBackup(backupId: string): Promise<BackupEntry | null> {
    const allBackups = await this.getAllBackups();
    return allBackups.find(backup => backup.id === backupId) || null;
  }

  private assessRecoveryRisk(backup: BackupEntry): 'low' | 'medium' | 'high' {
    const ageHours = (Date.now() - backup.timestamp.getTime()) / (1000 * 60 * 60);
    
    if (ageHours < 1) return 'low';
    if (ageHours < 24) return 'medium';
    return 'high';
  }
}

// Export singleton instance
export const dataIntegrityManager = DataIntegrityManager.getInstance();

// Schedule periodic cleanup (browser only)
if (typeof window !== 'undefined') {
  setInterval(() => {
    dataIntegrityManager.cleanupBackups();
  }, 24 * 60 * 60 * 1000); // Daily cleanup
}