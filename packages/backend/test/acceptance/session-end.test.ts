import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from '../../src/app.module';

describe('Feature: Backend Event Processing - SessionEnd', () => {
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
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Scenario: Receive SessionEnd hook event', () => {
    it('Given the Cage backend server is running When a Claude Code session ends Then the backend should receive the event via HTTP POST to /api/claude/hooks/session-end And respond with 200 OK within 100ms', async () => {
      // Given - backend server is running (setup in beforeEach)

      // When
      const payload = {
        sessionId: 'test-session-1',
        timestamp: '2025-01-15T11:00:00Z',
        summary: {
          totalTools: 15,
          duration: 3600000,
          tokensUsed: 1250,
        },
      };

      const startTime = Date.now();
      const response = await request(httpServer)
        .post('/api/claude/hooks/session-end')
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
