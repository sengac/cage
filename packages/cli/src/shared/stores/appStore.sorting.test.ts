/**
 * App Store Event Sorting Tests
 *
 * CRITICAL: Tests verify that events are ALWAYS sorted newest-first
 * This is a global ordering standard across the entire application
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './appStore';
import type { Event } from './appStore';

// Mock CageApiClient
vi.mock('../../api/cage-api-client', () => ({
  CageApiClient: {
    initializeFromConfig: vi.fn().mockResolvedValue({
      getEvents: vi.fn().mockResolvedValue({
        success: true,
        data: {
          events: [],
        },
      }),
    }),
  },
}));

describe('AppStore Event Sorting (Acceptance)', () => {
  beforeEach(() => {
    const store = useAppStore.getState();
    store.setEvents([]);
    vi.clearAllMocks();
  });

  it('CRITICAL: Events must be sorted newest-first after adding new events', async () => {
    const store = useAppStore.getState();

    // Create events with different timestamps
    const events: Event[] = [
      {
        id: '1',
        timestamp: '2025-01-01T10:00:00.000Z',
        eventType: 'PreToolUse',
        sessionId: 'test',
        toolName: 'Read',
        arguments: {},
      },
      {
        id: '2',
        timestamp: '2025-01-01T10:05:00.000Z',
        eventType: 'PostToolUse',
        sessionId: 'test',
        toolName: 'Read',
        arguments: {},
      },
      {
        id: '3',
        timestamp: '2025-01-01T10:02:00.000Z',
        eventType: 'PreToolUse',
        sessionId: 'test',
        toolName: 'Write',
        arguments: {},
      },
    ];

    // Set events in random order
    store.setEvents([events[0], events[2], events[1]]);

    // Get events from store
    const storedEvents = useAppStore.getState().events;

    // Verify events are sorted newest-first
    expect(storedEvents[0].id).toBe('2'); // 10:05:00
    expect(storedEvents[1].id).toBe('3'); // 10:02:00
    expect(storedEvents[2].id).toBe('1'); // 10:00:00

    // Verify timestamps are in descending order
    for (let i = 0; i < storedEvents.length - 1; i++) {
      const current = new Date(storedEvents[i].timestamp).getTime();
      const next = new Date(storedEvents[i + 1].timestamp).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  it('CRITICAL: Adding new events must maintain newest-first order', () => {
    const store = useAppStore.getState();

    // Add initial events
    const initialEvents: Event[] = [
      {
        id: '1',
        timestamp: '2025-01-01T10:00:00.000Z',
        eventType: 'PreToolUse',
        sessionId: 'test',
        toolName: 'Read',
        arguments: {},
      },
      {
        id: '2',
        timestamp: '2025-01-01T10:05:00.000Z',
        eventType: 'PostToolUse',
        sessionId: 'test',
        toolName: 'Read',
        arguments: {},
      },
    ];

    store.setEvents(initialEvents);

    // Add a new event with timestamp in the middle
    const newEvent: Event = {
      id: '3',
      timestamp: '2025-01-01T10:03:00.000Z',
      eventType: 'PreToolUse',
      sessionId: 'test',
      toolName: 'Write',
      arguments: {},
    };

    store.addEvent(newEvent);

    const storedEvents = useAppStore.getState().events;

    // Verify order: 10:05:00, 10:03:00, 10:00:00
    expect(storedEvents[0].id).toBe('2');
    expect(storedEvents[1].id).toBe('3');
    expect(storedEvents[2].id).toBe('1');
  });

  it('CRITICAL: fetchLatestEvents must sort merged events newest-first', async () => {
    const { CageApiClient } = await import('../../api/cage-api-client');
    const mockClient = {
      getEvents: vi.fn().mockResolvedValue({
        success: true,
        data: {
          events: [
            {
              id: '4',
              timestamp: '2025-01-01T10:10:00.000Z',
              eventType: 'PreToolUse',
              sessionId: 'test',
              toolName: 'Edit',
              arguments: {},
            },
            {
              id: '5',
              timestamp: '2025-01-01T10:08:00.000Z',
              eventType: 'PostToolUse',
              sessionId: 'test',
              toolName: 'Edit',
              arguments: {},
            },
          ],
        },
      }),
    };

    vi.mocked(CageApiClient.initializeFromConfig).mockResolvedValue(mockClient as never);

    const store = useAppStore.getState();

    // Set initial events
    const initialEvents: Event[] = [
      {
        id: '1',
        timestamp: '2025-01-01T10:00:00.000Z',
        eventType: 'PreToolUse',
        sessionId: 'test',
        toolName: 'Read',
        arguments: {},
      },
      {
        id: '2',
        timestamp: '2025-01-01T10:05:00.000Z',
        eventType: 'PostToolUse',
        sessionId: 'test',
        toolName: 'Read',
        arguments: {},
      },
    ];

    store.setEvents(initialEvents);
    store.updateServerStatus('running');

    // Fetch latest events
    await store.fetchLatestEvents();

    const storedEvents = useAppStore.getState().events;

    // Verify all events are sorted newest-first
    // Expected order: 10:10:00, 10:08:00, 10:05:00, 10:00:00
    expect(storedEvents.length).toBe(4);
    expect(storedEvents[0].id).toBe('4');
    expect(storedEvents[1].id).toBe('5');
    expect(storedEvents[2].id).toBe('2');
    expect(storedEvents[3].id).toBe('1');

    // Verify timestamps are in descending order
    for (let i = 0; i < storedEvents.length - 1; i++) {
      const current = new Date(storedEvents[i].timestamp).getTime();
      const next = new Date(storedEvents[i + 1].timestamp).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  it('CRITICAL: setEvents must sort events newest-first', () => {
    const store = useAppStore.getState();

    const events: Event[] = [
      {
        id: '1',
        timestamp: '2025-01-01T10:00:00.000Z',
        eventType: 'PreToolUse',
        sessionId: 'test',
        toolName: 'Read',
        arguments: {},
      },
      {
        id: '2',
        timestamp: '2025-01-01T10:10:00.000Z',
        eventType: 'PostToolUse',
        sessionId: 'test',
        toolName: 'Read',
        arguments: {},
      },
      {
        id: '3',
        timestamp: '2025-01-01T10:05:00.000Z',
        eventType: 'PreToolUse',
        sessionId: 'test',
        toolName: 'Write',
        arguments: {},
      },
    ];

    // Pass events in mixed order
    store.setEvents(events);

    const storedEvents = useAppStore.getState().events;

    // Verify sorted newest-first
    expect(storedEvents[0].id).toBe('2'); // 10:10
    expect(storedEvents[1].id).toBe('3'); // 10:05
    expect(storedEvents[2].id).toBe('1'); // 10:00
  });

  it('CRITICAL: Events with MAX_EVENTS_IN_MEMORY limit must keep newest events', () => {
    const store = useAppStore.getState();
    const MAX_EVENTS = 1000;

    // Create more than MAX_EVENTS events
    const events: Event[] = [];
    for (let i = 0; i < MAX_EVENTS + 100; i++) {
      events.push({
        id: `event-${i}`,
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        eventType: 'PreToolUse',
        sessionId: 'test',
        toolName: 'Read',
        arguments: {},
      });
    }

    store.setEvents(events);

    const storedEvents = useAppStore.getState().events;

    // Verify only MAX_EVENTS are kept
    expect(storedEvents.length).toBe(MAX_EVENTS);

    // Verify we kept the NEWEST events (highest IDs)
    expect(storedEvents[0].id).toBe(`event-${MAX_EVENTS + 99}`);
    expect(storedEvents[storedEvents.length - 1].id).toBe(`event-100`);
  });
});