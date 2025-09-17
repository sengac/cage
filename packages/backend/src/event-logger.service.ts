import { Injectable } from '@nestjs/common';
import { writeFile, mkdir, readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

@Injectable()
export class EventLoggerService {
  private baseDir: string;

  constructor() {
    // Use TEST_BASE_DIR for testing, otherwise use process.cwd()
    this.baseDir = process.env.TEST_BASE_DIR || process.cwd();
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
  }

  async getEventsList(page: number, limit: number, date?: string, sessionId?: string): Promise<{
    events: unknown[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  }> {
    const eventsDir = join(this.baseDir, '.cage', 'events');

    if (!existsSync(eventsDir)) {
      return {
        events: [],
        total: 0,
        pagination: { page, limit, total: 0 }
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
          const lines = content.trim().split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              // Filter by sessionId if provided
              if (!sessionId || event.sessionId === sessionId) {
                allEvents.push(event);
              }
            } catch (parseError) {
              console.error('Failed to parse event line:', parseError);
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
          total: allEvents.length
        }
      };
    } catch (error) {
      console.error('Error in getEventsList:', error);
      return {
        events: [],
        total: 0,
        pagination: { page, limit, total: 0 }
      };
    }
  }

  async getEventsStats(date?: string): Promise<{
    total: number;
    byToolName: Record<string, number>;
    byEventType: Record<string, number>;
    uniqueSessions: number;
    dateRange: {
      from: string;
      to: string;
    };
  }> {
    const eventsDir = join(this.baseDir, '.cage', 'events');

    if (!existsSync(eventsDir)) {
      return {
        total: 0,
        byToolName: {},
        byEventType: {},
        uniqueSessions: 0,
        dateRange: { from: '', to: '' }
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
          const lines = content.trim().split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              // Add all events (no filtering in stats)
              allEvents.push(event);
            } catch (parseError) {
              console.error('Failed to parse event line:', parseError);
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
          from: earliestDate || (date || ''),
          to: latestDate || (date || '')
        }
      };
    } catch {
      return {
        total: 0,
        byToolName: {},
        byEventType: {},
        uniqueSessions: 0,
        dateRange: { from: '', to: '' }
      };
    }
  }

  async getTailEvents(count: number): Promise<unknown[]> {
    const eventsDir = join(this.baseDir, '.cage', 'events');

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
          const lines = content.trim().split('\n').filter(line => line.trim());

          // Parse each line and add to events array
          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              // Add all events (no filtering in tail)
              allEvents.push(event);
            } catch (parseError) {
              console.error('Failed to parse event line:', parseError);
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

  private getLogPath(timestamp: string): string {
    // Extract date from timestamp (YYYY-MM-DD format)
    const date = timestamp.split('T')[0];

    // Create path: .cage/events/{date}/events.jsonl
    return join(this.baseDir, '.cage', 'events', date, 'events.jsonl');
  }
}