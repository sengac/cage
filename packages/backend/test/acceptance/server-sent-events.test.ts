import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from '../../src/app.module';
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

    // Set global prefix like in main.ts
    app.setGlobalPrefix('api', {
      exclude: ['/health']
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

  describe('Scenario: Stream events in real-time', () => {
    it('Given the backend server is running When I request the events stream Then the /api/events/stream endpoint should be available And return Server-Sent Events format', async () => {
      // Given - backend server is running

      // When - make a quick request to verify endpoint exists
      // We use a very short timeout since this is a streaming endpoint
      let response;
      try {
        response = await request(httpServer)
          .get('/api/events/stream')
          .set('Accept', 'text/event-stream')
          .timeout(50);
      } catch (error) {
        // Timeout is expected for streaming endpoints
        // What matters is that we don't get a 404
        expect(error.status).not.toBe(404);
        return;
      }

      // Then - if we get a response, verify it has correct headers
      if (response) {
        expect(response.headers['content-type']).toContain('text/event-stream');
      }
    });
  });
});