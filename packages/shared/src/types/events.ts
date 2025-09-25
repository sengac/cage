/**
 * Event types for logging and querying hook events
 */

import * as z from 'zod';
import { HookType } from './hooks';

/**
 * Base event schema for all logged events
 */
export const EventSchema = z.object({
  // Unique event identifier
  id: z.string(),

  // ISO 8601 timestamp when the event occurred
  timestamp: z.string().datetime(),

  // Type of hook that triggered this event
  type: z.nativeEnum(HookType),

  // Session ID from Claude Code
  sessionId: z.string(),

  // The actual hook payload data
  data: z.record(z.string(), z.unknown()),

  // Optional metadata
  metadata: z
    .object({
      agentType: z.string().optional(),
      version: z.string().optional(),
      environment: z.string().optional(),
      hostname: z.string().optional(),
      pid: z.number().optional(),
    })
    .optional(),
});

export type Event = z.infer<typeof EventSchema>;

/**
 * Event log entry schema for file-based storage
 * Extends Event with storage-specific fields
 */
export const EventLogEntrySchema = EventSchema.extend({
  // Timestamp when the event was written to disk
  writtenAt: z.string().datetime().optional(),

  // Optional checksum for integrity verification
  checksum: z.string().optional(),

  // File path where this event is stored
  filePath: z.string().optional(),

  // Line number in the file (for JSONL format)
  lineNumber: z.number().optional(),
});

export type EventLogEntry = z.infer<typeof EventLogEntrySchema>;

/**
 * Query parameters for retrieving events
 */
export const EventQuerySchema = z.object({
  // Date range (required)
  from: z.string().datetime(),
  to: z.string().datetime(),

  // Optional filters
  types: z.array(z.nativeEnum(HookType)).optional(),
  sessionIds: z.array(z.string()).optional(),

  // Pagination
  limit: z.number().positive().max(10000).default(1000),
  offset: z.number().min(0).default(0),

  // Sorting
  sortBy: z.enum(['timestamp', 'type', 'sessionId']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type EventQuery = z.infer<typeof EventQuerySchema>;

/**
 * Event statistics schema
 */
export const EventStatsSchema = z.object({
  totalEvents: z.number(),
  eventsByType: z.record(z.nativeEnum(HookType), z.number()),
  uniqueSessions: z.number(),
  dateRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  averageEventsPerSession: z.number(),
  mostFrequentTools: z
    .array(
      z.object({
        name: z.string(),
        count: z.number(),
      })
    )
    .optional(),
  peakActivityPeriods: z
    .array(
      z.object({
        hour: z.number().min(0).max(23),
        count: z.number(),
      })
    )
    .optional(),
});

export type EventStats = z.infer<typeof EventStatsSchema>;

/**
 * Event stream options for real-time monitoring
 */
export const EventStreamOptionsSchema = z.object({
  // Filter by event types
  types: z.array(z.nativeEnum(HookType)).optional(),

  // Include historical events from a certain point
  since: z.string().datetime().optional(),

  // Maximum buffer size for backpressure handling
  maxBufferSize: z.number().positive().default(1000),

  // Reconnect on disconnect
  autoReconnect: z.boolean().default(true),

  // Reconnect delay in milliseconds
  reconnectDelay: z.number().positive().default(1000),
});

export type EventStreamOptions = z.infer<typeof EventStreamOptionsSchema>;
