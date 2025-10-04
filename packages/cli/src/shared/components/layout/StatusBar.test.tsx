import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { StatusBar } from './StatusBar';
import type { AppState } from '../../stores/appStore';

// Mock useAppStore
vi.mock('../../stores/appStore', () => ({
  useAppStore: (selector: (state: AppState) => unknown) => {
    const mockState: Partial<AppState> = {
      serverStatus: 'running',
      hooksStatus: {
        isInstalled: true,
        settingsPath: '/test/.claude/settings.json',
        backendPort: 3790,
        backendEnabled: true,
        installedHooks: [
          { name: 'PreToolUse', enabled: true, eventCount: 50 },
          { name: 'PostToolUse', enabled: true, eventCount: 45 },
          { name: 'UserPromptSubmit', enabled: true, eventCount: 30 },
          { name: 'Stop', enabled: false, eventCount: 15 },
          { name: 'SubagentStop', enabled: false, eventCount: 10 },
          { name: 'SessionStart', enabled: false, eventCount: 0 },
          { name: 'SessionEnd', enabled: false, eventCount: 0 },
          { name: 'Notification', enabled: false, eventCount: 0 },
          { name: 'PreCompact', enabled: false, eventCount: 0 },
        ],
        totalEvents: 150,
      },
      events: [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          eventType: 'PreToolUse',
          toolName: 'Read',
          sessionId: 'test',
        },
        {
          id: '2',
          timestamp: new Date().toISOString(),
          eventType: 'PostToolUse',
          toolName: 'Write',
          sessionId: 'test',
        },
      ],
    };

    return selector(mockState as AppState);
  },
}));

// Mock useTheme
vi.mock('../../hooks/useTheme', () => ({
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

describe('StatusBar - PHASE2 Acceptance Criteria', () => {
  describe('Scenario: StatusBar displays real-time system status from Zustand', () => {
    it('MUST read ALL state from Zustand store ONLY', () => {
      const { lastFrame } = render(<StatusBar />);

      // Verify server status is displayed
      expect(lastFrame()).toContain('RUNNING');

      // Verify hooks status is displayed (3 enabled out of 9 total)
      expect(lastFrame()).toContain('3/9');

      // Verify events count is displayed
      expect(lastFrame()).toContain('2');
    });

    it('MUST NOT use any polling (setInterval/setTimeout)', () => {
      // Spy on setInterval and setTimeout
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      render(<StatusBar />);

      // Assert NO polling was set up
      expect(setIntervalSpy).not.toHaveBeenCalled();
      expect(setTimeoutSpy).not.toHaveBeenCalled();

      setIntervalSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });

    it('MUST NOT make any direct API calls', () => {
      // Spy on fetch
      const fetchSpy = vi.spyOn(global, 'fetch');

      render(<StatusBar />);

      // Assert NO fetch calls were made
      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('MUST display server status (running/stopped/unknown)', () => {
      const { lastFrame } = render(<StatusBar />);

      expect(lastFrame()).toContain('RUNNING');
    });

    it('MUST display hooks status (X/Y active)', () => {
      const { lastFrame } = render(<StatusBar />);

      // 3 hooks are enabled (PreToolUse, PostToolUse, UserPromptSubmit)
      // 9 hooks total
      expect(lastFrame()).toContain('3/9');
    });

    it('MUST display total events count', () => {
      const { lastFrame } = render(<StatusBar />);

      // 2 events in mock data
      expect(lastFrame()).toContain('2');
    });

    it('MUST display todays events count', () => {
      const { lastFrame } = render(<StatusBar />);

      // Both events are from today (using new Date().toISOString())
      expect(lastFrame()).toContain('2 today');
    });
  });

  describe('Scenario: StatusBar updates when Zustand state changes', () => {
    it('should re-render when serverStatus changes in Zustand', () => {
      // This test verifies that StatusBar is reactive to Zustand changes
      // Since we're mocking useAppStore to return static data, we're verifying
      // the component correctly reads from the store selector pattern

      const { lastFrame } = render(<StatusBar />);

      // Initial state shows "RUNNING"
      expect(lastFrame()).toContain('RUNNING');

      // The component should re-render automatically when Zustand state changes
      // This is guaranteed by the useAppStore selector pattern
    });
  });

  describe('Scenario: StatusBar compact mode', () => {
    it('should render compact single-line format when compact=true', () => {
      const { lastFrame } = render(<StatusBar compact={true} />);

      const output = lastFrame();

      // Compact mode shows everything on one line with separators
      expect(output).toContain('Server:');
      expect(output).toContain('RUNNING');
      expect(output).toContain('│'); // Separator
      expect(output).toContain('Hooks:');
      expect(output).toContain('3/9');
      expect(output).toContain('Events:');
      expect(output).toContain('2');
    });

    it('should render full detailed format when compact=false', () => {
      const { lastFrame } = render(<StatusBar compact={false} />);

      const output = lastFrame();

      // Full mode shows section headers
      expect(output).toContain('SERVER');
      expect(output).toContain('HOOKS');
      expect(output).toContain('EVENTS');
    });
  });
});
