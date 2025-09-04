/**
 * Sync Status Indicators
 * 
 * Provides visual indicators for sync status, progress, and errors across the application.
 * Integrates with Redux state and global sync manager for real-time updates.
 */

import store from './store';
import { selectTraySyncStatus, selectNetworkError, selectAutoUploadEnabled, shouldShowNotification } from './state';
import { globalSyncManager } from './globalSync';
import { Tray } from './tray';
import { element2TrayMap } from './app';
import { dataIntegrityManager } from './dataIntegrity';

export interface SyncIndicatorOptions {
  showProgress?: boolean;
  showErrors?: boolean;
  showStatus?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoHide?: boolean;
  hideDelay?: number;
}

/**
 * Main sync indicator manager
 */
export class SyncIndicatorManager {
  private static instance: SyncIndicatorManager | null = null;
  private globalIndicator: HTMLElement | null = null;
  private trayIndicators = new Map<string, HTMLElement>();
  private notificationQueue: HTMLElement[] = [];
  private options: SyncIndicatorOptions;

  private constructor(options: SyncIndicatorOptions = {}) {
    this.options = {
      showProgress: true,
      showErrors: true,
      showStatus: true,
      position: 'top-right',
      autoHide: true,
      hideDelay: 5000,
      ...options
    };
  }

  public static getInstance(options?: SyncIndicatorOptions): SyncIndicatorManager {
    if (!SyncIndicatorManager.instance) {
      SyncIndicatorManager.instance = new SyncIndicatorManager(options);
    }
    return SyncIndicatorManager.instance;
  }

  /**
   * Initialize the indicator system
   */
  public initialize(): void {
    this.createGlobalIndicator();
    this.setupStateListener();
    this.createStyles();
    console.log('Sync indicator system initialized');
  }

  /**
   * Create global sync status indicator
   */
  private createGlobalIndicator(): void {
    if (this.globalIndicator) return;

    this.globalIndicator = document.createElement('div');
    this.globalIndicator.className = 'sync-global-indicator';
    this.globalIndicator.style.cssText = this.getGlobalIndicatorStyles();
    
    document.body.appendChild(this.globalIndicator);
    this.updateGlobalIndicator();
  }

  /**
   * Update global sync indicator based on current state
   */
  private updateGlobalIndicator(): void {
    if (!this.globalIndicator) return;

    const state = store.getState();
    const autoSyncEnabled = selectAutoUploadEnabled(state);
    const syncStatus = globalSyncManager.getSyncStatus();
    const networkError = selectNetworkError(state);

    let icon = '🔄';
    let title = 'Auto-Sync';
    let statusClass = 'idle';

    if (!autoSyncEnabled) {
      icon = '⏸️';
      title = 'Auto-Sync: Disabled';
      statusClass = 'disabled';
    } else if (networkError) {
      icon = '❌';
      title = `Sync Error: ${networkError}`;
      statusClass = 'error';
    } else if (syncStatus.activeSyncs > 0) {
      icon = '🔄';
      title = `Syncing ${syncStatus.activeSyncs} tray(s)...`;
      statusClass = 'syncing';
    } else if (syncStatus.queueLength > 0) {
      icon = '⏳';
      title = `${syncStatus.queueLength} tray(s) queued for sync`;
      statusClass = 'pending';
    } else if (syncStatus.autoSyncTrays > 0) {
      icon = '✅';
      title = `Auto-sync active (${syncStatus.autoSyncTrays} trays)`;
      statusClass = 'active';
    }

    this.globalIndicator.innerHTML = `
      <div class="sync-indicator-content">
        <span class="sync-icon">${icon}</span>
        <span class="sync-text">${syncStatus.autoSyncTrays}</span>
      </div>
    `;
    
    this.globalIndicator.title = title;
    this.globalIndicator.className = `sync-global-indicator ${statusClass}`;
    
    // Add click handler for details
    this.globalIndicator.onclick = () => this.showSyncDetails();
  }

