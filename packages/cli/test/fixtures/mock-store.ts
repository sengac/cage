/**
 * Mock Zustand store for testing
 * Provides a controllable store implementation that tracks all method calls
 */

import type { AppState } from '../../src/shared/stores/appStore';

export function createMockStore(): AppState {
  const mockStore: Partial<AppState> = {
    // State
    isStreaming: false,
    serverStatus: 'unknown',
    events: [],
    debugLogs: [],
    lastEventTimestamp: null,
    lastDebugLogTimestamp: null,
    hooksStatus: null,

    // Actions - track calls for assertions
    setStreamingStatus: (status: boolean) => {
      mockStore.isStreaming = status;
      if (status) {
        mockStore.serverStatus = 'running';
      }
    },

    setLastEventTimestamp: (timestamp: string) => {
      mockStore.lastEventTimestamp = timestamp;
      // Trigger fetchLatestEvents (in real store)
      if (mockStore.fetchLatestEvents) {
        void mockStore.fetchLatestEvents();
      }
    },

    setLastDebugLogTimestamp: (timestamp: string) => {
      mockStore.lastDebugLogTimestamp = timestamp;
      // Trigger fetchLatestDebugLogs (in real store)
      if (mockStore.fetchLatestDebugLogs) {
        void mockStore.fetchLatestDebugLogs();
      }
    },

    fetchLatestEvents: async () => {
      // Mock implementation - no-op
    },

    fetchLatestDebugLogs: async () => {
      // Mock implementation - no-op
    },

    refreshHooksStatus: async () => {
      // Mock implementation - no-op
    },
  };

  return mockStore as AppState;
}
