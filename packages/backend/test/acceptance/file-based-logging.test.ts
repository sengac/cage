import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from '../../src/app.module';
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

    // Set global prefix like in main.ts
    app.setGlobalPrefix('api', {
      exclude: ['/health'],
    });

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
    it('Given the backend receives a hook event When the event is processed Then an entry should be appended to .cage/events/{date}/events.jsonl And the entry should contain: timestamp, eventType, toolName, arguments, sessionId', async () => {
      // Given - backend server is running

      // When
      const payload = {
        sessionId: 'test-session-1',
        timestamp: '2025-01-15T10:00:00Z',
        toolName: 'Read',
        arguments: {
          file_path: '/test/file.js',
        },
      };

      await request(httpServer)
        .post('/api/claude/hooks/pre-tool-use')
        .send(payload)
        .expect(200);

      // Then - Use the date from the timestamp we sent
      const dateFromTimestamp = payload.timestamp.split('T')[0];
      const logPath = join(
        process.cwd(),
        '.cage',
        'events',
        dateFromTimestamp,
        'events.jsonl'
      );
      expect(existsSync(logPath)).toBe(true);

      const logContent = readFileSync(logPath, 'utf-8');
      const logLines = logContent
        .trim()
        .split('\n')
        .filter(line => line.trim());

      // Find the entry for our test session
      const logEntry = logLines
        .map(line => JSON.parse(line))
        .find(entry => entry.sessionId === 'test-session-1');

      expect(logEntry).toBeDefined();
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('eventType', 'PreToolUse');
      expect(logEntry).toHaveProperty('toolName', 'Read');
      expect(logEntry).toHaveProperty('sessionId', 'test-session-1');
      expect(logEntry).toHaveProperty('arguments');
      expect(logEntry.arguments).toEqual({ file_path: '/test/file.js' });
    });
  });
});
