import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Logger, setGlobalLogTransport, LogLevel } from '@cage/shared';
import { WinstonLoggerService } from '../../src/winston-logger.service';
import { AppModule } from '../../src/app.module';

/**
 * Acceptance Test: Backend exposes debug logs endpoint
 *
 * Acceptance Criteria from PHASE2.md:
 * Given Winston is capturing all logger events
 * When a client requests GET /api/debug/logs
 * Then the backend MUST return all captured log events
 * And support query parameters: ?level=ERROR&component=hooks&limit=500
 * And return events in JSON format with proper schema
 */
describe('Debug Logs Endpoint - Acceptance Tests', () => {
  let module: TestingModule;
  let app: INestApplication;
  let winstonService: WinstonLoggerService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await module.init();

    app = module.createNestApplication();

    // Set global prefix like in main.ts
    app.setGlobalPrefix('api', {
      exclude: ['/health'],
    });

    await app.init();

    winstonService = module.get<WinstonLoggerService>(WinstonLoggerService);
    winstonService.clearLogs();

    // Set up the global log transport
    setGlobalLogTransport({
      log: (entry) => {
        winstonService.addLog(entry);
      },
    });
  });

  afterEach(async () => {
    setGlobalLogTransport(null);
    if (app) {
      await app.close();
    }
    if (module) {
      await module.close();
    }
  });

  describe('Scenario: Backend exposes debug logs endpoint', () => {
    it('should return all captured log events', async () => {
      // Given
      const logger = new Logger({ context: 'TestComponent' });
      logger.info('Test message 1');
      logger.warn('Test message 2');
      logger.error('Test message 3');

      // When
      const response = await request(app.getHttpServer())
        .get('/api/debug/logs')
        .expect(200);

      // Then - returned in reverse order (most recent first)
      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toMatchObject({
        level: 'ERROR',
        component: 'TestComponent',
        message: 'Test message 3',
      });
      expect(response.body[1].level).toBe('WARN');
      expect(response.body[2].level).toBe('INFO');
    });

    it('should return empty array when no logs exist', async () => {
      // When
      const response = await request(app.getHttpServer())
        .get('/api/debug/logs')
        .expect(200);

      // Then
      expect(response.body).toEqual([]);
    });

    it('should filter by log level', async () => {
      // Given
      const logger = new Logger({ context: 'TestComponent', level: LogLevel.DEBUG });
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      // When - filter for ERROR only
      const response = await request(app.getHttpServer())
        .get('/api/debug/logs?level=ERROR')
        .expect(200);

      // Then
      expect(response.body).toHaveLength(1);
      expect(response.body[0].level).toBe('ERROR');
      expect(response.body[0].message).toBe('Error message');
    });

    it('should filter by component', async () => {
      // Given
      const logger1 = new Logger({ context: 'Component1' });
      const logger2 = new Logger({ context: 'Component2' });
      logger1.info('From component 1');
      logger2.info('From component 2');
      logger1.info('Also from component 1');

      // When - filter for Component1 only
      const response = await request(app.getHttpServer())
        .get('/api/debug/logs?component=Component1')
        .expect(200);

      // Then
      expect(response.body).toHaveLength(2);
      expect(response.body[0].component).toBe('Component1');
      expect(response.body[1].component).toBe('Component1');
    });

    it('should limit number of returned logs', async () => {
      // Given
      const logger = new Logger({ context: 'TestComponent' });
      for (let i = 0; i < 10; i++) {
        logger.info(`Message ${i}`);
      }

      // When - request limit of 5
      const response = await request(app.getHttpServer())
        .get('/api/debug/logs?limit=5')
        .expect(200);

      // Then
      expect(response.body).toHaveLength(5);
    });

    it('should combine multiple query parameters', async () => {
      // Given
      const logger1 = new Logger({ context: 'Hooks' });
      const logger2 = new Logger({ context: 'Backend' });

      logger1.info('Hook info');
      logger1.error('Hook error 1');
      logger1.error('Hook error 2');
      logger2.error('Backend error');

      // When - filter by component=Hooks AND level=ERROR with limit=1
      const response = await request(app.getHttpServer())
        .get('/api/debug/logs?component=Hooks&level=ERROR&limit=1')
        .expect(200);

      // Then
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        component: 'Hooks',
        level: 'ERROR',
      });
    });

    it('should return logs with correct schema', async () => {
      // Given
      const logger = new Logger({ context: 'TestComponent' });
      const error = new Error('Test error');
      logger.error('Error with context', { error, userId: 123 });

      // When
      const response = await request(app.getHttpServer())
        .get('/api/debug/logs')
        .expect(200);

      // Then
      const log = response.body[0];
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('timestamp');
      expect(log).toHaveProperty('level', 'ERROR');
      expect(log).toHaveProperty('component', 'TestComponent');
      expect(log).toHaveProperty('message', 'Error with context');
      expect(log).toHaveProperty('context');
      expect(log.context).toHaveProperty('userId', 123);
      expect(log).toHaveProperty('stackTrace');
      expect(log.stackTrace).toContain('Error: Test error');

      // Verify timestamp is ISO 8601
      expect(() => new Date(log.timestamp)).not.toThrow();
      expect(log.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle logs without stack traces', async () => {
      // Given
      const logger = new Logger({ context: 'TestComponent' });
      logger.info('Info message');

      // When
      const response = await request(app.getHttpServer())
        .get('/api/debug/logs')
        .expect(200);

      // Then
      expect(response.body[0].stackTrace).toBeUndefined();
    });

    it('should return most recent logs first', async () => {
      // Given
      const logger = new Logger({ context: 'TestComponent' });
      logger.info('First message');
      await new Promise(resolve => setTimeout(resolve, 10));
      logger.info('Second message');
      await new Promise(resolve => setTimeout(resolve, 10));
      logger.info('Third message');

      // When
      const response = await request(app.getHttpServer())
        .get('/api/debug/logs')
        .expect(200);

      // Then - most recent first
      expect(response.body[0].message).toBe('Third message');
      expect(response.body[1].message).toBe('Second message');
      expect(response.body[2].message).toBe('First message');
    });
  });
});