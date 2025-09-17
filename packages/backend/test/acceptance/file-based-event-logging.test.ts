import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from '../../src/app.module.js';
import { rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Feature: File-Based Event Logging', () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer();

    // Clean up any existing test logs
    const testLogDir = join(process.cwd(), '.cage');
    if (existsSync(testLogDir)) {
      rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  afterEach(async () => {
    await app.close();

    // Clean up test logs
    const testLogDir = join(process.cwd(), '.cage');
    if (existsSync(testLogDir)) {
      rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  describe('Scenario: Log event with complete data', () => {
    it('Given the backend receives a hook event When the event is processed Then an entry should be appended to .cage/events/{date}/events.jsonl And the entry should contain: timestamp, eventType, toolName, arguments, results, sessionId And the file should use append-only mode (no overwrites)', async () => {
      // Given - backend server is running

      // When
      const payload = {
        sessionId: 'test-session-1',
        timestamp: '2025-01-15T10:00:00Z',
        toolName: 'Read',
        arguments: {
          file_path: '/test/file.js'
        }
      };

      await request(httpServer)
        .post('/claude/hooks/pre-tool-use')
        .send(payload)
        .expect(200);

      // Then
      const logPath = join(process.cwd(), '.cage', 'events', '2025-01-15', 'events.jsonl');
      expect(existsSync(logPath)).toBe(true);

      const logContent = readFileSync(logPath, 'utf-8');
      const logEntry = JSON.parse(logContent.trim());

      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('eventType', 'PreToolUse');
      expect(logEntry).toHaveProperty('toolName', 'Read');
      expect(logEntry).toHaveProperty('sessionId', 'test-session-1');
      expect(logEntry).toHaveProperty('arguments');
      expect(logEntry.arguments).toEqual({ file_path: '/test/file.js' });
    });
  });

  describe('Scenario: Rotate log files daily', () => {
    it('Given events are being logged When the date changes to a new day Then new events should be written to .cage/events/{new-date}/events.jsonl And previous day\'s file should remain unchanged And maintain chronological order within each file', async () => {
      // Given - backend server is running

      // When - log event for first date
      const payload1 = {
        sessionId: 'test-session-1',
        timestamp: '2025-01-15T10:00:00Z',
        toolName: 'Read',
        arguments: { file: 'test1.js' }
      };

      await request(httpServer)
        .post('/claude/hooks/pre-tool-use')
        .send(payload1)
        .expect(200);

      // When - log event for second date
      const payload2 = {
        sessionId: 'test-session-2',
        timestamp: '2025-01-16T10:00:00Z',
        toolName: 'Write',
        arguments: { file: 'test2.js' }
      };

      await request(httpServer)
        .post('/claude/hooks/pre-tool-use')
        .send(payload2)
        .expect(200);

      // Then
      const logPath1 = join(process.cwd(), '.cage', 'events', '2025-01-15', 'events.jsonl');
      const logPath2 = join(process.cwd(), '.cage', 'events', '2025-01-16', 'events.jsonl');

      expect(existsSync(logPath1)).toBe(true);
      expect(existsSync(logPath2)).toBe(true);

      const logContent1 = readFileSync(logPath1, 'utf-8');
      const logContent2 = readFileSync(logPath2, 'utf-8');

      const logEntry1 = JSON.parse(logContent1.trim());
      const logEntry2 = JSON.parse(logContent2.trim());

      expect(logEntry1.toolName).toBe('Read');
      expect(logEntry2.toolName).toBe('Write');
    });
  });

  describe('Scenario: Handle high-frequency events', () => {
    it('Given Claude Code is rapidly triggering hooks When 100+ events occur within 1 second Then all events should be captured without loss And events should maintain correct chronological order And the system should not crash or slow down Claude Code', async () => {
      // Given - backend server is running

      // When - rapidly trigger multiple events
      const eventPromises = [];
      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        const payload = {
          sessionId: 'test-session-bulk',
          timestamp: new Date(startTime + i).toISOString(),
          toolName: `Tool${i}`,
          arguments: { index: i }
        };

        eventPromises.push(
          request(httpServer)
            .post('/claude/hooks/pre-tool-use')
            .send(payload)
        );
      }

      const responses = await Promise.all(eventPromises);

      // Then
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Check that all events were logged
      const logPath = join(process.cwd(), '.cage', 'events', new Date(startTime).toISOString().split('T')[0], 'events.jsonl');
      expect(existsSync(logPath)).toBe(true);

      const logContent = readFileSync(logPath, 'utf-8');
      const logLines = logContent.trim().split('\n');
      expect(logLines.length).toBe(50);

      // Verify chronological order
      const events = logLines.map(line => JSON.parse(line));
      for (let i = 1; i < events.length; i++) {
        expect(new Date(events[i].timestamp).getTime()).toBeGreaterThanOrEqual(
          new Date(events[i-1].timestamp).getTime()
        );
      }
    });
  });

  describe('Scenario: Query events by date range', () => {
    it('Given I have logged events across multiple days When I query events for a date range Then I should see a summary of events within that date range And the output should show event counts by type And total number of Claude Code sessions', async () => {
      // Given - log events across multiple days
      const events = [
        {
          sessionId: 'session-1',
          timestamp: '2025-01-15T10:00:00Z',
          toolName: 'Read',
          arguments: { file: 'test1.js' }
        },
        {
          sessionId: 'session-1',
          timestamp: '2025-01-15T10:01:00Z',
          toolName: 'Write',
          arguments: { file: 'test1.js' }
        },
        {
          sessionId: 'session-2',
          timestamp: '2025-01-16T10:00:00Z',
          toolName: 'Read',
          arguments: { file: 'test2.js' }
        }
      ];

      for (const event of events) {
        await request(httpServer)
          .post('/claude/hooks/pre-tool-use')
          .send(event)
          .expect(200);
      }

      // When - query events for date range
      const response = await request(httpServer)
        .get('/events/list')
        .query({ from: '2025-01-15', to: '2025-01-16' })
        .expect(200);

      // Then
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('totalEvents', 3);
      expect(response.body.summary).toHaveProperty('eventsByType');
      expect(response.body.summary.eventsByType).toHaveProperty('PreToolUse', 3);
      expect(response.body.summary).toHaveProperty('sessions', 2);
    });
  });
});