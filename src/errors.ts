// Error handling utilities and custom error classes
// Provides standardized error handling across the application

import { IAppError, ITrayError, IIOError, INetworkError, ErrorCode, ERROR_CODES, TrayId } from "./types";

/**
 * Base application error class
 */
export class AppError extends Error implements IAppError {
  public readonly code: ErrorCode;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(code: ErrorCode, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Tray-specific error class
 */
export class TrayError extends AppError implements ITrayError {
  public readonly trayId?: TrayId;
  public readonly operation?: string;

  constructor(
    code: ErrorCode,
    message: string,
    trayId?: TrayId,
    operation?: string,
    context?: Record<string, unknown>
  ) {
    super(code, message, context);
    this.name = "TrayError";
    this.trayId = trayId;
    this.operation = operation;
  }

  static notFound(trayId: TrayId): TrayError {
    return new TrayError(
      ERROR_CODES.TRAY_NOT_FOUND,
      `Tray with ID ${trayId} not found`,
      trayId,
      "lookup"
    );
  }

  static invalidData(trayId: TrayId, reason: string): TrayError {
    return new TrayError(
      ERROR_CODES.INVALID_TRAY_DATA,
      `Invalid tray data: ${reason}`,
      trayId,
      "validation",
      { reason }
    );
  }

  static circularReference(trayId: TrayId, parentId: TrayId): TrayError {
    return new TrayError(
      ERROR_CODES.CIRCULAR_REFERENCE,
      `Circular reference detected: tray ${trayId} cannot be child of ${parentId}`,
      trayId,
      "move",
      { parentId }
    );
  }
}

/**
 * IO operation error class
 */
export class IOError extends AppError implements IIOError {
  public readonly operation: 'save' | 'load' | 'export' | 'import';
  public readonly dataType?: 'indexeddb' | 'localstorage' | 'file' | 'network';

  constructor(
    operation: 'save' | 'load' | 'export' | 'import',
    message: string,
    dataType?: 'indexeddb' | 'localstorage' | 'file' | 'network',
    context?: Record<string, unknown>
  ) {
    // Set appropriate error code based on operation
    const errorCode = operation === 'load' ? ERROR_CODES.LOAD_FAILED : ERROR_CODES.SAVE_FAILED;
    super(errorCode, message, context);
    this.name = "IOError";
    this.operation = operation;
    this.dataType = dataType;
  }

  static saveFailure(dataType: string, reason: string): IOError {
    return new IOError(
      'save',
      `Failed to save data to ${dataType}: ${reason}`,
      dataType as any,
      { reason }
    );
  }

  static loadFailure(dataType: string, reason: string): IOError {
    return new IOError(
      'load',
      `Failed to load data from ${dataType}: ${reason}`,
      dataType as any,
      { reason }
    );
  }
}

/**
 * Network operation error class
 */
export class NetworkError extends AppError implements INetworkError {
  public readonly url?: string;
  public readonly statusCode?: number;
  public readonly operation?: 'upload' | 'download' | 'sync';

  constructor(
    message: string,
    url?: string,
    statusCode?: number,
    operation?: 'upload' | 'download' | 'sync',
    context?: Record<string, unknown>
  ) {
    super(ERROR_CODES.NETWORK_ERROR, message, context);
    this.name = "NetworkError";
    this.url = url;
    this.statusCode = statusCode;
    this.operation = operation;
  }

  static fromResponse(response: Response, operation?: 'upload' | 'download' | 'sync'): NetworkError {
    return new NetworkError(
      `HTTP ${response.status}: ${response.statusText}`,
      response.url,
      response.status,
      operation,
      { headers: response.headers }
    );
  }

  static timeout(url: string, operation?: 'upload' | 'download' | 'sync'): NetworkError {
    return new NetworkError(
      "Request timeout",
      url,
      undefined,
      operation,
      { reason: "timeout" }
    );
  }
}

/**
 * Validation error for data structures
 */
export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(message: string, field?: string, value?: unknown) {
    super(ERROR_CODES.VALIDATION_ERROR, message, { field, value });
    this.name = "ValidationError";
    this.field = field;
    this.value = value;
  }

  static required(field: string): ValidationError {
    return new ValidationError(`Field '${field}' is required`, field);
  }

  static invalid(field: string, value: unknown, expected: string): ValidationError {
    return new ValidationError(
      `Field '${field}' has invalid value. Expected ${expected}, got ${typeof value}`,
      field,
      value
    );
  }
}

/**
 * Plugin-related errors
 */
export class PluginError extends AppError {
  public readonly pluginId?: string;

  constructor(message: string, pluginId?: string, context?: Record<string, unknown>) {
    super(ERROR_CODES.PLUGIN_ERROR, message, { ...context, pluginId });
    this.name = "PluginError";
    this.pluginId = pluginId;
  }

  static loadFailure(pluginId: string, reason: string): PluginError {
    return new PluginError(`Failed to load plugin '${pluginId}': ${reason}`, pluginId, { reason });
  }

  static executionError(pluginId: string, error: Error): PluginError {
    return new PluginError(
      `Plugin '${pluginId}' execution failed: ${error.message}`,
      pluginId,
      { originalError: error.message, stack: error.stack }
    );
  }
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
  private static listeners: Set<(error: AppError) => void> = new Set();

  /**
   * Add a global error listener
   */
  static addListener(listener: (error: AppError) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove a global error listener
   */
  static removeListener(listener: (error: AppError) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Handle an error by notifying all listeners
   */
  static handle(error: AppError): void {
    console.error(`[${error.name}] ${error.code}: ${error.message}`, error.context);
    
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error("Error listener threw exception:", e);
      }
    });
  }

  /**
   * Wrap a function to catch and handle errors
   */
  static wrap<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args: any[]) => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          return result.catch(error => {
            if (error instanceof AppError) {
              this.handle(error);
            } else {
              this.handle(new AppError(ERROR_CODES.VALIDATION_ERROR, error.message));
            }
            throw error;
          });
        }
        return result;
      } catch (error) {
        if (error instanceof AppError) {
          this.handle(error);
        } else {
          this.handle(new AppError(ERROR_CODES.VALIDATION_ERROR, (error as Error).message));
        }
        throw error;
      }
    }) as T;
  }

  /**
   * Create a safe async function that won't throw
   */
  static safe<T extends (...args: any[]) => Promise<any>>(
    fn: T
  ): (...args: Parameters<T>) => Promise<ReturnType<T> | null> {
    return async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        if (error instanceof AppError) {
          this.handle(error);
        } else {
          this.handle(new AppError(ERROR_CODES.VALIDATION_ERROR, (error as Error).message));
        }
        return null;
      }
    };
  }
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E extends AppError = AppError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a successful result
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Create a failed result
 */
export function failure<E extends AppError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Convert a throwing function to return a Result
 */
export function toResult<T>(fn: () => T): Result<T> {
  try {
    return success(fn());
  } catch (error) {
    if (error instanceof AppError) {
      return failure(error);
    }
    return failure(new AppError(ERROR_CODES.VALIDATION_ERROR, (error as Error).message));
  }
}

/**
 * Convert an async throwing function to return a Result
 */
export async function toResultAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    if (error instanceof AppError) {
      return failure(error);
    }
    return failure(new AppError(ERROR_CODES.VALIDATION_ERROR, (error as Error).message));
  }
}