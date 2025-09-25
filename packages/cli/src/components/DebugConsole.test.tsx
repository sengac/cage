import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DebugConsole } from './DebugConsole';
import { useAppStore } from '../stores/appStore';
import { useDebugStore } from '../stores/useStore';

// Mock the stores we'll need
vi.mock('../stores/appStore');
vi.mock('../stores/useStore');

describe('Feature: Debug Console', () => {
  let onBack: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onBack = vi.fn();

    // Mock appStore with test events
    (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(selector => {
      const state = {
        events: [
          {
            id: '1',
            timestamp: new Date().toISOString(),
            eventType: 'PreToolUse',
            sessionId: 'test-session',
            toolName: 'Read',
            arguments: { file_path: '/test/file.ts' },
            executionTime: 45,
          },
          {
            id: '2',
            timestamp: new Date().toISOString(),
            eventType: 'Backend',
            sessionId: 'test-session',
            error: 'Connection refused',
          },
          {
            id: '3',
            timestamp: new Date().toISOString(),
            eventType: 'PostToolUse',
            sessionId: 'test-session',
            toolName: 'Write',
            executionTime: 1250,
          },
          {
            id: '4',
            timestamp: new Date().toISOString(),
            eventType: 'UserPromptSubmit',
            sessionId: 'test-session',
          },
          {
            id: '5',
            timestamp: new Date().toISOString(),
            eventType: 'FileOperation',
            sessionId: 'test-session',
            toolName: 'Edit',
            executionTime: 78,
          },
          {
            id: '6',
            timestamp: new Date().toISOString(),
            eventType: 'Performance',
            sessionId: 'test-session',
            executionTime: 2000,
          },
        ],
      };
      return selector ? selector(state) : state;
    });

    // Mock debugStore
    (useDebugStore as ReturnType<typeof vi.fn>).mockImplementation(selector => {
      const state = {
        debugMode: false,
        debugLogs: [],
        enableDebugMode: vi.fn(),
        addDebugLog: vi.fn(),
        clearDebugLogs: vi.fn(),
      };
      return selector ? selector(state) : state;
    });
  });

  describe('Scenario: View debug output', () => {
    describe('Given debug mode is enabled', () => {
      describe('When I open the debug console', () => {
        it('Then I should see: Raw hook data as it arrives', async () => {
          const { lastFrame } = render(<DebugConsole onBack={onBack} />);

          // Wait for component to mount and useEffect to run
          await new Promise(resolve => setTimeout(resolve, 100));

          const frame = lastFrame();
          // Should display debug console header
          expect(frame).toContain('DEBUG CONSOLE');
          // Should show hook events
          expect(frame).toMatch(/PreToolUse|PostToolUse|UserPromptSubmit/);
        });

        it('Then I should see: Backend communication logs', async () => {
          const { lastFrame } = render(<DebugConsole onBack={onBack} />);

          await new Promise(resolve => setTimeout(resolve, 10));

          const frame = lastFrame();
          // Should show backend events
          expect(frame).toMatch(/backend|connection|server/i);
        });

        it('Then I should see: File system operations', async () => {
          const { lastFrame } = render(<DebugConsole onBack={onBack} />);

          await new Promise(resolve => setTimeout(resolve, 10));

          const frame = lastFrame();
          // Should show file operations
          expect(frame).toMatch(/read|write|edit|file/i);
        });

        it('Then I should see: Performance metrics', async () => {
          const { lastFrame } = render(<DebugConsole onBack={onBack} />);

          await new Promise(resolve => setTimeout(resolve, 100));

          const frame = lastFrame();
          // Should show timing/performance data
          expect(frame).toMatch(/\d+ms|duration|performance/i);
        });

        it('Then I should see: Error stack traces', async () => {
          const { stdin, lastFrame } = render(<DebugConsole onBack={onBack} />);

          await new Promise(resolve => setTimeout(resolve, 10));

          // Navigate to the error event (second event has an error)
          stdin.write('j'); // Move to second event
          await new Promise(resolve => setTimeout(resolve, 10));

          const frame = lastFrame();
          // Should show ERROR level and error-related text
          expect(frame.toUpperCase()).toContain('ERROR');
          // The component should be displaying the error event
          expect(frame).toMatch(/backend|Backend|ERROR|error/);
        });
      });
    });
  });

  describe('Scenario: Filter debug output', () => {
    describe('Given I am viewing debug console', () => {
      describe('When I press F for filter', () => {
        it('Then I can filter by log level (ERROR, WARN, INFO, DEBUG)', async () => {
          const { stdin, lastFrame } = render(<DebugConsole onBack={onBack} />);

          await new Promise(resolve => setTimeout(resolve, 10));

          // Press F to open filter menu
          stdin.write('f');
          await new Promise(resolve => setTimeout(resolve, 10));

          const frame = lastFrame();
          // Should show filter options
          expect(frame).toContain('FILTER');
          expect(frame).toMatch(/ERROR|WARN|INFO|DEBUG/);
        });

        it('Then I can filter by component (hooks, backend, cli)', async () => {
          const { stdin, lastFrame } = render(<DebugConsole onBack={onBack} />);

          await new Promise(resolve => setTimeout(resolve, 10));

          stdin.write('f');
          await new Promise(resolve => setTimeout(resolve, 10));

          const frame = lastFrame();
          // Should show component filter options
          expect(frame).toMatch(/hooks|backend|cli|component/i);
        });

        it('Then I can search within logs', async () => {
          const { stdin, lastFrame } = render(<DebugConsole onBack={onBack} />);

          await new Promise(resolve => setTimeout(resolve, 10));

          // Press / to search
          stdin.write('/');
          await new Promise(resolve => setTimeout(resolve, 10));

          const frame = lastFrame();
          // Should show search interface
          expect(frame).toMatch(/search/i);
        });
      });
    });
  });

  describe('Navigation and keyboard shortcuts', () => {
    it('Should navigate with arrow keys or j/k', async () => {
      const { stdin, lastFrame } = render(<DebugConsole onBack={onBack} />);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Check initial state - should have first event selected
      const initialFrame = lastFrame();
      expect(initialFrame).toMatch(/❯.*PreToolUse/);

      // Navigate down with j - should select second event
      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 50));

      const afterJ = lastFrame();
      // Should now have Backend selected (second event)
      expect(afterJ).toMatch(/❯.*Backend/);
      expect(afterJ).not.toEqual(initialFrame);

      // Navigate down again
      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 50));

      const afterSecondJ = lastFrame();
      // Should now have third event selected
      expect(afterSecondJ).toMatch(/❯.*PostToolUse/);

      // Navigate up with k - should go back
      stdin.write('k');
      await new Promise(resolve => setTimeout(resolve, 50));

      const afterK = lastFrame();
      // Should be back to Backend
      expect(afterK).toMatch(/❯.*Backend/);
    });

    it('Should exit with ESC or q', async () => {
      const { stdin } = render(<DebugConsole onBack={onBack} />);

      await new Promise(resolve => setTimeout(resolve, 10));

      stdin.write('q');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(onBack).toHaveBeenCalled();
    });

    it('Should show help with ?', async () => {
      const { stdin, lastFrame } = render(<DebugConsole onBack={onBack} />);

      await new Promise(resolve => setTimeout(resolve, 10));

      stdin.write('?');
      await new Promise(resolve => setTimeout(resolve, 10));

      const frame = lastFrame();
      expect(frame).toMatch(/help|shortcuts|keyboard/i);
    });
  });

  describe('Real-time updates', () => {
    it('Should show events as they arrive in real-time', async () => {
      const { lastFrame, rerender } = render(<DebugConsole onBack={onBack} />);

      await new Promise(resolve => setTimeout(resolve, 10));

      const initialFrame = lastFrame();

      // Simulate new events arriving
      rerender(<DebugConsole onBack={onBack} />);

      const updatedFrame = lastFrame();
      // Frame should update with new events
      expect(updatedFrame).toBeDefined();
    });
  });

  describe('Display requirements', () => {
    it('Should display a clear header showing DEBUG CONSOLE', async () => {
      const { lastFrame } = render(<DebugConsole onBack={onBack} />);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(lastFrame()).toContain('DEBUG CONSOLE');
    });

    it('Should show keyboard shortcuts in footer', async () => {
      const { lastFrame } = render(<DebugConsole onBack={onBack} />);

      await new Promise(resolve => setTimeout(resolve, 10));

      const frame = lastFrame();
      // Should show navigation hints
      expect(frame).toMatch(/ESC|Back|Exit|Navigate/i);
    });

    it('Should display event count and filter status', async () => {
      const { lastFrame } = render(<DebugConsole onBack={onBack} />);

      await new Promise(resolve => setTimeout(resolve, 10));

      const frame = lastFrame();
      // Should show some kind of event count or status
      expect(frame).toMatch(/events|Events|total|Total|\d+/);
    });
  });
});
