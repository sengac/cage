import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HooksStatusService } from './hooks-status-service';
import { createMockStore } from '../../../../test/fixtures/mock-store';
import type { AppState } from '../../../shared/stores/appStore';

describe('HooksStatusService - PHASE2 Acceptance Criteria', () => {
  let mockStore: AppState;
  let setIntervalSpy: ReturnType<typeof vi.fn>;
  let clearIntervalSpy: ReturnType<typeof vi.fn>;
  let intervalCallbacks: Array<() => void> = [];

  beforeEach(() => {
    // Create fresh mock store for each test
    mockStore = createMockStore();

    // Reset interval callbacks
    intervalCallbacks = [];

    // Mock setInterval to capture callbacks
    setIntervalSpy = vi.fn((callback: () => void, _interval: number): NodeJS.Timeout => {
      intervalCallbacks.push(callback);
      return 123 as NodeJS.Timeout; // Return fake timer ID
    });

    // Mock clearInterval
    clearIntervalSpy = vi.fn();

    // Reset HooksStatusService singleton
    HooksStatusService.resetInstance();

    // Create service with injected dependencies
    HooksStatusService.getInstance(1000, {
      // Use 1 second interval for tests
      getStore: () => mockStore,
      setIntervalFn: setIntervalSpy,
      clearIntervalFn: clearIntervalSpy,
    });
  });

  afterEach(() => {
    // Clean up
    HooksStatusService.getInstance().stop();
    HooksStatusService.resetInstance();
  });

  describe('Scenario: HooksStatusService singleton updates hooks status in Zustand', () => {
    it('MUST be a singleton (getInstance returns same instance)', () => {
      const instance1 = HooksStatusService.getInstance();
      const instance2 = HooksStatusService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('MUST poll /api/hooks/status every 30 seconds (configurable)', () => {
      const service = HooksStatusService.getInstance();

      service.start();

      // Verify setInterval was called with correct interval
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('MUST call store.refreshHooksStatus() on each poll', async () => {
      // Spy on refreshHooksStatus
      const refreshSpy = vi.spyOn(mockStore, 'refreshHooksStatus');

      const service = HooksStatusService.getInstance();

      service.start();

      // Wait for initial immediate fetch
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify immediate fetch was called
      expect(refreshSpy).toHaveBeenCalledTimes(1);

      // Simulate interval tick
      if (intervalCallbacks[0]) {
        intervalCallbacks[0]();
      }

      // Wait for async call
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify interval callback also calls refreshHooksStatus
      expect(refreshSpy).toHaveBeenCalledTimes(2);
    });

    it('MUST fetch immediately on start, then at interval', async () => {
      const refreshSpy = vi.spyOn(mockStore, 'refreshHooksStatus');

      const service = HooksStatusService.getInstance();

      // Before start
      expect(refreshSpy).not.toHaveBeenCalled();

      service.start();

      // Wait for immediate fetch
      await new Promise(resolve => setTimeout(resolve, 10));

      // Immediate fetch should have happened
      expect(refreshSpy).toHaveBeenCalledTimes(1);

      // Verify setInterval was set up
      expect(setIntervalSpy).toHaveBeenCalled();
    });

    it('MUST NOT create multiple instances when getInstance() called multiple times', () => {
      const instance1 = HooksStatusService.getInstance();
      const instance2 = HooksStatusService.getInstance();
      const instance3 = HooksStatusService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });

    it('MUST NOT start multiple intervals when start() called multiple times', () => {
      const service = HooksStatusService.getInstance();

      service.start();
      service.start();
      service.start();

      // Should only have called setInterval once
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it('MUST stop polling when stop() is called', () => {
      const service = HooksStatusService.getInstance();

      service.start();

      // Verify interval was started
      expect(setIntervalSpy).toHaveBeenCalled();

      service.stop();

      // Verify interval was cleared
      expect(clearIntervalSpy).toHaveBeenCalledWith(123);
    });

    it('MUST allow refresh() to force immediate fetch outside of polling', async () => {
      const refreshSpy = vi.spyOn(mockStore, 'refreshHooksStatus');

      const service = HooksStatusService.getInstance();

      // Don't start polling
      await service.refresh();

      // Wait for async call
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify refreshHooksStatus was called
      expect(refreshSpy).toHaveBeenCalledTimes(1);

      // Verify setInterval was NOT called (not polling)
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: Polling MUST only happen in service, NOT in components', () => {
    it('MUST use setInterval for polling (not components)', () => {
      const service = HooksStatusService.getInstance();

      service.start();

      // Verify setInterval was used
      expect(setIntervalSpy).toHaveBeenCalled();
    });

    it('MUST update Zustand store (for components to read)', async () => {
      const refreshSpy = vi.spyOn(mockStore, 'refreshHooksStatus');

      const service = HooksStatusService.getInstance();

      service.start();

      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify store was updated (components will read this)
      expect(refreshSpy).toHaveBeenCalled();
    });
  });
});
