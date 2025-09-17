import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from '../../src/app.module';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('Feature: Events Tail API Endpoint', () => {
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
    await app.init();
    httpServer = app.getHttpServer();

    // Clean up any existing test logs
    const testLogDir = join(testBaseDir, '.cage');
    if (existsSync(testLogDir)) {
      rmSync(testLogDir, { recursive: true, force: true });
    }

    // Create some test events
    const testEvents = [
      {
        sessionId: 'test-session-tail',
        timestamp: '2025-01-15T10:00:00Z',
        toolName: 'Read',
        arguments: { file: 'test1.js' }
      },
      {
        sessionId: 'test-session-tail',
        timestamp: '2025-01-15T10:01:00Z',
        toolName: 'Write',
        arguments: { file: 'test2.js' }
      },
      {
        sessionId: 'test-session-tail',
        timestamp: '2025-01-15T10:02:00Z',
        toolName: 'Edit',
        arguments: { file: 'test3.js' }
      }
    ];

    // Create events through the PreToolUse endpoint to generate logs
    for (const event of testEvents) {
      await request(httpServer)
        .post('/claude/hooks/pre-tool-use')
        .send(event);
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

  describe('Scenario: Get recent events via API', () => {
    it('Given I have logged events When I request /events/tail Then I should get the recent events in JSON format', async () => {
      // Given - events are already created in beforeEach

      // When
      const response = await request(httpServer)
        .get('/events/tail')
        .expect(200);

      // Then
      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body.events.length).toBeGreaterThan(0);

      // Verify event structure
      const event = response.body.events[0];
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('eventType');
      expect(event).toHaveProperty('sessionId');
    });

    it('Given I have logged events When I request /events/tail?count=2 Then I should get only 2 recent events', async () => {
      // Given - events are already created in beforeEach

      // When
      const response = await request(httpServer)
        .get('/events/tail?count=2')
        .expect(200);

      // Then
      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body.events.length).toBe(2);
    });
  });
});