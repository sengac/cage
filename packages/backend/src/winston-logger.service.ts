import { Injectable, Scope } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { nanoid } from 'nanoid';

export interface DebugLogEntry {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  component: string;
  message: string;
  context?: Record<string, unknown>;
  stackTrace?: string;
}

/**
 * Winston Logger Service
 *
 * Provides in-memory storage of all logger events from @cage/shared Logger class.
 * This service acts as a Winston transport that captures all log events for
 * debugging purposes via the /api/debug/logs endpoint.
 *
 * Emits 'debug.log.added' events for SSE notification broadcasting.
 *
 * NestJS creates this as a singleton by default.
 */
@Injectable()
export class WinstonLoggerService {
  private logs: DebugLogEntry[] = [];
  private readonly MAX_LOGS = 10000; // Prevent memory overflow

  constructor(private readonly eventEmitter?: EventEmitter2) {}

  /**
   * Add a log entry to in-memory storage
   * Emits 'debug.log.added' event for SSE notification
   */
  addLog(entry: Omit<DebugLogEntry, 'id' | 'timestamp'>): void {
    const logEntry: DebugLogEntry = {
      id: nanoid(),
      timestamp: new Date().toISOString(),
      ...entry,
    };

    this.logs.push(logEntry);

    // Prevent memory overflow by keeping only the most recent logs
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Emit event for SSE stream notification
    if (this.eventEmitter) {
      this.eventEmitter.emit('debug.log.added', {
        level: logEntry.level,
        component: logEntry.component,
        timestamp: logEntry.timestamp,
      });
    }
  }

  /**
   * Get all logs or filtered logs
   * Returns in chronological order by default
   */
  getLogs(filters?: {
    level?: string;
    component?: string;
    limit?: number;
    reverse?: boolean; // true = most recent first
  }): DebugLogEntry[] {
    let filtered = [...this.logs];

    // Filter by level
    if (filters?.level) {
      filtered = filtered.filter(log => log.level === filters.level);
    }

    // Filter by component
    if (filters?.component) {
      filtered = filtered.filter(log => log.component === filters.component);
    }

    // Reverse if requested (for API endpoint - most recent first)
    if (filters?.reverse) {
      filtered.reverse();
    }

    // Apply limit
    if (filters?.limit && filters.limit > 0) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Clear all logs (useful for testing)
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get total count of logs
   */
  getLogCount(): number {
    return this.logs.length;
  }

  /**
   * Get logs since a specific timestamp (for incremental fetching)
   * Returns logs with timestamp > since parameter
   */
  getLogsSince(timestamp: string): DebugLogEntry[] {
    return this.logs.filter(log => log.timestamp > timestamp);
  }
}