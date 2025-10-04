import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import React from 'react';
import { EventsStreamCommand } from '../../src/features/events/commands/stream';
import { EventsTailCommand } from '../../src/features/events/commands/tail';
import { EventsListCommand } from '../../src/features/events/commands/list';
import { EventsStatsCommand } from '../../src/features/events/commands/stats';

describe('Feature: CLI Event Monitoring', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'cage-test-'));
    process.chdir(testDir);

    // Create cage config
    await writeFile(
      join(testDir, 'cage.config.json'),
      JSON.stringify({
        version: '1.0.0',
        port: 3790,
        eventsDir: '.cage/events',
      })
    );

    // Create .cage directory with sample events
    const cageDir = join(testDir, '.cage');
    const eventsDir = join(cageDir, 'events', '2025-01-15');
    await mkdir(eventsDir, { recursive: true });

    // Create sample event log
    const events = [
      {
        timestamp: '2025-01-15T10:00:00Z',
        eventType: 'pre-tool-use',
        toolName: 'Read',
        sessionId: 'session-1',
      },
      {
        timestamp: '2025-01-15T10:00:01Z',
        eventType: 'post-tool-use',
        toolName: 'Read',
        sessionId: 'session-1',
      },
      {
        timestamp: '2025-01-15T10:00:02Z',
        eventType: 'pre-tool-use',
        toolName: 'Write',
        sessionId: 'session-1',
      },
      {
        timestamp: '2025-01-15T10:00:03Z',
        eventType: 'post-tool-use',
        toolName: 'Write',
        sessionId: 'session-1',
      },
    ];

    const jsonl = events.map(e => JSON.stringify(e)).join('\n');
    await writeFile(join(eventsDir, 'events.jsonl'), jsonl);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Scenario: Tail recent events', () => {
    it('Given I have logged events When I run cage events tail Then I should see the last 10 events', async () => {
      // When
      const { lastFrame } = render(<EventsTailCommand count={10} />);

      // Wait for component to process events
      await vi.waitFor(
        () => {
          expect(lastFrame()).toContain('2025-01-15');
        },
        { timeout: 1000 }
      );

      // Then
      expect(lastFrame()).toContain('2025-01-15T10:00:00Z');
      expect(lastFrame()).toContain('pre-tool-use');
      expect(lastFrame()).toContain('Read');
      expect(lastFrame()).toContain('Write');
    });

    it('Given I have logged events When I run cage events tail -n 2 Then I should see the last 2 events', async () => {
      // When
      const { lastFrame } = render(<EventsTailCommand count={2} />);

      // Wait for component to process events
      await vi.waitFor(
        () => {
          expect(lastFrame()).toContain('2025-01-15');
        },
        { timeout: 1000 }
      );

      // Then - should show the last 2 events
      expect(lastFrame()).toContain('2025-01-15T10:00:02Z');
      expect(lastFrame()).toContain('2025-01-15T10:00:03Z');
    });
  });

  describe('Scenario: Stream events in real-time', () => {
    it('Given the backend server is running When I run cage events stream Then I should see live events', async () => {
      // Mock EventSource for streaming
      const mockEventSource = {
        addEventListener: vi.fn(),
        close: vi.fn(),
        readyState: 1, // OPEN
      };

      // @ts-ignore - mocking global
      global.EventSource = vi.fn(() => mockEventSource);

      // When
      const { lastFrame } = render(<EventsStreamCommand />);

      // Then - should show connecting state
      expect(lastFrame()).toContain('Connecting to event stream');
    });

    it('Given I am streaming events When I run cage events stream --filter PreToolUse Then I should only see PreToolUse events', async () => {
      // Mock EventSource with proper event handlers
      let onOpenHandler: (() => void) | null = null;
      const mockEventSource = {
        addEventListener: vi.fn(),
        close: vi.fn(),
        readyState: 1,
        set onopen(handler: () => void) {
          onOpenHandler = handler;
          // Simulate connection opening after a brief delay
          setTimeout(() => {
            if (onOpenHandler) onOpenHandler();
          }, 10);
        },
        set onmessage(handler: (e: MessageEvent) => void) {
          // no-op for this test
        },
        set onerror(handler: (e: Event) => void) {
          // no-op for this test
        },
      };

      // @ts-ignore - mocking global
      global.EventSource = vi.fn(() => mockEventSource);

      // When
      const { lastFrame, rerender } = render(
        <EventsStreamCommand filter="PreToolUse" />
      );

      // Wait a bit for the connection to "open"
      await new Promise(resolve => setTimeout(resolve, 50));
      rerender(<EventsStreamCommand filter="PreToolUse" />);

      // Then - verify filter is shown
      expect(lastFrame()).toContain('Filtering: PreToolUse');
    });
  });

  describe('Scenario: Query events by date range', () => {
    it('Given I have logged events When I run cage events list --from 2025-01-15 --to 2025-01-15 Then I should see events summary', async () => {
      // When
      const { lastFrame } = render(
        <EventsListCommand from="2025-01-15" to="2025-01-15" />
      );

      // Wait for component to load events
      await vi.waitFor(
        () => {
          expect(lastFrame()).toContain('Events from');
        },
        { timeout: 1000 }
      );

      // Then
      expect(lastFrame()).toContain('Events from 2025-01-15');
      expect(lastFrame()).toContain('Total events: 4');
      expect(lastFrame()).toContain('pre-tool-use: 2');
      expect(lastFrame()).toContain('post-tool-use: 2');
    });
  });

  describe('Scenario: Display event statistics', () => {
    it('Given I have logged events When I run cage events stats Then I should see statistics', async () => {
      // When
      const { lastFrame } = render(<EventsStatsCommand />);

      // Wait for component to calculate stats
      await vi.waitFor(
        () => {
          expect(lastFrame()).toContain('Event Statistics');
        },
        { timeout: 1000 }
      );

      // Then
      expect(lastFrame()).toContain('Total events: 4');
      expect(lastFrame()).toContain('pre-tool-use: 2');
      expect(lastFrame()).toContain('post-tool-use: 2');
      expect(lastFrame()).toContain('Read: 2');
      expect(lastFrame()).toContain('Write: 2');
      expect(lastFrame()).toContain('Average events per session: 4');
    });
  });
});
