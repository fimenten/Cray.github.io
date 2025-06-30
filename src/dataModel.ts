// Pure data model for tray data - no UI dependencies
// This module contains data structures and utilities without any DOM/UI concerns

import { TrayId, ITrayData, ISerializedTrayData } from "./types";
import { ValidationError } from "./errors";
import { generateUUID, getWhiteColor } from "./utils";

/**
 * Pure data model for tray data
 * Contains only data properties, no UI state or DOM elements
 */
export class TrayData implements ITrayData {
  id: TrayId;
  name: string;
  children: ITrayData[];
  parentId: TrayId | null;
  borderColor: string;
  created_dt: Date | string;
  flexDirection: "column" | "row";
  host_url: string | null;
  filename: string | null;
  isFolded: boolean;
  properties: Record<string, unknown>;
  hooks: string[];
  isDone: boolean;

  constructor(data: Partial<ITrayData> & { id: TrayId; name: string; parentId?: TrayId | null }) {
    this.id = data.id;
    this.name = data.name;
    this.children = data.children || [];
    this.parentId = data.parentId || null;
    this.borderColor = data.borderColor || getWhiteColor();
    this.created_dt = data.created_dt instanceof Date ? data.created_dt : new Date(data.created_dt || Date.now());
    this.flexDirection = data.flexDirection || "column";
    this.host_url = data.host_url || null;
    this.filename = data.filename || null;
    this.isFolded = data.isFolded !== undefined ? data.isFolded : true;
    this.properties = data.properties || {};
    this.hooks = data.hooks || this.parseHooksFromName(this.name);
    this.isDone = data.isDone !== undefined ? data.isDone : this.checkDoneStateFromName(this.name);
  }

  /**
   * Parse hooks from name (extracted from original Tray class)
   */
  parseHooksFromName(name: string): string[] {
    if (!name || typeof name !== 'string') {
      return [];
    }
    
    // Use Unicode-aware regex to match @hook patterns
    // \p{L} matches any Unicode letter, \p{N} matches any Unicode number
    // \p{Emoji} matches emoji characters
    const hookRegex = /@([\p{L}\p{N}\p{Emoji}_.-]+)/gu;
    const matches = name.match(hookRegex);
    
    if (!matches) {
      return [];
    }
    
    return matches.map(match => match.slice(1)); // Remove the @ symbol
  }

  /**
   * Check if tray should be marked as done based on name
   */
  checkDoneStateFromName(name: string): boolean {
    if (!name || typeof name !== 'string') {
      return false;
    }
    return name.includes('✓') || name.includes('☑') || name.includes('✔');
  }

  /**
   * Create a deep clone of this tray data
   */
  clone(): TrayData {
    return new TrayData({
      id: generateUUID(),
      name: this.name,
      children: this.children.map(child => 
        child instanceof TrayData ? child.clone() : new TrayData(child).clone()
      ),
      parentId: this.parentId,
      borderColor: this.borderColor,
      created_dt: new Date(this.created_dt),
      flexDirection: this.flexDirection,
      host_url: this.host_url,
      filename: this.filename,
      isFolded: this.isFolded,
      properties: { ...this.properties },
      hooks: [...this.hooks],
      isDone: this.isDone
    });
  }

  /**
   * Convert ITrayData to ISerializedTrayData
   */
  private convertToSerializable(data: ITrayData): ISerializedTrayData {
    return {
      id: data.id,
      name: data.name,
      children: data.children.map(child => this.convertToSerializable(child)),
      parentId: data.parentId,
      borderColor: data.borderColor,
      created_dt: data.created_dt instanceof Date ? data.created_dt.toISOString() : data.created_dt,
      flexDirection: data.flexDirection,
      host_url: data.host_url,
      filename: data.filename,
      isFolded: data.isFolded,
      properties: data.properties,
      hooks: data.hooks,
      isDone: data.isDone
    };
  }

  /**
   * Convert to serializable format
   */
  toSerializable(): ISerializedTrayData {
    return {
      id: this.id,
      name: this.name,
      children: this.children.map(child => 
        child instanceof TrayData ? child.toSerializable() : this.convertToSerializable(child)
      ),
      parentId: this.parentId,
      borderColor: this.borderColor,
      created_dt: this.created_dt instanceof Date ? this.created_dt.toISOString() : this.created_dt,
      flexDirection: this.flexDirection,
      host_url: this.host_url,
      filename: this.filename,
      isFolded: this.isFolded,
      properties: this.properties,
      hooks: this.hooks,
      isDone: this.isDone
    };
  }

