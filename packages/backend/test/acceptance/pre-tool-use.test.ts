import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from '../../src/app.module';

describe('Feature: Backend Event Processing - PreToolUse', () => {
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

  describe('Scenario: Receive PreToolUse hook event', () => {
    it('Given the Cage backend server is running When Claude Code triggers a PreToolUse hook Then the backend should receive the event via HTTP POST to /claude/hooks/pre-tool-use And respond with 200 OK within 100ms', async () => {
      // Given - backend server is running (setup in beforeEach)

      // When
      const payload = {
        sessionId: 'test-session-1',
        timestamp: '2025-01-15T10:00:00Z',
        toolName: 'Read',
        arguments: {
          file_path: '/test/file.js'
        }
      };

      const startTime = Date.now();
      const response = await request(httpServer)
        .post('/claude/hooks/pre-tool-use')
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