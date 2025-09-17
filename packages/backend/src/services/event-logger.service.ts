import { Injectable } from '@nestjs/common';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { Logger } from '@cage/shared';

export interface EventLogEntry {
  timestamp: string;
  eventType: string;
  sessionId?: string;
  toolName?: string;
  arguments?: Record<string, unknown>;
  results?: Record<string, unknown>;
  [key: string]: unknown;
}

@Injectable()
export class EventLoggerService {
  private readonly logger = new Logger();

  async logEvent(event: EventLogEntry): Promise<void> {
    try {
      const logPath = this.getLogPath(event.timestamp);

      // Ensure directory exists
      const logDir = dirname(logPath);
      if (!existsSync(logDir)) {
        await mkdir(logDir, { recursive: true });
      }

      // Create JSONL entry
      const logEntry = JSON.stringify(event) + '\n';

      // Append to file (append-only mode)
      await writeFile(logPath, logEntry, { flag: 'a' });

    } catch (error) {
      this.logger.error('Failed to log event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: event.eventType,
        sessionId: event.sessionId
      });
    }
  }

  private getLogPath(timestamp: string): string {
    // Extract date from timestamp (YYYY-MM-DD format)
    const date = timestamp.split('T')[0];

    // Create path: .cage/events/{date}/events.jsonl
    return join(process.cwd(), '.cage', 'events', date, 'events.jsonl');
  }
}