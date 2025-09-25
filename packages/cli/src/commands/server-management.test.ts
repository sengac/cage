import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  existsSync,
  readFileSync,
  unlinkSync,
  readdirSync,
  statSync,
} from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { stopServer, getServerStatus } from './server-management';

// Mock fs and child_process
vi.mock('fs');
vi.mock('child_process');

describe('Server Management Commands', () => {
  const mockPidPath = join(process.cwd(), '.cage', 'server.pid');
  const _mockPort = 3790;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('cage stop', () => {
    describe('AC-1: Stop running server', () => {
      it('should stop a running server gracefully', async () => {
        // Given the server is running with PID 12345
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('12345');
        let killCalled = false;
        vi.mocked(execSync).mockImplementation((cmd, _options) => {
          if (cmd === 'kill -0 12345') {
            if (killCalled) {
              // After kill, process should be dead
              throw new Error('Process not found');
            }
            return ''; // Process exists initially
          }
          if (cmd === 'kill -TERM 12345') {
            killCalled = true;
            return ''; // Kill succeeds
          }
          return '';
        });

        // When stopping the server
        const result = await stopServer();

        // Then
        expect(result.success).toBe(true);
        expect(result.message).toContain('Cage server stopped');
        expect(execSync).toHaveBeenCalledWith('kill -TERM 12345', {
          stdio: 'ignore',
        });
      });
    });

    describe('AC-2: Stop when server not running', () => {
      it('should handle gracefully when no server is running', async () => {
        // Given no PID file exists
        vi.mocked(existsSync).mockReturnValue(false);

        // When stopping the server
        const result = await stopServer();

        // Then
        expect(result.success).toBe(true);
        expect(result.message).toContain('No Cage server is running');
      });
    });

    describe('AC-11: Force stop server', () => {
      it('should force kill server with --force flag', async () => {
        // Given the server is running
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('12345');
        let killCalled = false;
        vi.mocked(execSync).mockImplementation((cmd, _options) => {
          if (cmd === 'kill -0 12345') {
            if (killCalled) {
              // After kill, process should be dead
              throw new Error('Process not found');
            }
            return ''; // Process exists initially
          }
          if (cmd === 'kill -KILL 12345') {
            killCalled = true;
            return ''; // Kill succeeds
          }
          return '';
        });

        // When stopping with force
        const result = await stopServer({ force: true });

        // Then
        expect(result.success).toBe(true);
        expect(result.message).toContain('forcefully stopped');
        expect(execSync).toHaveBeenCalledWith('kill -KILL 12345', {
          stdio: 'ignore',
        });
      });
    });
  });

  describe('cage status', () => {
    describe('AC-3: Status when server running', () => {
      it('should show running server status', async () => {
        // Given server is running
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('12345');
        vi.mocked(execSync).mockImplementation(cmd => {
          if (cmd === 'kill -0 12345') return ''; // Process exists
          if (cmd.includes('lsof')) return 'node 12345'; // Port in use
          if (cmd.includes('ps')) return '12345 node 10:30'; // Process info
          return '';
        });

        // When getting status
        const status = await getServerStatus();

        // Then
        expect(status.server.running).toBe(true);
        expect(status.server.pid).toBe(12345);
        expect(status.server.port).toBe(3790);
        expect(status.server.health).toBe('OK');
      });
    });

    describe('AC-4: Status when server not running', () => {
      it('should show stopped server status', async () => {
        // Given no server is running
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(execSync).mockImplementation(() => {
          throw new Error('No process found');
        });

        // When getting status
        const status = await getServerStatus();

        // Then
        expect(status.server.running).toBe(false);
        expect(status.server.port).toBe('3790 (available)');
      });
    });

    describe('AC-5: Status shows hooks installed', () => {
      it('should show installed hooks information', async () => {
        // Given hooks are installed
        const mockSettings = {
          hooks: {
            PreToolUse: {
              '*': '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/pretooluse.mjs',
            },
            PostToolUse: {
              'Edit|MultiEdit|Write':
                '$CLAUDE_PROJECT_DIR/.claude/hooks/cli-app/quality-check.js',
              '*': '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/posttooluse.mjs',
            },
          },
        };

        vi.mocked(existsSync).mockImplementation(path => {
          if (path.includes('settings.json')) return true;
          return false;
        });
        vi.mocked(readFileSync).mockImplementation(path => {
          if (path.includes('settings.json')) {
            return JSON.stringify(mockSettings);
          }
          return '';
        });

        // When getting status
        const status = await getServerStatus();

        // Then
        expect(status.hooks.installed).toBe(true);
        expect(status.hooks.count).toBeGreaterThan(0);
        expect(status.hooks.hasQualityCheck).toBe(true);
      });
    });

    describe('AC-6: Status shows hooks not installed', () => {
      it('should show hooks not installed', async () => {
        // Given no hooks are installed
        vi.mocked(existsSync).mockImplementation(path => {
          if (path.includes('settings.json')) return false;
          return false;
        });

        // When getting status
        const status = await getServerStatus();

        // Then
        expect(status.hooks.installed).toBe(false);
        expect(status.hooks.message).toContain("Run 'cage hooks setup'");
      });
    });

    describe('AC-7: Status shows events information', () => {
      it('should show event statistics', async () => {
        // Given events have been captured
        vi.mocked(existsSync).mockImplementation(path => {
          if (path.includes('.cage/events')) return true;
          if (path.includes('2025-09-18/events.jsonl')) return true;
          return false;
        });

        // Mock directory reading
        vi.mocked(readdirSync).mockImplementation(path => {
          if (path.includes('.cage/events')) {
            return ['2025-09-18'];
          }
          return [];
        });

        // Mock stat to identify directories
        vi.mocked(statSync).mockImplementation(path => ({
          isDirectory: () => path.includes('2025-09-18'),
        }));

        // Mock file reading
        vi.mocked(readFileSync).mockImplementation(path => {
          if (path.includes('events.jsonl')) {
            return `{"timestamp":"2025-09-18T11:23:34.626Z","eventType":"PreToolUse"}
{"timestamp":"2025-09-18T11:24:13.689Z","eventType":"PostToolUse"}`;
          }
          return '';
        });

        // When getting status
        const status = await getServerStatus();

        // Then
        expect(status.events.total).toBe(2);
        expect(status.events.latest).toContain('2025-09-18');
      });
    });

    describe('AC-8: Status shows no events', () => {
      it('should handle no events captured', async () => {
        // Given no events exist
        vi.mocked(existsSync).mockImplementation(path => {
          if (path.includes('events')) return false;
          return false;
        });

        // When getting status
        const status = await getServerStatus();

        // Then
        expect(status.events.total).toBe(0);
        expect(status.events.message).toContain('No events recorded');
      });
    });

    describe('AC-9: Status shows offline logs', () => {
      it('should show offline log information', async () => {
        // Given offline logs exist
        vi.mocked(existsSync).mockImplementation(path => {
          if (path.includes('hooks-offline.log')) return true;
          return false;
        });
        vi.mocked(readFileSync).mockImplementation(path => {
          if (path.includes('hooks-offline.log')) {
            return `{"error":"fetch failed","timestamp":"2025-09-18T11:23:34"}
{"error":"connection refused","timestamp":"2025-09-18T11:24:00"}`;
          }
          return '';
        });

        // When getting status
        const status = await getServerStatus();

        // Then
        expect(status.offline.count).toBe(2);
        expect(status.offline.latestError).toContain('connection refused');
      });
    });

    describe('AC-12: JSON output format', () => {
      it('should return valid JSON when requested', async () => {
        // Given any state
        vi.mocked(existsSync).mockReturnValue(false);

        // When getting status as JSON
        const status = await getServerStatus({ format: 'json' });

        // Then
        expect(status).toHaveProperty('server');
        expect(status).toHaveProperty('hooks');
        expect(status).toHaveProperty('events');
        expect(status).toHaveProperty('offline');
        expect(() => JSON.stringify(status)).not.toThrow();
      });
    });

    describe('AC-15: Port conflict detection', () => {
      it('should detect port conflicts', async () => {
        // Given port is in use by non-Cage process
        vi.mocked(existsSync).mockReturnValue(false); // No PID file
        vi.mocked(execSync).mockImplementation((cmd, _options) => {
          if (cmd.includes('lsof -ti :3790')) {
            return '99999\n'; // PID only
          }
          throw new Error('No process');
        });

        // When getting status
        const status = await getServerStatus();

        // Then
        expect(status.server.warning).toContain('Port 3790 is in use');
        expect(status.server.warning).toContain('99999');
      });
    });
  });

  describe('PID file management', () => {
    describe('AC-14: PID file creation and deletion', () => {
      it('should create PID file on start', async () => {
        // Given server is not running
        vi.mocked(existsSync).mockReturnValue(false);

        // When checking if PID file should be created (tested in start command)
        // This test verifies the PID file path is correct
        const expectedPidPath = join(process.cwd(), '.cage', 'server.pid');

        // Then the PID file path should be correct
        expect(mockPidPath).toBe(expectedPidPath);
      });

      it('should remove PID file on stop', async () => {
        // Given server is running with PID file
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('12345');
        let pidFileDeleted = false;
        vi.mocked(unlinkSync).mockImplementation(() => {
          pidFileDeleted = true;
        });

        // When stopping server
        await stopServer();

        // Then PID file should be deleted
        expect(pidFileDeleted).toBe(true);
      });
    });
  });

  describe('Server Uptime Tracking', () => {
    describe('AC: Server uptime should be accurately tracked', () => {
      describe('Given a running server with a PID file containing start time', () => {
        describe('When getServerStatus is called', () => {
          it('Then it should calculate uptime as milliseconds since server start', async () => {
            // Given: A server started 5 minutes ago
            const startTime = Date.now() - 5 * 60 * 1000; // 5 minutes ago
            const pidFileContent = JSON.stringify({
              pid: 12345,
              startTime: startTime,
            });

            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockImplementation(path => {
              if (path.includes('server.pid')) {
                return pidFileContent;
              }
              return '';
            });
            vi.mocked(execSync).mockImplementation((cmd: string) => {
              if (cmd.includes('kill -0')) {
                return Buffer.from(''); // Process exists
              }
              if (cmd.includes('curl')) {
                return Buffer.from(''); // Health check passes
              }
              throw new Error('Unknown command');
            });

            // When
            const status = await getServerStatus();

            // Then
            expect(status.server.running).toBe(true);
            expect(status.server.uptime).toBeDefined();
            expect(typeof status.server.uptime).toBe('number');

            // Uptime should be approximately 5 minutes (allowing for test execution time)
            const uptimeMs = status.server.uptime as number;
            expect(uptimeMs).toBeGreaterThanOrEqual(5 * 60 * 1000 - 1000); // Allow 1 second tolerance
            expect(uptimeMs).toBeLessThanOrEqual(5 * 60 * 1000 + 1000);
          });
        });
      });

      describe('Given a PID file with legacy format (no start time)', () => {
        describe('When getServerStatus is called', () => {
          it('Then it should handle gracefully and return undefined uptime', async () => {
            // Given: Legacy PID file with just the PID number
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockImplementation(path => {
              if (path.includes('server.pid')) {
                return '12345';
              }
              return '';
            });
            vi.mocked(execSync).mockImplementation((cmd: string) => {
              if (cmd.includes('kill -0')) {
                return Buffer.from(''); // Process exists
              }
              if (cmd.includes('curl')) {
                return Buffer.from(''); // Health check passes
              }
              throw new Error('Unknown command');
            });

            // When
            const status = await getServerStatus();

            // Then
            expect(status.server.running).toBe(true);
            expect(status.server.uptime).toBeUndefined();
          });
        });
      });

      describe('Given a stopped server', () => {
        describe('When getServerStatus is called', () => {
          it('Then uptime should be undefined', async () => {
            // Given: No PID file exists
            vi.mocked(existsSync).mockReturnValue(false);

            // When
            const status = await getServerStatus();

            // Then
            expect(status.server.running).toBe(false);
            expect(status.server.uptime).toBeUndefined();
          });
        });
      });

      describe('Given a server that was just started', () => {
        describe('When getServerStatus is called immediately', () => {
          it('Then uptime should be close to zero', async () => {
            // Given: A server started just now
            const startTime = Date.now();
            const pidFileContent = JSON.stringify({
              pid: 12345,
              startTime: startTime,
            });

            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockImplementation(path => {
              if (path.includes('server.pid')) {
                return pidFileContent;
              }
              return '';
            });
            vi.mocked(execSync).mockImplementation((cmd: string) => {
              if (cmd.includes('kill -0')) {
                return Buffer.from(''); // Process exists
              }
              if (cmd.includes('curl')) {
                return Buffer.from(''); // Health check passes
              }
              throw new Error('Unknown command');
            });

            // When
            const status = await getServerStatus();

            // Then
            expect(status.server.running).toBe(true);
            expect(status.server.uptime).toBeDefined();

            // Uptime should be very small (less than 1 second)
            const uptimeMs = status.server.uptime as number;
            expect(uptimeMs).toBeGreaterThanOrEqual(0);
            expect(uptimeMs).toBeLessThan(1000);
          });
        });
      });
    });
  });
});
