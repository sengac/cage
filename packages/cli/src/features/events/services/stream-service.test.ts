import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StreamService } from './stream-service';
import { MockEventSource } from '../../../../test/fixtures/mock-event-source';
import { createMockStore } from '../../../../test/fixtures/mock-store';
import type { AppState } from '../../../shared/stores/appStore';

describe('StreamService - PHASE2 Acceptance Criteria', () => {
  let mockEventSourceInstance: MockEventSource;
  let mockStore: AppState;

  beforeEach(() => {
    // Create fresh mock store for each test
    mockStore = createMockStore();

    // Reset StreamService singleton
    StreamService.resetInstance();

    // Create service with injected dependencies
    StreamService.getInstance('http://localhost:3790/api/events/stream', {
      EventSourceClass: class extends MockEventSource {
        constructor(url: string) {
          super(url);
          mockEventSourceInstance = this;
        }
      },
      getStore: () => mockStore,
    });
  });

  afterEach(() => {
    // Clean up
    StreamService.getInstance().disconnect();
    StreamService.resetInstance();
  });

  describe('Scenario: StreamService singleton updates server status in Zustand', () => {
    it('MUST be a singleton (getInstance returns same instance)', () => {
      const instance1 = StreamService.getInstance();
      const instance2 = StreamService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('MUST establish ONE SSE connection to /api/events/stream', () => {
      const service = StreamService.getInstance();

      service.connect();

      // Verify EventSource was created with correct URL
      expect(mockEventSourceInstance).toBeDefined();
      expect(mockEventSourceInstance.url).toBe('http://localhost:3790/api/events/stream');
    });

    it('MUST call store.setStreamingStatus(true) when SSE connection succeeds', () => {
      const service = StreamService.getInstance();

      // Initial state
      expect(mockStore.isStreaming).toBe(false);
      expect(mockStore.serverStatus).toBe('unknown');

      // Connect
      service.connect();

      // Simulate successful connection
      mockEventSourceInstance.simulateOpen();

      // Verify store was updated
      expect(mockStore.isStreaming).toBe(true);
      expect(mockStore.serverStatus).toBe('running');
    });

    it('MUST call store.setStreamingStatus(false) when SSE connection fails', () => {
      const service = StreamService.getInstance();

      // Connect first
      service.connect();
      mockEventSourceInstance.simulateOpen();

      // Verify connected
      expect(mockStore.isStreaming).toBe(true);

      // Simulate error
      mockEventSourceInstance.simulateError();

      // Verify store was updated
      expect(mockStore.isStreaming).toBe(false);
    });

    it('MUST call store.setLastEventTimestamp() when receiving event_added notification', () => {
      const service = StreamService.getInstance();

      service.connect();
      mockEventSourceInstance.simulateOpen();

      const testTimestamp = '2025-10-01T10:00:00.000Z';

      // Simulate event_added notification
      mockEventSourceInstance.simulateMessage({
        type: 'event_added',
        eventType: 'PreToolUse',
        sessionId: 'test-session',
        timestamp: testTimestamp,
      });

      // Verify lastEventTimestamp was set
      expect(mockStore.lastEventTimestamp).toBe(testTimestamp);
    });

    it('MUST trigger store.fetchLatestEvents() when lastEventTimestamp changes', () => {
      // Spy on fetchLatestEvents
      const fetchSpy = vi.spyOn(mockStore, 'fetchLatestEvents');

      const service = StreamService.getInstance();

      service.connect();
      mockEventSourceInstance.simulateOpen();

      // Simulate event_added notification
      mockEventSourceInstance.simulateMessage({
        type: 'event_added',
        eventType: 'PreToolUse',
        sessionId: 'test-session',
        timestamp: '2025-10-01T10:00:00.000Z',
      });

      // Verify fetchLatestEvents was called
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('MUST NOT create multiple instances when getInstance() called multiple times', () => {
      const instance1 = StreamService.getInstance();
      const instance2 = StreamService.getInstance();
      const instance3 = StreamService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });

    it('MUST handle connection lifecycle correctly', () => {
      const service = StreamService.getInstance();

      // Not connected initially
      expect(mockStore.isStreaming).toBe(false);

      // Connect
      service.connect();
      mockEventSourceInstance.simulateOpen();

      // Now connected
      expect(mockStore.isStreaming).toBe(true);

      // Disconnect
      service.disconnect();

      // No longer connected
      expect(mockStore.isStreaming).toBe(false);
    });

    it('MUST not create duplicate connections when connect() called multiple times', () => {
      const service = StreamService.getInstance();

      // First connect
      service.connect();
      mockEventSourceInstance.simulateOpen();

      const firstInstance = mockEventSourceInstance;

      // Try to connect again (should be ignored)
      service.connect();

      // Should still be the same instance
      expect(mockEventSourceInstance).toBe(firstInstance);
    });
  });

  describe('Scenario: StreamService handles heartbeat messages', () => {
    it('MUST ignore heartbeat messages without errors', () => {
      const service = StreamService.getInstance();

      service.connect();
      mockEventSourceInstance.simulateOpen();

      // Simulate heartbeat
      mockEventSourceInstance.simulateMessage({
        type: 'heartbeat',
      });

      // Should not cause any issues
      expect(mockStore.isStreaming).toBe(true);
    });
  });

  describe('Scenario: StreamService handles debug log notifications', () => {
    it('MUST call store.setLastDebugLogTimestamp() when receiving debug_log_added', () => {
      const service = StreamService.getInstance();

      service.connect();
      mockEventSourceInstance.simulateOpen();

      const testTimestamp = '2025-10-01T10:00:00.000Z';

      // Simulate debug_log_added notification
      mockEventSourceInstance.simulateMessage({
        type: 'debug_log_added',
        level: 'INFO',
        component: 'TestComponent',
        timestamp: testTimestamp,
      });

      // Verify lastDebugLogTimestamp was set
      expect(mockStore.lastDebugLogTimestamp).toBe(testTimestamp);
    });
  });
});
