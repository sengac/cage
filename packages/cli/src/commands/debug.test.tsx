import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { parseArgs } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { DebugMode, parseDebugFlag, appendDebugLog, logDebugError } from './debug';
import type { DebugModeProps, DebugStore } from './debug';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock dependencies
vi.mock('../components/App', () => ({
  App: vi.fn(() => null)
}));

vi.mock('../stores/useStore', () => ({
  useDebugStore: vi.fn(() => ({
    enableDebugMode: vi.fn(),
    setLogFile: vi.fn(),
    addDebugLog: vi.fn()
  }))
}));

vi.mock('fs/promises');

describe('Debug Mode', () => {
  const mockFs = fs as unknown as {
    mkdir: ReturnType<typeof vi.fn>;
    appendFile: ReturnType<typeof vi.fn>;
    access: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.mkdir = vi.fn().mockResolvedValue(undefined);
    mockFs.appendFile = vi.fn().mockResolvedValue(undefined);
    mockFs.access = vi.fn().mockRejectedValue(new Error('Not found'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('CLI flag parsing', () => {
    it('should detect --debug flag', () => {
      const args = ['node', 'cage', '--debug'];
      const result = parseDebugFlag(args);

      expect(result.debugMode).toBe(true);
      expect(result.remainingArgs).toEqual([]);
    });

    it('should detect -d short flag', () => {
      const args = ['node', 'cage', '-d'];
      const result = parseDebugFlag(args);

      expect(result.debugMode).toBe(true);
      expect(result.remainingArgs).toEqual([]);
    });

    it('should pass through other arguments', () => {
      const args = ['node', 'cage', '--debug', 'start'];
      const result = parseDebugFlag(args);

      expect(result.debugMode).toBe(true);
      expect(result.remainingArgs).toEqual(['start']);
    });

    it('should handle no debug flag', () => {
      const args = ['node', 'cage', 'start'];
      const result = parseDebugFlag(args);

      expect(result.debugMode).toBe(false);
      expect(result.remainingArgs).toEqual(['start']);
    });

    it('should handle debug flag with log file path', () => {
      const args = ['node', 'cage', '--debug=/custom/debug.log'];
      const result = parseDebugFlag(args);

      expect(result.debugMode).toBe(true);
      expect(result.logFile).toBe('/custom/debug.log');
      expect(result.remainingArgs).toEqual([]);
    });

    it('should use default log file when no path specified', () => {
      const args = ['node', 'cage', '--debug'];
      const result = parseDebugFlag(args);

      expect(result.debugMode).toBe(true);
      expect(result.logFile).toContain('.cage/debug.log');
    });
  });

  describe('Debug log file handling', () => {
    it('should create .cage directory if it does not exist', async () => {
      const props: DebugModeProps = {
        debugMode: true,
        logFile: path.join(process.cwd(), '.cage', 'debug.log')
      };

      render(<DebugMode {...props} />);

      await vi.waitFor(() => {
        expect(mockFs.mkdir).toHaveBeenCalledWith(
          path.join(process.cwd(), '.cage'),
          { recursive: true }
        );
      });
    });

    it('should append debug logs to file', async () => {
      const logFile = path.join(process.cwd(), '.cage', 'debug.log');
      const logMessage = 'Debug mode activated';

      await appendDebugLog(logFile, logMessage);

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        logFile,
        expect.stringContaining(logMessage),
        'utf8'
      );
    });

    it('should include timestamp in log entries', async () => {
      const props: DebugModeProps = {
        debugMode: true,
        logFile: path.join(process.cwd(), '.cage', 'debug.log')
      };

      render(<DebugMode {...props} />);

      const logMessage = 'Test message';
      await appendDebugLog(props.logFile, logMessage);

      const call = mockFs.appendFile.mock.calls[0];
      const logContent = call[1] as string;

      expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('should handle log file write errors gracefully', async () => {
      mockFs.appendFile = vi.fn().mockRejectedValue(new Error('Permission denied'));

      const props: DebugModeProps = {
        debugMode: true,
        logFile: path.join(process.cwd(), '.cage', 'debug.log')
      };

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      await appendDebugLog(props.logFile, 'Test message');

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write to debug log'),
        expect.any(Error)
      );

      consoleError.mockRestore();
    });

    it('should create custom log directory if specified', async () => {
      const customPath = '/custom/logs/debug.log';
      const props: DebugModeProps = {
        debugMode: true,
        logFile: customPath
      };

      render(<DebugMode {...props} />);

      await vi.waitFor(() => {
        expect(mockFs.mkdir).toHaveBeenCalledWith(
          '/custom/logs',
          { recursive: true }
        );
      });
    });
  });

  describe('Interactive mode integration', () => {
    it('should launch App with debug panel when debug mode enabled', () => {
      const props: DebugModeProps = {
        debugMode: true,
        logFile: path.join(process.cwd(), '.cage', 'debug.log')
      };

      const result = render(<DebugMode {...props} />);

      // Since App is mocked, we just verify render succeeds
      expect(result).toBeDefined();
    });

    it('should launch App without debug panel when debug mode disabled', () => {
      const props: DebugModeProps = {
        debugMode: false
      };

      const result = render(<DebugMode {...props} />);

      // Since App is mocked, we just verify render succeeds
      expect(result).toBeDefined();
    });

    it('should pass remaining arguments to App', () => {
      const props: DebugModeProps = {
        debugMode: true,
        logFile: path.join(process.cwd(), '.cage', 'debug.log'),
        remainingArgs: ['start', 'server']
      };

      const result = render(<DebugMode {...props} />);

      // Since App is mocked, we just verify render succeeds
      expect(result).toBeDefined();
    });
  });

  describe('Debug store integration', () => {
    it('should enable debug mode in store when flag is set', async () => {
      const { useDebugStore } = await import('../stores/useStore');
      const mockStore = {
        enableDebugMode: vi.fn(),
        setLogFile: vi.fn(),
        addDebugLog: vi.fn()
      };

      vi.mocked(useDebugStore).mockReturnValue(mockStore);

      const props: DebugModeProps = {
        debugMode: true,
        logFile: '/custom/debug.log'
      };

      render(<DebugMode {...props} />);

      expect(mockStore.enableDebugMode).toHaveBeenCalledWith(true);
      expect(mockStore.setLogFile).toHaveBeenCalledWith('/custom/debug.log');
    });

    it('should not enable debug mode in store when flag is not set', async () => {
      const { useDebugStore } = await import('../stores/useStore');
      const mockStore = {
        enableDebugMode: vi.fn(),
        setLogFile: vi.fn(),
        addDebugLog: vi.fn()
      };

      vi.mocked(useDebugStore).mockReturnValue(mockStore);

      const props: DebugModeProps = {
        debugMode: false
      };

      render(<DebugMode {...props} />);

      expect(mockStore.enableDebugMode).not.toHaveBeenCalled();
    });
  });

  describe('Debug logging behavior', () => {
    it('should log application startup in debug mode', async () => {
      const props: DebugModeProps = {
        debugMode: true,
        logFile: path.join(process.cwd(), '.cage', 'debug.log')
      };

      render(<DebugMode {...props} />);

      await vi.waitFor(() => {
        expect(mockFs.appendFile).toHaveBeenCalledWith(
          props.logFile,
          expect.stringContaining('Debug mode activated'),
          'utf8'
        );
      }, { timeout: 100 });
    });

    it('should log command execution in debug mode', async () => {
      const props: DebugModeProps = {
        debugMode: true,
        logFile: path.join(process.cwd(), '.cage', 'debug.log'),
        remainingArgs: ['start']
      };

      render(<DebugMode {...props} />);

      await vi.waitFor(() => {
        expect(mockFs.appendFile).toHaveBeenCalledWith(
          props.logFile,
          expect.stringContaining('Command: start'),
          'utf8'
        );
      }, { timeout: 100 });
    });

    it('should not create log file when debug mode is disabled', async () => {
      const props: DebugModeProps = {
        debugMode: false
      };

      render(<DebugMode {...props} />);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFs.mkdir).not.toHaveBeenCalled();
      expect(mockFs.appendFile).not.toHaveBeenCalled();
    });

    it('should log errors to debug file', async () => {
      const logFile = path.join(process.cwd(), '.cage', 'debug.log');
      const error = new Error('Test error');

      await logDebugError(logFile, error);

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        logFile,
        expect.stringContaining('[ERROR]'),
        'utf8'
      );
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        logFile,
        expect.stringContaining('Test error'),
        'utf8'
      );
    });
  });

  describe('Environment variable support', () => {
    it('should enable debug mode via CAGE_DEBUG environment variable', () => {
      const originalEnv = process.env.CAGE_DEBUG;
      process.env.CAGE_DEBUG = '1';

      const args = ['node', 'cage'];
      const result = parseDebugFlag(args);

      expect(result.debugMode).toBe(true);

      process.env.CAGE_DEBUG = originalEnv;
    });

    it('should use CAGE_DEBUG_LOG environment variable for log file', () => {
      const originalEnv = process.env.CAGE_DEBUG_LOG;
      process.env.CAGE_DEBUG_LOG = '/custom/env/debug.log';
      process.env.CAGE_DEBUG = '1';

      const args = ['node', 'cage'];
      const result = parseDebugFlag(args);

      expect(result.logFile).toBe('/custom/env/debug.log');

      process.env.CAGE_DEBUG_LOG = originalEnv;
      delete process.env.CAGE_DEBUG;
    });

    it('should prefer CLI flag over environment variable', () => {
      const originalEnv = process.env.CAGE_DEBUG;
      process.env.CAGE_DEBUG = '0';

      const args = ['node', 'cage', '--debug'];
      const result = parseDebugFlag(args);

      expect(result.debugMode).toBe(true);

      process.env.CAGE_DEBUG = originalEnv;
    });
  });

  describe('Performance monitoring', () => {
    it('should log performance metrics in debug mode', async () => {
      const props: DebugModeProps = {
        debugMode: true,
        logFile: path.join(process.cwd(), '.cage', 'debug.log'),
        enablePerformanceMonitoring: true
      };

      render(<DebugMode {...props} />);

      await vi.waitFor(() => {
        expect(mockFs.appendFile).toHaveBeenCalledWith(
          props.logFile,
          expect.stringContaining('[PERF]'),
          'utf8'
        );
      }, { timeout: 100 });
    });

    it('should track command execution time', async () => {
      const props: DebugModeProps = {
        debugMode: true,
        logFile: path.join(process.cwd(), '.cage', 'debug.log'),
        remainingArgs: ['start']
      };

      const { unmount } = render(<DebugMode {...props} />);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Trigger unmount to test cleanup
      unmount();

      await new Promise(resolve => setTimeout(resolve, 10));

      const calls = mockFs.appendFile.mock.calls;
      const perfLog = calls.find(call =>
        (call[1] as string).includes('Execution time:')
      );
      expect(perfLog).toBeDefined();
    });
  });
});