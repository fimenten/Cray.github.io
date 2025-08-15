/**
 * Conflict Resolution System
 * 
 * Provides enhanced conflict detection and resolution strategies for tray synchronization.
 * Handles conflicts when both local and remote versions have changed.
 */

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
