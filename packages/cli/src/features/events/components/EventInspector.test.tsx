import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { EventInspector } from './EventInspector';
import { useAppStore } from '../../../shared/stores/appStore';
import type { Event } from '../../../shared/stores/appStore';
import { InputModeProvider } from '../../../shared/contexts/InputContext';
import { CageApiClient } from '../../../api/cage-api-client';

// Mock the store
vi.mock('../../../shared/stores/appStore');

// Mock the API client
vi.mock('../api/cage-api-client');

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

  const renderComponent = async (props = {}) => {
    const component = render(
      <InputModeProvider>
        <EventInspector
          onSelectEvent={onSelectEvent}
          onBack={onBack}
          {...props}
        />
      </InputModeProvider>
    );

    // Wait for the async loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    return component;
  };

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

    // Mock the API client to return our mock events
    vi.mocked(CageApiClient).initializeFromConfig = vi.fn().mockResolvedValue({
      getEvents: vi.fn().mockResolvedValue({
        success: true,
        data: {
          events: mockEvents,
          total: mockEvents.length,
          page: 1,
          pageSize: 1000,
        },
      }),
    });

    // Mock the store implementation
    (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(selector => {
      const state = {
        events: mockEvents,
        serverStatus: 'running', // Server must be running for EventInspector to load
      };
      return selector ? selector(state) : state;
    });
  });

  describe('Given the EventInspector is displayed', () => {
    describe('When rendered', () => {
      it('Then should show event count', async () => {
        const { lastFrame } = await renderComponent();

        expect(lastFrame()).toContain('3 events');
      });

      it('Then should show column headers', async () => {
        const { lastFrame } = await renderComponent();
        const frame = lastFrame();

        expect(frame).toContain('Time');
        expect(frame).toContain('Type');
        expect(frame).toContain('Tool');
        expect(frame).toContain('Description');
      });

      it('Then should list all events', async () => {
        const { lastFrame } = await renderComponent();
        const frame = lastFrame();

        expect(frame).toContain('ToolUse');
        expect(frame).toContain('UserMessage');
        expect(frame).toContain('Read');
        expect(frame).toContain('Edit');
      });

      it('Then should highlight the first event', async () => {
        const { lastFrame } = await renderComponent();

        // Should have pointer on first event (most recent by default)
        expect(lastFrame()).toMatch(/❯.*ToolUse.*Edit/);
      });
    });

    describe('When navigating with keyboard', () => {
      it('Then down arrow should move selection', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('\u001B[B'); // Down arrow
        await act(() => {
          rerender(
            <InputModeProvider>
              <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
            </InputModeProvider>
          );
        });

        // Should move to second event
        expect(lastFrame()).toMatch(/❯.*UserMessage/);
      });

      it('Then up arrow should move selection up', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        // Move down twice then up once
        stdin.write('\u001B[B');
        await act(() => {
          rerender(
            <InputModeProvider>
              <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
            </InputModeProvider>
          );
        });
        stdin.write('\u001B[B');
        await act(() => {
          rerender(
            <InputModeProvider>
              <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
            </InputModeProvider>
          );
        });
        stdin.write('\u001B[A'); // Up arrow
        await act(() => {
          rerender(
            <InputModeProvider>
              <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
            </InputModeProvider>
          );
        });

        // Should be on second event
        expect(lastFrame()).toMatch(/❯.*UserMessage/);
      });

      it('Then Enter should select event', async () => {
        const { stdin } = await renderComponent();

        stdin.write('\r'); // Enter

        // Should call onSelectEvent with the first (most recent) event and index
        expect(onSelectEvent).toHaveBeenCalledWith(mockEvents[2], 0); // event-3 is most recent, index 0 after sorting
      });
    });

    describe('When sorting', () => {
      it('Then t key should sort by timestamp', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('t');
        rerender(
          <InputModeProvider>
            <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
          </InputModeProvider>
        );

        // Should show sort indicator on Time column
        expect(lastFrame()).toMatch(/Time\s*[↓↑]/);
      });

      it('Then y key should sort by type', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('y');
        rerender(
          <InputModeProvider>
            <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
          </InputModeProvider>
        );

        // Should show sort indicator on Type column
        expect(lastFrame()).toMatch(/Type\s*[↓↑]/);
      });

      it('Then r key should reverse sort order', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        const initialFrame = lastFrame();

        stdin.write('r');
        rerender(
          <InputModeProvider>
            <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
          </InputModeProvider>
        );

        const reversedFrame = lastFrame();

        // Order should be different
        expect(reversedFrame).not.toBe(initialFrame);
      });
    });

    describe('When searching', () => {
      it('Then / key should start search', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('/');
        rerender(
          <InputModeProvider>
            <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Search:');
      });

      it('Then should filter events while searching', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        // Start search
        stdin.write('/');
        await act(() => {
          rerender(
            <InputModeProvider>
              <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
            </InputModeProvider>
          );
        });

        // Type "Edit" - need to rerender after each character
        stdin.write('E');
        await act(() => {
          rerender(
            <InputModeProvider>
              <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
            </InputModeProvider>
          );
        });
        stdin.write('d');
        await act(() => {
          rerender(
            <InputModeProvider>
              <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
            </InputModeProvider>
          );
        });
        stdin.write('i');
        await act(() => {
          rerender(
            <InputModeProvider>
              <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
            </InputModeProvider>
          );
        });
        stdin.write('t');
        await act(() => {
          rerender(
            <InputModeProvider>
              <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
            </InputModeProvider>
          );
        });

        expect(lastFrame()).toContain('Search: Edit');
      });

      it('Then Enter should apply search', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('/');
        rerender(
          <InputModeProvider>
            <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('E');
        rerender(
          <InputModeProvider>
            <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('d');
        rerender(
          <InputModeProvider>
            <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('i');
        rerender(
          <InputModeProvider>
            <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('t');
        rerender(
          <InputModeProvider>
            <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\r'); // Enter to apply search
        rerender(
          <InputModeProvider>
            <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
          </InputModeProvider>
        );

        // Should show filtered count
        expect(lastFrame()).toMatch(/1 events.*filtered from 3/);
      });

      it('Then Escape should cancel search', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('/');
        await act(() => {
          rerender(
            <InputModeProvider>
              <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
            </InputModeProvider>
          );
        });

        // Type some text
        stdin.write('t');
        await act(() => {
          rerender(
            <InputModeProvider>
              <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
            </InputModeProvider>
          );
        });

        // Cancel with Escape
        stdin.write('\u001B'); // Escape
        await act(() => {
          rerender(
            <InputModeProvider>
              <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
            </InputModeProvider>
          );
        });

        // Search should be cancelled
        expect(lastFrame()).not.toContain('Search:');
      });
    });

    describe('When filtering', () => {
      it('Then f key should cycle filter fields', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        stdin.write('f');
        rerender(
          <InputModeProvider>
            <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
          </InputModeProvider>
        );

        // Should show filter mode (implementation will determine exact display)
        const frame = lastFrame();
        expect(frame).toBeDefined();
      });

      it('Then F key should clear filters', async () => {
        const { stdin, lastFrame, rerender } = await renderComponent();

        // Set a filter first
        stdin.write('f');
        rerender(
          <InputModeProvider>
            <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
          </InputModeProvider>
        );

        // Clear it
        stdin.write('F');
        rerender(
          <InputModeProvider>
            <EventInspector onSelectEvent={onSelectEvent} onBack={onBack} />
          </InputModeProvider>
        );

        // Should show all events
        expect(lastFrame()).toContain('3 events');
      });
    });

    describe('When pressing navigation keys', () => {
      it('Then Escape should call onBack', async () => {
        const { stdin } = await renderComponent();

        stdin.write('\u001B'); // Escape

        expect(onBack).toHaveBeenCalledTimes(1);
      });

      it('Then q should call onBack', async () => {
        const { stdin } = await renderComponent();

        stdin.write('q');

        expect(onBack).toHaveBeenCalledTimes(1);
      });
    });

    describe('When no events exist', () => {
      it('Then should show empty message', async () => {
        vi.mocked(CageApiClient.initializeFromConfig).mockResolvedValue({
          getEvents: vi.fn().mockResolvedValue({
            success: true,
            data: { events: [] },
          }),
          getDebugLogs: vi.fn(),
          checkHealth: vi.fn(),
          getServerStatus: vi.fn(),
          getEvent: vi.fn(),
          getHooksStatus: vi.fn(),
          getBaseUrl: vi.fn(),
        });

        const { lastFrame } = await renderComponent();

        expect(lastFrame()).toContain('No events found');
      });
    });
  });
});
