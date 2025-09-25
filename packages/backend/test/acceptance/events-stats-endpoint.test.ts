import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from '../../src/app.module';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('Feature: Events Stats API Endpoint', () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeEach(async () => {
    // Set unique test directory for this test file
    const testId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const testBaseDir = join(process.cwd(), 'tmp', testId);
    process.env.TEST_BASE_DIR = testBaseDir;

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
    const testLogDir = join(testBaseDir, '.cage');
    if (existsSync(testLogDir)) {
      rmSync(testLogDir, { recursive: true, force: true });
    }

    // Create diverse test events for statistics
    const testEvents = [
      {
        sessionId: 'test-session-stats-1',
        timestamp: '2025-01-15T10:00:00Z',
        toolName: 'Read',
        arguments: { file: 'test1.js' },
      },
      {
        sessionId: 'test-session-stats-1',
        timestamp: '2025-01-15T10:01:00Z',
        toolName: 'Read',
        arguments: { file: 'test2.js' },
      },
      {
        sessionId: 'test-session-stats-2',
        timestamp: '2025-01-15T10:02:00Z',
        toolName: 'Write',
        arguments: { file: 'test3.js' },
      },
      {
        sessionId: 'test-session-stats-2',
        timestamp: '2025-01-15T10:03:00Z',
        toolName: 'Edit',
        arguments: { file: 'test4.js' },
      },
      {
        sessionId: 'test-session-stats-3',
        timestamp: '2025-01-15T10:04:00Z',
        toolName: 'Edit',
        arguments: { file: 'test5.js' },
      },
    ];

    // Create events through the PreToolUse endpoint to generate logs
    for (const event of testEvents) {
      const response = await request(httpServer)
        .post('/api/claude/hooks/pre-tool-use')
        .send(event)
        .expect(200);

      // Verify the event was logged successfully
      expect(response.body).toHaveProperty('success', true);
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

  describe('Scenario: Get event statistics', () => {
    it('Given I have logged events When I request /api/events/stats Then I should get comprehensive event statistics', async () => {
      // Given - events are already created in beforeEach

      // When
      const response = await request(httpServer)
        .get('/api/events/stats')
        .expect(200);

      // Then
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('byToolName');
      expect(response.body).toHaveProperty('byEventType');
      expect(response.body).toHaveProperty('uniqueSessions');
      expect(response.body).toHaveProperty('dateRange');

      // Verify the counts match our test data
      expect(response.body.total).toBe(5);
      expect(response.body.uniqueSessions).toBe(3);

      // Verify tool name breakdown
      expect(response.body.byToolName).toHaveProperty('Read', 2);
      expect(response.body.byToolName).toHaveProperty('Write', 1);
      expect(response.body.byToolName).toHaveProperty('Edit', 2);

      // Verify event type breakdown
      expect(response.body.byEventType).toHaveProperty('PreToolUse', 5);
    });

    it('Given I have logged events When I request /api/events/stats?date=2025-01-15 Then I should get statistics for that specific date', async () => {
      // Given - events are already created in beforeEach

      // When
      const response = await request(httpServer)
        .get('/api/events/stats?date=2025-01-15')
        .expect(200);

      // Then
      expect(response.body.total).toBe(5); // All events are from 2025-01-15
      expect(response.body.dateRange).toHaveProperty('from', '2025-01-15');
      expect(response.body.dateRange).toHaveProperty('to', '2025-01-15');
    });
  });
});
