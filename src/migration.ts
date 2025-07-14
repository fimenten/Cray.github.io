import { 
  TrayData, 
  LegacyTrayFormat, 
  MigrationContext, 
  DATA_VERSION, 
  TrayProperties,
  TrayId 
} from "./types";
import { Tray } from "./tray";

/**
 * Migration utilities for backward compatibility
 * Handles conversion between different data formats
 */

export class DataMigration {
  private static instance: DataMigration;
  
  static getInstance(): DataMigration {
    if (!DataMigration.instance) {
      DataMigration.instance = new DataMigration();
    }
    return DataMigration.instance;
  }

  /**
   * Migrate legacy data to current format
   */
  async migrate(data: unknown, fromVersion?: number): Promise<MigrationContext> {
    const context: MigrationContext = {
      fromVersion: fromVersion || this.detectVersion(data),
      toVersion: DATA_VERSION.CURRENT,
      data,
      warnings: []
    };

    try {
      if (context.fromVersion === DATA_VERSION.LEGACY) {
        context.data = await this.migrateLegacyToV1(data as LegacyTrayFormat | string, context);
      }
      
      // Future migrations would be added here
      // if (context.fromVersion === DATA_VERSION.V1 && context.toVersion > DATA_VERSION.V1) {
      //   context.data = await this.migrateV1ToV2(context.data, context);
      // }

      return context;
    } catch (error) {
      context.warnings.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Detect data version from structure
   */
  private detectVersion(data: unknown): number {
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return DATA_VERSION.LEGACY;
      }
    }

    if (!data || typeof data !== 'object') {
      return DATA_VERSION.LEGACY;
    }

    const obj = data as Record<string, unknown>;
    
    // Check for modern TrayData structure
    if ('version' in obj && typeof obj.version === 'number') {
      return obj.version;
    }

    // Check for legacy Tray class structure
    if ('children' in obj && Array.isArray(obj.children)) {
      return DATA_VERSION.LEGACY;
    }

    // Default to legacy if unsure
    return DATA_VERSION.LEGACY;
  }

