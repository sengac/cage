/**
 * Shared utilities and types for the Cage project
 */

import { z } from 'zod';
import { format } from 'date-fns';
import { nanoid } from 'nanoid';

/**
 * Generate a unique ID for events
 */
export function generateEventId(): string {
  return nanoid();
}

/**
 * Format a date for logging
 */
export function formatLogDate(date: Date): string {
  return format(date, 'yyyy-MM-dd HH:mm:ss.SSS');
}

/**
 * Base event schema
 */
export const EventSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  type: z.string(),
  payload: z.unknown(),
});

export type Event = z.infer<typeof EventSchema>;

/**
 * Hook event schema
 */
export const HookEventSchema = EventSchema.extend({
  type: z.literal('hook'),
  hookType: z.enum(['PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'Stop']),
  toolName: z.string().optional(),
  payload: z.record(z.unknown()),
});

export type HookEvent = z.infer<typeof HookEventSchema>;