  /**
   * Create TrayData from serialized format
   */
  static fromSerializable(data: ISerializedTrayData): TrayData {
    const trayData = new TrayData({
      id: data.id,
      name: data.name,
      parentId: data.parentId,
      borderColor: data.borderColor,
      created_dt: new Date(data.created_dt),
      flexDirection: data.flexDirection,
      host_url: data.host_url,
      filename: data.filename,
      isFolded: data.isFolded,
      properties: data.properties,
      hooks: data.hooks,
      isDone: data.isDone
    });

    // Process children
    if (data.children && Array.isArray(data.children)) {
      trayData.children = data.children.map(child => TrayData.fromSerializable(child));
    }

    return trayData;
  }

  /**
   * Add a property to this tray
   */
  addProperty(key: string, value: unknown): void {
    if (!key || typeof key !== 'string') {
      throw new ValidationError('Property key must be a non-empty string', 'key', key);
    }
    this.properties[key] = value;
  }

  /**
   * Remove a property from this tray
   */
  removeProperty(key: string): boolean {
    if (key in this.properties) {
      delete this.properties[key];
      return true;
    }
    return false;
  }

  /**
   * Get a property value
   */
  getProperty(key: string): unknown {
    return this.properties[key];
  }

  /**
   * Update multiple properties at once
   */
  updateProperties(props: Record<string, unknown>): void {
    Object.assign(this.properties, props);
  }

  /**
   * Add a child tray
   */
  addChild(child: ITrayData): void {
    if (!child || !child.id) {
      throw new ValidationError('Child must have an id', 'child', child);
    }
    
    // Prevent circular references
    if (this.wouldCreateCircularReference(child.id)) {
      throw new ValidationError(`Adding child ${child.id} would create circular reference`, 'childId', child.id);
    }

    this.children.push(child);
    if ('parentId' in child) {
      child.parentId = this.id;
    }
  }

  /**
   * Remove a child tray
   */
  removeChild(childId: TrayId): boolean {
    const index = this.children.findIndex(child => child.id === childId);
    if (index !== -1) {
      const child = this.children[index];
      this.children.splice(index, 1);
      if ('parentId' in child) {
        child.parentId = null;
      }
      return true;
    }
    return false;
  }

  /**
   * Find a child by ID
   */
  findChild(childId: TrayId): ITrayData | null {
    return this.children.find(child => child.id === childId) || null;
  }

  /**
   * Check if adding a child would create a circular reference
   */
  private wouldCreateCircularReference(childId: TrayId): boolean {
    if (childId === this.id) {
      return true;
    }
    
    // Check if this tray is a descendant of the potential child
    const visited = new Set<TrayId>();
    let current: ITrayData | null = this;
    
    while (current && current.parentId && !visited.has(current.id)) {
      visited.add(current.id);
      if (current.parentId === childId) {
        return true;
      }
      // In a real implementation, we'd need access to the full tree
      // For now, we'll rely on the simpler check above
      break;
    }
    
    return false;
  }

  /**
   * Sort children by a property
   */
  sortChildren(property: string, descending: boolean = false): void {
    this.children.sort((a, b) => {
      let aVal: unknown;
      let bVal: unknown;

      if (property === 'created_dt') {
        aVal = new Date(a.created_dt).getTime();
        bVal = new Date(b.created_dt).getTime();
      } else if (property === 'name') {
        aVal = a.name;
        bVal = b.name;
      } else {
        aVal = a.properties[property];
        bVal = b.properties[property];
      }

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return descending ? 1 : -1;
      if (bVal == null) return descending ? -1 : 1;

      // Compare values
      let result = 0;
      if (aVal < bVal) result = -1;
      else if (aVal > bVal) result = 1;

      return descending ? -result : result;
    });
  }

  /**
   * Get all hooks used in this tray and its children
   */
  getAllHooks(): string[] {
    const allHooks = new Set<string>();
    
    // Add hooks from this tray
    this.hooks.forEach(hook => allHooks.add(hook));
    
    // Add hooks from children recursively
    const addChildHooks = (tray: ITrayData) => {
      tray.hooks.forEach(hook => allHooks.add(hook));
      tray.children.forEach(addChildHooks);
    };
    
    this.children.forEach(addChildHooks);
    
    return Array.from(allHooks);
  }

  /**
   * Update the name and re-parse hooks and done state
   */
  updateName(newName: string): void {
    this.name = newName;
    this.hooks = this.parseHooksFromName(newName);
    this.isDone = this.checkDoneStateFromName(newName);
  }

  /**
   * Validate the tray data structure
   */
  validate(): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!this.id) {
      errors.push(ValidationError.required('id'));
    }

    if (!this.name || typeof this.name !== 'string') {
      errors.push(ValidationError.invalid('name', this.name, 'non-empty string'));
    }

    if (this.flexDirection !== 'column' && this.flexDirection !== 'row') {
      errors.push(ValidationError.invalid('flexDirection', this.flexDirection, '"column" or "row"'));
    }

    if (this.children && !Array.isArray(this.children)) {
      errors.push(ValidationError.invalid('children', this.children, 'array'));
    }

    return errors;
  }
}

