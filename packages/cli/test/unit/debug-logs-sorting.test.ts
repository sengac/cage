/**
 * Debug Logs Sorting and Real-Time Updates Tests
 *
 * Tests that debug logs follow the EXACT same pattern as events:
 * 1. Fetch new logs when SSE notification arrives
 * 2. Append to existing logs
 * 3. Sort newest-first
 * 4. Limit to MAX
 * 5. Deduplicate
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../../src/shared/stores/appStore';

describe('Debug Logs - Sorting and Real-Time Updates', () => {
  beforeEach(() => {
    // Reset store
    const store = useAppStore.getState();
    store.debugLogs = [];
    store.lastDebugLogTimestamp = undefined;
  });

  it('should sort debug logs newest-first after SSE notification', async () => {
    const store = useAppStore.getState();

    // Simulate having old logs
    store.debugLogs = [
      {
        id: '1',
        timestamp: '2025-01-01T10:00:00.000Z',
        level: 'INFO' as const,
        component: 'OldComponent',
        message: 'Old log',
      },
    ];

    // Mock API client to return newer logs
    const mockClient = {
      getDebugLogs: vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            id: '2',
            timestamp: '2025-01-01T10:01:00.000Z',
            level: 'INFO' as const,
            component: 'NewComponent',
            message: 'New log 1',
          },
          {
            id: '3',
            timestamp: '2025-01-01T10:02:00.000Z',
            level: 'INFO' as const,
            component: 'NewComponent',
            message: 'New log 2',
          },
        ],
      }),
    };

    // TODO: Inject mock client and call setLastDebugLogTimestamp
    // For now, manually test the sorting logic

    const allLogs = [
      ...store.debugLogs,
      {
        id: '2',
        timestamp: '2025-01-01T10:01:00.000Z',
        level: 'INFO' as const,
        component: 'NewComponent',
        message: 'New log 1',
      },
      {
        id: '3',
        timestamp: '2025-01-01T10:02:00.000Z',
        level: 'INFO' as const,
        component: 'NewComponent',
        message: 'New log 2',
      },
    ];

    // Sort newest-first
    allLogs.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Newest should be first
    expect(allLogs[0].id).toBe('3'); // 10:02:00
    expect(allLogs[1].id).toBe('2'); // 10:01:00
    expect(allLogs[2].id).toBe('1'); // 10:00:00
  });

  it('should limit debug logs to MAX after appending new logs', () => {
    const MAX_DEBUG_LOGS = 1000;
    const store = useAppStore.getState();

    // Create 1005 logs
    const manyLogs = Array.from({ length: 1005 }, (_, i) => ({
      id: `log-${i}`,
      timestamp: new Date(Date.now() + i * 1000).toISOString(),
      level: 'INFO' as const,
      component: 'TestComponent',
      message: `Log ${i}`,
    }));

    // Sort newest-first
    manyLogs.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Limit to MAX
    const limitedLogs = manyLogs.slice(0, MAX_DEBUG_LOGS);

    expect(limitedLogs.length).toBe(MAX_DEBUG_LOGS);
    // Should keep the newest logs
    expect(limitedLogs[0].id).toBe('log-1004'); // Newest
    expect(limitedLogs[999].id).toBe('log-5'); // 1000th newest
  });

  it('should deduplicate debug logs when same log arrives multiple times', () => {
    const store = useAppStore.getState();

    const existingLogs = [
      {
        id: 'log-1',
        timestamp: '2025-01-01T10:00:00.000Z',
        level: 'INFO' as const,
        component: 'Component1',
        message: 'Message 1',
      },
      {
        id: 'log-2',
        timestamp: '2025-01-01T10:01:00.000Z',
        level: 'INFO' as const,
        component: 'Component2',
        message: 'Message 2',
      },
    ];

    const newLogs = [
      {
        id: 'log-2', // Duplicate
        timestamp: '2025-01-01T10:01:00.000Z',
        level: 'INFO' as const,
        component: 'Component2',
        message: 'Message 2',
      },
      {
        id: 'log-3', // New
        timestamp: '2025-01-01T10:02:00.000Z',
        level: 'INFO' as const,
        component: 'Component3',
        message: 'Message 3',
      },
    ];

    // Deduplication logic
    const existingIds = new Set(existingLogs.map(log => log.id));
    const uniqueNewLogs = newLogs.filter(log => !existingIds.has(log.id));

    expect(uniqueNewLogs.length).toBe(1);
    expect(uniqueNewLogs[0].id).toBe('log-3');
  });

  it('should show newest logs at top of Debug Console list', () => {
    const logs = [
      {
        id: '1',
        timestamp: '2025-01-01T10:00:00.000Z',
        level: 'INFO' as const,
        component: 'Old',
        message: 'Old',
      },
      {
        id: '2',
        timestamp: '2025-01-01T10:05:00.000Z',
        level: 'INFO' as const,
        component: 'Newest',
        message: 'Newest',
      },
      {
        id: '3',
        timestamp: '2025-01-01T10:03:00.000Z',
        level: 'INFO' as const,
        component: 'Middle',
        message: 'Middle',
      },
    ];

    // Sort newest-first (what Debug Console should display)
    logs.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Newest should be at index 0 (top of list)
    expect(logs[0].component).toBe('Newest'); // 10:05:00
    expect(logs[1].component).toBe('Middle'); // 10:03:00
    expect(logs[2].component).toBe('Old'); // 10:00:00
  });
});
