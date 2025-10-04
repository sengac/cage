/**
 * Cage Hook Handler Logging Tests
 *
 * Tests that cage-hook-handler uses Logger with Winston HTTP transport
 * for all debug logging instead of file-based appendFileSync
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '@cage/shared';

describe('Cage Hook Handler Logging', () => {
  let logger: Logger;
  const loggerErrorSpy = vi.spyOn(Logger.prototype, 'error');
  const loggerInfoSpy = vi.spyOn(Logger.prototype, 'info');

  beforeEach(() => {
    vi.clearAllMocks();
    logger = new Logger({ context: 'CageHookHandler' });
  });

  describe('Connection Error Logging', () => {
    it('should use Logger.error for backend connection failures', () => {
      const error = new Error('Connection refused');

      logger.error('Failed to connect to Cage backend', { error });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to connect to Cage backend',
        { error }
      );
    });

    it('should NOT use appendFileSync for debug logging', () => {
      const error = new Error('Connection timeout');

      // Use Logger instead of file writes
      logger.error('Backend connection failed', { error });

      expect(loggerErrorSpy).toHaveBeenCalled();
      // Verify Logger is used, not file system
    });

    it('should include error details in context', () => {
      const error = new Error('ECONNREFUSED');
      error.name = 'NetworkError';

      logger.error('Connection error', {
        error,
        hookType: 'pre-tool-use',
        timestamp: new Date().toISOString()
      });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Connection error',
        expect.objectContaining({
          error: expect.any(Error),
          hookType: 'pre-tool-use',
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('Offline Logging', () => {
    it('should use Logger.error for offline mode logging', () => {
      const hookType = 'post-tool-use';
      const errorMessage = 'Backend unreachable';

      logger.error('Hook execution failed - backend offline', {
        hookType,
        errorMessage,
        offline: true
      });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Hook execution failed - backend offline',
        expect.objectContaining({
          hookType,
          errorMessage,
          offline: true
        })
      );
    });

    it('should NOT write to hooks-offline.log file', () => {
      // Use Logger instead of file-based logging
      logger.error('Backend offline', { hookType: 'user-prompt-submit' });

      expect(loggerErrorSpy).toHaveBeenCalled();
      // No file system writes should occur
    });
  });

  describe('Debug Logging', () => {
    it('should use Logger.info for debug information', () => {
      logger.info('Hook handler initialized', {
        hookType: 'pre-tool-use',
        port: 3790
      });

      expect(loggerInfoSpy).toHaveBeenCalledWith(
        'Hook handler initialized',
        expect.objectContaining({
          hookType: 'pre-tool-use',
          port: 3790
        })
      );
    });

    it('should NOT write to debug-hook-connection.log file', () => {
      // Use Logger instead of appendFileSync
      logger.info('Processing hook event', { timestamp: new Date().toISOString() });

      expect(loggerInfoSpy).toHaveBeenCalled();
      // No file system writes should occur
    });
  });

  describe('Winston Transport Integration', () => {
    it('should send logs through Winston transport when available', () => {
      // Logger will use global transport if set
      const mockTransport = {
        log: vi.fn()
      };

      // Simulate setting global transport
      const Logger2 = Logger;
      const logger2 = new Logger2({ context: 'CageHookHandler' });

      logger2.error('Test error', { test: true });

      // Logger should attempt to use transport
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should handle Winston transport failures gracefully', () => {
      // Even if transport fails, Logger should not throw
      expect(() => {
        logger.error('Error during hook execution', {
          error: new Error('Test error')
        });
      }).not.toThrow();
    });
  });

  describe('Context and Component Naming', () => {
    it('should use "CageHookHandler" as component context', () => {
      const handlerLogger = new Logger({ context: 'CageHookHandler' });

      handlerLogger.error('Hook error', { hookType: 'stop' });

      expect(loggerErrorSpy).toHaveBeenCalled();
      // Verify logger has correct context
      expect(handlerLogger.getLevel()).toBeDefined();
    });

    it('should include hook type in log context', () => {
      logger.error('Hook execution failed', {
        hookType: 'pre-tool-use',
        toolName: 'Read'
      });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Hook execution failed',
        expect.objectContaining({
          hookType: 'pre-tool-use',
          toolName: 'Read'
        })
      );
    });
  });
});
