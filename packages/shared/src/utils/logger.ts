/**
 * Logger utility for consistent logging across all packages
 * Uses process.stdout/stderr instead of console to comply with coding standards
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerOptions {
  level?: LogLevel;
  context?: string;
  silent?: boolean;
}

export interface LogTransport {
  log(entry: {
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    component: string;
    message: string;
    context?: Record<string, unknown>;
    stackTrace?: string;
  }): void;
}

// Global Winston transport (set by backend)
let globalTransport: LogTransport | null = null;

export function setGlobalLogTransport(transport: LogTransport | null): void {
  globalTransport = transport;
}

export function getGlobalLogTransport(): LogTransport | null {
  return globalTransport;
}

export class Logger {
  private level: LogLevel;
  private context?: string;
  private silent: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.context = options.context;
    this.silent = options.silent ?? false;
  }

  /**
   * Create a child logger with additional context
   */
  child(childContext: string): Logger {
    const fullContext = this.context
      ? `${this.context}:${childContext}`
      : childContext;

    return new Logger({
      level: this.level,
      context: fullContext,
      silent: this.silent,
    });
  }

  /**
   * Format a log message with timestamp, level, and context
   */
  private formatMessage(
    level: string,
    message: string,
    data?: unknown
  ): string {
    const timestamp = new Date().toISOString();
    const contextPart = this.context ? `[${this.context}] ` : '';

    let dataPart = '';
    if (data) {
      // Special handling for objects containing Error instances
      if (typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>;
        if (obj.error instanceof Error) {
          const errorData = {
            ...obj,
            error: {
              message: obj.error.message,
              name: obj.error.name,
              stack: obj.error.stack,
            },
          };
          dataPart = ` ${JSON.stringify(errorData)}`;
        } else {
          dataPart = ` ${JSON.stringify(data)}`;
        }
      } else {
        dataPart = ` ${JSON.stringify(data)}`;
      }
    }

    return `${timestamp} [${level}] ${contextPart}${message}${dataPart}\n`;
  }

  /**
   * Write to stdout or stderr based on level
   * Only writes to console if no Winston transport is available
   */
  private write(level: LogLevel, message: string): void {
    if (this.silent) {
      return;
    }

    // If Winston transport is available, DON'T write to console
    // Winston transport will handle all logging
    if (getGlobalLogTransport()) {
      return;
    }

    // Fallback to console only when Winston is not available
    if (level >= LogLevel.WARN) {
      process.stderr.write(message);
    } else {
      process.stdout.write(message);
    }
  }

  /**
   * Send log to global transport (Winston)
   */
  private sendToTransport(
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
    message: string,
    data?: unknown
  ): void {
    // Respect silent flag for transport as well
    if (this.silent) {
      return;
    }

    const transport = getGlobalLogTransport();
    if (!transport) {
      return;
    }

    const entry: Parameters<LogTransport['log']>[0] = {
      level,
      component: this.context || 'Unknown',
      message,
    };

    // Extract context and stack trace from data
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;

      // Extract stack trace from Error objects
      if (obj.error instanceof Error) {
        entry.stackTrace = obj.error.stack;
        // Include other context data
        const { error, ...rest } = obj;
        if (Object.keys(rest).length > 0) {
          entry.context = rest;
        }
      } else {
        entry.context = obj;
      }
    }

    transport.log(entry);
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: unknown): void {
    if (this.level <= LogLevel.DEBUG) {
      const formatted = this.formatMessage('DEBUG', message, data);
      this.write(LogLevel.DEBUG, formatted);
      this.sendToTransport('DEBUG', message, data);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, data?: unknown): void {
    if (this.level <= LogLevel.INFO) {
      const formatted = this.formatMessage('INFO', message, data);
      this.write(LogLevel.INFO, formatted);
      this.sendToTransport('INFO', message, data);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: unknown): void {
    if (this.level <= LogLevel.WARN) {
      const formatted = this.formatMessage('WARN', message, data);
      this.write(LogLevel.WARN, formatted);
      this.sendToTransport('WARN', message, data);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, data?: unknown): void {
    if (this.level <= LogLevel.ERROR) {
      const formatted = this.formatMessage('ERROR', message, data);
      this.write(LogLevel.ERROR, formatted);
      this.sendToTransport('ERROR', message, data);
    }
  }

  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }
}

/**
 * Default logger instance
 */
export const defaultLogger = new Logger();
