import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WinstonLoggerService } from '../../src/winston-logger.service';
import { AppModule } from '../../src/app.module';
import { DebugLogLevel } from '../../src/dto/debug-logs.dto';

/**
 * Acceptance Test: Backend receives debug logs from CLI via POST
 *
 * Acceptance Criteria from WINSTON_LOGGING_IMPLEMENTATION_PLAN.md:
 * Given a CLI frontend sending log entries
 * When logs are POSTed to /api/debug/logs
 * Then the backend MUST store them in Winston
 * And emit SSE notifications for each log
 * And validate incoming data structure
 * And handle edge cases gracefully
 */
describe('Debug Logs POST Endpoint - Acceptance Tests', () => {
  let module: TestingModule;
  let app: INestApplication;
  let winstonService: WinstonLoggerService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // CRITICAL: Initialize module FIRST to instantiate all providers
    await module.init();

    app = module.createNestApplication();

    // Enable validation pipe (like in main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    // Set global prefix like in main.ts
    app.setGlobalPrefix('api', {
      exclude: ['/health'],
    });

    // CRITICAL: Initialize app SECOND for HTTP server
    await app.init();

    // Get services AFTER both inits
    winstonService = module.get<WinstonLoggerService>(WinstonLoggerService);
    winstonService.clearLogs();

    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    if (module) {
      await module.close();
    }
  });

  describe('Scenario: POST single log entry', () => {
    it('should store a single log entry in Winston', async () => {
      // Given
      const logEntry = {
        level: DebugLogLevel.INFO,
        component: 'TestComponent',
        message: 'Test log message',
      };

      // When
      const response = await request(app.getHttpServer())
        .post('/api/debug/logs')
        .send({ logs: [logEntry] })
        .expect(201);

      // Then
      expect(response.body).toEqual({ received: 1 });

      // Verify stored in Winston
      const logs = winstonService.getLogs({ reverse: false });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: 'INFO',
        component: 'TestComponent',
        message: 'Test log message',
      });
      expect(logs[0]).toHaveProperty('id');
      expect(logs[0]).toHaveProperty('timestamp');
    });
  });

  describe('Scenario: POST batch of logs', () => {
    it('should store all logs in a batch', async () => {
      // Given
      const logBatch = [
        {
          level: DebugLogLevel.DEBUG,
          component: 'Component1',
          message: 'Debug message',
        },
        {
          level: DebugLogLevel.INFO,
          component: 'Component2',
          message: 'Info message',
        },
        {
          level: DebugLogLevel.WARN,
          component: 'Component3',
          message: 'Warning message',
        },
      ];

      // When
      const response = await request(app.getHttpServer())
        .post('/api/debug/logs')
        .send({ logs: logBatch })
        .expect(201);

      // Then
      expect(response.body).toEqual({ received: 3 });

      // Verify all stored in Winston
      const logs = winstonService.getLogs({ reverse: false });
      expect(logs).toHaveLength(3);
      expect(logs[0].level).toBe('DEBUG');
      expect(logs[1].level).toBe('INFO');
      expect(logs[2].level).toBe('WARN');
    });
  });

  describe('Scenario: POST logs with all fields', () => {
    it('should accept logs with context and stackTrace', async () => {
      // Given
      const logEntry = {
        level: DebugLogLevel.ERROR,
        component: 'ErrorComponent',
        message: 'Something went wrong',
        context: {
          userId: 123,
          requestId: 'req-456',
          metadata: { key: 'value' },
        },
        stackTrace: 'Error: Test error\\n    at someFunction (file.ts:42)',
      };

      // When
      const response = await request(app.getHttpServer())
        .post('/api/debug/logs')
        .send({ logs: [logEntry] })
        .expect(201);

      // Then
      expect(response.body).toEqual({ received: 1 });

      // Verify all fields stored
      const logs = winstonService.getLogs({ reverse: false });
      expect(logs[0]).toMatchObject({
        level: 'ERROR',
        component: 'ErrorComponent',
        message: 'Something went wrong',
        context: {
          userId: 123,
          requestId: 'req-456',
          metadata: { key: 'value' },
        },
        stackTrace: 'Error: Test error\\n    at someFunction (file.ts:42)',
      });
    });
  });

  describe('Scenario: POST logs from CLI component', () => {
    it('should handle logs from frontend CLI', async () => {
      // Given - Simulating logs from CLI frontend components
      const cliLogs = [
        {
          level: DebugLogLevel.INFO,
          component: 'AppStore',
          message: 'fetchLatestEvents called',
          context: { eventCount: 42 },
        },
        {
          level: DebugLogLevel.DEBUG,
          component: 'StreamService',
          message: 'SSE connection established',
        },
        {
          level: DebugLogLevel.WARN,
          component: 'CageApiClient',
          message: 'API request retry',
          context: { attempt: 2 },
        },
      ];

      // When
      const response = await request(app.getHttpServer())
        .post('/api/debug/logs')
        .send({ logs: cliLogs })
        .expect(201);

      // Then
      expect(response.body).toEqual({ received: 3 });

      // Verify CLI logs stored
      const logs = winstonService.getLogs({ reverse: false });
      expect(logs).toHaveLength(3);
      expect(logs[0].component).toBe('AppStore');
      expect(logs[1].component).toBe('StreamService');
      expect(logs[2].component).toBe('CageApiClient');
    });
  });

  describe('Scenario: POST then GET', () => {
    it('should retrieve POSTed logs via GET endpoint', async () => {
      // Given - POST some logs
      const logBatch = [
        {
          level: DebugLogLevel.INFO,
          component: 'TestComponent',
          message: 'First message',
        },
        {
          level: DebugLogLevel.ERROR,
          component: 'TestComponent',
          message: 'Error message',
        },
      ];

      await request(app.getHttpServer())
        .post('/api/debug/logs')
        .send({ logs: logBatch })
        .expect(201);

      // When - GET the logs
      const response = await request(app.getHttpServer())
        .get('/api/debug/logs')
        .expect(200);

      // Then - Should retrieve the POSTed logs
      expect(response.body).toHaveLength(2);
      expect(response.body[0].message).toBe('Error message'); // Most recent first
      expect(response.body[1].message).toBe('First message');
    });

    it('should filter POSTed logs by component via GET', async () => {
      // Given - POST logs from multiple components
      const logBatch = [
        { level: DebugLogLevel.INFO, component: 'CLI', message: 'CLI log' },
        {
          level: DebugLogLevel.INFO,
          component: 'Backend',
          message: 'Backend log',
        },
        { level: DebugLogLevel.INFO, component: 'CLI', message: 'Another CLI log' },
      ];

      await request(app.getHttpServer())
        .post('/api/debug/logs')
        .send({ logs: logBatch })
        .expect(201);

      // When - GET filtered by CLI component
      const response = await request(app.getHttpServer())
        .get('/api/debug/logs?component=CLI')
        .expect(200);

      // Then
      expect(response.body).toHaveLength(2);
      expect(response.body.every((log: { component: string }) => log.component === 'CLI')).toBe(true);
    });
  });

  describe('Scenario: POST logs emit SSE notifications', () => {
    it('should emit debug_log_added events for each log', async () => {
      // Given - Set up event listener
      const emittedEvents: unknown[] = [];
      eventEmitter.on('debug.log.added', (event) => {
        emittedEvents.push(event);
      });

      const logBatch = [
        {
          level: DebugLogLevel.INFO,
          component: 'Component1',
          message: 'Message 1',
        },
        {
          level: DebugLogLevel.ERROR,
          component: 'Component2',
          message: 'Message 2',
        },
      ];

      // When - POST logs
      await request(app.getHttpServer())
        .post('/api/debug/logs')
        .send({ logs: logBatch })
        .expect(201);

      // Then - SSE events emitted
      expect(emittedEvents).toHaveLength(2);
      expect(emittedEvents[0]).toMatchObject({
        level: 'INFO',
        component: 'Component1',
      });
      expect(emittedEvents[1]).toMatchObject({
        level: 'ERROR',
        component: 'Component2',
      });
    });
  });

  describe('Scenario: POST with invalid data', () => {
    it('should reject logs without required level field', async () => {
      // Given - Missing level field
      const invalidLog = {
        logs: [
          {
            component: 'TestComponent',
            message: 'Missing level',
          },
        ],
      };

      // When/Then - Should fail validation
      await request(app.getHttpServer())
        .post('/api/debug/logs')
        .send(invalidLog)
        .expect(400);
    });

    it('should reject logs without required component field', async () => {
      // Given - Missing component field
      const invalidLog = {
        logs: [
          {
            level: DebugLogLevel.INFO,
            message: 'Missing component',
          },
        ],
      };

      // When/Then - Should fail validation
      await request(app.getHttpServer())
        .post('/api/debug/logs')
        .send(invalidLog)
        .expect(400);
    });

    it('should reject logs with invalid level', async () => {
      // Given - Invalid level value
      const invalidLog = {
        logs: [
          {
            level: 'INVALID_LEVEL',
            component: 'TestComponent',
            message: 'Invalid level',
          },
        ],
      };

      // When/Then - Should fail validation
      await request(app.getHttpServer())
        .post('/api/debug/logs')
        .send(invalidLog)
        .expect(400);
    });

    it('should reject requests without logs array', async () => {
      // Given - Missing logs array
      const invalidRequest = {
        notLogs: [],
      };

      // When/Then - Should fail validation
      await request(app.getHttpServer())
        .post('/api/debug/logs')
        .send(invalidRequest)
        .expect(400);
    });
  });

  describe('Scenario: POST empty batch', () => {
    it('should handle empty logs array gracefully', async () => {
      // Given - Empty logs array
      const emptyBatch = { logs: [] };

      // When
      const response = await request(app.getHttpServer())
        .post('/api/debug/logs')
        .send(emptyBatch)
        .expect(201);

      // Then
      expect(response.body).toEqual({ received: 0 });

      // Verify no logs stored
      const logs = winstonService.getLogs({ reverse: false });
      expect(logs).toHaveLength(0);
    });
  });

  describe('Scenario: POST logs respect MAX_LOGS limit', () => {
    it('should prune old logs when MAX_LOGS limit is reached', async () => {
      // Given - The Winston service has MAX_LOGS = 10000
      const MAX_LOGS = 10000;

      // Create logs that exceed the limit
      const logsToCreate = MAX_LOGS + 100;
      const batchSize = 500;

      // POST logs in batches
      for (let i = 0; i < logsToCreate; i += batchSize) {
        const batch = Array.from({ length: Math.min(batchSize, logsToCreate - i) }, (_, idx) => ({
          level: DebugLogLevel.INFO,
          component: 'StressTest',
          message: `Log ${i + idx}`,
        }));

        await request(app.getHttpServer())
          .post('/api/debug/logs')
          .send({ logs: batch })
          .expect(201);
      }

      // When - Check stored logs
      const logs = winstonService.getLogs({ reverse: false });

      // Then - Should not exceed MAX_LOGS
      expect(logs.length).toBeLessThanOrEqual(MAX_LOGS);

      // The most recent logs should be kept
      expect(logs[logs.length - 1].message).toContain(`Log ${logsToCreate - 1}`);
    });
  });

  describe('Scenario: POST logs from multiple components simultaneously', () => {
    it('should handle concurrent POSTs from different sources', async () => {
      // Given - Multiple log batches from different components
      const cliBatch = [
        { level: DebugLogLevel.INFO, component: 'CLI', message: 'CLI log 1' },
        { level: DebugLogLevel.INFO, component: 'CLI', message: 'CLI log 2' },
      ];

      const backendBatch = [
        {
          level: DebugLogLevel.DEBUG,
          component: 'Backend',
          message: 'Backend log 1',
        },
        {
          level: DebugLogLevel.DEBUG,
          component: 'Backend',
          message: 'Backend log 2',
        },
      ];

      const hooksBatch = [
        { level: DebugLogLevel.WARN, component: 'Hooks', message: 'Hook log 1' },
      ];

      // When - POST all batches concurrently
      const [response1, response2, response3] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/debug/logs')
          .send({ logs: cliBatch }),
        request(app.getHttpServer())
          .post('/api/debug/logs')
          .send({ logs: backendBatch }),
        request(app.getHttpServer())
          .post('/api/debug/logs')
          .send({ logs: hooksBatch }),
      ]);

      // Then - All should succeed
      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response3.status).toBe(201);
      expect(response1.body).toEqual({ received: 2 });
      expect(response2.body).toEqual({ received: 2 });
      expect(response3.body).toEqual({ received: 1 });

      // Verify all logs stored
      const logs = winstonService.getLogs({ reverse: false });
      expect(logs).toHaveLength(5);

      // Verify logs from all components are present
      const componentCounts = logs.reduce((acc: Record<string, number>, log) => {
        acc[log.component] = (acc[log.component] || 0) + 1;
        return acc;
      }, {});

      expect(componentCounts).toEqual({
        CLI: 2,
        Backend: 2,
        Hooks: 1,
      });
    });
  });
});