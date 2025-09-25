import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from '../../src/app.module';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('Feature: Events List API Endpoint', () => {
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

    // Create some test events across multiple days
    const testEvents = [
      {
        sessionId: 'test-session-list-1',
        timestamp: '2025-01-14T10:00:00Z',
        toolName: 'Read',
        arguments: { file: 'test1.js' },
      },
      {
        sessionId: 'test-session-list-2',
        timestamp: '2025-01-15T10:00:00Z',
        toolName: 'Write',
        arguments: { file: 'test2.js' },
      },
      {
        sessionId: 'test-session-list-3',
        timestamp: '2025-01-15T11:00:00Z',
        toolName: 'Edit',
        arguments: { file: 'test3.js' },
      },
    ];

    // Create events through the PreToolUse endpoint to generate logs
    for (const event of testEvents) {
      await request(httpServer)
        .post('/api/claude/hooks/pre-tool-use')
        .send(event)
        .expect(200);

      // Small delay to ensure events are processed sequentially
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  });

  afterEach(async () => {
    await app.close();

    // Clean up test logs
    const testBaseDir = process.env.TEST_BASE_DIR || process.cwd();
    const testLogDir = join(testBaseDir, '.cage');
    if (existsSync(testLogDir)) {
      rmSync(testLogDir, { recursive: true, force: true });
    }

    // Clean up the entire test directory
    const tmpDir = join(process.cwd(), 'tmp');
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('Scenario: List all events with pagination', () => {
    it('Given I have logged events When I request /api/events/list Then I should get all events with pagination info', async () => {
      // Given - events are already created in beforeEach

      // When
      const response = await request(httpServer)
        .get('/api/events/list')
        .expect(200);

      // Then
      expect(response.body).toHaveProperty('events');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body.events.length).toBeGreaterThan(0);

      // Verify pagination structure
      const pagination = response.body.pagination;
      expect(pagination).toHaveProperty('page');
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('total');
    });

    it('Given I have logged events When I request /api/events/list?page=1&limit=2 Then I should get 2 events for page 1', async () => {
      // Given - events are already created in beforeEach

      // When
      const response = await request(httpServer)
        .get('/api/events/list?page=1&limit=2')
        .expect(200);

      // Then
      expect(response.body.events.length).toBe(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });

    it('Given I have logged events When I request /api/events/list?date=2025-01-15 Then I should get only events from that date', async () => {
      // Given - events are already created in beforeEach

      // When
      const response = await request(httpServer)
        .get('/api/events/list?date=2025-01-15')
        .expect(200);

      // Then
      expect(response.body.events.length).toBe(2); // Only 2 events from 2025-01-15

      // Verify all events are from the specified date
      for (const event of response.body.events) {
        expect(event.timestamp).toMatch(/^2025-01-15/);
      }
    });
  });
});
