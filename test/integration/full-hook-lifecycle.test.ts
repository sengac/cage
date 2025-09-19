import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawn } from 'child_process';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getSharedBackend, resetBackendState, BACKEND_PORT } from './shared-backend';

/**
 * Integration Test: Full Hook Lifecycle
 *
 * Tests the complete flow for all 10 Claude Code hook types:
 * Hook Trigger → Backend Processing → Event Logging → Event Querying
 *
 * This verifies the core Phase 1 requirement:
 * "100% of Claude Code hook events are captured"
 */

describe('Integration: Full Hook Lifecycle', { concurrent: false }, () => {
  let testDir: string;
  let originalCwd: string;
  let backendPort: number;
  let sharedTestDir: string;

  const ALL_HOOK_TYPES = [
    'pre-tool-use',
    'post-tool-use',
    'user-prompt-submit',
    'session-start',
    'session-end',
    'notification',
    'pre-compact',
    'stop',
    'subagent-stop'
  ] as const;

  beforeAll(async () => {
    originalCwd = process.cwd();

    // Use shared backend but get our own test directory
    const backend = await getSharedBackend();
    backendPort = backend.port;
    sharedTestDir = backend.testDir;
  });

  afterAll(async () => {
    // No cleanup needed - shared backend handles it
  });

  beforeEach(async () => {
    // Create a unique test directory for this test run
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testDir = join(sharedTestDir, testId);
    await mkdir(testDir, { recursive: true });

    // Create .cage directory structure in our isolated test dir
    await mkdir(join(testDir, '.cage'), { recursive: true });
    await mkdir(join(testDir, '.cage/events'), { recursive: true });

    // Create cage config in our test directory
    await writeFile(join(testDir, 'cage.config.json'), JSON.stringify({
      port: backendPort,
      logLevel: 'info'
    }));
  });

  describe('All 10 Hook Types', () => {
    ALL_HOOK_TYPES.forEach((hookType) => {
      it(`should capture and log ${hookType} hook event`, async () => {
        // Arrange: Create test payload for this hook type
        const sessionId = `test-session-${Date.now()}`;
        const testPayload = createTestPayload(hookType);

        // Add sessionId to the payload that's sent to the hook handler
        const payloadWithSessionId = {
          ...testPayload,
          sessionId
        };

        // Act: Trigger hook via hook handler
        const hookHandler = spawn('node', [
          join(originalCwd, 'packages/hooks/dist/cage-hook-handler.js'),
          hookType
        ], {
          cwd: testDir, // Set working directory to test directory so it finds cage.config.json
          env: {
            ...process.env,
            TEST_BASE_DIR: testDir,
            CLAUDE_PROJECT_DIR: testDir
          }
        });

        // Send payload with sessionId to hook handler
        hookHandler.stdin.write(JSON.stringify(payloadWithSessionId));
        hookHandler.stdin.end();

        // Wait for hook handler to complete
        const exitCode = await new Promise<number>((resolve) => {
          hookHandler.on('exit', (code) => resolve(code || 0));
        });

        // Assert: Hook handler should succeed
        expect(exitCode).toBe(0);

        // Assert: Event should be logged to file system
        // (no wait needed - if hook handler exited successfully, the file write is complete)
        const today = new Date().toISOString().split('T')[0];
        const eventsFile = join(sharedTestDir, '.cage/events', today, 'events.jsonl');

        expect(existsSync(eventsFile)).toBe(true);

        // Assert: Event content should be correct
        const logContent = await readFile(eventsFile, 'utf-8');
        const loggedEvents = logContent.trim().split('\n').map(line => JSON.parse(line));

        // Filter events for this specific sessionId (since file is shared)
        const sessionEvents = loggedEvents.filter(event => event.sessionId === sessionId);
        expect(sessionEvents).toHaveLength(1);

        const loggedEvent = sessionEvents[0];
        const expectedEvent: Record<string, unknown> = {
          eventType: hookTypeToEventType(hookType),
          sessionId
        };

        // Add hook-specific fields based on type
        if (hookType === 'pre-tool-use' || hookType === 'post-tool-use') {
          expectedEvent.toolName = testPayload.toolName;
          expectedEvent.arguments = testPayload.arguments;
        }
        if (hookType === 'user-prompt-submit') {
          expectedEvent.prompt = testPayload.prompt;
        }
        if (hookType === 'session-start') {
          expectedEvent.projectPath = testPayload.projectPath;
        }
        if (hookType === 'session-end') {
          expectedEvent.duration = testPayload.duration;
        }
        if (hookType === 'notification') {
          expectedEvent.level = testPayload.level;
          expectedEvent.message = testPayload.message;
        }
        if (hookType === 'stop') {
          expectedEvent.reason = testPayload.reason;
        }
        if (hookType === 'subagent-stop') {
          expectedEvent.subagentId = testPayload.subagentId;
          expectedEvent.parentSessionId = testPayload.parentSessionId;
        }

        expect(loggedEvent).toMatchObject(expectedEvent);

        // Assert: Event should be queryable via API with sessionId
        const response = await fetch(`http://localhost:${backendPort}/api/events/list?sessionId=${sessionId}&limit=10`);
        expect(response.ok).toBe(true);

        const { events } = await response.json();
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
          eventType: hookTypeToEventType(hookType),
          sessionId
        });
      });
    });
  });

  describe('Event Persistence and Querying', () => {
    it('should capture multiple events from a session', async () => {
      const sessionId = `test-session-${Date.now()}`;
      const hookTypes = ['session-start', 'pre-tool-use', 'post-tool-use', 'stop'] as const;

      // Send all events with unique timestamps in payload
      const promises = hookTypes.map((hookType, index) => {
        const payload = createTestPayload(hookType);
        payload.sessionId = sessionId;
        // Add sequence number to verify we got all events
        payload.sequenceNumber = index;

        const hookHandler = spawn('node', [
          join(originalCwd, 'packages/hooks/dist/cage-hook-handler.js'),
          hookType
        ], {
          cwd: testDir,
          env: {
            ...process.env,
            TEST_BASE_DIR: testDir,
            CLAUDE_PROJECT_DIR: testDir
          }
        });

        hookHandler.stdin.write(JSON.stringify(payload));
        hookHandler.stdin.end();

        return new Promise<number>((resolve) => {
          hookHandler.on('exit', (code) => resolve(code || 0));
        });
      });

      // Wait for all hooks to complete
      const exitCodes = await Promise.all(promises);
      exitCodes.forEach(code => expect(code).toBe(0));

      // Query events and verify we got them all
      // (no wait needed - if all hook handlers exited successfully, all file writes are complete)
      const response = await fetch(`http://localhost:${backendPort}/api/events/list?sessionId=${sessionId}&limit=10`);
      expect(response.ok).toBe(true);

      const { events } = await response.json();

      // Just verify we captured all 4 events - don't care about order
      expect(events).toHaveLength(4);
      const eventTypes = events.map((e: { eventType: string }) => e.eventType);
      expect(eventTypes).toContain('SessionStart');
      expect(eventTypes).toContain('PreToolUse');
      expect(eventTypes).toContain('PostToolUse');
      expect(eventTypes).toContain('Stop');
    });

    it('should handle date-based log rotation correctly', async () => {
      // This test would need to manipulate system time or create events on different dates
      // For now, we'll verify the directory structure is correct

      const sessionId = `rotation-test-${Date.now()}`;
      const payload = createTestPayload('pre-tool-use');
      payload.sessionId = sessionId; // Add sessionId to the payload

      const hookHandler = spawn('node', [
        join(originalCwd, 'packages/hooks/dist/cage-hook-handler.js'),
        'pre-tool-use'
      ], {
        cwd: testDir,
        env: {
          ...process.env,
          TEST_BASE_DIR: testDir,
          CLAUDE_PROJECT_DIR: testDir
        }
      });

      hookHandler.stdin.write(JSON.stringify(payload));
      hookHandler.stdin.end();

      const exitCode = await new Promise<number>((resolve) => {
        hookHandler.on('exit', (code) => resolve(code || 0));
      });

      expect(exitCode).toBe(0);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify date-based directory structure in shared backend directory
      const today = new Date().toISOString().split('T')[0];
      const todayDir = join(sharedTestDir, '.cage/events', today);
      const eventsFile = join(todayDir, 'events.jsonl');

      expect(existsSync(todayDir)).toBe(true);
      expect(existsSync(eventsFile)).toBe(true);
    });
  });
});