  /**
   * Add sync indicator to a tray element
   */
  public addTrayIndicator(tray: Tray, element: HTMLElement): void {
    if (!tray.host_url || !tray.filename) return;

    const indicator = document.createElement('div');
    indicator.className = 'sync-tray-indicator';
    indicator.style.cssText = this.getTrayIndicatorStyles();
    
    element.appendChild(indicator);
    this.trayIndicators.set(tray.id, indicator);
    this.updateTrayIndicator(tray.id);
  }

  /**
   * Update tray-specific sync indicator
   */
  public updateTrayIndicator(trayId: string): void {
    const indicator = this.trayIndicators.get(trayId);
    if (!indicator) return;

    const state = store.getState();
    const syncStatus = selectTraySyncStatus(state, trayId);
    
    let icon = '';
    let statusClass = '';
    let title = '';

    switch (syncStatus) {
      case 'syncing':
        icon = '🔄';
        statusClass = 'syncing';
        title = 'Syncing...';
        break;
      case 'synced':
        icon = '✅';
        statusClass = 'synced';
        title = 'Synced';
        break;
      case 'error':
        icon = '❌';
        statusClass = 'error';
        title = 'Sync failed';
        break;
      default:
        icon = '⏳';
        statusClass = 'pending';
        title = 'Pending sync';
    }

    indicator.innerHTML = icon;
    indicator.className = `sync-tray-indicator ${statusClass}`;
    indicator.title = title;

    // Auto-hide synced status after delay
    if (syncStatus === 'synced' && this.options.autoHide) {
      setTimeout(() => {
        if (indicator.className.includes('synced')) {
          indicator.style.opacity = '0.3';
        }
      }, this.options.hideDelay || 5000);
    }
  }

