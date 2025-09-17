import { describe, it, expect } from 'vitest';
import * as z from 'zod';

// These imports will work after implementing events.ts
import {
  EventSchema,
  EventLogEntrySchema,
  EventQuerySchema,
  type Event,
  type EventLogEntry,
  type EventQuery
} from './events';

describe('Event Types', () => {
  describe('EventSchema', () => {
    it('should validate a basic event', () => {
      const event = {
        id: 'evt_123abc',
        timestamp: new Date().toISOString(),
        type: 'PreToolUse',
        sessionId: 'session-456',
        data: {
          toolName: 'Read',
          arguments: { file_path: '/test.txt' }
        }
      };

      const result = EventSchema.safeParse(event);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('evt_123abc');
        expect(result.data.type).toBe('PreToolUse');
      }
    });

    it('should validate event with metadata', () => {
      const event = {
        id: 'evt_123abc',
        timestamp: new Date().toISOString(),
        type: 'PostToolUse',
        sessionId: 'session-456',
        data: {
          toolName: 'Write',
          result: { success: true }
        },
        metadata: {
          agentType: 'claude',
          version: '1.0.0',
          environment: 'development'
        }
      };

      const result = EventSchema.safeParse(event);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata?.agentType).toBe('claude');
        expect(result.data.metadata?.version).toBe('1.0.0');
      }
    });

    it('should reject event without required fields', () => {
      const event = {
        type: 'PreToolUse'
        // Missing id, timestamp, sessionId, data
      };

      const result = EventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('EventLogEntrySchema', () => {
    it('should validate a log entry for file storage', () => {
      const entry = {
        id: 'evt_123abc',
        timestamp: new Date().toISOString(),
        type: 'UserPromptSubmit',
        sessionId: 'session-456',
        data: {
          prompt: 'Help me write a function'
        },
        metadata: {
          agentType: 'claude'
        },
        writtenAt: new Date().toISOString(),
        checksum: 'sha256:abcdef123456'
      };

      const result = EventLogEntrySchema.safeParse(entry);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.writtenAt).toBeDefined();
        expect(result.data.checksum).toBe('sha256:abcdef123456');
      }
    });

    it('should auto-generate writtenAt if not provided', () => {
      const entry = {
        id: 'evt_123abc',
        timestamp: new Date().toISOString(),
        type: 'Stop',
        sessionId: 'session-456',
        data: {
          reason: 'Task completed'
        }
      };

      const result = EventLogEntrySchema.safeParse(entry);
      expect(result.success).toBe(true);
      // Note: writtenAt would be added when writing to disk
    });
  });

  describe('EventQuerySchema', () => {
    it('should validate a basic query', () => {
      const query = {
        from: '2025-01-01T00:00:00Z',
        to: '2025-01-31T23:59:59Z'
      };

      const result = EventQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.from).toBe('2025-01-01T00:00:00Z');
        expect(result.data.to).toBe('2025-01-31T23:59:59Z');
      }
    });

    it('should validate a query with filters', () => {
      const query = {
        from: '2025-01-01T00:00:00Z',
        to: '2025-01-31T23:59:59Z',
        types: ['PreToolUse', 'PostToolUse'],
        sessionIds: ['session-123', 'session-456'],
        limit: 100,
        offset: 20
      };

      const result = EventQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.types).toHaveLength(2);
        expect(result.data.limit).toBe(100);
        expect(result.data.offset).toBe(20);
      }
    });

    it('should provide defaults for limit', () => {
      const query = {
        from: '2025-01-01T00:00:00Z',
        to: '2025-01-31T23:59:59Z'
      };

      const result = EventQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(1000); // default
        expect(result.data.offset).toBe(0); // default
      }
    });

    it('should reject invalid date format', () => {
      const query = {
        from: 'invalid-date',
        to: '2025-01-31T23:59:59Z'
      };

      const result = EventQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });
});