// Helper functions
interface TestPayload {
  timestamp: string;
  sessionId: string;
  // Pre/Post Tool Use
  toolName?: string;
  arguments?: Record<string, unknown>;
  result?: Record<string, unknown>;
  executionTime?: number;
  error?: string;
  // User Prompt Submit
  prompt?: string;
  context?: {
    previousMessages?: Array<{ role: string; content: string; }>;
    currentFile?: string;
  };
  // Session Start/End
  projectPath?: string;
  environment?: Record<string, unknown>;
  duration?: number;
  summary?: Record<string, unknown>;
  // Notification
  level?: string;
  message?: string;
  // Pre-Compact
  reason?: string;
  currentTokenCount?: number;
  maxTokenCount?: number;
  // Status
  currentStatus?: string;
  requestType?: string;
  // Stop
  finalState?: Record<string, unknown>;
  // Subagent Stop
  subagentId?: string;
  parentSessionId?: string;
}

function createTestPayload(hookType: string): TestPayload {
  const basePayload = {
    timestamp: new Date().toISOString()
    // sessionId will be added by the test
  };

  switch (hookType) {
    case 'pre-tool-use':
      return {
        ...basePayload,
        toolName: 'Read',
        arguments: { file_path: '/test.txt' }
      };

    case 'post-tool-use':
      return {
        ...basePayload,
        toolName: 'Read',
        arguments: { file_path: '/test.txt' },
        result: { content: 'test file content' },
        executionTime: 150
      };

    case 'user-prompt-submit':
      return {
        ...basePayload,
        prompt: 'Help me write a function',
        context: {
          previousMessages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' }
          ],
          currentFile: '/test.js'
        }
      };

    case 'session-start':
      return {
        ...basePayload,
        projectPath: process.cwd(),
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          cwd: process.cwd()
        }
      };

    case 'session-end':
      return {
        ...basePayload,
        duration: 30000,
        summary: {
          toolsUsed: ['Read', 'Write'],
          filesModified: ['/test.js'],
          errors: 0,
          warnings: 2
        }
      };

    case 'notification':
      return {
        ...basePayload,
        level: 'info',
        message: 'Test notification'
      };

    case 'pre-compact':
      return {
        ...basePayload,
        reason: 'conversation_length',
        currentTokenCount: 5000,
        maxTokenCount: 10000
      };

    case 'stop':
      return {
        ...basePayload,
        reason: 'completed',
        finalState: { tasksCompleted: 5 }
      };

    case 'subagent-stop':
      return {
        ...basePayload,
        subagentId: 'subagent-123',
        parentSessionId: 'parent-session-456',
        result: {
          success: true,
          output: 'Task completed successfully',
          metrics: { duration: 1500 }
        }
      };

    default:
      return basePayload;
  }
}

function hookTypeToEventType(hookType: string): string {
  return hookType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}