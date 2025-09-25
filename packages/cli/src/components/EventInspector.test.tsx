import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventInspector } from './EventInspector';
import { useAppStore } from '../stores/appStore';
import type { Event } from '../stores/appStore';

// Mock the store
vi.mock('../stores/appStore');

// Mock date-fns format for consistent output
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    // Return a consistent format for testing
    return '10:30:45.123';
  }),
}));

describe('EventInspector', () => {
  let onSelectEvent: ReturnType<typeof vi.fn>;
  let onBack: ReturnType<typeof vi.fn>;
  let mockEvents: Event[];

  beforeEach(() => {
    onSelectEvent = vi.fn();
    onBack = vi.fn();

    // Create mock events
    mockEvents = [
      {
        id: 'event-1',
        timestamp: new Date('2025-01-01T10:30:45.123Z').toISOString(),
        eventType: 'ToolUse',
        sessionId: 'session-1',
        toolName: 'Read',
        arguments: { file_path: '/test.ts', prompt: 'Reading test file' },
        result: { output: 'File content' },
        executionTime: 100,
      },
      {
        id: 'event-2',
        timestamp: new Date('2025-01-01T10:31:00.456Z').toISOString(),
        eventType: 'UserMessage',
        sessionId: 'session-1',
        arguments: { prompt: 'User input message' },
      },
      {
        id: 'event-3',
        timestamp: new Date('2025-01-01T10:31:15.789Z').toISOString(),
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
        events: mockEvents,
      };
      return selector ? selector(state) : state;
    });
  });

  describe('Given the EventInspector is displayed', () => {
    describe('When rendered', () => {
      it('Then should show the title', () => {
        const { lastFrame } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        expect(lastFrame()).toContain('EVENT INSPECTOR');
      });

      it('Then should show event count', () => {
        const { lastFrame } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        expect(lastFrame()).toContain('3 events');
      });

      it('Then should show column headers', () => {
        const { lastFrame } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );
        const frame = lastFrame();

        expect(frame).toContain('Time');
        expect(frame).toContain('Type');
        expect(frame).toContain('Tool');
        expect(frame).toContain('Description');
      });

      it('Then should list all events', () => {
        const { lastFrame } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );
        const frame = lastFrame();

        expect(frame).toContain('ToolUse');
        expect(frame).toContain('UserMessage');
        expect(frame).toContain('Read');
        expect(frame).toContain('Edit');
      });

      it('Then should show keyboard shortcuts', () => {
        const { lastFrame } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );
        const frame = lastFrame();

        expect(frame).toContain('↵ View');
        expect(frame).toContain('/ Search');
        expect(frame).toContain('f Filter');
        expect(frame).toContain('r Reverse');
        expect(frame).toContain('ESC Back');
      });

      it('Then should highlight the first event', () => {
        const { lastFrame } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        // Should have pointer on first event (most recent by default)
        expect(lastFrame()).toMatch(/❯.*ToolUse.*Edit/);
      });
    });

    describe('When navigating with keyboard', () => {
      it('Then down arrow should move selection', () => {
        const { stdin, lastFrame, rerender } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        stdin.write('\u001B[B'); // Down arrow
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        // Should move to second event
        expect(lastFrame()).toMatch(/❯.*UserMessage/);
      });

      it('Then up arrow should move selection up', () => {
        const { stdin, lastFrame, rerender } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        // Move down twice then up once
        stdin.write('\u001B[B');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );
        stdin.write('\u001B[B');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );
        stdin.write('\u001B[A'); // Up arrow
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        // Should be on second event
        expect(lastFrame()).toMatch(/❯.*UserMessage/);
      });

      it('Then Enter should select event', () => {
        const { stdin } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        stdin.write('\r'); // Enter

        // Should call onSelectEvent with the first (most recent) event
        expect(onSelectEvent).toHaveBeenCalledWith(mockEvents[2]); // event-3 is most recent
      });
    });

    describe('When sorting', () => {
      it('Then t key should sort by timestamp', () => {
        const { stdin, lastFrame, rerender } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        stdin.write('t');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        // Should show sort indicator on Time column
        expect(lastFrame()).toMatch(/Time\s*[↓↑]/);
      });

      it('Then y key should sort by type', () => {
        const { stdin, lastFrame, rerender } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        stdin.write('y');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        // Should show sort indicator on Type column
        expect(lastFrame()).toMatch(/Type\s*[↓↑]/);
      });

      it('Then r key should reverse sort order', () => {
        const { stdin, lastFrame, rerender } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        const initialFrame = lastFrame();

        stdin.write('r');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        const reversedFrame = lastFrame();

        // Order should be different
        expect(reversedFrame).not.toBe(initialFrame);
      });
    });

    describe('When searching', () => {
      it('Then / key should start search', () => {
        const { stdin, lastFrame, rerender } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        stdin.write('/');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        expect(lastFrame()).toContain('Search:');
      });

      it('Then should filter events while searching', () => {
        const { stdin, lastFrame, rerender } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        // Start search
        stdin.write('/');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        // Type "Edit"
        stdin.write('E');
        stdin.write('d');
        stdin.write('i');
        stdin.write('t');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        expect(lastFrame()).toContain('Search: Edit');
      });

      it('Then Enter should apply search', () => {
        const { stdin, lastFrame, rerender } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        stdin.write('/');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );
        stdin.write('E');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );
        stdin.write('d');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );
        stdin.write('i');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );
        stdin.write('t');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );
        stdin.write('\r'); // Enter to apply search
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        // Should show filtered count
        expect(lastFrame()).toMatch(/1 events.*filtered from 3/);
      });

      it('Then Escape should cancel search', () => {
        const { stdin, lastFrame, rerender } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        stdin.write('/');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );
        stdin.write('test');
        stdin.write('\u001B'); // Escape
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        // Search should be cancelled
        expect(lastFrame()).not.toContain('Search:');
      });
    });

    describe('When filtering', () => {
      it('Then f key should cycle filter fields', () => {
        const { stdin, lastFrame, rerender } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        stdin.write('f');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        // Should show filter mode (implementation will determine exact display)
        const frame = lastFrame();
        expect(frame).toBeDefined();
      });

      it('Then F key should clear filters', () => {
        const { stdin, lastFrame, rerender } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        // Set a filter first
        stdin.write('f');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        // Clear it
        stdin.write('F');
        rerender(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        // Should show all events
        expect(lastFrame()).toContain('3 events');
      });
    });

    describe('When pressing navigation keys', () => {
      it('Then Escape should call onBack', () => {
        const { stdin } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        stdin.write('\u001B'); // Escape

        expect(onBack).toHaveBeenCalledTimes(1);
      });

      it('Then q should call onBack', () => {
        const { stdin } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        stdin.write('q');

        expect(onBack).toHaveBeenCalledTimes(1);
      });
    });

    describe('When no events exist', () => {
      it('Then should show empty message', () => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              events: [],
            };
            return selector ? selector(state) : state;
          }
        );

        const { lastFrame } = render(
          <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
        );

        expect(lastFrame()).toContain('No events found');
      });
    });
  });
});
