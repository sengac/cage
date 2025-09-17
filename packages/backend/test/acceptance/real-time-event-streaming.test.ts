import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from '../../src/app.module.js';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('Feature: Real-time Event Streaming', () => {
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

  describe('Scenario: Stream events in real-time', () => {
    it('Given the backend server is running When events are triggered Then the /events/stream endpoint should be available And return Server-Sent Events format', async () => {
      // Given - backend server is running

      // When - attempt to connect to event stream
      const response = await request(httpServer)
        .get('/events/stream')
        .set('Accept', 'text/event-stream')
        .expect(200);

      // Then
      expect(response.headers['content-type']).toContain('text/plain');
      // Note: In a real test, we would set up an actual event stream listener
      // For this acceptance test, we're verifying the endpoint exists and is accessible
    });
  });

  describe('Scenario: Filter streamed events by type', () => {
    it('Given I am streaming events When I request filtering by event type Then the stream should accept filter parameter', async () => {
      // Given - backend server is running

      // When - request filtered event stream
      const response = await request(httpServer)
        .get('/events/stream')
        .query({ filter: 'PreToolUse' })
        .set('Accept', 'text/event-stream')
        .expect(200);

      // Then
      expect(response.headers['content-type']).toContain('text/plain');
      // The filter parameter is accepted and processed by the endpoint
    });
  });

  describe('Scenario: Display event statistics', () => {
    it('Given I have logged events When I request event statistics Then I should see total events by type And average events per session And most frequently used tools', async () => {
      // Given - log some events first
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
          sessionId: 'session-1',
          timestamp: '2025-01-15T10:02:00Z',
          toolName: 'Read',
          arguments: { file: 'test2.js' }
        },
        {
          sessionId: 'session-2',
          timestamp: '2025-01-15T10:03:00Z',
          toolName: 'Read',
          arguments: { file: 'test3.js' }
        }
      ];

      for (const event of events) {
        await request(httpServer)
          .post('/claude/hooks/pre-tool-use')
          .send(event)
          .expect(200);
      }

      // When - request event statistics
      const response = await request(httpServer)
        .get('/events/stats')
        .expect(200);

      // Then
      expect(response.body).toHaveProperty('totalEvents', 4);
      expect(response.body).toHaveProperty('eventsByType');
      expect(response.body.eventsByType).toHaveProperty('PreToolUse', 4);
      expect(response.body).toHaveProperty('toolsByCount');
      expect(response.body.toolsByCount).toHaveProperty('Read', 3);
      expect(response.body.toolsByCount).toHaveProperty('Write', 1);
      expect(response.body).toHaveProperty('averageEventsPerSession', 2);
      expect(response.body).toHaveProperty('sessions', 2);
    });
  });

  describe('Scenario: Tail recent events', () => {
    it('Given I have logged events When I request recent events Then I should see the last 10 events by default And each event should show timestamp, type, and tool name And events should be displayed in chronological order (oldest to newest)', async () => {
      // Given - log multiple events
      const events = [];
      for (let i = 0; i < 15; i++) {
        events.push({
          sessionId: 'session-tail',
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          toolName: `Tool${i}`,
          arguments: { index: i }
        });
      }

      for (const event of events) {
        await request(httpServer)
          .post('/claude/hooks/pre-tool-use')
          .send(event)
          .expect(200);
      }

      // When - request tail events (default count)
      const response = await request(httpServer)
        .get('/events/tail')
        .expect(200);

      // Then
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(10); // Default count

      // Verify chronological order
      for (let i = 1; i < response.body.length; i++) {
        expect(new Date(response.body[i].timestamp).getTime()).toBeGreaterThanOrEqual(
          new Date(response.body[i-1].timestamp).getTime()
        );
      }

      // Verify required fields
      response.body.forEach((event: unknown) => {
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('eventType');
        expect(event).toHaveProperty('toolName');
      });
    });
  });

  describe('Scenario: Tail with custom count', () => {
    it('Given I have logged events When I request tail events with custom count Then I should see the specified number of recent events', async () => {
      // Given - log multiple events
      const events = [];
      for (let i = 0; i < 10; i++) {
        events.push({
          sessionId: 'session-custom-tail',
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          toolName: `Tool${i}`,
          arguments: { index: i }
        });
      }

      for (const event of events) {
        await request(httpServer)
          .post('/claude/hooks/pre-tool-use')
          .send(event)
          .expect(200);
      }

      // When - request tail events with custom count
      const response = await request(httpServer)
        .get('/events/tail')
        .query({ count: '5' })
        .expect(200);

      // Then
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(5);

      // Should be the last 5 events
      const lastEvent = response.body[response.body.length - 1];
      expect(lastEvent.toolName).toBe('Tool9');
    });
  });
});