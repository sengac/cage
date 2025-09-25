import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';

// These imports will work after implementing logger.ts
import { Logger, LogLevel } from './logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleLogSpy: MockInstance<typeof process.stdout.write>;
  let consoleErrorSpy: MockInstance<typeof process.stderr.write>;
  let consoleWarnSpy: MockInstance<typeof process.stderr.write>;

  beforeEach(() => {
    // Mock console methods since we shouldn't use console in production
    // but the logger needs to output somewhere during tests
    consoleLogSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    consoleErrorSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    consoleWarnSpy = consoleErrorSpy; // Both warn and error use stderr
    logger = new Logger();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Log Levels', () => {
    it('should log debug messages when level is debug', () => {
      logger = new Logger({ level: LogLevel.DEBUG });
      logger.debug('Debug message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should not log debug messages when level is info', () => {
      logger = new Logger({ level: LogLevel.INFO });
      logger.debug('Debug message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log info messages when level is info or lower', () => {
      logger = new Logger({ level: LogLevel.INFO });
      logger.info('Info message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log warn messages when level is warn or lower', () => {
      logger = new Logger({ level: LogLevel.WARN });
      logger.warn('Warning message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should log error messages at all levels', () => {
      logger = new Logger({ level: LogLevel.ERROR });
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Message Formatting', () => {
    it('should include timestamp in log messages', () => {
      logger.info('Test message');
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include log level in message', () => {
      logger.info('Test message');
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('[INFO]');
    });

    it('should handle object data', () => {
      const data = { key: 'value', number: 42 };
      logger.info('Test message', data);
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('Test message');
      expect(call).toContain(JSON.stringify(data));
    });

    it('should handle error objects', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', { error });
      const call = consoleErrorSpy.mock.calls[0][0];
      expect(call).toContain('Error occurred');
      expect(call).toContain('Test error');
    });
  });

  describe('Context Support', () => {
    it('should include context in all log messages', () => {
      logger = new Logger({ context: 'TestModule' });
      logger.info('Test message');
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('[TestModule]');
    });

    it('should allow creating child loggers with additional context', () => {
      logger = new Logger({ context: 'Parent' });
      const childLogger = logger.child('Child');
      childLogger.info('Test message');
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('[Parent:Child]');
    });
  });

  describe('Silent Mode', () => {
    it('should not output anything when silent is true', () => {
      logger = new Logger({ silent: true });
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
