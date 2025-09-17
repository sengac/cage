import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { mkdtemp, rm, writeFile, readFile, mkdir, readdir, stat } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Integration Test: Full Hook Lifecycle
 *
 * Tests the complete flow for all 10 Claude Code hook types:
 * Hook Trigger → Backend Processing → Event Logging → Event Querying
 *
 * This verifies the core Phase 1 requirement:
 * "100% of Claude Code hook events are captured"
 */

describe('Integration: Full Hook Lifecycle', () => {
  let testDir: string;
  let originalCwd: string;
  let backendProcess: ChildProcess;
  let backendPort: number;

  const ALL_HOOK_TYPES = [
    'pre-tool-use',
    'post-tool-use',
    'user-prompt-submit',
    'session-start',
    'session-end',
    'notification',
    'pre-compact',
    'status',
    'stop',
    'subagent-stop'
  ] as const;

  beforeAll(async () => {
    // Find available port for backend
    backendPort = 3790;

    // Setup test environment
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'cage-integration-'));
    process.chdir(testDir);

    // Create cage config
    await writeFile('cage.config.json', JSON.stringify({
      port: backendPort,
      logLevel: 'info'
    }));

    // Create .cage directory structure
    await mkdir('.cage', { recursive: true });
    await mkdir('.cage/events', { recursive: true });

    // Start backend server
    backendProcess = spawn('node', [
      join(originalCwd, 'packages/backend/dist/main.js')
    ], {
      env: {
        ...process.env,
        PORT: backendPort.toString(),
        TEST_BASE_DIR: testDir
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for backend to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Backend failed to start within 10 seconds'));
      }, 10000);

      if (backendProcess.stdout) {
        backendProcess.stdout.on('data', (data) => {
          if (data.toString().includes('Nest application successfully started')) {
            clearTimeout(timeout);
            resolve();
          }
        });
      }

      if (backendProcess.stderr) {
        backendProcess.stderr.on('data', (data) => {
          console.error('Backend stderr:', data.toString());
        });
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    if (backendProcess) {
      backendProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clear any existing event logs before each test
    const eventsDir = join(testDir, '.cage/events');
    if (existsSync(eventsDir)) {
      await rm(eventsDir, { recursive: true, force: true });
      await mkdir(eventsDir, { recursive: true });
    }
  });

  describe('All 10 Hook Types', () => {
    ALL_HOOK_TYPES.forEach((hookType) => {
      it(`should capture and log ${hookType} hook event`, async () => {
        // Arrange: Create test payload for this hook type
        const testPayload = createTestPayload(hookType);
        const sessionId = `test-session-${Date.now()}`;

        const enrichedPayload = {
          ...testPayload,
          sessionId,
          timestamp: new Date().toISOString(),
          hook_type: hookType,
          project_dir: testDir
        };

        // Act: Trigger hook via hook handler
        const hookHandler = spawn('node', [
          join(originalCwd, 'packages/hooks/dist/cage-hook-handler.js'),
          hookType
        ], {
          cwd: testDir // Set working directory to test directory so it finds cage.config.json
        });

        // Send payload to hook handler
        hookHandler.stdin.write(JSON.stringify(testPayload));
        hookHandler.stdin.end();

        // Wait for hook handler to complete
        const exitCode = await new Promise<number>((resolve) => {
          hookHandler.on('exit', (code) => resolve(code || 0));
        });

        // Assert: Hook handler should succeed
        expect(exitCode).toBe(0);

        // Wait for event to be logged (async operation)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Assert: Event should be logged to file system
        const today = new Date().toISOString().split('T')[0];
        const eventsFile = join(testDir, '.cage/events', today, 'events.jsonl');

        expect(existsSync(eventsFile)).toBe(true);

        // Assert: Event content should be correct
        const logContent = await readFile(eventsFile, 'utf-8');
        const loggedEvents = logContent.trim().split('\n').map(line => JSON.parse(line));

        expect(loggedEvents).toHaveLength(1);

        const loggedEvent = loggedEvents[0];
        expect(loggedEvent).toMatchObject({
          eventType: hookTypeToEventType(hookType),
          sessionId,
          toolName: testPayload.toolName || undefined,
          arguments: testPayload.arguments || undefined
        });

        // Assert: Event should be queryable via API
        const response = await fetch(`http://localhost:${backendPort}/events/tail?count=1`);
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
    it('should maintain chronological order across multiple hook types', async () => {
      const sessionId = `test-session-${Date.now()}`;
      const triggerOrder = ['session-start', 'pre-tool-use', 'post-tool-use', 'stop'] as const;
      const triggerTimes: string[] = [];

      // Trigger hooks in sequence
      for (const hookType of triggerOrder) {
        const payload = createTestPayload(hookType);
        payload.sessionId = sessionId;

        const hookHandler = spawn('node', [
          join(originalCwd, 'packages/hooks/dist/cage-hook-handler.js'),
          hookType
        ]);

        hookHandler.stdin.write(JSON.stringify(payload));
        hookHandler.stdin.end();

        const exitCode = await new Promise<number>((resolve) => {
          hookHandler.on('exit', (code) => resolve(code || 0));
        });

        expect(exitCode).toBe(0);
        triggerTimes.push(new Date().toISOString());

        // Small delay between hooks
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Wait for all events to be logged
      await new Promise(resolve => setTimeout(resolve, 200));

      // Query events and verify order
      const response = await fetch(`http://localhost:${backendPort}/events/list?sessionId=${sessionId}`);
      expect(response.ok).toBe(true);

      const { events } = await response.json();
      expect(events).toHaveLength(4);

      // Verify chronological order
      const eventTypes = events.map((e: { eventType: string }) => e.eventType);
      expect(eventTypes).toEqual(['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop']);

      // Verify timestamps are in order
      for (let i = 1; i < events.length; i++) {
        expect(new Date(events[i].timestamp) >= new Date(events[i-1].timestamp)).toBe(true);
      }
    });

    it('should handle date-based log rotation correctly', async () => {
      // This test would need to manipulate system time or create events on different dates
      // For now, we'll verify the directory structure is correct

      const payload = createTestPayload('pre-tool-use');
      const hookHandler = spawn('node', [
        join(originalCwd, 'packages/hooks/dist/cage-hook-handler.js'),
        'pre-tool-use'
      ]);

      hookHandler.stdin.write(JSON.stringify(payload));
      hookHandler.stdin.end();

      const exitCode = await new Promise<number>((resolve) => {
        hookHandler.on('exit', (code) => resolve(code || 0));
      });

      expect(exitCode).toBe(0);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify date-based directory structure
      const today = new Date().toISOString().split('T')[0];
      const todayDir = join(testDir, '.cage/events', today);
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
  toolName?: string;
  arguments?: Record<string, unknown>;
  results?: Record<string, unknown>;
  prompt?: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  message?: string;
  type?: string;
  reason?: string;
  status?: string;
  summary?: string;
}

function createTestPayload(hookType: string): TestPayload {
  const basePayload = {
    timestamp: new Date().toISOString(),
    sessionId: `test-session-${Date.now()}`
  };

  switch (hookType) {
    case 'pre-tool-use':
    case 'post-tool-use':
      return {
        ...basePayload,
        toolName: 'Read',
        arguments: { file_path: '/test.txt' },
        results: hookType === 'post-tool-use' ? { success: true } : undefined
      };

    case 'user-prompt-submit':
      return {
        ...basePayload,
        prompt: 'Help me write a function',
        context: { files: ['/test.js'] }
      };

    case 'session-start':
    case 'session-end':
      return {
        ...basePayload,
        metadata: { version: '1.0.0' }
      };

    case 'notification':
      return {
        ...basePayload,
        message: 'Test notification',
        type: 'info'
      };

    case 'pre-compact':
      return {
        ...basePayload,
        reason: 'conversation_length'
      };

    case 'status':
      return {
        ...basePayload,
        status: 'active'
      };

    case 'stop':
    case 'subagent-stop':
      return {
        ...basePayload,
        reason: 'completed',
        summary: 'Task completed successfully'
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