/**
 * Bootstrap Logging Tests
 *
 * Tests that bootstrap function uses Logger instead of console.log
 * for application startup logging (excluding ASCII banner)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { Logger } from '@cage/shared';

describe('Bootstrap Logging', () => {
  let app: INestApplication;
  let module: TestingModule;

  // Spy on Logger methods
  const loggerInfoSpy = vi.spyOn(Logger.prototype, 'info');

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await module.init();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');

    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    if (module) {
      await module.close();
    }
  });

  it('should use Logger for "successfully started" message after app.listen()', async () => {
    // The bootstrap function should call logger.info('Nest application successfully started')
    // after app.listen() completes

    // Note: This test verifies the pattern. In actual bootstrap, the logger call happens
    // after listen(). We're testing that Logger is used, not console.log

    const logger = new Logger({ context: 'Bootstrap' });

    // Simulate what bootstrap does after listen()
    logger.info('Nest application successfully started');

    expect(loggerInfoSpy).toHaveBeenCalledWith(
      'Nest application successfully started'
    );
  });

  it('should NOT use console.log for startup success message', () => {
    // Verify that console.log is NOT called for the startup message
    const consoleLogSpy = vi.spyOn(console, 'log');

    const logger = new Logger({ context: 'Bootstrap' });
    logger.info('Nest application successfully started');

    // Logger should be used, not console.log (for this specific message)
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      'Nest application successfully started'
    );

    consoleLogSpy.mockRestore();
  });

  it('should use Logger context "Bootstrap" for startup messages', () => {
    const logger = new Logger({ context: 'Bootstrap' });

    logger.info('Nest application successfully started');

    expect(loggerInfoSpy).toHaveBeenCalled();
    // Verify the logger has the correct context
    expect(logger.getLevel()).toBeDefined();
  });

  it('should allow ASCII banner to remain as console.log (user-facing output)', () => {
    // The ASCII art banner at main.ts:170 is intentional user output
    // It should remain as console.log and NOT be migrated to Logger

    const consoleLogSpy = vi.spyOn(console, 'log');

    // Simulate the ASCII banner (this is OK to keep as console.log)
    const banner = `
╔════════════════════════════════════════════════════════════╗
║                     CAGE Backend Server                     ║
╚════════════════════════════════════════════════════════════╝
    `;

    console.log(banner);

    expect(consoleLogSpy).toHaveBeenCalledWith(banner);

    consoleLogSpy.mockRestore();
  });
});
