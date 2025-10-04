import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Logger, setGlobalLogTransport } from '@cage/shared';
import { WinstonLoggerService } from '../../src/winston-logger.service';

/**
 * Acceptance Test: Logger event capture via Winston
 *
 * Acceptance Criteria from PHASE2.md:
 * Given the CAGE system is running (backend, CLI, or hooks)
 * When any component uses the Logger class (from @cage/shared)
 * Then all logger events MUST be captured by Winston
 * And Winston MUST persist events to an in-memory transport
 * And logger events include: debug, info, warn, error levels
 * And each event captures: timestamp, level, component, message, context data, stack traces (for errors)
 */
describe('Winston Logger Capture - Acceptance Tests', () => {
  let winstonService: WinstonLoggerService;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [WinstonLoggerService],
    }).compile();

    await module.init();

    winstonService = module.get<WinstonLoggerService>(WinstonLoggerService);

    // Set up the global log transport
    setGlobalLogTransport({
      log: (entry) => {
        winstonService.addLog(entry);
      },
    });

    logger = new Logger({ context: 'TestComponent', level: 0 }); // LogLevel.DEBUG = 0
  });

  afterEach(() => {
    winstonService.clearLogs();
    setGlobalLogTransport(null);
  });

  describe('Scenario: Logger event capture via Winston', () => {
    it('should capture debug level events', () => {
      // When
      logger.debug('Test debug message', { testData: 'debug' });

      // Then
      const logs = winstonService.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: 'DEBUG',
        component: 'TestComponent',
        message: 'Test debug message',
        context: { testData: 'debug' },
      });
      expect(logs[0].timestamp).toBeDefined();
      expect(logs[0].id).toBeDefined();
    });

    it('should capture info level events', () => {
      // When
      logger.info('Test info message', { testData: 'info' });

      // Then
      const logs = winstonService.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: 'INFO',
        component: 'TestComponent',
        message: 'Test info message',
        context: { testData: 'info' },
      });
    });

    it('should capture warn level events', () => {
      // When
      logger.warn('Test warn message', { testData: 'warn' });

      // Then
      const logs = winstonService.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: 'WARN',
        component: 'TestComponent',
        message: 'Test warn message',
        context: { testData: 'warn' },
      });
    });

    it('should capture error level events', () => {
      // When
      const error = new Error('Test error');
      logger.error('Test error message', { error });

      // Then
      const logs = winstonService.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: 'ERROR',
        component: 'TestComponent',
        message: 'Test error message',
      });
      expect(logs[0].stackTrace).toContain('Error: Test error');
    });

    it('should capture stack traces for errors', () => {
      // When
      const error = new Error('Test error with stack');
      logger.error('Error occurred', { error });

      // Then
      const logs = winstonService.getLogs();
      expect(logs[0].stackTrace).toBeDefined();
      expect(logs[0].stackTrace).toContain('Error: Test error with stack');
      expect(logs[0].stackTrace).toContain('at ');
    });

    it('should persist multiple events in memory', () => {
      // When
      logger.debug('Debug 1');
      logger.info('Info 1');
      logger.warn('Warn 1');
      logger.error('Error 1');

      // Then
      const logs = winstonService.getLogs();
      expect(logs).toHaveLength(4);
      expect(logs.map(l => l.level)).toEqual(['DEBUG', 'INFO', 'WARN', 'ERROR']);
    });

    it('should maintain chronological order of events', () => {
      // When
      logger.info('First message');
      logger.info('Second message');
      logger.info('Third message');

      // Then
      const logs = winstonService.getLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('First message');
      expect(logs[1].message).toBe('Second message');
      expect(logs[2].message).toBe('Third message');

      // Verify timestamps are in order
      const time1 = new Date(logs[0].timestamp).getTime();
      const time2 = new Date(logs[1].timestamp).getTime();
      const time3 = new Date(logs[2].timestamp).getTime();
      expect(time2).toBeGreaterThanOrEqual(time1);
      expect(time3).toBeGreaterThanOrEqual(time2);
    });

    it('should handle context data of various types', () => {
      // When
      logger.info('Complex context', {
        string: 'value',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'data' },
      });

      // Then
      const logs = winstonService.getLogs();
      expect(logs[0].context).toEqual({
        string: 'value',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'data' },
      });
    });

    it('should handle messages without context', () => {
      // When
      logger.info('Message without context');

      // Then
      const logs = winstonService.getLogs();
      expect(logs[0].message).toBe('Message without context');
      expect(logs[0].context).toBeUndefined();
    });

    it('should capture events from multiple components', () => {
      // When
      const logger1 = new Logger({ context: 'Component1' });
      const logger2 = new Logger({ context: 'Component2' });

      logger1.info('From component 1');
      logger2.info('From component 2');

      // Then
      const logs = winstonService.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].component).toBe('Component1');
      expect(logs[1].component).toBe('Component2');
    });
  });
});