/**
 * Data validation utilities
 */
export class TrayDataValidator {
  /**
   * Validate a tray data object
   */
  static validate(data: unknown): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      errors.push(ValidationError.invalid('data', data, 'object'));
      return errors;
    }

    const trayData = data as Record<string, unknown>;

    // Required fields
    if (!trayData.id) {
      errors.push(ValidationError.required('id'));
    } else if (typeof trayData.id !== 'string') {
      errors.push(ValidationError.invalid('id', trayData.id, 'string'));
    }

    if (!trayData.name) {
      errors.push(ValidationError.required('name'));
    } else if (typeof trayData.name !== 'string') {
      errors.push(ValidationError.invalid('name', trayData.name, 'string'));
    }

    // Optional but typed fields
    if (trayData.parentId !== null && trayData.parentId !== undefined && typeof trayData.parentId !== 'string') {
      errors.push(ValidationError.invalid('parentId', trayData.parentId, 'string or null'));
    }

    if (trayData.flexDirection && trayData.flexDirection !== 'column' && trayData.flexDirection !== 'row') {
      errors.push(ValidationError.invalid('flexDirection', trayData.flexDirection, '"column" or "row"'));
    }

    if (trayData.children && !Array.isArray(trayData.children)) {
      errors.push(ValidationError.invalid('children', trayData.children, 'array'));
    }

    if (trayData.properties && typeof trayData.properties !== 'object') {
      errors.push(ValidationError.invalid('properties', trayData.properties, 'object'));
    }

    if (trayData.hooks && !Array.isArray(trayData.hooks)) {
      errors.push(ValidationError.invalid('hooks', trayData.hooks, 'array'));
    }

    return errors;
  }

  /**
   * Check if data is valid tray data
   */
  static isValid(data: unknown): data is ITrayData {
    return this.validate(data).length === 0;
  }

  /**
   * Validate and throw if invalid
   */
  static validateAndThrow(data: unknown): asserts data is ITrayData {
    const errors = this.validate(data);
    if (errors.length > 0) {
      throw new ValidationError(`Invalid tray data: ${errors.map(e => e.message).join(', ')}`);
    }
  }
}

/**
 * Data manipulation utilities
 */
export class TrayDataUtils {
  /**
   * Find a tray by ID in a tree structure
   */
  static findById(root: ITrayData, id: TrayId): ITrayData | null {
    if (root.id === id) {
      return root;
    }

    for (const child of root.children) {
      const found = this.findById(child, id);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * Get all trays in a tree (flat list)
   */
  static getAllTrays(root: ITrayData): ITrayData[] {
    const result: ITrayData[] = [root];
    
    for (const child of root.children) {
      result.push(...this.getAllTrays(child));
    }

    return result;
  }

  /**
   * Get the path from root to a specific tray
   */
  static getPath(root: ITrayData, targetId: TrayId): ITrayData[] | null {
    if (root.id === targetId) {
      return [root];
    }

    for (const child of root.children) {
      const childPath = this.getPath(child, targetId);
      if (childPath) {
        return [root, ...childPath];
      }
    }

    return null;
  }

  /**
   * Move a tray to a new parent
   */
  static moveTray(root: ITrayData, trayId: TrayId, newParentId: TrayId | null): boolean {
    const tray = this.findById(root, trayId);
    const newParent = newParentId ? this.findById(root, newParentId) : null;
    
    if (!tray) {
      return false;
    }

    // Remove from current parent
    if (tray.parentId) {
      const currentParent = this.findById(root, tray.parentId);
      if (currentParent) {
        const index = currentParent.children.findIndex(child => child.id === trayId);
        if (index !== -1) {
          currentParent.children.splice(index, 1);
        }
      }
    }

    // Add to new parent
    if (newParent) {
      newParent.children.push(tray);
      tray.parentId = newParentId;
    } else {
      tray.parentId = null;
    }

    return true;
  }

  /**
   * Get newest timestamp in a tree
   */
  static getNewestTimestamp(root: ITrayData): Date {
    let newest = new Date(root.created_dt);
    
    for (const child of root.children) {
      const childNewest = this.getNewestTimestamp(child);
      if (childNewest > newest) {
        newest = childNewest;
      }
    }

    return newest;
  }

  /**
   * Count total trays in tree
   */
  static countTrays(root: ITrayData): number {
    return 1 + root.children.reduce((sum, child) => sum + this.countTrays(child), 0);
  }

  /**
   * Get all unique hooks in tree
   */
  static getAllUniqueHooks(root: ITrayData): string[] {
    const hooks = new Set<string>();
    
    const addHooks = (tray: ITrayData) => {
      tray.hooks.forEach(hook => hooks.add(hook));
      tray.children.forEach(addHooks);
    };
    
    addHooks(root);
    return Array.from(hooks);
  }
}