  /**
   * Migrate from legacy Tray class format to modern TrayData
   */
  private async migrateLegacyToV1(
    data: LegacyTrayFormat | string, 
    context: MigrationContext
  ): Promise<TrayData> {
    let legacyData: LegacyTrayFormat;

    // Parse if string
    if (typeof data === 'string') {
      try {
        legacyData = JSON.parse(data);
      } catch (error) {
        throw new Error(`Invalid JSON data: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      legacyData = data;
    }

    // Validate required fields
    if (!legacyData.id || !legacyData.name) {
      throw new Error('Missing required fields: id and name');
    }

    // Convert properties to typed format
    const properties: TrayProperties = {};
    if (legacyData.properties && typeof legacyData.properties === 'object') {
      // Map known property types
      if ('priority' in legacyData.properties && typeof legacyData.properties.priority === 'number') {
        properties.priority = legacyData.properties.priority;
      }
      if ('tags' in legacyData.properties && Array.isArray(legacyData.properties.tags)) {
        properties.tags = legacyData.properties.tags.filter(tag => typeof tag === 'string');
      }
      if ('dueDate' in legacyData.properties) {
        try {
          properties.dueDate = new Date(legacyData.properties.dueDate as any);
        } catch {
          context.warnings.push(`Invalid dueDate for tray ${legacyData.id}, skipping`);
        }
      }
      if ('color' in legacyData.properties && typeof legacyData.properties.color === 'string') {
        properties.color = legacyData.properties.color;
      }

      // Store unknown properties in metadata
      const knownKeys = ['priority', 'tags', 'dueDate', 'color'];
      const unknownProps = Object.keys(legacyData.properties)
        .filter(key => !knownKeys.includes(key))
        .reduce((acc, key) => {
          acc[key] = legacyData.properties![key];
          return acc;
        }, {} as Record<string, unknown>);

      if (Object.keys(unknownProps).length > 0) {
        properties.metadata = unknownProps;
        context.warnings.push(`Moved unknown properties to metadata for tray ${legacyData.id}`);
      }
    }

    // Handle date conversion
    let created_dt: Date;
    try {
      created_dt = legacyData.created_dt ? new Date(legacyData.created_dt) : new Date();
      if (isNaN(created_dt.getTime())) {
        created_dt = new Date();
        context.warnings.push(`Invalid created_dt for tray ${legacyData.id}, using current date`);
      }
    } catch {
      created_dt = new Date();
      context.warnings.push(`Failed to parse created_dt for tray ${legacyData.id}, using current date`);
    }

    // Create modern TrayData
    const modernData: TrayData = {
      id: legacyData.id,
      name: legacyData.name,
      parentId: legacyData.parentId ?? null,
      borderColor: legacyData.borderColor || "#ffffff",
      created_dt,
      flexDirection: legacyData.flexDirection || "column",
      host_url: legacyData.host_url || null,
      filename: legacyData.filename || null,
      isFolded: legacyData.isFolded !== undefined ? legacyData.isFolded : true,
      properties,
      hooks: Array.isArray(legacyData.hooks) ? legacyData.hooks : [],
      isDone: legacyData.isDone || false,
      showDoneMarker: legacyData.showDoneMarker || false,
      version: DATA_VERSION.V1_SEPARATED
    };

    return modernData;
  }

  /**
   * Convert modern TrayData back to legacy format for compatibility
   */
  convertToLegacyFormat(data: TrayData): LegacyTrayFormat {
    // Flatten properties back to generic Record
    const legacyProperties: Record<string, unknown> = {};
    
    if (data.properties.priority !== undefined) {
      legacyProperties.priority = data.properties.priority;
    }
    if (data.properties.tags) {
      legacyProperties.tags = data.properties.tags;
    }
    if (data.properties.dueDate) {
      legacyProperties.dueDate = data.properties.dueDate;
    }
    if (data.properties.color) {
      legacyProperties.color = data.properties.color;
    }
    if (data.properties.metadata) {
      Object.assign(legacyProperties, data.properties.metadata);
    }

    return {
      id: data.id,
      name: data.name,
      parentId: data.parentId ?? undefined,
      borderColor: data.borderColor,
      created_dt: data.created_dt,
      flexDirection: data.flexDirection,
      host_url: data.host_url,
      filename: data.filename,
      isFolded: data.isFolded,
      properties: legacyProperties,
      hooks: data.hooks,
      isDone: data.isDone,
      showDoneMarker: data.showDoneMarker
    };
  }

  /**
   * Migrate hierarchical legacy data (with children arrays)
   */
  async migrateHierarchical(
    legacyRoot: LegacyTrayFormat, 
    context?: MigrationContext
  ): Promise<{ root: TrayData; allTrays: Record<TrayId, TrayData> }> {
    if (!context) {
      context = {
        fromVersion: DATA_VERSION.LEGACY,
        toVersion: DATA_VERSION.CURRENT,
        data: legacyRoot,
        warnings: []
      };
    }

    const allTrays: Record<TrayId, TrayData> = {};
    
    // Recursive function to process tray and its children
    const processNode = async (
      legacyNode: LegacyTrayFormat, 
      parentId: TrayId | null = null
    ): Promise<TrayData> => {
      // Set parent ID if provided
      if (parentId) {
        legacyNode.parentId = parentId;
      }

      // Convert this node
      const modernNode = await this.migrateLegacyToV1(legacyNode, context!);
      allTrays[modernNode.id] = modernNode;

      // Process children if they exist
      if (legacyNode.children && Array.isArray(legacyNode.children)) {
        for (const child of legacyNode.children) {
          await processNode(child, modernNode.id);
        }
      }

      return modernNode;
    };

    const root = await processNode(legacyRoot);
    return { root, allTrays };
  }

  /**
   * Convert Tray class instance to TrayData
   */
  convertTrayToData(tray: Tray): TrayData {
    const properties: TrayProperties = {};
    
    // Extract known property types from generic properties
    if (tray.properties) {
      if (typeof tray.properties.priority === 'number') {
        properties.priority = tray.properties.priority;
      }
      if (Array.isArray(tray.properties.tags)) {
        properties.tags = tray.properties.tags.filter(tag => typeof tag === 'string');
      }
      if (tray.properties.dueDate) {
        try {
          properties.dueDate = new Date(tray.properties.dueDate as any);
        } catch {
          // Skip invalid dates
        }
      }
      if (typeof tray.properties.color === 'string') {
        properties.color = tray.properties.color;
      }

      // Store remaining properties in metadata
      const knownKeys = ['priority', 'tags', 'dueDate', 'color'];
      const unknownProps = Object.keys(tray.properties)
        .filter(key => !knownKeys.includes(key))
        .reduce((acc, key) => {
          acc[key] = tray.properties[key];
          return acc;
        }, {} as Record<string, unknown>);

      if (Object.keys(unknownProps).length > 0) {
        properties.metadata = unknownProps;
      }
    }

    return {
      id: tray.id,
      name: tray.name,
      parentId: tray.parentId,
      borderColor: tray.borderColor,
      created_dt: tray.created_dt,
      flexDirection: tray.flexDirection,
      host_url: tray.host_url,
      filename: tray.filename,
      isFolded: tray.isFolded,
      properties,
      hooks: [...tray.hooks],
      isDone: tray.isDone,
      showDoneMarker: tray.showDoneMarker || false,
      version: DATA_VERSION.V1_SEPARATED
    };
  }

  /**
   * Convert TrayData back to legacy Tray constructor parameters
   */
  convertDataToTrayParams(data: TrayData): {
    parentId: TrayId;
    id: TrayId;
    name: string;
    color: string | null;
    created_dt: Date;
    flexDirection: "column" | "row";
    host_url: string | null;
    filename: string | null;
    isFold: boolean;
    properties: Record<string, any>;
    hooks: string[];
    isDone: boolean;
  } {
    // Flatten properties back to generic Record
    const legacyProperties: Record<string, any> = {};
    
    if (data.properties.priority !== undefined) {
      legacyProperties.priority = data.properties.priority;
    }
    if (data.properties.tags) {
      legacyProperties.tags = data.properties.tags;
    }
    if (data.properties.dueDate) {
      legacyProperties.dueDate = data.properties.dueDate;
    }
    if (data.properties.color) {
      legacyProperties.color = data.properties.color;
    }
    if (data.properties.metadata) {
      Object.assign(legacyProperties, data.properties.metadata);
    }

    return {
      parentId: data.parentId ?? "",
      id: data.id,
      name: data.name,
      color: data.borderColor,
      created_dt: data.created_dt,
      flexDirection: data.flexDirection,
      host_url: data.host_url,
      filename: data.filename,
      isFold: data.isFolded,
      properties: legacyProperties,
      hooks: [...data.hooks],
      isDone: data.isDone
    };
  }

  /**
   * Validate migrated data
   */
  validateMigration(original: unknown, migrated: TrayData): boolean {
    try {
      // Basic validation
      if (!migrated.id || !migrated.name) {
        return false;
      }

      // Version should be set
      if (!migrated.version || migrated.version < DATA_VERSION.V1_SEPARATED) {
        return false;
      }

      // Date should be valid
      if (!(migrated.created_dt instanceof Date) || isNaN(migrated.created_dt.getTime())) {
        return false;
      }

      // Properties should be object
      if (!migrated.properties || typeof migrated.properties !== 'object') {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get migration summary
   */
  getMigrationSummary(context: MigrationContext): string {
    const lines = [
      `Migration from version ${context.fromVersion} to ${context.toVersion}`,
      `Warnings: ${context.warnings.length}`
    ];

    if (context.warnings.length > 0) {
      lines.push('Warning details:');
      context.warnings.forEach(warning => {
        lines.push(`  - ${warning}`);
      });
    }

    return lines.join('\n');
  }
}

// Convenience functions
export const migrationService = DataMigration.getInstance();

export async function migrateLegacyData(data: unknown): Promise<MigrationContext> {
  return migrationService.migrate(data);
}

export function convertTrayToData(tray: Tray): TrayData {
  return migrationService.convertTrayToData(tray);
}

export function convertDataToLegacy(data: TrayData): LegacyTrayFormat {
  return migrationService.convertToLegacyFormat(data);
}

export async function migrateHierarchicalData(
  legacyRoot: LegacyTrayFormat
): Promise<{ root: TrayData; allTrays: Record<TrayId, TrayData> }> {
  return migrationService.migrateHierarchical(legacyRoot);
}