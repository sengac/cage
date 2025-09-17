import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from '../../src/app.module';

describe('Feature: Backend Event Processing - SessionStart', () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Scenario: Receive SessionStart hook event', () => {
    it('Given the Cage backend server is running When a new Claude Code session starts Then the backend should receive the event via HTTP POST to /claude/hooks/session-start And respond with 200 OK within 100ms', async () => {
      // Given - backend server is running (setup in beforeEach)

      // When
      const payload = {
        sessionId: 'test-session-new',
        timestamp: '2025-01-15T09:00:00Z',
        metadata: {
          userAgent: 'Claude Code/1.0.0',
          platform: 'darwin'
        }
      };

      const startTime = Date.now();
      const response = await request(httpServer)
        .post('/claude/hooks/session-start')
        .send(payload)
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Then
      expect(responseTime).toBeLessThan(100);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});