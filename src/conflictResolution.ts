/**
 * Conflict Resolution System
 * 
 * Provides enhanced conflict detection and resolution strategies for tray synchronization.
 * Handles conflicts when both local and remote versions have changed.
 */

import { Tray } from './tray';
import { serializeAsync } from './io';

export class ConflictError extends Error {
  public conflictType: 'both_updated' | 'timestamp_conflict' | 'structure_conflict';
  public localTray: Tray;
  public remoteTray: Tray;

  constructor(message: string, conflictType: ConflictError['conflictType'], localTray: Tray, remoteTray: Tray) {
    super(message);
    this.name = 'ConflictError';
    this.conflictType = conflictType;
    this.localTray = localTray;
    this.remoteTray = remoteTray;
  }
}

export interface ConflictDetectionResult {
  action: 'upload' | 'download' | 'conflict' | 'nothing';
  reason: string;
  localChanged: boolean;
  remoteChanged: boolean;
  conflictType?: ConflictError['conflictType'];
}

export interface TrayStateSnapshot {
  id: string;
  name: string;
  created_dt: Date;
  lastModified?: Date;
  contentHash: string;
  structureHash: string;
  childrenIds: string[];
  properties: Record<string, any>;
  hooks: string[];
  isDone: boolean;
}

const lastKnownStates = new Map<string, TrayStateSnapshot>();

export async function createTraySnapshot(tray: Tray): Promise<TrayStateSnapshot> {
  const serialized = await serializeAsync(tray);
  const contentHash = await hashString(serialized);
  const structureHash = await hashString(JSON.stringify({
    childrenIds: tray.children.map(c => c.id),
    parentId: tray.parentId
  }));

  return {
    id: tray.id,
    name: tray.name,
    created_dt: tray.created_dt,
    lastModified: new Date(),
    contentHash,
    structureHash,
    childrenIds: tray.children.map(c => c.id),
    properties: { ...tray.properties },
    hooks: [...tray.hooks],
    isDone: tray.isDone
  };
}

export async function detectConflict(localTray: Tray, remoteTray: Tray): Promise<ConflictDetectionResult> {
  const lastKnown = lastKnownStates.get(localTray.id);
  
  if (!lastKnown) {
    // No baseline - assume remote is authoritative if it exists
    if (remoteTray) {
      return {
        action: 'download',
        reason: 'No local baseline, downloading remote version',
        localChanged: false,
        remoteChanged: true
      };
    } else {
      return {
        action: 'upload',
        reason: 'New local tray, uploading',
        localChanged: true,
        remoteChanged: false
      };
    }
  }

  // Create current snapshots
  const localSnapshot = await createTraySnapshot(localTray);
  const remoteSnapshot = await createTraySnapshot(remoteTray);

  // Check if local has changed from last known state
  const localChanged = 
    localSnapshot.contentHash !== lastKnown.contentHash ||
    localSnapshot.structureHash !== lastKnown.structureHash ||
    localSnapshot.name !== lastKnown.name ||
    localSnapshot.isDone !== lastKnown.isDone ||
    JSON.stringify(localSnapshot.properties) !== JSON.stringify(lastKnown.properties) ||
    JSON.stringify(localSnapshot.hooks) !== JSON.stringify(lastKnown.hooks);

  // Check if remote has changed from last known state
  const remoteChanged = 
    remoteSnapshot.contentHash !== lastKnown.contentHash ||
    remoteSnapshot.structureHash !== lastKnown.structureHash ||
    remoteSnapshot.name !== lastKnown.name ||
    remoteSnapshot.isDone !== lastKnown.isDone ||
    JSON.stringify(remoteSnapshot.properties) !== JSON.stringify(lastKnown.properties) ||
    JSON.stringify(remoteSnapshot.hooks) !== JSON.stringify(lastKnown.hooks);

  // Apply conflict resolution logic based on your specifications
  if (localChanged && !remoteChanged) {
    // Local updated + Remote unchanged → Upload
    return {
      action: 'upload',
      reason: 'Local changes detected, remote unchanged',
      localChanged: true,
      remoteChanged: false
    };
  } else if (!localChanged && remoteChanged) {
    // Local unchanged + Remote updated → Download
    return {
      action: 'download',
      reason: 'Remote changes detected, local unchanged',
      localChanged: false,
      remoteChanged: true
    };
  } else if (localChanged && remoteChanged) {
    // Both updated → Conflict
    let conflictType: ConflictError['conflictType'] = 'both_updated';
    
    if (localSnapshot.structureHash !== remoteSnapshot.structureHash) {
      conflictType = 'structure_conflict';
    } else if (Math.abs(localTray.created_dt.getTime() - remoteTray.created_dt.getTime()) > 1000) {
      conflictType = 'timestamp_conflict';
    }

    return {
      action: 'conflict',
      reason: 'Both local and remote have changes',
      localChanged: true,
      remoteChanged: true,
      conflictType
    };
  } else {
    // Both unchanged → Nothing
    return {
      action: 'nothing',
      reason: 'No changes detected',
      localChanged: false,
      remoteChanged: false
    };
  }
}

export async function updateLastKnownState(tray: Tray): Promise<void> {
  try {
    const snapshot = await createTraySnapshot(tray);
    lastKnownStates.set(tray.id, snapshot);
  } catch (error) {
    console.warn(`Failed to update last known state for tray ${tray.id}:`, error);
    throw error;
  }
}

export function clearLastKnownState(trayId: string): void {
  lastKnownStates.delete(trayId);
}

export function hasLastKnownState(trayId: string): boolean {
  return lastKnownStates.has(trayId);
}

export async function resolveConflictManually(
  conflictResult: ConflictDetectionResult,
  localTray: Tray,
  remoteTray: Tray,
  userChoice: 'keep_local' | 'keep_remote' | 'merge'
): Promise<Tray> {
  switch (userChoice) {
    case 'keep_local':
      // Update last known state to local version
      await updateLastKnownState(localTray);
      return localTray;
      
    case 'keep_remote':
      // Replace local with remote and update last known state
      await updateLastKnownState(remoteTray);
      return remoteTray;
      
    case 'merge':
      // Simple merge strategy - combine properties and hooks, prefer newer timestamps
      // Update local tray with merged data
      localTray.properties = { ...remoteTray.properties, ...localTray.properties };
      
      // Merge hooks (unique)
      const allHooks = new Set([...remoteTray.hooks, ...localTray.hooks]);
      localTray.hooks = Array.from(allHooks);
      
      // Use newer timestamp
      if (remoteTray.created_dt > localTray.created_dt) {
        localTray.created_dt = remoteTray.created_dt;
      }
      
      await updateLastKnownState(localTray);
      return localTray;
      
    default:
      throw new Error(`Unknown conflict resolution choice: ${userChoice}`);
  }
}

async function hashString(str: string): Promise<string> {
  // Simple hash function for content comparison
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}
