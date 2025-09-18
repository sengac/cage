import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventLoggerService } from '../src/event-logger.service';
import { mkdtemp, rm, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * TDD Test: EventLoggerService File-Based Logging
 *
 * Tests that events are properly written to file system
 * in append-only JSONL format with date-based rotation.
 */

describe('EventLoggerService', () => {
  let service: EventLoggerService;
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'event-logger-test-'));
    process.chdir(testDir);

    // Create .cage directory structure
    await mkdir('.cage', { recursive: true });
    await mkdir('.cage/events', { recursive: true });

    service = new EventLoggerService();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  describe('logEvent', () => {
    it('should write event to date-based JSONL file', async () => {
      // Arrange
      const event = {
        timestamp: new Date().toISOString(),
        eventType: 'PreToolUse' as const,
        sessionId: 'test-session',
        toolName: 'Read',
        arguments: { file_path: '/test.txt' }
      };

      // Act
      await service.logEvent(event);

      // Assert: File should be created in date-based directory
      const today = new Date().toISOString().split('T')[0];
      const eventsFile = join(testDir, '.cage/events', today, 'events.jsonl');

      expect(existsSync(eventsFile)).toBe(true);

      // Assert: File content should be correct JSONL format
      const content = await readFile(eventsFile, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(1);

      const loggedEvent = JSON.parse(lines[0]);
      expect(loggedEvent).toMatchObject({
        timestamp: event.timestamp,
        eventType: 'PreToolUse',
        sessionId: 'test-session',
        toolName: 'Read',
        arguments: { file_path: '/test.txt' }
      });
    });

    it('should append multiple events to same file', async () => {
      // Arrange
      const event1 = {
        timestamp: new Date().toISOString(),
        eventType: 'PreToolUse' as const,
        sessionId: 'session-1',
        toolName: 'Read',
        arguments: { file_path: '/test1.txt' }
      };

      const event2 = {
        timestamp: new Date().toISOString(),
        eventType: 'PostToolUse' as const,
        sessionId: 'session-1',
        toolName: 'Read',
        arguments: { file_path: '/test1.txt' },
        results: { success: true }
      };

      // Act
      await service.logEvent(event1);
      await service.logEvent(event2);

      // Assert: Both events in same file
      const today = new Date().toISOString().split('T')[0];
      const eventsFile = join(testDir, '.cage/events', today, 'events.jsonl');

      const content = await readFile(eventsFile, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(2);

      const loggedEvent1 = JSON.parse(lines[0]);
      const loggedEvent2 = JSON.parse(lines[1]);

      expect(loggedEvent1.eventType).toBe('PreToolUse');
      expect(loggedEvent2.eventType).toBe('PostToolUse');
    });

    it('should handle concurrent event logging', async () => {
      // Arrange
      const events = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        eventType: 'PreToolUse' as const,
        sessionId: `session-${i}`,
        toolName: 'Read',
        arguments: { file_path: `/test${i}.txt` }
      }));

      // Act: Log events concurrently
      await Promise.all(events.map(event => service.logEvent(event)));

      // Assert: All events logged
      const today = new Date().toISOString().split('T')[0];
      const eventsFile = join(testDir, '.cage/events', today, 'events.jsonl');

      const content = await readFile(eventsFile, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(10);

      // Verify all sessions are present
      const sessionIds = lines.map(line => JSON.parse(line).sessionId);
      const uniqueSessions = new Set(sessionIds);
      expect(uniqueSessions.size).toBe(10);
    });

    it('should create directory structure if missing', async () => {
      // Arrange: Remove .cage directory
      await rm(join(testDir, '.cage'), { recursive: true, force: true });

      const event = {
        timestamp: new Date().toISOString(),
        eventType: 'SessionStart' as const,
        sessionId: 'test-session',
        metadata: { version: '1.0.0' }
      };

      // Act
      await service.logEvent(event);

      // Assert: Directory structure created
      const today = new Date().toISOString().split('T')[0];
      const eventsDir = join(testDir, '.cage/events', today);
      const eventsFile = join(eventsDir, 'events.jsonl');

      expect(existsSync(eventsDir)).toBe(true);
      expect(existsSync(eventsFile)).toBe(true);

      const content = await readFile(eventsFile, 'utf-8');
      const loggedEvent = JSON.parse(content.trim());
      expect(loggedEvent.eventType).toBe('SessionStart');
    });

    it('should handle all 10 event types correctly', async () => {
      // Arrange: Create events for all 10 hook types
      const eventTypes = [
        'PreToolUse',
        'PostToolUse',
        'UserPromptSubmit',
        'SessionStart',
        'SessionEnd',
        'Notification',
        'PreCompact',
        'Stop',
        'SubagentStop'
      ] as const;

      const events = eventTypes.map(eventType => ({
        timestamp: new Date().toISOString(),
        eventType,
        sessionId: 'test-session',
        ...(eventType.includes('Tool') ? {
          toolName: 'Read',
          arguments: { file_path: '/test.txt' }
        } : {})
      }));

      // Act
      for (const event of events) {
        await service.logEvent(event);
      }

      // Assert: All events logged
      const today = new Date().toISOString().split('T')[0];
      const eventsFile = join(testDir, '.cage/events', today, 'events.jsonl');

      const content = await readFile(eventsFile, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(10);

      const loggedEventTypes = lines.map(line => JSON.parse(line).eventType);
      expect(loggedEventTypes).toEqual(eventTypes);
    });

    it('should handle errors gracefully and not throw', async () => {
      // Arrange: Create event with potentially problematic data
      const event = {
        timestamp: new Date().toISOString(),
        eventType: 'PreToolUse' as const,
        sessionId: 'test-session',
        toolName: 'Read',
        arguments: {
          file_path: '/test.txt',
          // Include data that could cause JSON issues
          circular: null as unknown,
          specialChars: 'test\n\r\t"quotes"',
          unicode: '🚀🎣📊'
        }
      };

      // Remove circular reference issue
      event.arguments.circular = { safe: 'data' };

      // Act & Assert: Should not throw
      await expect(service.logEvent(event)).resolves.not.toThrow();

      // Verify event was logged
      const today = new Date().toISOString().split('T')[0];
      const eventsFile = join(testDir, '.cage/events', today, 'events.jsonl');
      expect(existsSync(eventsFile)).toBe(true);
    });
  });
});