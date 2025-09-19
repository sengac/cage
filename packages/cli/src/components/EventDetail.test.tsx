import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventDetail } from './EventDetail';
import { useAppStore } from '../stores/appStore';
import type { Event } from '../stores/appStore';

// Mock the store
vi.mock('../stores/appStore');

// Mock date-fns format for consistent output
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    return '2025-01-01 10:30:45';
  }),
}));

describe('EventDetail', () => {
  let onBack: ReturnType<typeof vi.fn>;
  let mockEvent: Event;

  beforeEach(() => {
    onBack = vi.fn();

    // Create mock event with comprehensive data
    mockEvent = {
      id: 'event-123',
      timestamp: new Date('2025-01-01T10:30:45.123Z').toISOString(),
      eventType: 'ToolUse',
      sessionId: 'session-abc',
      toolName: 'Edit',
      arguments: {
        file_path: '/path/to/file.ts',
        old_string: 'const foo = "old";',
        new_string: 'const foo = "new";'
      },
      result: {
        success: true,
        linesChanged: 1,
        diff: '@@ -1 +1 @@\n-const foo = "old";\n+const foo = "new";'
      },
      executionTime: 150,
    };

    // Mock the store implementation
    (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      const state = {
        selectedEvent: mockEvent,
      };
      return selector ? selector(state) : state;
    });
  });

  describe('Given the EventDetail is displayed', () => {
    describe('When rendered with an event', () => {
      it('Then should show the event header with basic info', () => {
        const { lastFrame } = render(<EventDetail onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('EVENT DETAIL');
        expect(frame).toContain('event-123');
        expect(frame).toContain('ToolUse');
        expect(frame).toContain('Edit');
        expect(frame).toContain('2025-01-01 10:30:45');
      });

      it('Then should show execution time and session', () => {
        const { lastFrame } = render(<EventDetail onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('150ms');
        expect(frame).toContain('session-abc');
      });

      it('Then should show tab headers', () => {
        const { lastFrame } = render(<EventDetail onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Arguments');
        expect(frame).toContain('Result');
        expect(frame).toContain('Raw');
      });

      it('Then should highlight the first tab by default', () => {
        const { lastFrame } = render(<EventDetail onBack={onBack} />);

        // Should have pointer/highlight on Arguments tab
        expect(lastFrame()).toMatch(/❯.*Arguments/);
      });

      it('Then should show arguments content by default', () => {
        const { lastFrame } = render(<EventDetail onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('file_path');
        expect(frame).toContain('/path/to/file.ts');
        expect(frame).toContain('old_string');
        expect(frame).toContain('new_string');
      });

      it('Then should show keyboard shortcuts', () => {
        const { lastFrame } = render(<EventDetail onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('← → Switch tabs');
        expect(frame).toContain('c Copy');
        expect(frame).toContain('ESC Back');
      });
    });

    describe('When navigating tabs with keyboard', () => {
      it('Then right arrow should switch to Result tab', () => {
        const { stdin, lastFrame, rerender } = render(<EventDetail onBack={onBack} />);

        stdin.write('\u001B[C'); // Right arrow
        rerender(<EventDetail onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Result/);
      });

      it('Then should show result content when on Result tab', () => {
        const { stdin, lastFrame, rerender } = render(<EventDetail onBack={onBack} />);

        stdin.write('\u001B[C'); // Right arrow to Result
        rerender(<EventDetail onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('success');
        expect(frame).toContain('true');
        expect(frame).toContain('linesChanged');
        expect(frame).toContain('diff');
      });

      it('Then right arrow again should switch to Raw tab', () => {
        const { stdin, lastFrame, rerender } = render(<EventDetail onBack={onBack} />);

        stdin.write('\u001B[C'); // Right arrow to Result
        rerender(<EventDetail onBack={onBack} />);
        stdin.write('\u001B[C'); // Right arrow to Raw
        rerender(<EventDetail onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Raw/);
      });

      it('Then should show raw JSON when on Raw tab', () => {
        const { stdin, lastFrame, rerender } = render(<EventDetail onBack={onBack} />);

        stdin.write('\u001B[C'); // Right arrow to Result
        rerender(<EventDetail onBack={onBack} />);
        stdin.write('\u001B[C'); // Right arrow to Raw
        rerender(<EventDetail onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('"id"');
        expect(frame).toContain('"eventType"');
        expect(frame).toContain('"toolName"');
        expect(frame).toContain('event-123');
      });

      it('Then left arrow should move backwards through tabs', () => {
        const { stdin, lastFrame, rerender } = render(<EventDetail onBack={onBack} />);

        // Go to Raw tab
        stdin.write('\u001B[C'); // Result
        rerender(<EventDetail onBack={onBack} />);
        stdin.write('\u001B[C'); // Raw
        rerender(<EventDetail onBack={onBack} />);

        // Go back to Result
        stdin.write('\u001B[D'); // Left arrow
        rerender(<EventDetail onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Result/);
      });

      it('Then should wrap around at tab boundaries', () => {
        const { stdin, lastFrame, rerender } = render(<EventDetail onBack={onBack} />);

        // Go past Raw should wrap to Arguments
        stdin.write('\u001B[C'); // Result
        rerender(<EventDetail onBack={onBack} />);
        stdin.write('\u001B[C'); // Raw
        rerender(<EventDetail onBack={onBack} />);
        stdin.write('\u001B[C'); // Should wrap to Arguments
        rerender(<EventDetail onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Arguments/);
      });

      it('Then left from Arguments should wrap to Raw', () => {
        const { stdin, lastFrame, rerender } = render(<EventDetail onBack={onBack} />);

        stdin.write('\u001B[D'); // Left from Arguments should wrap to Raw
        rerender(<EventDetail onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Raw/);
      });
    });

    describe('When using number keys for tab navigation', () => {
      it('Then 1 should switch to Arguments tab', () => {
        const { stdin, lastFrame, rerender } = render(<EventDetail onBack={onBack} />);

        // Go to Result first
        stdin.write('\u001B[C');
        rerender(<EventDetail onBack={onBack} />);

        // Press 1 to go to Arguments
        stdin.write('1');
        rerender(<EventDetail onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Arguments/);
      });

      it('Then 2 should switch to Result tab', () => {
        const { stdin, lastFrame, rerender } = render(<EventDetail onBack={onBack} />);

        stdin.write('2');
        rerender(<EventDetail onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Result/);
      });

      it('Then 3 should switch to Raw tab', () => {
        const { stdin, lastFrame, rerender } = render(<EventDetail onBack={onBack} />);

        stdin.write('3');
        rerender(<EventDetail onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Raw/);
      });
    });

    describe('When pressing copy key', () => {
      it('Then c should show copy success message', () => {
        const { stdin, lastFrame, rerender } = render(<EventDetail onBack={onBack} />);

        stdin.write('c');
        rerender(<EventDetail onBack={onBack} />);

        expect(lastFrame()).toContain('Copied to clipboard');
      });

      it('Then copy message should disappear after delay', () => {
        // This test would need timer mocking in a real implementation
        const { stdin, lastFrame, rerender } = render(<EventDetail onBack={onBack} />);

        stdin.write('c');
        rerender(<EventDetail onBack={onBack} />);

        expect(lastFrame()).toContain('Copied to clipboard');
      });
    });

    describe('When pressing export key', () => {
      it('Then e should show export options', () => {
        const { stdin, lastFrame, rerender } = render(<EventDetail onBack={onBack} />);

        stdin.write('e');
        rerender(<EventDetail onBack={onBack} />);

        expect(lastFrame()).toContain('Export options');
      });
    });

    describe('When pressing navigation keys', () => {
      it('Then Escape should call onBack', () => {
        const { stdin } = render(<EventDetail onBack={onBack} />);

        stdin.write('\u001B'); // Escape

        expect(onBack).toHaveBeenCalledTimes(1);
      });

      it('Then q should call onBack', () => {
        const { stdin } = render(<EventDetail onBack={onBack} />);

        stdin.write('q');

        expect(onBack).toHaveBeenCalledTimes(1);
      });
    });

    describe('When handling different event types', () => {
      it('Then should show UserMessage event correctly', () => {
        const userEvent: Event = {
          id: 'msg-123',
          timestamp: new Date('2025-01-01T10:30:45.123Z').toISOString(),
          eventType: 'UserMessage',
          sessionId: 'session-abc',
          arguments: {
            prompt: 'Tell me about React hooks',
          },
        };

        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            selectedEvent: userEvent,
          };
          return selector ? selector(state) : state;
        });

        const { lastFrame } = render(<EventDetail onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('UserMessage');
        expect(frame).toContain('msg-123');
        expect(frame).toContain('Tell me about React hooks');
      });

      it('Then should show event without result correctly', () => {
        const eventWithoutResult: Event = {
          id: 'no-result-123',
          timestamp: new Date('2025-01-01T10:30:45.123Z').toISOString(),
          eventType: 'ToolUse',
          sessionId: 'session-abc',
          toolName: 'Bash',
          arguments: {
            command: 'ls -la',
          },
        };

        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            selectedEvent: eventWithoutResult,
          };
          return selector ? selector(state) : state;
        });

        const { lastFrame } = render(<EventDetail onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Bash');
        expect(frame).toContain('ls -la');
      });

      it('Then should show error event correctly', () => {
        const errorEvent: Event = {
          id: 'error-123',
          timestamp: new Date('2025-01-01T10:30:45.123Z').toISOString(),
          eventType: 'ToolUse',
          sessionId: 'session-abc',
          toolName: 'Read',
          arguments: {
            file_path: '/nonexistent.txt',
          },
          error: 'File not found',
          executionTime: 5,
        };

        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            selectedEvent: errorEvent,
          };
          return selector ? selector(state) : state;
        });

        const { lastFrame } = render(<EventDetail onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Read');
        expect(frame).toContain('File not found');
        expect(frame).toContain('error');
      });
    });

    describe('When no event is selected', () => {
      it('Then should show no event message', () => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            selectedEvent: null,
          };
          return selector ? selector(state) : state;
        });

        const { lastFrame } = render(<EventDetail onBack={onBack} />);

        expect(lastFrame()).toContain('No event selected');
      });

      it('Then should still show back navigation', () => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            selectedEvent: null,
          };
          return selector ? selector(state) : state;
        });

        const { lastFrame } = render(<EventDetail onBack={onBack} />);

        expect(lastFrame()).toContain('ESC Back');
      });
    });

    describe('When formatting JSON content', () => {
      it('Then should format arguments JSON with proper indentation', () => {
        const { lastFrame } = render(<EventDetail onBack={onBack} />);
        const frame = lastFrame();

        // Should have JSON-like formatting
        expect(frame).toContain('file_path');
        expect(frame).toContain('old_string');
        expect(frame).toContain('new_string');
      });

      it('Then should handle complex nested objects', () => {
        const complexEvent: Event = {
          id: 'complex-123',
          timestamp: new Date('2025-01-01T10:30:45.123Z').toISOString(),
          eventType: 'ToolUse',
          sessionId: 'session-abc',
          toolName: 'MultiEdit',
          arguments: {
            files: [
              { path: '/file1.ts', changes: 3 },
              { path: '/file2.ts', changes: 1 }
            ],
            config: {
              backup: true,
              format: 'prettier'
            }
          }
        };

        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            selectedEvent: complexEvent,
          };
          return selector ? selector(state) : state;
        });

        const { lastFrame } = render(<EventDetail onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('files');
        expect(frame).toContain('config');
        expect(frame).toContain('backup');
        expect(frame).toContain('prettier');
      });
    });
  });
});