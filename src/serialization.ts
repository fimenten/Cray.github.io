// Data serialization and deserialization layer
// Handles converting between data models and various storage formats

import { TrayData, TrayDataValidator } from "./dataModel";
import { TrayId, ITrayData, ISerializedTrayData, IJSONLTrayData } from "./types";
import { IOError, ValidationError } from "./errors";

/**
 * Main serialization class that handles different formats
 */
export class TraySerializer {
  /**
   * Serialize TrayData to JSON string
   */
  static toJSON(trayData: ITrayData): string {
    try {
      const serializable = trayData instanceof TrayData 
        ? trayData.toSerializable() 
        : this.convertToSerializable(trayData);
      
      return JSON.stringify(serializable, null, 0);
    } catch (error) {
      throw IOError.saveFailure('json', `Serialization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Deserialize JSON string to TrayData
   */
  static fromJSON(jsonString: string): TrayData {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Validate the parsed data
      const errors = TrayDataValidator.validate(parsed);
      if (errors.length > 0) {
        throw new ValidationError(`Invalid JSON data: ${errors.map(e => e.message).join(', ')}`);
      }

      return TrayData.fromSerializable(parsed as ISerializedTrayData);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw IOError.loadFailure('json', `Deserialization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Convert ITrayData to ISerializedTrayData format
   */
  private static convertToSerializable(data: ITrayData): ISerializedTrayData {
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
   * Serialize to JSONL format (one tray per line)
   */
  static toJSONL(rootTray: ITrayData): string {
    const lines: string[] = [];
    const allTrays = this.getAllTraysFlat(rootTray);
    
    for (const tray of allTrays) {
      const jsonlData: IJSONLTrayData = {
        id: tray.id,
        name: tray.name,
        childrenIds: tray.children.map(child => child.id),
        parentId: tray.parentId,
        borderColor: tray.borderColor,
        created_dt: tray.created_dt instanceof Date ? tray.created_dt : new Date(tray.created_dt),
        flexDirection: tray.flexDirection,
        host_url: tray.host_url,
        filename: tray.filename,
        isFolded: tray.isFolded,
        properties: tray.properties,
        hooks: tray.hooks,
        isDone: tray.isDone
      };
      
      lines.push(JSON.stringify(jsonlData));
    }
    
    return lines.join('\n');
  }

  /**
   * Deserialize from JSONL format
   */
  static fromJSONL(jsonlString: string): TrayData {
    try {
      const lines = jsonlString.split('\n').filter(line => line.trim());
      const trayMap = new Map<TrayId, TrayData>();
      
      // First pass: create all trays
      for (const line of lines) {
        const jsonlData = JSON.parse(line) as IJSONLTrayData;
        
        const trayData = new TrayData({
          id: jsonlData.id,
          name: jsonlData.name,
          children: [], // Will be populated in second pass
          parentId: jsonlData.parentId,
          borderColor: jsonlData.borderColor,
          created_dt: jsonlData.created_dt,
          flexDirection: jsonlData.flexDirection,
          host_url: jsonlData.host_url,
          filename: jsonlData.filename,
          isFolded: jsonlData.isFolded,
          properties: jsonlData.properties,
          hooks: jsonlData.hooks,
          isDone: jsonlData.isDone
        });
        
        trayMap.set(jsonlData.id, trayData);
      }
      
      // Second pass: build parent-child relationships
      for (const line of lines) {
        const jsonlData = JSON.parse(line) as IJSONLTrayData;
        const tray = trayMap.get(jsonlData.id);
        
        if (tray && jsonlData.childrenIds) {
          for (const childId of jsonlData.childrenIds) {
            const child = trayMap.get(childId);
            if (child) {
              tray.children.push(child);
              child.parentId = tray.id;
            }
          }
        }
      }
      
      // Find root tray (one with no parent or find topmost)
      const rootTray = this.findRootTray(trayMap);
      if (!rootTray) {
        throw new ValidationError('No root tray found in JSONL data');
      }
      
      return rootTray;
    } catch (error) {
      throw IOError.loadFailure('jsonl', `JSONL deserialization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Export to markdown format
   */
  static toMarkdown(trayData: ITrayData, includeProperties: boolean = false): string {
    const lines: string[] = [];
    
    const addTrayToMarkdown = (tray: ITrayData, depth: number = 0) => {
      const indent = '  '.repeat(depth);
      const doneMarker = tray.isDone ? '✓ ' : '';
      const hooks = tray.hooks.length > 0 ? ` ${tray.hooks.map(h => `@${h}`).join(' ')}` : '';
      
      lines.push(`${indent}- ${doneMarker}${tray.name}${hooks}`);
      
      if (includeProperties && Object.keys(tray.properties).length > 0) {
        for (const [key, value] of Object.entries(tray.properties)) {
          lines.push(`${indent}  - ${key}: ${value}`);
        }
      }
      
      for (const child of tray.children) {
        addTrayToMarkdown(child, depth + 1);
      }
    };
    
    addTrayToMarkdown(trayData);
    return lines.join('\n');
  }

  /**
   * Create a compressed format for network transfer
   */
  static toCompressed(trayData: ITrayData): string {
    const serializable = trayData instanceof TrayData 
      ? trayData.toSerializable() 
      : this.convertToSerializable(trayData);
    
    // Remove default values to reduce size
    const compressed = this.removeDefaults(serializable);
    
    return JSON.stringify(compressed);
  }

  /**
   * Deserialize from compressed format
   */
  static fromCompressed(compressedString: string): TrayData {
    try {
      const parsed = JSON.parse(compressedString);
      const restored = this.restoreDefaults(parsed);
      
      return TrayData.fromSerializable(restored);
    } catch (error) {
      throw IOError.loadFailure('compressed', `Compressed deserialization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get all trays in flat array (for JSONL)
   */
  private static getAllTraysFlat(root: ITrayData): ITrayData[] {
    const result: ITrayData[] = [root];
    
    for (const child of root.children) {
      result.push(...this.getAllTraysFlat(child));
    }
    
    return result;
  }

  /**
   * Find root tray from a map of trays
   */
  private static findRootTray(trayMap: Map<TrayId, TrayData>): TrayData | null {
    // First try to find a tray with no parent
    for (const tray of trayMap.values()) {
      if (!tray.parentId) {
        return tray;
      }
    }
    
    // If all trays have parents, find the topmost one
    for (const tray of trayMap.values()) {
      if (tray.parentId && !trayMap.has(tray.parentId)) {
        return tray;
      }
    }
    
    // Return the first tray if nothing else works
    const first = trayMap.values().next();
    return first.done ? null : first.value;
  }

  /**
   * Remove default values to compress data
   */
  private static removeDefaults(data: ISerializedTrayData): Partial<ISerializedTrayData> {
    const result: Partial<ISerializedTrayData> = {
      id: data.id,
      name: data.name
    };

    if (data.children && data.children.length > 0) {
      result.children = data.children.map(child => this.removeDefaults(child)) as ISerializedTrayData[];
    }

    if (data.parentId !== null) result.parentId = data.parentId;
    if (data.borderColor !== '#f5f5f5') result.borderColor = data.borderColor;
    if (data.flexDirection !== 'column') result.flexDirection = data.flexDirection;
    if (data.host_url !== null) result.host_url = data.host_url;
    if (data.filename !== null) result.filename = data.filename;
    if (!data.isFolded) result.isFolded = data.isFolded;
    if (Object.keys(data.properties).length > 0) result.properties = data.properties;
    if (data.hooks && data.hooks.length > 0) result.hooks = data.hooks;
    if (data.isDone) result.isDone = data.isDone;
    
    // Always include created_dt as it's important
    result.created_dt = data.created_dt;

    return result;
  }

  /**
   * Restore default values from compressed data
   */
  private static restoreDefaults(data: Partial<ISerializedTrayData>): ISerializedTrayData {
    return {
      id: data.id!,
      name: data.name!,
      children: data.children ? data.children.map(child => this.restoreDefaults(child)) : [],
      parentId: data.parentId || null,
      borderColor: data.borderColor || '#f5f5f5',
      created_dt: data.created_dt!,
      flexDirection: data.flexDirection || 'column',
      host_url: data.host_url || null,
      filename: data.filename || null,
      isFolded: data.isFolded !== undefined ? data.isFolded : true,
      properties: data.properties || {},
      hooks: data.hooks || [],
      isDone: data.isDone || false
    };
  }
}

/**
 * Format-specific serializers
 */
export class JSONLSerializer {
  /**
   * Serialize to JSONL format with metadata
   */
  static serialize(trayData: ITrayData): string {
    const metadata = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      format: 'jsonl'
    };
    
    const lines = [
      JSON.stringify({ type: 'metadata', data: metadata }),
      ...TraySerializer.toJSONL(trayData).split('\n').map(line => 
        JSON.stringify({ type: 'tray', data: JSON.parse(line) })
      )
    ];
    
    return lines.join('\n');
  }

  /**
   * Deserialize from JSONL format with metadata
   */
  static deserialize(jsonlString: string): { trayData: TrayData; metadata: unknown } {
    const lines = jsonlString.split('\n').filter(line => line.trim());
    let metadata: unknown = null;
    const trayLines: string[] = [];
    
    for (const line of lines) {
      const parsed = JSON.parse(line);
      if (parsed.type === 'metadata') {
        metadata = parsed.data;
      } else if (parsed.type === 'tray') {
        trayLines.push(JSON.stringify(parsed.data));
      }
    }
    
    const trayData = TraySerializer.fromJSONL(trayLines.join('\n'));
    return { trayData, metadata };
  }
}

/**
 * Migration utilities for handling format changes
 */
export class SerializationMigrator {
  /**
   * Migrate data from older formats to current format
   */
  static migrate(data: unknown, fromVersion: string = 'auto'): TrayData {
    if (fromVersion === 'auto') {
      fromVersion = this.detectVersion(data);
    }
    
    switch (fromVersion) {
      case '1.0':
        return this.migrateFrom1_0(data);
      case 'legacy':
        return this.migrateFromLegacy(data);
      default:
        // Assume current format
        if (typeof data === 'string') {
          return TraySerializer.fromJSON(data);
        } else {
          return TrayData.fromSerializable(data as ISerializedTrayData);
        }
    }
  }

  /**
   * Detect the version of serialized data
   */
  private static detectVersion(data: unknown): string {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return this.detectVersion(parsed);
      } catch {
        return 'legacy';
      }
    }
    
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      
      // Check for version markers
      if ('version' in obj) {
        return obj.version as string;
      }
      
      // Check for known legacy properties
      if ('_element' in obj || 'isEditing' in obj) {
        return 'legacy';
      }
    }
    
    return '1.0';
  }

  /**
   * Migrate from version 1.0
   */
  private static migrateFrom1_0(data: unknown): TrayData {
    // For now, 1.0 is the current format
    return TrayData.fromSerializable(data as ISerializedTrayData);
  }

  /**
   * Migrate from legacy format (pre-refactoring)
   */
  private static migrateFromLegacy(data: unknown): TrayData {
    const obj = data as Record<string, unknown>;
    
    // Extract only data properties, ignore UI properties
    const cleanData: Partial<ITrayData> = {
      id: obj.id as TrayId,
      name: obj.name as string,
      parentId: obj.parentId as TrayId || null,
      borderColor: obj.borderColor as string,
      created_dt: obj.created_dt as Date | string,
      flexDirection: (obj.flexDirection as "column" | "row") || "column",
      host_url: obj.host_url as string || null,
      filename: obj.filename as string || null,
      isFolded: obj.isFolded as boolean !== undefined ? obj.isFolded as boolean : true,
      properties: obj.properties as Record<string, unknown> || {},
      hooks: obj.hooks as string[] || [],
      isDone: obj.isDone as boolean || false
    };
    
    // Handle children recursively
    if (obj.children && Array.isArray(obj.children)) {
      cleanData.children = obj.children.map(child => this.migrateFromLegacy(child));
    } else {
      cleanData.children = [];
    }
    
    return new TrayData(cleanData as ITrayData);
  }
}