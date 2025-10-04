import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { writeFile, mkdir, readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { Logger, getProjectRoot, getEventsDir } from '@cage/shared';
import { randomBytes } from 'crypto';

export interface EventStats {
  total: number;
  byToolName: Record<string, number>;
  byEventType: Record<string, number>;
  uniqueSessions: number;
  dateRange: {
    from: string;
    to: string;
  };
}

@Injectable()
export class EventLoggerService {
  private readonly logger = new Logger({ context: 'EventLoggerService' });

  constructor(private readonly eventEmitter?: EventEmitter2) {}

  private getBaseDir(): string {
    // Use centralized path utility which handles TEST_BASE_DIR
    return getProjectRoot();
  }
  async logEvent(eventData: {
    timestamp: string;
    eventType: string;
    sessionId: string;
    [key: string]: unknown;
  }): Promise<void> {
    const logPath = this.getLogPath(eventData.timestamp);

    // Ensure directory exists
    const logDir = dirname(logPath);
    if (!existsSync(logDir)) {
      await mkdir(logDir, { recursive: true });
    }

    // Create JSONL entry
    const logEntry = JSON.stringify(eventData) + '\n';

    // Append to file
    await writeFile(logPath, logEntry, { flag: 'a' });

    // Emit event for SSE stream notification
    if (this.eventEmitter) {
      this.eventEmitter.emit('hook.event.added', {
        eventType: eventData.eventType,
        sessionId: eventData.sessionId,
        timestamp: eventData.timestamp,
      });
    }
  }

  async getEventsList(
    page: number,
    limit: number,
    date?: string,
    sessionId?: string
  ): Promise<{
    events: unknown[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  }> {
    const eventsDir = getEventsDir();

    if (!existsSync(eventsDir)) {
      return {
        events: [],
        total: 0,
        pagination: { page, limit, total: 0 },
      };
    }

    try {
      let dateDirs: string[];

      if (date) {
        // Filter to specific date
        dateDirs = [date];
      } else {
        // Get all date directories
        const allDirs = await readdir(eventsDir);
        // Filter to only valid date directories (YYYY-MM-DD format)
        dateDirs = allDirs.filter(dir => /^\d{4}-\d{2}-\d{2}$/.test(dir));
      }

      const allEvents: unknown[] = [];

      // Read events from date directories
      for (const dateDir of dateDirs) {
        const logPath = join(eventsDir, dateDir, 'events.jsonl');

        if (existsSync(logPath)) {
          const content = await readFile(logPath, 'utf-8');
          const lines = content
            .trim()
            .split('\n')
            .filter(line => line.trim());

          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              // Filter by sessionId if provided
              if (!sessionId || event.sessionId === sessionId) {
                // Generate unique ID for event if it doesn't have one
                if (!event.id) {
                  event.id = randomBytes(16).toString('hex');
                }
                allEvents.push(event);
              }
            } catch (parseError) {
              this.logger.error('Failed to parse event line:', parseError);
            }
          }
        }
      }

      // Sort by timestamp descending (most recent first)
      allEvents.sort((a: unknown, b: unknown) => {
        const eventA = a as Record<string, unknown>;
        const eventB = b as Record<string, unknown>;
        const timestampA = new Date(eventA.timestamp as string).getTime();
        const timestampB = new Date(eventB.timestamp as string).getTime();
        return timestampB - timestampA;
      });

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedEvents = allEvents.slice(startIndex, endIndex);

      return {
        events: paginatedEvents,
        total: allEvents.length,
        pagination: {
          page,
          limit,
          total: allEvents.length,
        },
      };
    } catch (error) {
      this.logger.error('Error in getEventsList:', error);
      return {
        events: [],
        total: 0,
        pagination: { page, limit, total: 0 },
      };
    }
  }

  async getEventsStats(date?: string): Promise<EventStats> {
    const eventsDir = getEventsDir();

    if (!existsSync(eventsDir)) {
      return {
        total: 0,
        byToolName: {},
        byEventType: {},
        uniqueSessions: 0,
        dateRange: { from: '', to: '' },
      };
    }

    try {
      let dateDirs: string[];

      if (date) {
        dateDirs = [date];
      } else {
        dateDirs = await readdir(eventsDir);
      }

      const allEvents: unknown[] = [];

      // Read events from date directories
      for (const dateDir of dateDirs) {
        const logPath = join(eventsDir, dateDir, 'events.jsonl');

        if (existsSync(logPath)) {
          const content = await readFile(logPath, 'utf-8');
          const lines = content
            .trim()
            .split('\n')
            .filter(line => line.trim());

          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              // Add all events (no filtering in stats)
              allEvents.push(event);
            } catch (parseError) {
              this.logger.error('Failed to parse event line:', parseError);
            }
          }
        }
      }

      // Calculate statistics
      const byToolName: Record<string, number> = {};
      const byEventType: Record<string, number> = {};
      const sessionIds = new Set<string>();
      let earliestDate = '';
      let latestDate = '';

      for (const event of allEvents) {
        const eventObj = event as Record<string, unknown>;

        // Count by tool name
        const toolName = eventObj.toolName as string;
        if (toolName) {
          byToolName[toolName] = (byToolName[toolName] || 0) + 1;
        }

        // Count by event type
        const eventType = eventObj.eventType as string;
        if (eventType) {
          byEventType[eventType] = (byEventType[eventType] || 0) + 1;
        }

        // Track unique sessions
        const sessionId = eventObj.sessionId as string;
        if (sessionId) {
          sessionIds.add(sessionId);
        }

        // Track date range
        const timestamp = eventObj.timestamp as string;
        if (timestamp) {
          const eventDate = timestamp.split('T')[0];
          if (!earliestDate || eventDate < earliestDate) {
            earliestDate = eventDate;
          }
          if (!latestDate || eventDate > latestDate) {
            latestDate = eventDate;
          }
        }
      }

      return {
        total: allEvents.length,
        byToolName,
        byEventType,
        uniqueSessions: sessionIds.size,
        dateRange: {
          from: earliestDate || date || '',
          to: latestDate || date || '',
        },
      };
    } catch {
      return {
        total: 0,
        byToolName: {},
        byEventType: {},
        uniqueSessions: 0,
        dateRange: { from: '', to: '' },
      };
    }
  }

  async getTailEvents(count: number): Promise<unknown[]> {
    const eventsDir = getEventsDir();

    if (!existsSync(eventsDir)) {
      return [];
    }

    try {
      // Get all date directories
      const dateDirs = await readdir(eventsDir);
      const sortedDates = dateDirs.sort().reverse(); // Most recent first

      const allEvents: unknown[] = [];

      // Read events from each date directory (most recent first)
      for (const dateDir of sortedDates) {
        const logPath = join(eventsDir, dateDir, 'events.jsonl');

        if (existsSync(logPath)) {
          const content = await readFile(logPath, 'utf-8');
          const lines = content
            .trim()
            .split('\n')
            .filter(line => line.trim());

          // Parse each line and add to events array
          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              // Add all events (no filtering in tail)
              allEvents.push(event);
            } catch (parseError) {
              this.logger.error('Failed to parse event line:', parseError);
            }
          }
        }

        // Stop if we have enough events
        if (allEvents.length >= count) {
          break;
        }
      }

      // Sort by timestamp descending and take requested count
      allEvents.sort((a: unknown, b: unknown) => {
        const eventA = a as Record<string, unknown>;
        const eventB = b as Record<string, unknown>;
        const timestampA = new Date(eventA.timestamp as string).getTime();
        const timestampB = new Date(eventB.timestamp as string).getTime();
        return timestampB - timestampA;
      });

      return allEvents.slice(0, count);
    } catch {
      return [];
    }
  }

  async getEventsSince(timestamp: string): Promise<unknown[]> {
    const eventsDir = getEventsDir();

    if (!existsSync(eventsDir)) {
      return [];
    }

    try {
      // Get the date from the timestamp
      const sinceDate = new Date(timestamp);
      const dateStr = timestamp.split('T')[0];

      // Get all date directories from the since date onwards
      const allDirs = await readdir(eventsDir);
      const dateDirs = allDirs
        .filter(dir => /^\d{4}-\d{2}-\d{2}$/.test(dir))
        .filter(dir => dir >= dateStr)
        .sort();

      const newEvents: unknown[] = [];

      // Read events from each relevant date directory
      for (const dateDir of dateDirs) {
        const logPath = join(eventsDir, dateDir, 'events.jsonl');

        if (existsSync(logPath)) {
          const content = await readFile(logPath, 'utf-8');
          const lines = content
            .trim()
            .split('\n')
            .filter(line => line.trim());

          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              // Only include events newer than or equal to the timestamp
              if (event.timestamp >= timestamp) {
                // Generate unique ID for event if it doesn't have one
                if (!event.id) {
                  event.id = randomBytes(16).toString('hex');
                }
                newEvents.push(event);
              }
            } catch (parseError) {
              this.logger.error('Failed to parse event line:', parseError);
            }
          }
        }
      }

      // Sort by timestamp ascending (oldest first)
      newEvents.sort((a: unknown, b: unknown) => {
        const eventA = a as Record<string, unknown>;
        const eventB = b as Record<string, unknown>;
        const timestampA = new Date(eventA.timestamp as string).getTime();
        const timestampB = new Date(eventB.timestamp as string).getTime();
        return timestampA - timestampB;
      });

      return newEvents;
    } catch (error) {
      this.logger.error('Error in getEventsSince:', error);
      return [];
    }
  }

  private getLogPath(timestamp: string): string {
    // Extract date from timestamp (YYYY-MM-DD format)
    const date = timestamp.split('T')[0];

    // Dynamically get base directory to support test isolation
    const baseDir = this.getBaseDir();
    
    // Create path: .cage/events/{date}/events.jsonl
    return join(baseDir, '.cage', 'events', date, 'events.jsonl');
  }
}
