import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { Logger } from '@cage/shared';
import type { EventLogEntry } from '../services/event-logger.service.js';

interface MessageEvent {
  data: string;
  type?: string;
  id?: string;
  retry?: number;
}

interface HookEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}


@Injectable()
export class EventsService {
  private readonly logger = new Logger();
  private readonly eventSubject = new Subject<HookEvent>();

  @OnEvent('hook.received')
  handleHookEvent(event: HookEvent) {
    this.eventSubject.next(event);
  }

  getEventStream(eventFilter?: string): Observable<MessageEvent> {
    return this.eventSubject.asObservable().pipe(
      filter((event: HookEvent) => !eventFilter || event.type === eventFilter),
      map((event: HookEvent) => ({
        data: JSON.stringify({
          timestamp: event.timestamp,
          eventType: event.type,
          toolName: event.payload.toolName || 'N/A',
          sessionId: event.payload.sessionId
        }),
        type: 'event',
        id: `${Date.now()}`
      }))
    );
  }

  async getEventsList(from?: string, to?: string): Promise<{
    events: EventLogEntry[];
    summary: {
      totalEvents: number;
      eventsByType: Record<string, number>;
      sessions: number;
    };
  }> {
    try {
      const events = await this.loadEventsInRange(from, to);
      const eventsByType: Record<string, number> = {};
      const sessions = new Set<string>();

      events.forEach(event => {
        eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
        if (event.sessionId) {
          sessions.add(event.sessionId);
        }
      });

      return {
        events,
        summary: {
          totalEvents: events.length,
          eventsByType,
          sessions: sessions.size
        }
      };
    } catch (error) {
      this.logger.error('Failed to load events list', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        events: [],
        summary: {
          totalEvents: 0,
          eventsByType: {},
          sessions: 0
        }
      };
    }
  }

  async getEventStats(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    toolsByCount: Record<string, number>;
    averageEventsPerSession: number;
    sessions: number;
  }> {
    try {
      const events = await this.loadAllEvents();
      const eventsByType: Record<string, number> = {};
      const toolsByCount: Record<string, number> = {};
      const sessions = new Set<string>();

      events.forEach(event => {
        eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;

        if (event.toolName) {
          toolsByCount[event.toolName] = (toolsByCount[event.toolName] || 0) + 1;
        }

        if (event.sessionId) {
          sessions.add(event.sessionId);
        }
      });

      return {
        totalEvents: events.length,
        eventsByType,
        toolsByCount,
        averageEventsPerSession: sessions.size > 0 ? events.length / sessions.size : 0,
        sessions: sessions.size
      };
    } catch (error) {
      this.logger.error('Failed to calculate event stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        totalEvents: 0,
        eventsByType: {},
        toolsByCount: {},
        averageEventsPerSession: 0,
        sessions: 0
      };
    }
  }

  async getTailEvents(count: number): Promise<EventLogEntry[]> {
    try {
      const events = await this.loadAllEvents();
      return events.slice(-count);
    } catch (error) {
      this.logger.error('Failed to load tail events', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  private async loadEventsInRange(from?: string, to?: string): Promise<EventLogEntry[]> {
    const eventsDir = join(process.cwd(), '.cage', 'events');

    if (!existsSync(eventsDir)) {
      return [];
    }

    const allEvents: EventLogEntry[] = [];
    const dateDirs = await readdir(eventsDir);

    for (const dateDir of dateDirs) {
      // Filter by date range if specified
      if (from && dateDir < from) continue;
      if (to && dateDir > to) continue;

      const eventsFile = join(eventsDir, dateDir, 'events.jsonl');
      if (existsSync(eventsFile)) {
        const events = await this.parseJsonlFile(eventsFile);
        allEvents.push(...events);
      }
    }

    return allEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  private async loadAllEvents(): Promise<EventLogEntry[]> {
    return this.loadEventsInRange();
  }

  private async parseJsonlFile(filePath: string): Promise<EventLogEntry[]> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());

      return lines.map(line => {
        try {
          return JSON.parse(line) as EventLogEntry;
        } catch (error) {
          this.logger.error('Failed to parse JSONL line', {
            error: error instanceof Error ? error.message : 'Unknown error',
            line
          });
          return null;
        }
      }).filter((event): event is EventLogEntry => event !== null);

    } catch (error) {
      this.logger.error('Failed to read JSONL file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath
      });
      return [];
    }
  }
}