import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { loadCageConfig } from './config';
import type { Event } from '../stores/appStore';
import { Logger } from '@cage/shared';

interface RealEvent {
  timestamp: string;
  eventType: string;
  toolName?: string;
  sessionId: string;
  [key: string]: unknown;
}

const logger = new Logger({ context: 'real-events' });

export async function loadRealEvents(): Promise<Event[]> {
  try {
    const config = await loadCageConfig();
    if (!config) {
      return [];
    }

    const eventsDir = join(process.cwd(), config.eventsDir || '.cage/events');

    if (!existsSync(eventsDir)) {
      return [];
    }

    const allEvents: Event[] = [];
    const dateDirs = await readdir(eventsDir);

    // Sort date directories to get most recent first
    const sortedDates = dateDirs.sort((a, b) => b.localeCompare(a));

    // Load events from all date directories
    for (const dateDir of sortedDates) {
      const datePath = join(eventsDir, dateDir);
      try {
        const files = await readdir(datePath);
        const eventFiles = files.filter(f => f.endsWith('.jsonl'));

        for (const file of eventFiles) {
          const filePath = join(datePath, file);
          const content = await readFile(filePath, 'utf-8');
          const lines = content.trim().split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const event = JSON.parse(line) as RealEvent;

              // Convert to our Event interface format
              const convertedEvent: Event = {
                id: `${event.sessionId}-${event.timestamp}`,
                timestamp: event.timestamp,
                eventType: event.eventType,
                sessionId: event.sessionId,
                toolName: event.toolName,
                arguments: event.arguments as Record<string, unknown>,
                result: event.result as Record<string, unknown>,
                error: event.error as string,
                executionTime: event.executionTime as number,
              };

              allEvents.push(convertedEvent);
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      } catch {
        // Skip directories that can't be read
        continue;
      }
    }

    // Sort events by timestamp (most recent first)
    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return allEvents;
  } catch (error) {
    logger.error('Failed to load real events', { error });
    return [];
  }
}

export async function getEventsCounts(): Promise<{
  total: number;
  today: number;
  thisWeek: number;
}> {
  try {
    const events = await loadRealEvents();
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const todayEvents = events.filter(e => e.timestamp.startsWith(today)).length;
    const weekEvents = events.filter(e => e.timestamp >= oneWeekAgo).length;

    return {
      total: events.length,
      today: todayEvents,
      thisWeek: weekEvents,
    };
  } catch {
    return { total: 0, today: 0, thisWeek: 0 };
  }
}