  /**
   * Remove tray indicator
   */
  public removeTrayIndicator(trayId: string): void {
    const indicator = this.trayIndicators.get(trayId);
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
      this.trayIndicators.delete(trayId);
    }
  }

  /**
   * Show sync progress notification
   */
  public showSyncProgress(message: string, progress?: number): void {
    if (!this.options.showProgress || !shouldShowNotification('sync-progress')) return;

    const notification = this.createNotification('progress', message, progress);
    this.showNotification(notification);
  }

  /**
   * Show sync error notification
   */
  public showSyncError(message: string, details?: string): void {
    if (!this.options.showErrors || !shouldShowNotification('sync-error')) return;

    const notification = this.createNotification('error', message, undefined, details);
    this.showNotification(notification);
  }

  /**
   * Show sync success notification
   */
  public showSyncSuccess(message: string): void {
    if (!shouldShowNotification('sync-success')) return;
    
    const notification = this.createNotification('success', message);
    this.showNotification(notification);
  }

  /**
   * Create notification element
   */
  private createNotification(
    type: 'progress' | 'error' | 'success',
    message: string,
    progress?: number,
    details?: string
  ): HTMLElement {
    const notification = document.createElement('div');
    notification.className = `sync-notification sync-notification-${type}`;
    notification.style.cssText = this.getNotificationStyles(type);

    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔄';
    
    let content = `
      <div class="sync-notification-header">
        <span class="sync-notification-icon">${icon}</span>
        <span class="sync-notification-message">${message}</span>
        <button class="sync-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    if (progress !== undefined) {
      content += `
        <div class="sync-progress-bar">
          <div class="sync-progress-fill" style="width: ${progress}%"></div>
        </div>
      `;
    }

    if (details) {
      content += `
        <div class="sync-notification-details">${details}</div>
      `;
    }

    notification.innerHTML = content;
    return notification;
  }

  /**
   * Show notification with auto-remove
   */
  private showNotification(notification: HTMLElement): void {
    document.body.appendChild(notification);
    this.notificationQueue.push(notification);

    // Position notifications
    this.updateNotificationPositions();

    // Auto-remove after delay
    if (this.options.autoHide) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, this.options.hideDelay || 5000);
    }
  }

  /**
   * Remove notification
   */
  private removeNotification(notification: HTMLElement): void {
    if (notification.parentNode) {
      notification.style.transition = 'opacity 0.3s, transform 0.3s';
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        this.notificationQueue = this.notificationQueue.filter(n => n !== notification);
        this.updateNotificationPositions();
      }, 300);
    }
  }

  /**
   * Update notification positions to stack properly
   */
  private updateNotificationPositions(): void {
    this.notificationQueue.forEach((notification, index) => {
      const offset = index * 80; // Stack vertically
      notification.style.transform = `translateY(${offset}px)`;
    });
  }

  /**
   * Show detailed sync status modal
   */
  private showSyncDetails(): void {
    const state = store.getState();
    const syncStatus = globalSyncManager.getSyncStatus();
    const networkError = selectNetworkError(state);
    const resourceStats = globalSyncManager.getResourceStats();

    const modal = document.createElement('div');
    modal.className = 'sync-details-modal';
    modal.style.cssText = this.getModalStyles();

    modal.innerHTML = `
      <div class="sync-details-content">
        <div class="sync-details-header">
          <h3>Sync Status Details</h3>
          <button class="sync-details-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
        </div>
        
        <div class="sync-details-body">
          <div class="sync-status-grid">
            <div class="sync-status-item">
              <strong>Status:</strong> ${syncStatus.isRunning ? 'Running' : 'Stopped'}
            </div>
            <div class="sync-status-item">
              <strong>Active Syncs:</strong> ${syncStatus.activeSyncs}
            </div>
            <div class="sync-status-item">
              <strong>Queue Length:</strong> ${syncStatus.queueLength}
            </div>
            <div class="sync-status-item">
              <strong>Network Trays:</strong> ${syncStatus.networkTrays}
            </div>
            <div class="sync-status-item">
              <strong>Auto-Sync Trays:</strong> ${syncStatus.autoSyncTrays}
            </div>
            <div class="sync-status-item">
              <strong>Memory Usage:</strong> ${resourceStats.memoryEstimate}
            </div>
          </div>
          
          ${networkError ? `<div class="sync-error-display">
            <strong>Last Error:</strong> ${networkError}
          </div>` : ''}
          
          <div class="sync-actions">
            <button onclick="globalSyncManager.forceSyncCheck(); this.parentElement.parentElement.parentElement.parentElement.remove();">
              🔄 Force Sync Check
            </button>
            <button onclick="globalSyncManager.stop(); this.parentElement.parentElement.parentElement.parentElement.remove();">
              ⏹️ Stop Sync
            </button>
            <button onclick="globalSyncManager.start(); this.parentElement.parentElement.parentElement.parentElement.remove();">
              ▶️ Start Sync
            </button>
            <button onclick="syncIndicatorManager.showIntegrityCheck(); this.parentElement.parentElement.parentElement.parentElement.remove();">
              🔍 Data Integrity Check
            </button>
            <button onclick="syncIndicatorManager.showBackupManager(); this.parentElement.parentElement.parentElement.parentElement.remove();">
              💾 Backup Manager
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * Setup Redux state listener for real-time updates
   */
  private setupStateListener(): void {
    store.subscribe(() => {
      this.updateGlobalIndicator();
      
      // Update all tray indicators
      this.trayIndicators.forEach((_, trayId) => {
        this.updateTrayIndicator(trayId);
      });
    });
  }

  /**
   * CSS styles for components
   */
  private createStyles(): void {
    if (document.getElementById('sync-indicator-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'sync-indicator-styles';
    styles.textContent = `
      @keyframes sync-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes sync-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      .sync-global-indicator.syncing .sync-icon {
        animation: sync-spin 1s linear infinite;
      }
      
      .sync-tray-indicator.syncing {
        animation: sync-spin 1s linear infinite;
      }
      
      .sync-notification {
        transition: all 0.3s ease;
      }
      
      .sync-notification:hover {
        transform: translateX(-5px);
      }
      
      .sync-details-modal {
        backdrop-filter: blur(4px);
      }
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * Style generators for different components
   */
  private getGlobalIndicatorStyles(): string {
    const position = this.options.position || 'top-right';
    const [vPos, hPos] = position.split('-');
    
    return `
      position: fixed;
      ${vPos}: 20px;
      ${hPos}: 20px;
      background: #fff;
      border: 2px solid #ddd;
      border-radius: 8px;
      padding: 8px 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      user-select: none;
    `;
  }

  private getTrayIndicatorStyles(): string {
    return `
      position: absolute;
      top: 4px;
      right: 4px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      z-index: 100;
      transition: all 0.3s ease;
    `;
  }

  private getNotificationStyles(type: string): string {
    const colors = {
      error: '#dc3545',
      success: '#28a745', 
      progress: '#007bff'
    };
    
    return `
      position: fixed;
      top: 80px;
      right: 20px;
      background: white;
      border-left: 4px solid ${colors[type as keyof typeof colors]};
      border-radius: 6px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10001;
      min-width: 300px;
      max-width: 400px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
    `;
  }

  private getModalStyles(): string {
    return `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
      font-family: system-ui, -apple-system, sans-serif;
    `;
  }

  /**
   * Show data integrity check modal
   */
  public async showIntegrityCheck(): Promise<void> {
    try {
      this.showSyncProgress('Running data integrity check...', 0);
      
      const integrityResults = await globalSyncManager.performIntegrityCheck();
      
      const modal = document.createElement('div');
      modal.className = 'sync-details-modal';
      modal.style.cssText = this.getModalStyles();

      const detailsHtml = integrityResults.details.map(detail => `
        <div class="integrity-check-item ${detail.isValid ? 'valid' : 'invalid'}">
          <div class="tray-info">
            <strong>${detail.trayName}</strong> (${detail.trayId})
          </div>
          <div class="validation-status">
            ${detail.isValid ? '✅ Valid' : '❌ Invalid'}
            ${detail.errorCount > 0 ? ` - ${detail.errorCount} errors` : ''}
            ${detail.warningCount > 0 ? ` - ${detail.warningCount} warnings` : ''}
          </div>
          ${!detail.isValid ? `
            <button onclick="syncIndicatorManager.showRecoveryOptions('${detail.trayId}')">
              🔧 Recovery Options
            </button>
          ` : ''}
        </div>
      `).join('');

      modal.innerHTML = `
        <div class="sync-details-content">
          <div class="sync-details-header">
            <h3>Data Integrity Check Results</h3>
            <button class="sync-details-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
          </div>
          
          <div class="sync-details-body">
            <div class="integrity-summary">
              <div class="summary-item">
                <strong>Total Trays:</strong> ${integrityResults.totalTrays}
              </div>
              <div class="summary-item">
                <strong>Valid:</strong> <span class="valid-count">${integrityResults.validTrays}</span>
              </div>
              <div class="summary-item">
                <strong>Invalid:</strong> <span class="invalid-count">${integrityResults.invalidTrays}</span>
              </div>
              <div class="summary-item">
                <strong>Warnings:</strong> ${integrityResults.warnings}
              </div>
            </div>
            
            <div class="integrity-details">
              <h4>Tray Details:</h4>
              ${detailsHtml || '<p>No trays found.</p>'}
            </div>
            
            <div class="sync-actions">
              <button onclick="this.parentElement.parentElement.parentElement.remove();">
                Close
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      
      // Close on background click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });

      this.removeNotification(document.querySelector('.sync-notification-progress') as HTMLElement);
      
    } catch (error) {
      this.showSyncError('Integrity check failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Show backup manager modal
   */
  public async showBackupManager(): Promise<void> {
    try {
      const backupStats = await dataIntegrityManager.getBackupStats();
      
      const modal = document.createElement('div');
      modal.className = 'sync-details-modal';
      modal.style.cssText = this.getModalStyles();

      modal.innerHTML = `
        <div class="sync-details-content">
          <div class="sync-details-header">
            <h3>Backup Manager</h3>
            <button class="sync-details-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
          </div>
          
          <div class="sync-details-body">
            <div class="backup-summary">
              <div class="summary-item">
                <strong>Total Backups:</strong> ${backupStats.totalBackups}
              </div>
              <div class="summary-item">
                <strong>Total Size:</strong> ${Math.round(backupStats.totalSize / 1024)}KB
              </div>
              <div class="summary-item">
                <strong>Oldest:</strong> ${backupStats.oldestBackup ? backupStats.oldestBackup.toLocaleString() : 'N/A'}
              </div>
              <div class="summary-item">
                <strong>Newest:</strong> ${backupStats.newestBackup ? backupStats.newestBackup.toLocaleString() : 'N/A'}
              </div>
            </div>
            
            <div class="backup-operations">
              <h4>Operations by Type:</h4>
              ${Object.entries(backupStats.backupsByOperation).map(([operation, count]) => `
                <div class="operation-count">
                  <strong>${operation}:</strong> ${count}
                </div>
              `).join('')}
            </div>
            
            <div class="sync-actions">
              <button onclick="dataIntegrityManager.cleanupBackups(); this.parentElement.parentElement.parentElement.parentElement.remove();">
                🧹 Cleanup Old Backups
              </button>
              <button onclick="this.parentElement.parentElement.parentElement.remove();">
                Close
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      
      // Close on background click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });
      
    } catch (error) {
      this.showSyncError('Failed to load backup manager', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Show recovery options for a specific tray
   */
  public async showRecoveryOptions(trayId: string): Promise<void> {
    try {
      const recoveryOptions = await globalSyncManager.getRecoveryOptions(trayId);
      
      if (recoveryOptions.length === 0) {
        this.showSyncError('No recovery options available', 'No backups found for this tray');
        return;
      }
      
      const modal = document.createElement('div');
      modal.className = 'sync-details-modal';
      modal.style.cssText = this.getModalStyles();

      const optionsHtml = recoveryOptions.map(option => `
        <div class="recovery-option risk-${option.riskLevel}">
          <div class="recovery-option-header">
            <strong>${option.label}</strong>
            <span class="risk-badge risk-${option.riskLevel}">${option.riskLevel.toUpperCase()} RISK</span>
          </div>
          <div class="recovery-option-description">
            ${option.description}
          </div>
          <button onclick="syncIndicatorManager.performRecovery('${option.id}'); this.parentElement.parentElement.parentElement.parentElement.remove();">
            Restore from this backup
          </button>
        </div>
      `).join('');

      modal.innerHTML = `
        <div class="sync-details-content">
          <div class="sync-details-header">
            <h3>Recovery Options</h3>
            <button class="sync-details-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
          </div>
          
          <div class="sync-details-body">
            <div class="recovery-warning">
              ⚠️ Recovery will replace the current tray data. Make sure you understand the implications.
            </div>
            
            <div class="recovery-options">
              ${optionsHtml}
            </div>
            
            <div class="sync-actions">
              <button onclick="this.parentElement.parentElement.parentElement.remove();">
                Cancel
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      
      // Close on background click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });
      
    } catch (error) {
      this.showSyncError('Failed to load recovery options', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Perform recovery from backup
   */
  public async performRecovery(backupId: string): Promise<void> {
    try {
      this.showSyncProgress('Recovering tray from backup...', 50);
      
      await globalSyncManager.recoverTrayFromBackup(backupId);
      
      this.showSyncSuccess('Tray recovered successfully');
    } catch (error) {
      this.showSyncError('Recovery failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

// Export singleton instance
export const syncIndicatorManager = SyncIndicatorManager.getInstance();