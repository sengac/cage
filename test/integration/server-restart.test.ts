import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Integration Test: Server Restart
 *
 * Tests that no events are lost during backend restart.
 * This verifies the Phase 1 requirement:
 * "Automatic recovery after system restarts"
 */

describe('Integration: Server Restart', { concurrent: false }, () => {
  let testDir: string;
  let originalCwd: string;
  let backendPort: number;

  beforeAll(async () => {
    backendPort = 3791; // Different port to avoid conflicts
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'cage-restart-test-'));
    process.chdir(testDir);

    // Create cage config
    await writeFile('cage.config.json', JSON.stringify({
      port: backendPort,
      logLevel: 'info'
    }));

    // Create .cage directory structure
    await mkdir('.cage', { recursive: true });
    await mkdir('.cage/events', { recursive: true });
  });

  afterAll(async () => {
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

  it('should not lose events during backend restart', async () => {
    const sessionId = `restart-test-${Date.now()}`;
    const eventsBeforeRestart: unknown[] = [];
    const eventsAfterRestart: unknown[] = [];

    // Phase 1: Start backend and send some events
    let backendProcess = await startBackend();

    // Send events before restart
    for (let i = 0; i < 3; i++) {
      const payload = {
        toolName: 'Read',
        arguments: { file_path: `/test-${i}.txt` },
        sessionId,
        timestamp: new Date().toISOString()
      };

      await triggerHook('pre-tool-use', payload);
      eventsBeforeRestart.push(payload);

      // Small delay between events
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Wait for events to be processed
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify events were logged before restart
    const eventsResponse1 = await fetch(`http://localhost:${backendPort}/events/list?sessionId=${sessionId}`);
    expect(eventsResponse1.ok).toBe(true);
    const { events: beforeEvents } = await eventsResponse1.json();
    expect(beforeEvents).toHaveLength(3);

    // Phase 2: Restart backend
    await stopBackend(backendProcess);

    // Verify backend is down
    try {
      await fetch(`http://localhost:${backendPort}/health`);
      throw new Error('Backend should be down');
    } catch (error) {
      // Expected - backend should be unreachable
    }

    // Start backend again
    backendProcess = await startBackend();

    // Phase 3: Send more events after restart
    for (let i = 3; i < 6; i++) {
      const payload = {
        toolName: 'Write',
        arguments: { file_path: `/test-${i}.txt`, content: 'test content' },
        sessionId,
        timestamp: new Date().toISOString()
      };

      await triggerHook('post-tool-use', payload);
      eventsAfterRestart.push(payload);

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Wait for events to be processed
    await new Promise(resolve => setTimeout(resolve, 200));

    // Phase 4: Verify all events are preserved
    const eventsResponse2 = await fetch(`http://localhost:${backendPort}/events/list?sessionId=${sessionId}`);
    expect(eventsResponse2.ok).toBe(true);
    const { events: allEvents } = await eventsResponse2.json();

    // Should have all 6 events (3 before + 3 after restart)
    expect(allEvents).toHaveLength(6);

    // Verify events from before restart are still there
    const beforeRestartEvents = allEvents.filter((e: { eventType: string }) => e.eventType === 'PreToolUse');
    expect(beforeRestartEvents).toHaveLength(3);

    // Verify events from after restart are there
    const afterRestartEvents = allEvents.filter((e: { eventType: string }) => e.eventType === 'PostToolUse');
    expect(afterRestartEvents).toHaveLength(3);

    // Verify chronological order is maintained
    for (let i = 1; i < allEvents.length; i++) {
      const prevTime = new Date(allEvents[i-1].timestamp);
      const currTime = new Date(allEvents[i].timestamp);
      expect(currTime >= prevTime).toBe(true);
    }

    // Phase 5: Verify file-based persistence
    const today = new Date().toISOString().split('T')[0];
    const eventsFile = join(testDir, '.cage/events', today, 'events.jsonl');
    expect(existsSync(eventsFile)).toBe(true);

    const logContent = await readFile(eventsFile, 'utf-8');
    const loggedEvents = logContent.trim().split('\n').map(line => JSON.parse(line));
    expect(loggedEvents).toHaveLength(6);

    // Cleanup
    await stopBackend(backendProcess);
  });

  it('should handle hooks gracefully when backend is down during restart', async () => {
    const sessionId = `offline-test-${Date.now()}`;

    // Start backend
    let backendProcess = await startBackend();

    // Send one event to establish baseline
    const payload1 = {
      toolName: 'Read',
      arguments: { file_path: '/test.txt' },
      sessionId,
      timestamp: new Date().toISOString()
    };

    await triggerHook('pre-tool-use', payload1);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Stop backend
    await stopBackend(backendProcess);

    // Try to send events while backend is down - these should be logged offline
    const payload2 = {
      toolName: 'Write',
      arguments: { file_path: '/offline-test.txt' },
      sessionId,
      timestamp: new Date().toISOString()
    };

    await triggerHook('post-tool-use', payload2);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify offline log was created
    const offlineLogPath = join(testDir, '.cage', 'hooks-offline.log');
    expect(existsSync(offlineLogPath)).toBe(true);

    const offlineLogContent = await readFile(offlineLogPath, 'utf-8');
    expect(offlineLogContent).toContain('post-tool-use');
    expect(offlineLogContent).toContain('fetch failed');

    // Restart backend
    backendProcess = await startBackend();

    // Send another event after restart
    const payload3 = {
      toolName: 'Edit',
      arguments: { file_path: '/after-restart.txt' },
      sessionId,
      timestamp: new Date().toISOString()
    };

    await triggerHook('pre-tool-use', payload3);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify that events before and after downtime are properly logged
    const response = await fetch(`http://localhost:${backendPort}/events/list?sessionId=${sessionId}`);
    expect(response.ok).toBe(true);
    const { events } = await response.json();

    // Should have 2 events (1 before downtime, 1 after restart)
    // The offline event should not be in the backend logs
    expect(events).toHaveLength(2);

    // Cleanup
    await stopBackend(backendProcess);
  });

  // Helper functions
  async function startBackend(): Promise<ChildProcess> {
    const backendProcess = spawn('node', [
      join(originalCwd, 'packages/backend/dist/main.js')
    ], {
      env: { ...process.env, PORT: backendPort.toString() },
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

    return backendProcess;
  }

  async function stopBackend(process: ChildProcess): Promise<void> {
    if (process && !process.killed) {
      process.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        process.on('exit', () => resolve());

        // Force kill after 5 seconds if not graceful
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      });
    }
  }

  async function triggerHook(hookType: string, payload: Record<string, unknown>): Promise<void> {
    const hookHandler = spawn('node', [
      join(originalCwd, 'packages/hooks/dist/cage-hook-handler.js'),
      hookType
    ]);

    hookHandler.stdin.write(JSON.stringify(payload));
    hookHandler.stdin.end();

    const exitCode = await new Promise<number>((resolve) => {
      hookHandler.on('exit', (code) => resolve(code || 0));
    });

    // Hook should not block regardless of backend status
    expect(exitCode).toBe(0);
  }
});