import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAppStore } from './appStore';
import type { Event, DebugLog } from './appStore';
import * as CageApiClientModule from '../../api/cage-api-client';

describe('AppStore - SSE Notification Architecture', () => {
  let mockGetEvents: ReturnType<typeof vi.fn>;
  let mockGetDebugLogs: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useAppStore.setState({
      events: [],
      debugLogs: [],
      lastEventTimestamp: null,
      lastDebugLogTimestamp: null,
      serverStatus: 'running',
    });

    mockGetEvents = vi.fn();
    mockGetDebugLogs = vi.fn();

    vi.spyOn(CageApiClientModule.CageApiClient, 'initializeFromConfig').mockResolvedValue({
      getEvents: mockGetEvents,
      getDebugLogs: mockGetDebugLogs,
      checkHealth: vi.fn(),
      getServerStatus: vi.fn(),
      getEvent: vi.fn(),
      getHooksStatus: vi.fn(),
      getBaseUrl: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Event timestamp and auto-fetch', () => {
    it('should update lastEventTimestamp when setLastEventTimestamp is called', () => {
      const timestamp = '2025-01-24T10:00:00.000Z';

      useAppStore.getState().setLastEventTimestamp(timestamp);

      expect(useAppStore.getState().lastEventTimestamp).toBe(timestamp);
    });

    it('should automatically call fetchLatestEvents when timestamp is set', async () => {
      const mockEvents: Event[] = [
        {
          id: '1',
          timestamp: '2025-01-24T10:00:01.000Z',
          eventType: 'PreToolUse',
          sessionId: 'session-123',
          toolName: 'Edit',
        },
      ];

      mockGetEvents.mockResolvedValue({
        success: true,
        data: { events: mockEvents },
      });

      useAppStore.getState().setLastEventTimestamp('2025-01-24T10:00:00.000Z');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(useAppStore.getState().events).toHaveLength(1);
      expect(useAppStore.getState().events[0].id).toBe('1');
    });

    it('should fetch events with ?since parameter', async () => {
      mockGetEvents.mockResolvedValue({
        success: true,
        data: { events: [] },
      });

      useAppStore.setState({ lastEventTimestamp: '2025-01-24T09:00:00.000Z' });
      useAppStore.getState().setLastEventTimestamp('2025-01-24T10:00:00.000Z');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockGetEvents).toHaveBeenCalledWith({
        since: '2025-01-24T10:00:00.000Z',
        limit: 100,
      });
    });

    it('should append new events to existing events array', async () => {
      const existingEvent: Event = {
        id: '1',
        timestamp: '2025-01-24T09:00:00.000Z',
        eventType: 'PreToolUse',
        sessionId: 'session-1',
      };

      const newEvent: Event = {
        id: '2',
        timestamp: '2025-01-24T10:00:00.000Z',
        eventType: 'PostToolUse',
        sessionId: 'session-1',
      };

      useAppStore.setState({ events: [existingEvent] });

      mockGetEvents.mockResolvedValue({
        success: true,
        data: { events: [newEvent] },
      });

      useAppStore.getState().setLastEventTimestamp('2025-01-24T10:00:00.000Z');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(useAppStore.getState().events).toHaveLength(2);
      // Events are sorted newest-first (CRITICAL per appStore.sorting.test.ts)
      expect(useAppStore.getState().events[0].id).toBe('2'); // 10:00 (newest)
      expect(useAppStore.getState().events[1].id).toBe('1'); // 09:00 (oldest)
    });

    it('should not fetch when server is not running', async () => {
      useAppStore.setState({ serverStatus: 'stopped' });
      useAppStore.getState().setLastEventTimestamp('2025-01-24T10:00:00.000Z');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockGetEvents).not.toHaveBeenCalled();
    });

    it('should enforce MAX_EVENTS_IN_MEMORY limit', async () => {
      const manyEvents: Event[] = Array.from({ length: 1100 }, (_, i) => ({
        id: `event-${i}`,
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        eventType: 'PreToolUse',
        sessionId: 'session-1',
      }));

      useAppStore.setState({ events: manyEvents.slice(0, 1000) });

      mockGetEvents.mockResolvedValue({
        success: true,
        data: { events: manyEvents.slice(1000) },
      });

      useAppStore.getState().setLastEventTimestamp('2025-01-24T10:00:00.000Z');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(useAppStore.getState().events.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Debug log timestamp and auto-fetch', () => {
    it('should update lastDebugLogTimestamp when setLastDebugLogTimestamp is called', () => {
      const timestamp = '2025-01-24T10:00:00.000Z';

      useAppStore.getState().setLastDebugLogTimestamp(timestamp);

      expect(useAppStore.getState().lastDebugLogTimestamp).toBe(timestamp);
    });

    it('should automatically call fetchLatestDebugLogs when timestamp is set', async () => {
      const mockLogs = [
        {
          id: '1',
          timestamp: '2025-01-24T10:00:01.000Z',
          level: 'ERROR',
          component: 'TestComponent',
          message: 'Test error',
        },
      ];

      mockGetDebugLogs.mockResolvedValue({
        success: true,
        data: mockLogs,
      });

      useAppStore.getState().setLastDebugLogTimestamp('2025-01-24T10:00:00.000Z');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(useAppStore.getState().debugLogs).toHaveLength(1);
      expect(useAppStore.getState().debugLogs[0].id).toBe('1');
    });

    it('should fetch debug logs with ?since parameter', async () => {
      mockGetDebugLogs.mockResolvedValue({
        success: true,
        data: [],
      });

      useAppStore.setState({ lastDebugLogTimestamp: '2025-01-24T09:00:00.000Z' });
      useAppStore.getState().setLastDebugLogTimestamp('2025-01-24T10:00:00.000Z');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockGetDebugLogs).toHaveBeenCalledWith({
        since: '2025-01-24T10:00:00.000Z',
        limit: 500,
      });
    });

    it('should append new debug logs to existing logs array', async () => {
      const existingLog: DebugLog = {
        id: '1',
        timestamp: '2025-01-24T09:00:00.000Z',
        level: 'INFO',
        component: 'Component1',
        message: 'First log',
      };

      const newLog = {
        id: '2',
        timestamp: '2025-01-24T10:00:00.000Z',
        level: 'ERROR',
        component: 'Component2',
        message: 'Second log',
      };

      useAppStore.setState({ debugLogs: [existingLog] });

      mockGetDebugLogs.mockResolvedValue({
        success: true,
        data: [newLog],
      });

      useAppStore.getState().setLastDebugLogTimestamp('2025-01-24T10:00:00.000Z');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(useAppStore.getState().debugLogs).toHaveLength(2);
      // Debug logs are sorted newest-first (consistent with events sorting)
      expect(useAppStore.getState().debugLogs[0].id).toBe('2'); // 10:00 (newest)
      expect(useAppStore.getState().debugLogs[1].id).toBe('1'); // 09:00 (oldest)
    });

    it('should not fetch debug logs when server is not running', async () => {
      useAppStore.setState({ serverStatus: 'stopped' });
      useAppStore.getState().setLastDebugLogTimestamp('2025-01-24T10:00:00.000Z');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockGetDebugLogs).not.toHaveBeenCalled();
    });
  });

  describe('Central storage architecture', () => {
    it('should store events in central state, not component local state', () => {
      const events: Event[] = [
        {
          id: '1',
          timestamp: '2025-01-24T10:00:00.000Z',
          eventType: 'PreToolUse',
          sessionId: 'session-1',
        },
      ];

      useAppStore.setState({ events });

      expect(useAppStore.getState().events).toBe(events);
      expect(useAppStore.getState().events).toHaveLength(1);
    });

    it('should store debug logs in central state, not component local state', () => {
      const debugLogs: DebugLog[] = [
        {
          id: '1',
          timestamp: '2025-01-24T10:00:00.000Z',
          level: 'ERROR',
          component: 'TestComponent',
          message: 'Test error',
        },
      ];

      useAppStore.setState({ debugLogs });

      expect(useAppStore.getState().debugLogs).toBe(debugLogs);
      expect(useAppStore.getState().debugLogs).toHaveLength(1);
    });
  });
});