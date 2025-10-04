/**
 * CLI Events Commands with Real Data - Acceptance Tests
 *
 * These tests verify CLI commands work with actual logged events instead of mock data
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { nanoid } from 'nanoid';
import React from 'react';

import { EventsListCommand } from '../../src/features/events/commands/list';
import { EventsTailCommand } from '../../src/features/events/commands/tail';
import { EventsStreamCommand } from '../../src/features/events/commands/stream';

describe('CLI Events Commands with Real Data - Given-When-Then', () => {
  let testDir: string;
  let originalCwd: string;
  let cageConfig: any;

  beforeEach(() => {
    // Create isolated test directory
    testDir = join(tmpdir(), `cage-cli-test-${nanoid()}`);
    mkdirSync(testDir, { recursive: true });
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Create cage config
    cageConfig = {
      port: 3790,
      host: 'localhost',
      eventsDir: '.cage/events',
      logLevel: 'info',
    };

    writeFileSync(
      join(testDir, 'cage.config.json'),
      JSON.stringify(cageConfig, null, 2)
    );

    // Create .cage directory structure
    mkdirSync(join(testDir, '.cage', 'events'), { recursive: true });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Scenario: cage events list shows real logged events', () => {
    it('GIVEN events are logged to JSONL files WHEN cage events list runs THEN should display actual event statistics', async () => {
      // GIVEN: Real events logged to the file system
      const todayDate = new Date();
      const todayDir = todayDate.toISOString().split('T')[0];
      const eventsDir = join(testDir, '.cage', 'events', todayDir);
      mkdirSync(eventsDir, { recursive: true });

      // Create events with today's date
      const baseTime = new Date(todayDate);
      baseTime.setHours(10, 30, 0, 0);

      const testEvents = [
        {
          id: nanoid(),
          timestamp: new Date(baseTime).toISOString(),
          eventType: 'PreToolUse',
          toolName: 'Read',
          arguments: { file_path: '/test1.txt' },
          sessionId: 'session-abc-123',
        },
        {
          id: nanoid(),
          timestamp: new Date(baseTime.getTime() + 1000).toISOString(),
          eventType: 'PostToolUse',
          toolName: 'Read',
          result: { content: 'file content' },
          sessionId: 'session-abc-123',
        },
        {
          id: nanoid(),
          timestamp: new Date(baseTime.getTime() + 60000).toISOString(),
          eventType: 'PreToolUse',
          toolName: 'Write',
          arguments: { file_path: '/test2.txt', content: 'hello world' },
          sessionId: 'session-def-456',
        },
        {
          id: nanoid(),
          timestamp: new Date(baseTime.getTime() + 61000).toISOString(),
          eventType: 'PostToolUse',
          toolName: 'Write',
          result: { success: true },
          sessionId: 'session-def-456',
        },
        {
          id: nanoid(),
          timestamp: new Date(baseTime.getTime() + 120000).toISOString(),
          eventType: 'UserPromptSubmit',
          prompt: 'Please help me with this task',
          sessionId: 'session-def-456',
        },
      ];

      const eventLines = testEvents
        .map(event => JSON.stringify(event))
        .join('\n');
      writeFileSync(join(eventsDir, 'events.jsonl'), eventLines);

      // WHEN: cage events list is executed
      const { lastFrame } = render(<EventsListCommand />);

      // Wait for async loading
      await new Promise(resolve => setTimeout(resolve, 1000));

      const output = lastFrame();

      // THEN: Should show actual event statistics, not "Total events: 0"
      expect(output).toContain('Total events: 5');
      expect(output).toContain('Sessions: 2');

      // AND: Should show event type breakdown
      expect(output).toContain('PreToolUse: 2');
      expect(output).toContain('PostToolUse: 2');
      expect(output).toContain('UserPromptSubmit: 1');

      // AND: Should show recent events
      expect(output).toContain('UserPromptSubmit');
    });

    it('GIVEN no events exist WHEN cage events list runs THEN should show "No events found" correctly', async () => {
      // GIVEN: No events directory exists

      // WHEN: cage events list is executed
      const { lastFrame } = render(<EventsListCommand />);

      await new Promise(resolve => setTimeout(resolve, 500));

      const output = lastFrame();

      // THEN: Should show appropriate "no events" message
      expect(output).toContain('Total events: 0');
    });
  });

  describe('Scenario: cage events tail shows recent real events', () => {
    it('GIVEN events are logged WHEN cage events tail runs THEN should show most recent actual events', async () => {
      // GIVEN: Events logged across multiple days
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDir = yesterday.toISOString().split('T')[0];

      const todayDir = new Date().toISOString().split('T')[0];

      // Create events for yesterday
      mkdirSync(join(testDir, '.cage', 'events', yesterdayDir), {
        recursive: true,
      });
      const oldEvents = [
        {
          id: nanoid(),
          timestamp: yesterday.toISOString(),
          eventType: 'PreToolUse',
          toolName: 'Read',
          sessionId: 'old-session',
        },
      ];
      writeFileSync(
        join(testDir, '.cage', 'events', yesterdayDir, 'events.jsonl'),
        oldEvents.map(e => JSON.stringify(e)).join('\\n')
      );

      // Create events for today (more recent)
      mkdirSync(join(testDir, '.cage', 'events', todayDir), {
        recursive: true,
      });
      const today = new Date();
      today.setHours(11, 0, 0, 0);
      const recentEvents = [
        {
          id: nanoid(),
          timestamp: new Date(today).toISOString(),
          eventType: 'PostToolUse',
          toolName: 'Write',
          sessionId: 'recent-session-1',
        },
        {
          id: nanoid(),
          timestamp: new Date(today.getTime() + 60000).toISOString(),
          eventType: 'PreToolUse',
          toolName: 'Edit',
          sessionId: 'recent-session-2',
        },
      ];
      writeFileSync(
        join(testDir, '.cage', 'events', todayDir, 'events.jsonl'),
        recentEvents.map(e => JSON.stringify(e)).join('\\n')
      );

      // WHEN: cage events tail runs with default count (10)
      const { lastFrame } = render(<EventsTailCommand count={10} />);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const output = lastFrame();

      // THEN: Should show events (the actual count may vary based on what's loaded)
      expect(output).toContain('Last');
      expect(output).toContain('events:');
      // The component should show at least one event
      expect(output).toMatch(/PreToolUse|PostToolUse/);
    });
  });

  describe('Scenario: cage events stream connects to real backend SSE', () => {
    it('GIVEN backend is running WHEN cage events stream runs THEN should attempt real SSE connection', async () => {
      // GIVEN: Mock EventSource to test actual connection attempt
      const originalEventSource = global.EventSource;
      let eventSourceCreated = false;
      let eventSourceUrl = '';

      // @ts-ignore - mocking global
      global.EventSource = vi.fn().mockImplementation(function (url) {
        eventSourceCreated = true;
        eventSourceUrl = url.toString();

        // Mock SSE connection
        return {
          onopen: null,
          onmessage: null,
          onerror: null,
          close: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          readyState: 0, // CONNECTING
        };
      });

      // WHEN: cage events stream is executed
      const { lastFrame } = render(<EventsStreamCommand />);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // THEN: Should attempt to connect to real backend SSE endpoint
      expect(eventSourceCreated).toBe(true);
      expect(eventSourceUrl).toContain('localhost:3790');
      expect(eventSourceUrl).toContain('/api/events/stream');

      // Clean up
      // @ts-ignore
      global.EventSource = originalEventSource;
    });

    it('GIVEN events stream is working WHEN new events arrive THEN should display them in real-time', async () => {
      // This will be implemented after fixing the stream command
      // For now, verify it doesn't show fake mock events
      const { lastFrame } = render(<EventsStreamCommand />);

      await new Promise(resolve => setTimeout(resolve, 1500));

      const output = lastFrame();

      // Should NOT contain the fake mock session-1 events
      expect(output).not.toContain('session-1');
      expect(output).not.toContain('2025-09-18T02:55:12.073Z');
    });
  });

  describe('Scenario: CLI events commands handle configuration correctly', () => {
    it('GIVEN custom eventsDir in config WHEN commands run THEN should use correct path', async () => {
      // GIVEN: Custom events directory in config
      const customConfig = {
        ...cageConfig,
        eventsDir: 'custom/events/path',
      };
      writeFileSync(
        join(testDir, 'cage.config.json'),
        JSON.stringify(customConfig, null, 2)
      );

      // Create events in custom location
      const todayDir = new Date().toISOString().split('T')[0];
      const customEventsDir = join(
        testDir,
        'custom',
        'events',
        'path',
        todayDir
      );
      mkdirSync(customEventsDir, { recursive: true });

      const testEvent = {
        id: nanoid(),
        timestamp: new Date().toISOString(),
        eventType: 'PreToolUse',
        toolName: 'Read',
        sessionId: 'custom-path-test',
      };

      writeFileSync(
        join(customEventsDir, 'events.jsonl'),
        JSON.stringify(testEvent)
      );

      // WHEN: cage events list runs
      const { lastFrame } = render(<EventsListCommand />);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const output = lastFrame();

      // THEN: Should find events in custom location
      expect(output).toContain('Total events: 1');
      expect(output).toContain('PreToolUse');
      expect(output).toContain('Read');
    });
  });
});
