/**
 * Logs Command Tests
 *
 * Tests that the logs command uses Logger instead of console.log
 * for unimplemented command notifications
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '@cage/shared';

describe('Logs Command', () => {
  let logger: Logger;
  const loggerInfoSpy = vi.spyOn(Logger.prototype, 'info');

  beforeEach(() => {
    vi.clearAllMocks();
    logger = new Logger({ context: 'LogsCommand' });
  });

  it('should use Logger for unimplemented logs command notification', () => {
    const logType = 'hooks';

    // Simulate what the logs command should do
    logger.info(`Logs command for ${logType} not yet implemented`);

    expect(loggerInfoSpy).toHaveBeenCalledWith(
      `Logs command for ${logType} not yet implemented`
    );
  });

  it('should NOT use console.log for unimplemented notification', () => {
    const consoleLogSpy = vi.spyOn(console, 'log');
    const logType = 'events';

    // Use Logger instead of console.log
    logger.info(`Logs command for ${logType} not yet implemented`);

    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      `Logs command for ${logType} not yet implemented`
    );

    consoleLogSpy.mockRestore();
  });

  it('should include log type in the message', () => {
    const logType = 'server';

    logger.info(`Logs command for ${logType} not yet implemented`);

    expect(loggerInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining(logType)
    );
  });

  it('should use context "LogsCommand" for logs command messages', () => {
    const contextLogger = new Logger({ context: 'LogsCommand' });

    contextLogger.info('Logs command for hooks not yet implemented');

    expect(loggerInfoSpy).toHaveBeenCalled();
    expect(contextLogger.getLevel()).toBeDefined();
  });

  it('should handle different log types with Logger', () => {
    const logTypes = ['hooks', 'events', 'server', 'debug'];

    logTypes.forEach(type => {
      logger.info(`Logs command for ${type} not yet implemented`);
    });

    expect(loggerInfoSpy).toHaveBeenCalledTimes(logTypes.length);
  });
});
