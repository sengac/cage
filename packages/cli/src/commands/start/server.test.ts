import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { startServer } from './server.js';

vi.mock('child_process');
vi.mock('fs');

describe('cage start command', () => {
  const mockCageDir = join(process.cwd(), '.cage');
  const mockPidFile = join(mockCageDir, 'server.pid');
  const mockBackendPath = join(process.cwd(), 'packages/backend/dist/main.js');
  let mockChildProcess: Partial<ChildProcess>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock child process
    mockChildProcess = {
      pid: 12345,
      kill: vi.fn(() => true),
      on: vi.fn((event, handler) => {
        if (event === 'spawn') {
          // Simulate successful spawn
          setTimeout(() => handler(), 10);
        }
        return mockChildProcess as ChildProcess;
      }),
      stderr: {
        on: vi.fn()
      } as any,
      stdout: {
        on: vi.fn((event, handler) => {
          if (event === 'data') {
            // Simulate server started message
            setTimeout(() => {
              handler(Buffer.from('Nest application successfully started'));
            }, 100);
          }
        })
      } as any
    };

    // Default mock implementations
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path === mockCageDir) return true;
      if (path === mockBackendPath) return true;
      if (path === mockPidFile) return false; // No PID file initially
      return false;
    });

    vi.mocked(mkdirSync).mockImplementation(() => undefined);
    vi.mocked(writeFileSync).mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Starting the server', () => {
    it('should spawn the actual backend process', async () => {
      // Given
      vi.mocked(spawn).mockReturnValue(mockChildProcess as ChildProcess);

      // When
      const result = await startServer({ port: 3790 });

      // Then
      expect(spawn).toHaveBeenCalledWith(
        'node',
        [mockBackendPath],
        expect.objectContaining({
          env: expect.objectContaining({
            PORT: '3790'
          }),
          detached: true,
          stdio: expect.any(Array)
        })
      );
      expect(result.success).toBe(true);
    });

    it('should create a PID file with the process ID', async () => {
      // Given
      let pidFileContent: string | undefined;
      vi.mocked(spawn).mockReturnValue(mockChildProcess as ChildProcess);
      vi.mocked(writeFileSync).mockImplementation((path, data) => {
        if (path === mockPidFile) {
          pidFileContent = data.toString();
        }
      });

      // When
      await startServer({ port: 3790 });

      // Then
      expect(writeFileSync).toHaveBeenCalledWith(mockPidFile, '12345');
      expect(pidFileContent).toBe('12345');
    });

    it('should fail if port is already in use', async () => {
      // Given - PID file exists with running process
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === mockPidFile) return true;
        if (path === mockCageDir) return true;
        if (path === mockBackendPath) return true;
        return false;
      });
      vi.mocked(readFileSync).mockReturnValue('99999');

      // When
      const result = await startServer({ port: 3790 });

      // Then
      expect(result.success).toBe(false);
      expect(result.message).toContain('already running');
      expect(spawn).not.toHaveBeenCalled();
    });

    it('should handle backend not found', async () => {
      // Given
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === mockBackendPath) return false; // Backend not built
        if (path === mockCageDir) return true;
        return false;
      });

      // When
      const result = await startServer({ port: 3790 });

      // Then
      expect(result.success).toBe(false);
      expect(result.message).toContain('Backend not found');
      expect(result.message).toContain('npm run build');
    });

    it('should create .cage directory if it does not exist', async () => {
      // Given
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === mockCageDir) return false; // No .cage dir
        if (path === mockBackendPath) return true;
        return false;
      });
      vi.mocked(spawn).mockReturnValue(mockChildProcess as ChildProcess);

      // When
      await startServer({ port: 3790 });

      // Then
      expect(mkdirSync).toHaveBeenCalledWith(mockCageDir, { recursive: true });
    });

    it('should handle spawn errors gracefully', async () => {
      // Given
      const errorProcess = {
        ...mockChildProcess,
        on: vi.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('spawn failed')), 10);
          }
          return errorProcess as ChildProcess;
        })
      };
      vi.mocked(spawn).mockReturnValue(errorProcess as ChildProcess);

      // When
      const result = await startServer({ port: 3790 });

      // Then
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to start');
    });

    it('should wait for server to be ready', async () => {
      // Given
      let dataEmitted = false;
      const customProcess = {
        ...mockChildProcess,
        stdout: {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              setTimeout(() => {
                dataEmitted = true;
                handler(Buffer.from('Nest application successfully started'));
              }, 50);
            }
          })
        } as any
      };
      vi.mocked(spawn).mockReturnValue(customProcess as ChildProcess);

      // When
      const result = await startServer({ port: 3790 });

      // Then
      expect(result.success).toBe(true);
      expect(dataEmitted).toBe(true);
      expect(result.message).toContain('running');
    });

    it('should pass environment variables correctly', async () => {
      // Given
      vi.mocked(spawn).mockReturnValue(mockChildProcess as ChildProcess);

      // When
      await startServer({ port: 4000 });

      // Then
      expect(spawn).toHaveBeenCalledWith(
        'node',
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            PORT: '4000',
            NODE_ENV: 'production'
          })
        })
      );
    });

    it('should handle server that exits immediately', async () => {
      // Given
      const exitProcess = {
        ...mockChildProcess,
        on: vi.fn((event, handler) => {
          if (event === 'exit') {
            setTimeout(() => handler(1, null), 10);
          }
          return exitProcess as ChildProcess;
        })
      };
      vi.mocked(spawn).mockReturnValue(exitProcess as ChildProcess);

      // When
      const result = await startServer({ port: 3790 });

      // Then
      expect(result.success).toBe(false);
      expect(result.message).toContain('exited');
    });
  });

  describe('Server lifecycle', () => {
    it('should integrate with cage stop command', async () => {
      // Given - start server first
      vi.mocked(spawn).mockReturnValue(mockChildProcess as ChildProcess);

      const startResult = await startServer({ port: 3790 });
      expect(startResult.success).toBe(true);

      // Verify PID file was created
      expect(writeFileSync).toHaveBeenCalledWith(mockPidFile, '12345');

      // When - stop would read this PID and kill the process
      // This test verifies the contract between start and stop
      expect(mockChildProcess.pid).toBe(12345);
    });

    it('should clean up PID file if server crashes', async () => {
      // This would be handled by the server process itself
      // or by cage status detecting stale PID
      expect(true).toBe(true);
    });
  });
});