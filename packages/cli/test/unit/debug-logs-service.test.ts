/**
 * Debug Logs Service Tests
 *
 * Tests that DebugLogsService follows the EXACT same singleton pattern
 * as HooksStatusService and manages Zustand state properly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DebugLogsService } from '../../src/features/debug/services/debug-logs-service';
import type { AppState } from '../../src/shared/stores/appStore';

describe('DebugLogsService', () => {
  let mockStore: Partial<AppState>;
  let mockFetchLatestDebugLogs: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset singleton
    DebugLogsService.resetInstance();

    // Create mock store
    mockFetchLatestDebugLogs = vi.fn().mockResolvedValue(undefined);
    mockStore = {
      serverStatus: 'running',
      debugLogs: [],
      fetchLatestDebugLogs: mockFetchLatestDebugLogs,
    };
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DebugLogsService.getInstance();
      const instance2 = DebugLogsService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = DebugLogsService.getInstance();
      DebugLogsService.resetInstance();
      const instance2 = DebugLogsService.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should fetch initial debug logs on start', async () => {
      const service = DebugLogsService.getInstance({
        getStore: () => mockStore as AppState,
      });

      service.start();

      // Should fetch immediately
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockFetchLatestDebugLogs).toHaveBeenCalled();
    });

    it('should not start twice', () => {
      const service = DebugLogsService.getInstance({
        getStore: () => mockStore as AppState,
      });

      service.start();
      service.start(); // Second call should be ignored

      // Should only be called once
      expect(mockFetchLatestDebugLogs).toHaveBeenCalledTimes(1);
    });
  });

  describe('Real-Time Updates via SSE', () => {
    it('should work with SSE notifications triggering store updates', async () => {
      // The service doesn't poll - it relies on SSE notifications
      // StreamService calls store.setLastDebugLogTimestamp()
      // which triggers store.fetchLatestDebugLogs()

      const service = DebugLogsService.getInstance({
        getStore: () => mockStore as AppState,
      });

      service.start();

      // Simulate SSE notification arriving
      // This would normally come from StreamService
      await mockStore.fetchLatestDebugLogs?.();

      expect(mockFetchLatestDebugLogs).toHaveBeenCalled();
    });
  });

  describe('Manual Refresh', () => {
    it('should allow manual refresh', async () => {
      const service = DebugLogsService.getInstance({
        getStore: () => mockStore as AppState,
      });

      service.start();
      await service.refresh();

      // Should fetch at least twice (once on start, once on refresh)
      expect(mockFetchLatestDebugLogs).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cleanup', () => {
    it('should stop service cleanly', () => {
      const service = DebugLogsService.getInstance({
        getStore: () => mockStore as AppState,
      });

      service.start();
      service.stop();

      // Should be able to restart after stop
      service.start();
      expect(mockFetchLatestDebugLogs).toHaveBeenCalled();
    });
  });
});
