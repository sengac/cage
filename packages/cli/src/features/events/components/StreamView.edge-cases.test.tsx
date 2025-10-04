import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamView } from './StreamView';
import { useAppStore } from '../../../shared/stores/appStore';
import type { Event } from '../../../shared/stores/appStore';
import { InputModeProvider } from '../../../shared/contexts/InputContext';

// Mock the store
vi.mock('../../../shared/stores/appStore');

// Mock date-fns format
vi.mock('date-fns', () => ({
  format: vi.fn(() => '10:30:45.123'),
}));

describe('StreamView Edge Cases', () => {
  let onBack: ReturnType<typeof vi.fn>;
  let selectEvent: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  const renderComponent = (events: Event[]) => {
    (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(selector => {
      const state = {
        events,
        isStreaming: true,
        eventFilters: {},
        selectEvent,
        navigate,
      };
      return selector ? selector(state) : state;
    });

    return render(
      <InputModeProvider>
        <StreamView onBack={onBack} onNavigate={navigate} />
      </InputModeProvider>
    );
  };

  beforeEach(() => {
    onBack = vi.fn();
    selectEvent = vi.fn();
    navigate = vi.fn();
  });

  describe('Edge case: Events with missing or invalid fields', () => {
    it('should handle events with undefined timestamp', () => {
      const events: Event[] = [
        {
          id: 'test-1',
          timestamp: undefined as any, // Invalid timestamp
          eventType: 'TestEvent',
          sessionId: 'session-1',
        },
      ];

      const { lastFrame } = renderComponent(events);
      expect(lastFrame()).toContain('Invalid'); // Should show Invalid for time
      expect(lastFrame()).not.toContain('NaN');
    });

    it('should handle events with null values', () => {
      const events: Event[] = [
        {
          id: 'test-2',
          timestamp: new Date().toISOString(),
          eventType: null as any,
          sessionId: 'session-1',
          toolName: null as any,
        },
      ];

      const { lastFrame } = renderComponent(events);
      expect(lastFrame()).toBeDefined();
      expect(() => lastFrame()).not.toThrow();
    });

    it('should handle events with undefined description fields', () => {
      const events: Event[] = [
        {
          id: 'test-3',
          timestamp: new Date().toISOString(),
          eventType: 'ToolUse',
          sessionId: 'session-1',
          toolName: 'Edit',
          arguments: {
            // Missing file_path, command, pattern
          },
        },
      ];

      const { lastFrame } = renderComponent(events);
      expect(lastFrame()).toBeDefined();
      expect(() => lastFrame()).not.toThrow();
    });

    it('should handle events with empty strings', () => {
      const events: Event[] = [
        {
          id: '',
          timestamp: '',
          eventType: '',
          sessionId: '',
          toolName: '',
        },
      ];

      const { lastFrame } = renderComponent(events);
      expect(lastFrame()).toBeDefined();
      expect(() => lastFrame()).not.toThrow();
    });

    it('should handle mixed valid and invalid events', () => {
      const events: Event[] = [
        {
          id: 'valid-1',
          timestamp: new Date().toISOString(),
          eventType: 'PreToolUse',
          sessionId: 'session-1',
          toolName: 'Read',
          arguments: { file_path: '/test.txt' },
        },
        {
          id: 'invalid-1',
          timestamp: 'invalid-date',
          eventType: undefined as any,
          sessionId: null as any,
        },
        {
          id: 'valid-2',
          timestamp: new Date().toISOString(),
          eventType: 'PostToolUse',
          sessionId: 'session-1',
          toolName: 'Write',
          result: { success: true },
        },
      ];

      const { lastFrame } = renderComponent(events);
      expect(lastFrame()).toBeDefined();
      expect(() => lastFrame()).not.toThrow();
      // Virtual list might not show all events, just verify it renders
      expect(lastFrame()).toContain('Time');
      expect(lastFrame()).toContain('Type');
    });

    it('should handle events from SSE without IDs', () => {
      const events: Event[] = [
        {
          id: undefined as any, // Missing ID
          timestamp: new Date().toISOString(),
          eventType: 'UserMessage',
          sessionId: 'session-1',
          arguments: { prompt: 'Test message' },
        },
      ];

      const { lastFrame } = renderComponent(events);
      expect(lastFrame()).toBeDefined();
      expect(() => lastFrame()).not.toThrow();
    });

    it('should handle events with very long descriptions', () => {
      const longString = 'a'.repeat(1000);
      const events: Event[] = [
        {
          id: 'long-1',
          timestamp: new Date().toISOString(),
          eventType: 'ToolUse',
          sessionId: 'session-1',
          toolName: 'Edit',
          arguments: {
            file_path: longString,
          },
        },
      ];

      const { lastFrame } = renderComponent(events);
      const frame = lastFrame();
      expect(frame).toBeDefined();
      expect(() => lastFrame()).not.toThrow();
      // Should be truncated to 60 chars
      expect(frame).not.toContain('a'.repeat(100));
    });

    it('should handle events with special characters', () => {
      const events: Event[] = [
        {
          id: 'special-1',
          timestamp: new Date().toISOString(),
          eventType: 'ToolUse',
          sessionId: 'session-1',
          toolName: 'Bash',
          arguments: {
            command: 'echo "Hello\nWorld\t\\special$chars"',
          },
        },
      ];

      const { lastFrame } = renderComponent(events);
      expect(lastFrame()).toBeDefined();
      expect(() => lastFrame()).not.toThrow();
    });
  });

  describe('Empty state handling', () => {
    it('should handle empty event buffer gracefully', () => {
      const events: Event[] = [];

      const { lastFrame } = renderComponent(events);
      expect(lastFrame()).toContain('No events in stream');
      expect(() => lastFrame()).not.toThrow();
    });
  });

  describe('SSE connection type events', () => {
    it('should handle SSE heartbeat events', () => {
      const events: Event[] = [
        {
          id: 'heartbeat-1',
          timestamp: new Date().toISOString(),
          eventType: 'heartbeat',
          sessionId: 'sse-connection',
        },
      ];

      const { lastFrame } = renderComponent(events);
      expect(lastFrame()).toBeDefined();
      expect(() => lastFrame()).not.toThrow();
    });

    it('should handle SSE connection events', () => {
      const events: Event[] = [
        {
          id: 'conn-1',
          timestamp: new Date().toISOString(),
          eventType: 'connected',
          sessionId: 'sse-connection',
        },
      ];

      const { lastFrame } = renderComponent(events);
      expect(lastFrame()).toBeDefined();
      expect(() => lastFrame()).not.toThrow();
    });
  });
});
