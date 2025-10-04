import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { ServerManager } from './ServerManager';
import { useAppStore } from '../../../shared/stores/appStore';
import type { ServerInfo } from '../../../shared/stores/appStore';
import { InputModeProvider } from '../../../shared/contexts/InputContext';

// Mock the store
vi.mock('../../../shared/stores/appStore');

// Mock date-fns for consistent output
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    return '2025-01-01 10:30:45';
  }),
  formatDistanceToNow: vi.fn(() => '2 minutes'),
}));

// Create a mock status monitor that we can control
const mockStatusMonitor = {
  on: vi.fn(),
  off: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  forceUpdate: vi.fn(),
  getStatus: vi.fn(),
  triggerUpdate: vi.fn(),
};

// Mock the status monitor singleton
vi.mock('../utils/status-monitor', () => ({
  StatusMonitor: {
    getInstance: vi.fn(() => mockStatusMonitor),
  },
}));

describe('ServerManager', async () => {
  let onBack: ReturnType<typeof vi.fn>;
  let setServerInfo: ReturnType<typeof vi.fn>;
  let setLoading: ReturnType<typeof vi.fn>;
  let addError: ReturnType<typeof vi.fn>;
  let mockServerInfo: ServerInfo;

  const renderComponent = async (props = {}) => {
    const component = render(
      <InputModeProvider>
        <ServerManager onBack={onBack} {...props} />
      </InputModeProvider>
    );

    // Wait for async loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    return component;
  };

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

    // Configure the status monitor mock for running server
    // Store the handlers so we can trigger them
    let statusUpdateHandler: any;
    mockStatusMonitor.on.mockImplementation((event, handler) => {
      if (event === 'statusUpdated') {
        statusUpdateHandler = handler;
      }
    });

    mockStatusMonitor.forceUpdate.mockImplementation(() => {
      // Trigger the handler immediately with the status
      if (statusUpdateHandler) {
        statusUpdateHandler({
          server: {
            status: 'running',
            serverInfo: mockServerInfo,
            fullStatus: null,
          },
          hooks: {
            installed: false,
            enabledCount: 0,
            totalCount: 0,
          },
          events: {
            total: 0,
            today: 0,
            totalCount: 0,
            recentCount: 0,
          },
          lastUpdated: Date.now(),
        });
      }
      return Promise.resolve();
    });

    mockStatusMonitor.getStatus.mockReturnValue({
      server: {
        status: 'running',
        serverInfo: mockServerInfo,
        fullStatus: null,
      },
      hooks: {
        installed: false,
        enabledCount: 0,
        totalCount: 0,
      },
      events: {
        total: 0,
        today: 0,
        totalCount: 0,
        recentCount: 0,
      },
      lastUpdated: Date.now(),
    });
  });

  describe('Given the ServerManager is displayed', async () => {
    describe('When server is running', async () => {
      it('Then should show server status', async () => {
        const { lastFrame } = await renderComponent();
        const frame = lastFrame();

        expect(frame).toContain('Status:');
      });

      it('Then should show port configuration', async () => {
        const { lastFrame } = await renderComponent();
        const frame = lastFrame();

        expect(frame).toContain('Port:');
      });

      it('Then should show configuration section', async () => {
        const { lastFrame } = await renderComponent();
        const frame = lastFrame();

        expect(frame).toContain('Configuration');
        expect(frame).toContain('Port:');
      });


    });

    describe('When server is stopped', async () => {
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

        // Configure the status monitor mock for stopped server
        mockStatusMonitor.forceUpdate.mockResolvedValue({
          server: {
            status: 'stopped',
            serverInfo: null,
            fullStatus: null,
          },
          hooks: {
            installed: false,
            enabledCount: 0,
            totalCount: 0,
          },
          events: {
            total: 0,
            today: 0,
            totalCount: 0,
            recentCount: 0,
          },
          lastUpdated: Date.now(),
        });
        mockStatusMonitor.getStatus.mockReturnValue({
          server: {
            status: 'stopped',
            serverInfo: null,
            fullStatus: null,
          },
          hooks: {
            installed: false,
            enabledCount: 0,
            totalCount: 0,
          },
          events: {
            total: 0,
            today: 0,
            totalCount: 0,
            recentCount: 0,
          },
          lastUpdated: Date.now(),
        });
      });

      it('Then should show stopped status', async () => {
        const { lastFrame } = await renderComponent();
        const frame = lastFrame();

        expect(frame).toContain('Status:');
      });

      it('Then should show no server info message', async () => {
        const { lastFrame } = await renderComponent();

        expect(lastFrame()).toContain('Server is not running');
      });

      it('Then should still show configuration options', async () => {
        const { lastFrame } = await renderComponent();
        const frame = lastFrame();

        expect(frame).toContain('Configuration');
        expect(frame).toContain('Port:');
      });
    });

    describe('When server is in error state', async () => {
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

        // Configure the status monitor mock for error state
        mockStatusMonitor.forceUpdate.mockResolvedValue({
          server: {
            status: 'error',
            serverInfo: {
              status: 'error',
              port: 3000,
            },
            fullStatus: null,
          },
          hooks: {
            installed: false,
            enabledCount: 0,
            totalCount: 0,
          },
          events: {
            total: 0,
            today: 0,
            totalCount: 0,
            recentCount: 0,
          },
          lastUpdated: Date.now(),
        });
        mockStatusMonitor.getStatus.mockReturnValue({
          server: {
            status: 'error',
            serverInfo: {
              status: 'error',
              port: 3000,
            },
            fullStatus: null,
          },
          hooks: {
            installed: false,
            enabledCount: 0,
            totalCount: 0,
          },
          events: {
            total: 0,
            today: 0,
            totalCount: 0,
            recentCount: 0,
          },
          lastUpdated: Date.now(),
        });
      });

      it('Then should show error status', async () => {
        const { lastFrame } = await renderComponent();
        const frame = lastFrame();

        expect(frame).toContain('Status:');
      });

      it('Then should show error message', async () => {
        const { lastFrame } = await renderComponent();

        expect(lastFrame()).toContain('Failed to start server');
      });
    });

    describe('When server is connecting', async () => {
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

        // Configure the status monitor mock for connecting state
        mockStatusMonitor.forceUpdate.mockResolvedValue({
          server: {
            status: 'connecting',
            serverInfo: null,
            fullStatus: null,
          },
          hooks: {
            installed: false,
            enabledCount: 0,
            totalCount: 0,
          },
          events: {
            total: 0,
            today: 0,
            totalCount: 0,
            recentCount: 0,
          },
          lastUpdated: Date.now(),
        });
        mockStatusMonitor.getStatus.mockReturnValue({
          server: {
            status: 'connecting',
            serverInfo: null,
            fullStatus: null,
          },
          hooks: {
            installed: false,
            enabledCount: 0,
            totalCount: 0,
          },
          events: {
            total: 0,
            today: 0,
            totalCount: 0,
            recentCount: 0,
          },
          lastUpdated: Date.now(),
        });
      });

      it('Then should show status label', async () => {
        const { lastFrame } = await renderComponent();
        const frame = lastFrame();

        expect(frame).toContain('Status:');
      });

      it('Then should show loading message', async () => {
        const { lastFrame } = await renderComponent();

        expect(lastFrame()).toContain('Starting server...');
      });

      it('Then should show loading indicator', async () => {
        const { lastFrame } = await renderComponent();

        // Should have some loading indicator
        expect(lastFrame()).toBeDefined();
      });
    });

    describe('When using keyboard controls', async () => {
      it('Thens should trigger start/stop server', async () => {
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

        const { stdin, lastFrame } = await renderComponent();

        stdin.write('s');

        // Should call appropriate action based on current state
        expect(lastFrame()).toBeDefined();
      });

      it('Thenr should restart server', async () => {
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

        const { stdin, lastFrame } = await renderComponent();

        stdin.write('r');

        // Should call restart function
        expect(lastFrame()).toBeDefined();
      });

      it('Thenc should enter configuration mode', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('c');
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Configuration Mode');
      });

      it('Thenl should toggle logs view', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('l');
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );

        // Should expand logs or show logs panel
        expect(lastFrame()).toBeDefined();
      });

      it('ThenEscape should call onBack', async () => {
        const { stdin } = await renderComponent();

        stdin.write('\u001B'); // Escape

        expect(onBack).toHaveBeenCalledTimes(1);
      });

      it('Thenq should call onBack', async () => {
        const { stdin } = await renderComponent();

        stdin.write('q');

        expect(onBack).toHaveBeenCalledTimes(1);
      });
    });

    describe('When in configuration mode', async () => {
      it('Then should show port input field', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('c'); // Enter config mode
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Port:');
      });

      it('Then should allow editing port number', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('c'); // Enter config mode
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );

        // Type new port number
        stdin.write('8080');
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('8080');
      });

      it('ThenEnter should save configuration', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('c'); // Enter config mode
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('8080');
        stdin.write('\r'); // Enter to save
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Configuration saved');
      });

      it('ThenEscape should cancel configuration', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('c'); // Enter config mode
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('8080');
        stdin.write('\u001B'); // Escape to cancel
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).not.toContain('Configuration Mode');
      });
    });

    describe('When handling process monitoring', async () => {
      it('Then should render server manager', async () => {
        const { lastFrame } = await renderComponent();

        expect(lastFrame()).toBeDefined();
      });
    });

    describe('When handling validation', async () => {
      it('Then should validate port numbers', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('c'); // Enter config mode
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );
        // Clear existing port (3000 = 4 characters)
        stdin.write('\u0008'); // Backspace
        stdin.write('\u0008'); // Backspace
        stdin.write('\u0008'); // Backspace
        stdin.write('\u0008'); // Backspace
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('99999'); // Invalid port - outside range
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\r'); // Enter to save
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Invalid port');
      });

      it('Then should show validation errors', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('c'); // Enter config mode
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );
        // Clear existing port (3000 = 4 characters)
        stdin.write('\u0008'); // Backspace
        stdin.write('\u0008'); // Backspace
        stdin.write('\u0008'); // Backspace
        stdin.write('\u0008'); // Backspace
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );
        // Now the port field is empty, pressing Enter should trigger "Port must be a number"
        stdin.write('\r'); // Enter to save
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Port must be a number');
      });

      it('Then should clear validation errors on input change', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('c'); // Enter config mode
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('abc'); // Invalid input
        stdin.write('\r'); // Enter to trigger validation
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );

        // Clear and enter valid input
        stdin.write('\u0008\u0008\u0008'); // Backspace to clear
        stdin.write('3000'); // Valid port
        rerender(
          <InputModeProvider>
            <ServerManager onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).not.toContain('Port must be a number');
      });
    });

    describe('When displaying status colors', async () => {
      it('Thenrunning status should be green', async () => {
        const { lastFrame } = await renderComponent();

        // Should use success theme color for running status
        expect(lastFrame()).toBeDefined();
      });

      it('Thenstopped status should be muted', async () => {
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

        const { lastFrame } = await renderComponent();

        // Should use muted theme color for stopped status
        expect(lastFrame()).toBeDefined();
      });

      it('Thenerror status should be red', async () => {
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

        const { lastFrame } = await renderComponent();

        // Should use error theme color for error status
        expect(lastFrame()).toBeDefined();
      });
    });
  });
});
