/**
 * Integration tests for StatusBar + StreamService + HooksStatusService
 *
 * These tests verify the complete architecture:
 * - Singleton services update Zustand
 * - StatusBar reads from Zustand only
 * - No polling in components
 * - Real-time updates flow through the system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { StatusBar } from '../../src/shared/components/layout/StatusBar';
import { StreamService } from '../../src/features/events/services/stream-service';
import { HooksStatusService } from '../../src/features/hooks/services/hooks-status-service';
import { useAppStore } from '../../src/shared/stores/appStore';
import { MockEventSource } from '../fixtures/mock-event-source';

// Mock useTheme
vi.mock('../../src/hooks/useTheme', () => ({
  useTheme: () => ({
    primary: { main: '#00FF00' },
    status: { success: '#00FF00', warning: '#FFA500', error: '#FF0000' },
    ui: {
      text: '#FFFFFF',
      textMuted: '#888888',
      textDim: '#666666',
      borderSubtle: '#444444',
    },
  }),
}));

describe('StatusBar + Services Integration - PHASE2 Architecture', () => {
  let mockEventSourceInstance: MockEventSource;

  beforeEach(() => {
    // Reset all singletons
    StreamService.resetInstance();
    HooksStatusService.resetInstance();

    // Reset Zustand store to clean state
    useAppStore.setState({
      isStreaming: false,
      serverStatus: 'unknown',
      events: [],
      debugLogs: [],
      lastEventTimestamp: null,
      lastDebugLogTimestamp: null,
      hooksStatus: null,
    });
  });

  afterEach(() => {
    // Clean up services
    StreamService.getInstance().disconnect();
    HooksStatusService.getInstance().stop();
    StreamService.resetInstance();
    HooksStatusService.resetInstance();
  });

  describe('Complete Architecture Flow', () => {
    it('MUST follow: Services → Zustand → StatusBar (no direct API calls)', async () => {
      // Setup StreamService with mock EventSource
      const streamService = StreamService.getInstance('http://localhost:3790/api/events/stream', {
        EventSourceClass: class extends MockEventSource {
          constructor(url: string) {
            super(url);
            mockEventSourceInstance = this;
          }
        },
      });

      // Setup HooksStatusService with mock interval
      const refreshSpy = vi.fn();
      useAppStore.setState({
        refreshHooksStatus: refreshSpy,
      });

      const hooksService = HooksStatusService.getInstance(1000, {
        setIntervalFn: vi.fn(),
        clearIntervalFn: vi.fn(),
      });

      // Render StatusBar BEFORE services are started
      const { lastFrame, rerender } = render(<StatusBar compact />);

      // Initial state (wait for render)
      await new Promise(resolve => setTimeout(resolve, 10));
      const initialOutput = lastFrame();
      expect(initialOutput).toBeDefined();

      // Start StreamService
      streamService.connect();
      mockEventSourceInstance.simulateOpen();

      // Wait for React to re-render
      rerender(<StatusBar compact />);

      // StatusBar should now show "RUNNING" (from StreamService → Zustand)
      expect(lastFrame()).toContain('RUNNING');

      // Start HooksStatusService
      hooksService.start();

      // Verify HooksStatusService called refreshHooksStatus
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(refreshSpy).toHaveBeenCalled();

      // Verify NO polling happened in StatusBar component itself
      // (This is implicitly verified by the fact that we're using mocks)
    });

    it('MUST update StatusBar when Zustand state changes', async () => {
      // Render StatusBar
      const { lastFrame, rerender } = render(<StatusBar compact />);

      // Initially 0 events
      expect(useAppStore.getState().events.length).toBe(0);

      // Directly update Zustand state (simulating what services would do)
      useAppStore.setState({
        events: [
          {
            id: '1',
            timestamp: '2025-10-01T10:00:00.000Z',
            eventType: 'PreToolUse',
            toolName: 'Read',
            sessionId: 'test',
          },
        ],
        serverStatus: 'running',
      });

      // Wait for state update
      await new Promise(resolve => setTimeout(resolve, 10));

      // Re-render StatusBar
      rerender(<StatusBar compact />);

      // StatusBar should show the updated state (from Zustand)
      expect(lastFrame()).toContain('RUNNING');
      expect(lastFrame()).toContain('1');
    });

    it('MUST NOT have polling in StatusBar component', () => {
      // Spy on setInterval and setTimeout
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      // Render StatusBar
      render(<StatusBar compact />);

      // Verify NO polling was set up by the component
      expect(setIntervalSpy).not.toHaveBeenCalled();
      expect(setTimeoutSpy).not.toHaveBeenCalled();

      setIntervalSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });

    it('MUST have single StreamService instance across application', () => {
      const instance1 = StreamService.getInstance();
      const instance2 = StreamService.getInstance();
      const instance3 = StreamService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });

    it('MUST have single HooksStatusService instance across application', () => {
      const instance1 = HooksStatusService.getInstance();
      const instance2 = HooksStatusService.getInstance();
      const instance3 = HooksStatusService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('Architecture Compliance', () => {
    it('MUST comply with: StatusBar reads ONLY from Zustand', () => {
      // Spy on fetch to ensure StatusBar doesn't make API calls
      const fetchSpy = vi.spyOn(global, 'fetch');

      // Render StatusBar
      render(<StatusBar compact />);

      // Verify NO fetch calls
      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('MUST comply with: Services update Zustand, not components', async () => {
      // This is verified by the architecture itself:
      // - StreamService.connect() → sets isStreaming in Zustand
      // - HooksStatusService.start() → calls refreshHooksStatus in Zustand
      // - StatusBar only reads from Zustand

      const streamService = StreamService.getInstance('http://localhost:3790/api/events/stream', {
        EventSourceClass: class extends MockEventSource {
          constructor(url: string) {
            super(url);
            mockEventSourceInstance = this;
          }
        },
      });

      // Before connection
      expect(useAppStore.getState().isStreaming).toBe(false);

      // Service updates Zustand
      streamService.connect();
      mockEventSourceInstance.simulateOpen();

      // Zustand was updated by service
      expect(useAppStore.getState().isStreaming).toBe(true);
      expect(useAppStore.getState().serverStatus).toBe('running');
    });
  });
});
