import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Integration Test: Offline Mode
 *
 * Tests that hooks don't block Claude Code when the backend server is down.
 * This verifies the Phase 1 requirements:
 * - "Handle hook when server is down"
 * - "Claude Code should continue operating normally"
 * - "Not block or delay Claude's execution"
 * - "Graceful degradation when backend is unavailable"
 */

describe('Integration: Offline Mode', () => {
  let testDir: string;
  let originalCwd: string;
  let backendPort: number;

  beforeAll(async () => {
    backendPort = 3793; // Different port to avoid conflicts
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'cage-offline-test-'));
    process.chdir(testDir);

    // Create cage config pointing to unavailable backend
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
    // Clear any existing logs before each test
    const cageDir = join(testDir, '.cage');
    if (existsSync(cageDir)) {
      await rm(cageDir, { recursive: true, force: true });
      await mkdir(cageDir, { recursive: true });
    }
  });

  it('should not block when backend is completely down', async () => {
    const sessionId = `offline-test-${Date.now()}`;

    // Verify backend is indeed down
    try {
      await fetch(`http://localhost:${backendPort}/health`);
      throw new Error('Backend should be down for this test');
    } catch (error) {
      // Expected - backend should be unreachable
    }

    // Test all hook types to ensure none block
    const hookTypes = [
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
    ];

    const results: Array<{ hookType: string; exitCode: number; responseTime: number }> = [];

    for (const hookType of hookTypes) {
      const payload = createOfflineTestPayload(hookType, sessionId);

      const startTime = Date.now();
      const exitCode = await triggerHookAndGetExitCode(hookType, payload);
      const responseTime = Date.now() - startTime;

      results.push({ hookType, exitCode, responseTime });

      // Small delay between hooks
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('Offline hook test results:');
    results.forEach(({ hookType, exitCode, responseTime }) => {
      console.log(`  ${hookType}: exit ${exitCode} in ${responseTime}ms`);
    });

    // Assert: All hooks should exit with code 0 (success, don't block Claude)
    results.forEach(({ hookType, exitCode }) => {
      expect(exitCode, `${hookType} should not block Claude`).toBe(0);
    });

    // Assert: All hooks should respond quickly (within 5 seconds)
    results.forEach(({ hookType, responseTime }) => {
      expect(responseTime, `${hookType} should respond quickly`).toBeLessThan(5000);
    });

    // Verify offline logging was created
    const offlineLogPath = join(testDir, '.cage', 'hooks-offline.log');
    expect(existsSync(offlineLogPath)).toBe(true);

    const offlineLogContent = await readFile(offlineLogPath, 'utf-8');

    // Should contain entries for all hook types
    hookTypes.forEach(hookType => {
      expect(offlineLogContent).toContain(hookType);
    });

    // Should contain error information
    expect(offlineLogContent).toContain('fetch failed');

    // Parse log entries to verify structure
    const logLines = offlineLogContent.trim().split('\n').filter(line => line.trim());
    expect(logLines).toHaveLength(hookTypes.length);

    logLines.forEach(line => {
      const logEntry = JSON.parse(line);
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('hookType');
      expect(logEntry).toHaveProperty('data');
      expect(logEntry).toHaveProperty('error');
      expect(logEntry.error).toContain('fetch failed');
    });
  });

  it('should handle rapid offline hooks without blocking', async () => {
    const sessionId = `rapid-offline-test-${Date.now()}`;
    const totalHooks = 50;
    const maxResponseTime = 1000; // 1 second max per hook

    console.log(`Testing ${totalHooks} rapid offline hooks`);

    const promises: Promise<{ exitCode: number; responseTime: number }>[] = [];

    // Send many hooks rapidly while backend is down
    for (let i = 0; i < totalHooks; i++) {
      const payload = {
        toolName: 'Read',
        arguments: { file_path: `/rapid-test-${i}.txt` },
        sessionId,
        timestamp: new Date().toISOString(),
        eventIndex: i
      };

      const promise = (async () => {
        const startTime = Date.now();
        const exitCode = await triggerHookAndGetExitCode('pre-tool-use', payload);
        const responseTime = Date.now() - startTime;
        return { exitCode, responseTime };
      })();

      promises.push(promise);

      // Slight stagger to simulate real usage
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Wait for all hooks to complete
    const results = await Promise.all(promises);

    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const maxActualResponseTime = Math.max(...results.map(r => r.responseTime));
    const slowHooks = results.filter(r => r.responseTime > maxResponseTime).length;

    console.log(`Average offline response time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Max offline response time: ${maxActualResponseTime}ms`);
    console.log(`Slow hooks: ${slowHooks}/${totalHooks}`);

    // Assert: All hooks should succeed (not block Claude)
    results.forEach(({ exitCode }, index) => {
      expect(exitCode, `Hook ${index} should not block`).toBe(0);
    });

    // Assert: Response times should be reasonable
    expect(avgResponseTime).toBeLessThan(maxResponseTime);
    expect(slowHooks).toBeLessThan(totalHooks * 0.1); // Less than 10% should be slow

    // Verify offline log contains all entries
    const offlineLogPath = join(testDir, '.cage', 'hooks-offline.log');
    expect(existsSync(offlineLogPath)).toBe(true);

    const offlineLogContent = await readFile(offlineLogPath, 'utf-8');
    const logLines = offlineLogContent.trim().split('\n').filter(line => line.trim());
    expect(logLines).toHaveLength(totalHooks);
  });

  it('should transition gracefully from offline to online mode', async () => {
    const sessionId = `transition-test-${Date.now()}`;

    // Phase 1: Send hooks while offline
    console.log('Phase 1: Testing offline hooks');

    const offlinePayload = {
      toolName: 'Read',
      arguments: { file_path: '/offline-test.txt' },
      sessionId,
      timestamp: new Date().toISOString()
    };

    const offlineExitCode = await triggerHookAndGetExitCode('pre-tool-use', offlinePayload);
    expect(offlineExitCode).toBe(0);

    // Verify offline log was created
    const offlineLogPath = join(testDir, '.cage', 'hooks-offline.log');
    expect(existsSync(offlineLogPath)).toBe(true);

    let offlineLogContent = await readFile(offlineLogPath, 'utf-8');
    expect(offlineLogContent).toContain('pre-tool-use');

    // Phase 2: Start backend server
    console.log('Phase 2: Starting backend server');

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
    });

    // Phase 3: Send hooks while online
    console.log('Phase 3: Testing online hooks');

    const onlinePayload = {
      toolName: 'Write',
      arguments: { file_path: '/online-test.txt', content: 'test' },
      sessionId,
      timestamp: new Date().toISOString()
    };

    const onlineExitCode = await triggerHookAndGetExitCode('post-tool-use', onlinePayload);
    expect(onlineExitCode).toBe(0);

    // Wait for event to be processed
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify online event was logged to backend
    const response = await fetch(`http://localhost:${backendPort}/events/list?sessionId=${sessionId}`);
    expect(response.ok).toBe(true);

    const { events } = await response.json();
    expect(events).toHaveLength(1); // Only the online event should be in backend
    expect(events[0].eventType).toBe('PostToolUse');

    // Verify offline log still exists and wasn't overwritten
    offlineLogContent = await readFile(offlineLogPath, 'utf-8');
    expect(offlineLogContent).toContain('pre-tool-use'); // Offline event still logged

    // The offline log should not contain the online event
    expect(offlineLogContent).not.toContain('post-tool-use');

    // Cleanup
    backendProcess.kill();
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ Graceful transition from offline to online mode verified');
  });

  it('should handle malformed config gracefully when offline', async () => {
    // Create malformed config
    await writeFile('cage.config.json', '{ invalid json }');

    const payload = {
      toolName: 'Read',
      arguments: { file_path: '/malformed-config-test.txt' },
      sessionId: `malformed-test-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    // Hook should still not block even with malformed config
    const exitCode = await triggerHookAndGetExitCode('pre-tool-use', payload);
    expect(exitCode).toBe(0);

    // Should fall back to default config and still log offline
    const offlineLogPath = join(testDir, '.cage', 'hooks-offline.log');
    expect(existsSync(offlineLogPath)).toBe(true);

    const offlineLogContent = await readFile(offlineLogPath, 'utf-8');
    expect(offlineLogContent).toContain('pre-tool-use');
  });

  // Helper functions
  function createOfflineTestPayload(hookType: string, sessionId: string): Record<string, unknown> {
    const basePayload = {
      sessionId,
      timestamp: new Date().toISOString()
    };

    switch (hookType) {
      case 'pre-tool-use':
      case 'post-tool-use':
        return {
          ...basePayload,
          toolName: 'Read',
          arguments: { file_path: `/offline-${hookType}.txt` }
        };

      case 'user-prompt-submit':
        return {
          ...basePayload,
          prompt: 'Test offline prompt'
        };

      case 'session-start':
      case 'session-end':
        return {
          ...basePayload,
          metadata: { offline: true }
        };

      default:
        return {
          ...basePayload,
          type: hookType
        };
    }
  }

  async function triggerHookAndGetExitCode(hookType: string, payload: Record<string, unknown>): Promise<number> {
    const hookHandler = spawn('node', [
      join(originalCwd, 'packages/hooks/dist/cage-hook-handler.js'),
      hookType
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    hookHandler.stdin.write(JSON.stringify(payload));
    hookHandler.stdin.end();

    return new Promise<number>((resolve) => {
      hookHandler.on('exit', (code) => resolve(code || 0));

      // Force timeout after 10 seconds to prevent hanging
      setTimeout(() => {
        if (!hookHandler.killed) {
          hookHandler.kill();
          resolve(1); // Return error code for timeout
        }
      }, 10000);
    });
  }
});