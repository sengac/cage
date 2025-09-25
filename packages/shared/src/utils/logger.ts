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
   */
  private write(level: LogLevel, message: string): void {
    if (this.silent) {
      return;
    }

    if (level >= LogLevel.WARN) {
      process.stderr.write(message);
    } else {
      process.stdout.write(message);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: unknown): void {
    if (this.level <= LogLevel.DEBUG) {
      const formatted = this.formatMessage('DEBUG', message, data);
      this.write(LogLevel.DEBUG, formatted);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, data?: unknown): void {
    if (this.level <= LogLevel.INFO) {
      const formatted = this.formatMessage('INFO', message, data);
      this.write(LogLevel.INFO, formatted);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: unknown): void {
    if (this.level <= LogLevel.WARN) {
      const formatted = this.formatMessage('WARN', message, data);
      this.write(LogLevel.WARN, formatted);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, data?: unknown): void {
    if (this.level <= LogLevel.ERROR) {
      const formatted = this.formatMessage('ERROR', message, data);
      this.write(LogLevel.ERROR, formatted);
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
