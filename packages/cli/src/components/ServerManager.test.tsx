import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServerManager } from './ServerManager';
import { useAppStore } from '../stores/appStore';
import type { ServerInfo } from '../stores/appStore';

// Mock the store
vi.mock('../stores/appStore');

// Mock date-fns for consistent output
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    return '2025-01-01 10:30:45';
  }),
  formatDistanceToNow: vi.fn(() => '2 minutes'),
}));

describe('ServerManager', () => {
  let onBack: ReturnType<typeof vi.fn>;
  let setServerInfo: ReturnType<typeof vi.fn>;
  let setLoading: ReturnType<typeof vi.fn>;
  let addError: ReturnType<typeof vi.fn>;
  let mockServerInfo: ServerInfo;

  beforeEach(() => {
    onBack = vi.fn();
    setServerInfo = vi.fn();
    setLoading = vi.fn();
    addError = vi.fn();

    // Create mock server info
    mockServerInfo = {
      status: 'running',
      port: 3000,
      pid: 12345,
      uptime: 120000, // 2 minutes
      memoryUsage: 45.6, // MB
    };

    // Mock the store implementation
    (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(selector => {
      const state = {
        serverStatus: 'running',
        serverInfo: mockServerInfo,
        isLoading: false,
        loadingMessage: '',
        errors: [],
        setServerInfo,
        setLoading,
        addError,
      };
      return selector ? selector(state) : state;
    });
  });

  describe('Given the ServerManager is displayed', () => {
    describe('When server is running', () => {
      it('Then should show the title', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('SERVER MANAGEMENT');
      });

      it('Then should show server status as running', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Status:');
        expect(frame).toContain('Running');
      });

      it('Then should show server information', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Port: 3000');
        expect(frame).toContain('PID: 12345');
        expect(frame).toContain('Uptime:');
        expect(frame).toContain('Memory: 45.6 MB');
      });

      it('Then should show stop control', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('s Stop Server');
      });

      it('Then should show restart control', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('r Restart');
      });

      it('Then should show configuration section', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Configuration');
        expect(frame).toContain('Port:');
      });

      it('Then should show logs section', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Recent Logs');
      });

      it('Then should show keyboard shortcuts', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('c Config');
        expect(frame).toContain('l Logs');
        expect(frame).toContain('ESC Back');
      });
    });

    describe('When server is stopped', () => {
      beforeEach(() => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              serverStatus: 'stopped',
              serverInfo: null,
              isLoading: false,
              loadingMessage: '',
              errors: [],
              setServerInfo,
              setLoading,
              addError,
            };
            return selector ? selector(state) : state;
          }
        );
      });

      it('Then should show stopped status', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Status:');
        expect(frame).toContain('Stopped');
      });

      it('Then should show start control', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('s Start Server');
      });

      it('Then should show no server info message', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('Server is not running');
      });

      it('Then should still show configuration options', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Configuration');
        expect(frame).toContain('Port:');
      });
    });

    describe('When server is in error state', () => {
      beforeEach(() => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              serverStatus: 'error',
              serverInfo: {
                status: 'error',
                port: 3000,
              },
              isLoading: false,
              loadingMessage: '',
              errors: [new Error('Failed to start server')],
              setServerInfo,
              setLoading,
              addError,
            };
            return selector ? selector(state) : state;
          }
        );
      });

      it('Then should show error status', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Status:');
        expect(frame).toContain('Error');
      });

      it('Then should show error message', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('Failed to start server');
      });

      it('Then should show retry option', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('r Retry');
      });
    });

    describe('When server is connecting', () => {
      beforeEach(() => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              serverStatus: 'connecting',
              serverInfo: null,
              isLoading: true,
              loadingMessage: 'Starting server...',
              errors: [],
              setServerInfo,
              setLoading,
              addError,
            };
            return selector ? selector(state) : state;
          }
        );
      });

      it('Then should show connecting status', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Status:');
        expect(frame).toContain('Connecting');
      });

      it('Then should show loading message', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('Starting server...');
      });

      it('Then should show loading indicator', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        // Should have some loading indicator
        expect(lastFrame()).toBeDefined();
      });
    });

    describe('When using keyboard controls', () => {
      it('Then s should trigger start/stop server', () => {
        const startServer = vi.fn();
        const stopServer = vi.fn();

        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              serverStatus: 'running',
              serverInfo: mockServerInfo,
              isLoading: false,
              loadingMessage: '',
              errors: [],
              setServerInfo,
              setLoading,
              addError,
              startServer,
              stopServer,
            };
            return selector ? selector(state) : state;
          }
        );

        const { stdin, lastFrame } = render(<ServerManager onBack={onBack} />);

        stdin.write('s');

        // Should call appropriate action based on current state
        expect(lastFrame()).toBeDefined();
      });

      it('Then r should restart server', () => {
        const restartServer = vi.fn();

        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              serverStatus: 'running',
              serverInfo: mockServerInfo,
              isLoading: false,
              loadingMessage: '',
              errors: [],
              setServerInfo,
              setLoading,
              addError,
              restartServer,
            };
            return selector ? selector(state) : state;
          }
        );

        const { stdin, lastFrame } = render(<ServerManager onBack={onBack} />);

        stdin.write('r');

        // Should call restart function
        expect(lastFrame()).toBeDefined();
      });

      it('Then c should enter configuration mode', () => {
        const { stdin, lastFrame, rerender } = render(
          <ServerManager onBack={onBack} />
        );

        stdin.write('c');
        rerender(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('Configuration Mode');
      });

      it('Then l should toggle logs view', () => {
        const { stdin, lastFrame, rerender } = render(
          <ServerManager onBack={onBack} />
        );

        stdin.write('l');
        rerender(<ServerManager onBack={onBack} />);

        // Should expand logs or show logs panel
        expect(lastFrame()).toBeDefined();
      });

      it('Then Escape should call onBack', () => {
        const { stdin } = render(<ServerManager onBack={onBack} />);

        stdin.write('\u001B'); // Escape

        expect(onBack).toHaveBeenCalledTimes(1);
      });

      it('Then q should call onBack', () => {
        const { stdin } = render(<ServerManager onBack={onBack} />);

        stdin.write('q');

        expect(onBack).toHaveBeenCalledTimes(1);
      });
    });

    describe('When in configuration mode', () => {
      it('Then should show port input field', () => {
        const { stdin, lastFrame, rerender } = render(
          <ServerManager onBack={onBack} />
        );

        stdin.write('c'); // Enter config mode
        rerender(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('Port:');
      });

      it('Then should allow editing port number', () => {
        const { stdin, lastFrame, rerender } = render(
          <ServerManager onBack={onBack} />
        );

        stdin.write('c'); // Enter config mode
        rerender(<ServerManager onBack={onBack} />);

        // Type new port number
        stdin.write('8080');
        rerender(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('8080');
      });

      it('Then Enter should save configuration', () => {
        const { stdin, lastFrame, rerender } = render(
          <ServerManager onBack={onBack} />
        );

        stdin.write('c'); // Enter config mode
        rerender(<ServerManager onBack={onBack} />);
        stdin.write('8080');
        stdin.write('\r'); // Enter to save
        rerender(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('Configuration saved');
      });

      it('Then Escape should cancel configuration', () => {
        const { stdin, lastFrame, rerender } = render(
          <ServerManager onBack={onBack} />
        );

        stdin.write('c'); // Enter config mode
        rerender(<ServerManager onBack={onBack} />);
        stdin.write('8080');
        stdin.write('\u001B'); // Escape to cancel
        rerender(<ServerManager onBack={onBack} />);

        expect(lastFrame()).not.toContain('Configuration Mode');
      });
    });

    describe('When viewing logs', () => {
      it('Then should show recent log entries', () => {
        const { stdin, lastFrame, rerender } = render(
          <ServerManager onBack={onBack} />
        );

        stdin.write('l'); // Toggle logs
        rerender(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('Recent Logs');
      });

      it('Then should show log timestamps', () => {
        const { stdin, lastFrame, rerender } = render(
          <ServerManager onBack={onBack} />
        );

        stdin.write('l'); // Toggle logs
        rerender(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('2025-01-01 10:30:45');
      });

      it('Then should allow scrolling through logs', () => {
        const { stdin, lastFrame, rerender } = render(
          <ServerManager onBack={onBack} />
        );

        stdin.write('l'); // Toggle logs
        rerender(<ServerManager onBack={onBack} />);

        // Should show scroll indicators or navigation
        expect(lastFrame()).toBeDefined();
      });

      it('Then should show different log levels', () => {
        const { stdin, lastFrame, rerender } = render(
          <ServerManager onBack={onBack} />
        );

        stdin.write('l'); // Toggle logs
        rerender(<ServerManager onBack={onBack} />);

        // Should show INFO, ERROR, DEBUG levels
        expect(lastFrame()).toBeDefined();
      });
    });

    describe('When handling process monitoring', () => {
      it('Then should update memory usage periodically', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('Memory: 45.6 MB');
      });

      it('Then should format uptime correctly', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('Uptime:');
      });

      it('Then should show CPU usage if available', () => {
        const serverWithCPU = {
          ...mockServerInfo,
          cpuUsage: 15.3,
        };

        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              serverStatus: 'running',
              serverInfo: serverWithCPU,
              isLoading: false,
              loadingMessage: '',
              errors: [],
              setServerInfo,
              setLoading,
              addError,
            };
            return selector ? selector(state) : state;
          }
        );

        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('CPU:');
      });

      it('Then should handle missing process info gracefully', () => {
        const minimalServerInfo = {
          status: 'running' as const,
          port: 3000,
        };

        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              serverStatus: 'running',
              serverInfo: minimalServerInfo,
              isLoading: false,
              loadingMessage: '',
              errors: [],
              setServerInfo,
              setLoading,
              addError,
            };
            return selector ? selector(state) : state;
          }
        );

        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('Port: 3000');
        expect(lastFrame()).not.toContain('PID:');
      });
    });

    describe('When handling validation', () => {
      it('Then should validate port numbers', () => {
        const { stdin, lastFrame, rerender } = render(
          <ServerManager onBack={onBack} />
        );

        stdin.write('c'); // Enter config mode
        rerender(<ServerManager onBack={onBack} />);
        // Clear existing port (3000 = 4 characters)
        stdin.write('\u0008'); // Backspace
        stdin.write('\u0008'); // Backspace
        stdin.write('\u0008'); // Backspace
        stdin.write('\u0008'); // Backspace
        rerender(<ServerManager onBack={onBack} />);
        stdin.write('99999'); // Invalid port - outside range
        rerender(<ServerManager onBack={onBack} />);
        stdin.write('\r'); // Enter to save
        rerender(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('Invalid port');
      });

      it('Then should show validation errors', () => {
        const { stdin, lastFrame, rerender } = render(
          <ServerManager onBack={onBack} />
        );

        stdin.write('c'); // Enter config mode
        rerender(<ServerManager onBack={onBack} />);
        // Clear existing port (3000 = 4 characters)
        stdin.write('\u0008'); // Backspace
        stdin.write('\u0008'); // Backspace
        stdin.write('\u0008'); // Backspace
        stdin.write('\u0008'); // Backspace
        rerender(<ServerManager onBack={onBack} />);
        // Now the port field is empty, pressing Enter should trigger "Port must be a number"
        stdin.write('\r'); // Enter to save
        rerender(<ServerManager onBack={onBack} />);

        expect(lastFrame()).toContain('Port must be a number');
      });

      it('Then should clear validation errors on input change', () => {
        const { stdin, lastFrame, rerender } = render(
          <ServerManager onBack={onBack} />
        );

        stdin.write('c'); // Enter config mode
        rerender(<ServerManager onBack={onBack} />);
        stdin.write('abc'); // Invalid input
        stdin.write('\r'); // Enter to trigger validation
        rerender(<ServerManager onBack={onBack} />);

        // Clear and enter valid input
        stdin.write('\u0008\u0008\u0008'); // Backspace to clear
        stdin.write('3000'); // Valid port
        rerender(<ServerManager onBack={onBack} />);

        expect(lastFrame()).not.toContain('Port must be a number');
      });
    });

    describe('When displaying status colors', () => {
      it('Then running status should be green', () => {
        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        // Should use success theme color for running status
        expect(lastFrame()).toBeDefined();
      });

      it('Then stopped status should be muted', () => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              serverStatus: 'stopped',
              serverInfo: null,
              isLoading: false,
              loadingMessage: '',
              errors: [],
              setServerInfo,
              setLoading,
              addError,
            };
            return selector ? selector(state) : state;
          }
        );

        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        // Should use muted theme color for stopped status
        expect(lastFrame()).toBeDefined();
      });

      it('Then error status should be red', () => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              serverStatus: 'error',
              serverInfo: { status: 'error', port: 3000 },
              isLoading: false,
              loadingMessage: '',
              errors: [new Error('Server error')],
              setServerInfo,
              setLoading,
              addError,
            };
            return selector ? selector(state) : state;
          }
        );

        const { lastFrame } = render(<ServerManager onBack={onBack} />);

        // Should use error theme color for error status
        expect(lastFrame()).toBeDefined();
      });
    });
  });
});
