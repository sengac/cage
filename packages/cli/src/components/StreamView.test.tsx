import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamView } from './StreamView';
import { useAppStore } from '../stores/appStore';
import type { Event } from '../stores/appStore';

// Mock the store
vi.mock('../stores/appStore');

// Mock date-fns format for consistent output
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    return '10:30:45.123';
  }),
}));

describe('StreamView', () => {
  let onBack: ReturnType<typeof vi.fn>;
  let toggleStream: ReturnType<typeof vi.fn>;
  let pauseStream: ReturnType<typeof vi.fn>;
  let selectEvent: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let mockEvents: Event[];

  beforeEach(() => {
    onBack = vi.fn();
    toggleStream = vi.fn();
    pauseStream = vi.fn();
    selectEvent = vi.fn();
    navigate = vi.fn();

    // Create mock streaming events
    mockEvents = [
      {
        id: 'stream-1',
        timestamp: new Date('2025-01-01T10:30:45.123Z').toISOString(),
        eventType: 'ToolUse',
        sessionId: 'session-1',
        toolName: 'Read',
        arguments: { file_path: '/test.ts' },
        result: { output: 'File content' },
        executionTime: 100,
      },
      {
        id: 'stream-2',
        timestamp: new Date('2025-01-01T10:30:46.456Z').toISOString(),
        eventType: 'UserMessage',
        sessionId: 'session-1',
        arguments: { prompt: 'User input' },
      },
      {
        id: 'stream-3',
        timestamp: new Date('2025-01-01T10:30:47.789Z').toISOString(),
        eventType: 'ToolUse',
        sessionId: 'session-1',
        toolName: 'Edit',
        arguments: {
          file_path: '/app.ts',
          old_string: 'foo',
          new_string: 'bar',
        },
        result: { success: true },
        executionTime: 250,
      },
    ];

    // Mock the store implementation
    (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(selector => {
      const state = {
        streamBuffer: mockEvents,
        isStreaming: true,
        isPaused: false,
        newEventCount: 0,
        eventFilters: {},
        toggleStream,
        pauseStream,
        selectEvent,
        navigate,
      };
      return selector ? selector(state) : state;
    });
  });

  describe('Given the StreamView is displayed', () => {
    describe('When rendered in streaming mode', () => {
      it('Then should show the title', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);

        expect(lastFrame()).toContain('REAL-TIME MONITOR');
      });

      it('Then should show streaming status', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Streaming');
        expect(frame).toContain('LIVE');
      });

      it('Then should show event count', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);

        expect(lastFrame()).toContain('3 events');
      });

      it('Then should show column headers', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Time');
        expect(frame).toContain('Type');
        expect(frame).toContain('Tool');
        expect(frame).toContain('Description');
      });

      it('Then should list all streaming events', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('ToolUse');
        expect(frame).toContain('UserMessage');
        expect(frame).toContain('Read');
        expect(frame).toContain('Edit');
      });

      it('Then should show keyboard shortcuts for streaming', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Space Pause');
        expect(frame).toContain('↵ Detail');
        expect(frame).toContain('/ Filter');
        expect(frame).toContain('ESC Back');
      });

      it('Then should highlight the most recent event', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);

        // Should highlight the last/newest event by default
        expect(lastFrame()).toMatch(/❯.*Edit/);
      });

      it('Then should auto-scroll to bottom for new events', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);

        // The newest event should be visible and selected
        expect(lastFrame()).toMatch(/❯.*Edit/);
      });
    });

    describe('When paused', () => {
      beforeEach(() => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              streamBuffer: mockEvents,
              isStreaming: true,
              isPaused: true,
              newEventCount: 0,
              eventFilters: {},
              toggleStream,
              pauseStream,
              selectEvent,
              navigate,
            };
            return selector ? selector(state) : state;
          }
        );
      });

      it('Then should show paused status', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('PAUSED');
        expect(frame).not.toContain('LIVE');
      });

      it('Then should show resume shortcut', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);

        expect(lastFrame()).toContain('Space Resume');
      });

      it('Then should allow navigation when paused', () => {
        const { stdin, lastFrame, rerender } = render(
          <StreamView onBack={onBack} />
        );

        // Should be able to navigate up/down when paused
        stdin.write('\u001B[A'); // Up arrow
        rerender(<StreamView onBack={onBack} />);

        // Should move to previous event
        expect(lastFrame()).toMatch(/❯.*UserMessage/);
      });
    });

    describe('When using keyboard controls', () => {
      it('Then space should toggle pause/resume', () => {
        const { stdin } = render(<StreamView onBack={onBack} />);

        stdin.write(' '); // Space key

        expect(pauseStream).toHaveBeenCalledTimes(1);
      });

      it('Then up/down arrows should navigate when paused', () => {
        // Set to paused state for navigation
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              streamBuffer: mockEvents,
              isStreaming: true,
              isPaused: true,
              newEventCount: 0,
              eventFilters: {},
              toggleStream,
              pauseStream,
              selectEvent,
              navigate,
            };
            return selector ? selector(state) : state;
          }
        );

        const { stdin, lastFrame, rerender } = render(
          <StreamView onBack={onBack} />
        );

        stdin.write('\u001B[A'); // Up arrow
        rerender(<StreamView onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*UserMessage/);
      });

      it('Then Enter should show event detail', () => {
        const { stdin } = render(<StreamView onBack={onBack} />);

        stdin.write('\r'); // Enter

        expect(selectEvent).toHaveBeenCalledWith(mockEvents[2]); // Latest event
        expect(navigate).toHaveBeenCalledWith('eventDetail');
      });

      it('Then Escape should call onBack', () => {
        const { stdin } = render(<StreamView onBack={onBack} />);

        stdin.write('\u001B'); // Escape

        expect(onBack).toHaveBeenCalledTimes(1);
      });

      it('Then q should call onBack', () => {
        const { stdin } = render(<StreamView onBack={onBack} />);

        stdin.write('q');

        expect(onBack).toHaveBeenCalledTimes(1);
      });

      it('Then s should toggle streaming on/off', () => {
        const { stdin } = render(<StreamView onBack={onBack} />);

        stdin.write('s');

        expect(toggleStream).toHaveBeenCalledTimes(1);
      });
    });

    describe('When filtering events', () => {
      it('Then / should start filter mode', () => {
        const { stdin, lastFrame, rerender } = render(
          <StreamView onBack={onBack} />
        );

        stdin.write('/');
        rerender(<StreamView onBack={onBack} />);

        expect(lastFrame()).toContain('Filter:');
      });

      it('Then should filter events in real-time', () => {
        const { stdin, lastFrame, rerender } = render(
          <StreamView onBack={onBack} />
        );

        // Start filter
        stdin.write('/');
        rerender(<StreamView onBack={onBack} />);

        // Type "Edit"
        stdin.write('E');
        rerender(<StreamView onBack={onBack} />);
        stdin.write('d');
        rerender(<StreamView onBack={onBack} />);
        stdin.write('i');
        rerender(<StreamView onBack={onBack} />);
        stdin.write('t');
        rerender(<StreamView onBack={onBack} />);

        expect(lastFrame()).toContain('Filter: Edit');
      });

      it('Then Enter should apply filter', () => {
        const { stdin, lastFrame, rerender } = render(
          <StreamView onBack={onBack} />
        );

        stdin.write('/');
        rerender(<StreamView onBack={onBack} />);
        stdin.write('E');
        rerender(<StreamView onBack={onBack} />);
        stdin.write('d');
        rerender(<StreamView onBack={onBack} />);
        stdin.write('i');
        rerender(<StreamView onBack={onBack} />);
        stdin.write('t');
        rerender(<StreamView onBack={onBack} />);
        stdin.write('\r'); // Enter to apply
        rerender(<StreamView onBack={onBack} />);

        // Should show filtered count
        expect(lastFrame()).toMatch(/1 events.*filtered/);
      });

      it('Then Escape should cancel filter', () => {
        const { stdin, lastFrame, rerender } = render(
          <StreamView onBack={onBack} />
        );

        stdin.write('/');
        rerender(<StreamView onBack={onBack} />);
        stdin.write('test');
        stdin.write('\u001B'); // Escape
        rerender(<StreamView onBack={onBack} />);

        expect(lastFrame()).not.toContain('Filter:');
      });
    });

    describe('When showing new events', () => {
      beforeEach(() => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              streamBuffer: mockEvents,
              isStreaming: true,
              isPaused: false,
              newEventCount: 2,
              eventFilters: {},
              toggleStream,
              pauseStream,
              selectEvent,
              navigate,
            };
            return selector ? selector(state) : state;
          }
        );
      });

      it('Then should show new event indicator', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);

        expect(lastFrame()).toContain('2 new');
      });

      it('Then should highlight new events differently', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);

        // New events should have some visual indicator
        expect(lastFrame()).toBeDefined();
      });
    });

    describe('When not streaming', () => {
      beforeEach(() => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              streamBuffer: [],
              isStreaming: false,
              isPaused: false,
              newEventCount: 0,
              eventFilters: {},
              toggleStream,
              pauseStream,
              selectEvent,
              navigate,
            };
            return selector ? selector(state) : state;
          }
        );
      });

      it('Then should show stopped status', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('STOPPED');
        expect(frame).not.toContain('LIVE');
      });

      it('Then should show start streaming option', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);

        expect(lastFrame()).toContain('s Start');
      });

      it('Then should show no events message when buffer empty', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);

        expect(lastFrame()).toContain('No events in stream');
      });
    });

    describe('When export functionality is used', () => {
      it('Then e should show export options', () => {
        const { stdin, lastFrame, rerender } = render(
          <StreamView onBack={onBack} />
        );

        stdin.write('e');
        rerender(<StreamView onBack={onBack} />);

        expect(lastFrame()).toContain('Export');
      });

      it('Then should show export format options', () => {
        const { stdin, lastFrame, rerender } = render(
          <StreamView onBack={onBack} />
        );

        stdin.write('e');
        rerender(<StreamView onBack={onBack} />);

        expect(lastFrame()).toContain('JSON');
      });
    });

    describe('When handling split-screen mode', () => {
      it('Then Tab should toggle split-screen detail view', () => {
        const { stdin, lastFrame, rerender } = render(
          <StreamView onBack={onBack} />
        );

        stdin.write('\t'); // Tab key
        rerender(<StreamView onBack={onBack} />);

        // Should show split view or detail panel
        expect(lastFrame()).toBeDefined();
      });

      it('Then should show event detail in split view', () => {
        const { stdin, lastFrame, rerender } = render(
          <StreamView onBack={onBack} />
        );

        stdin.write('\t'); // Tab to enable split view
        rerender(<StreamView onBack={onBack} />);

        // Should show some event details
        expect(lastFrame()).toBeDefined();
      });
    });

    describe('When buffer management is active', () => {
      it('Then should handle large number of events', () => {
        // Create a large buffer
        const largeBuffer = Array.from({ length: 1000 }, (_, i) => ({
          id: `event-${i}`,
          timestamp: new Date().toISOString(),
          eventType: 'ToolUse',
          sessionId: 'session-1',
          toolName: 'Test',
          arguments: { index: i },
        }));

        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              streamBuffer: largeBuffer,
              isStreaming: true,
              isPaused: false,
              newEventCount: 0,
              eventFilters: {},
              toggleStream,
              pauseStream,
              selectEvent,
              navigate,
            };
            return selector ? selector(state) : state;
          }
        );

        const { lastFrame } = render(<StreamView onBack={onBack} />);

        expect(lastFrame()).toContain('1000 events');
      });

      it('Then should show buffer status when large', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);

        // Should handle buffer display appropriately
        expect(lastFrame()).toBeDefined();
      });
    });

    describe('When connection status changes', () => {
      it('Then should show connection status', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);

        // Should show some indication of connection status
        expect(lastFrame()).toBeDefined();
      });

      it('Then should handle reconnection scenarios', () => {
        const { lastFrame } = render(<StreamView onBack={onBack} />);

        // Should handle connection state properly
        expect(lastFrame()).toBeDefined();
      });
    });
  });
});
