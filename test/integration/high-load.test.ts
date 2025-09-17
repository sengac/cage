import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Integration Test: High Load
 *
 * Tests that the system can handle 1000+ events rapidly without loss.
 * This verifies the Phase 1 requirements:
 * - "System must handle 1000+ events per minute without degradation"
 * - "Zero event loss during normal operation"
 * - "All events should be captured without loss"
 */

describe('Integration: High Load', () => {
  let testDir: string;
  let originalCwd: string;
  let backendProcess: ChildProcess;
  let backendPort: number;

  beforeAll(async () => {
    backendPort = 3792; // Different port to avoid conflicts
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'cage-highload-test-'));
    process.chdir(testDir);

    // Create cage config
    await writeFile('cage.config.json', JSON.stringify({
      port: backendPort,
      logLevel: 'warn' // Reduce log noise during high load
    }));

    // Create .cage directory structure
    await mkdir('.cage', { recursive: true });
    await mkdir('.cage/events', { recursive: true });

    // Start backend server
    backendProcess = spawn('node', [
      join(originalCwd, 'packages/backend/dist/main.js')
    ], {
      env: { ...process.env, PORT: backendPort.toString() },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for backend to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Backend failed to start within 15 seconds'));
      }, 15000);

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
    if (backendProcess && !backendProcess.killed) {
      backendProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 2000));
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

  it('should handle 1000 events rapidly without loss', async () => {
    const sessionId = `highload-test-${Date.now()}`;
    const totalEvents = 1000;
    const concurrency = 50; // Number of concurrent hooks
    const startTime = Date.now();

    console.log(`Starting high load test: ${totalEvents} events with concurrency ${concurrency}`);

    // Generate all event payloads
    const eventPayloads = Array.from({ length: totalEvents }, (_, i) => ({
      toolName: i % 2 === 0 ? 'Read' : 'Write',
      arguments: {
        file_path: `/test-${i}.txt`,
        content: i % 2 === 1 ? `content-${i}` : undefined
      },
      sessionId,
      timestamp: new Date().toISOString(),
      eventIndex: i
    }));

    // Split into batches for concurrent processing
    const batches: Array<typeof eventPayloads> = [];
    for (let i = 0; i < eventPayloads.length; i += concurrency) {
      batches.push(eventPayloads.slice(i, i + concurrency));
    }

    // Process batches concurrently
    let processedCount = 0;
    const errors: string[] = [];

    for (const batch of batches) {
      const batchPromises = batch.map(async (payload, batchIndex) => {
        try {
          const hookType = payload.eventIndex % 2 === 0 ? 'pre-tool-use' : 'post-tool-use';
          await triggerHook(hookType, payload);
          processedCount++;

          // Log progress every 100 events
          if (processedCount % 100 === 0) {
            console.log(`Processed ${processedCount}/${totalEvents} events`);
          }
        } catch (error) {
          errors.push(`Event ${payload.eventIndex}: ${error}`);
        }
      });

      // Wait for this batch to complete before starting next batch
      await Promise.all(batchPromises);

      // Small delay between batches to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const eventsPerSecond = (totalEvents * 1000) / totalTime;

    console.log(`High load test completed in ${totalTime}ms`);
    console.log(`Rate: ${eventsPerSecond.toFixed(2)} events/second`);
    console.log(`Processed: ${processedCount}/${totalEvents} events`);
    console.log(`Errors: ${errors.length}`);

    // Assert: All events should be processed without errors
    expect(errors).toHaveLength(0);
    expect(processedCount).toBe(totalEvents);

    // Wait for all events to be logged (async operation)
    console.log('Waiting for events to be persisted...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify events were logged to the backend
    const response = await fetch(`http://localhost:${backendPort}/events/list?sessionId=${sessionId}`);
    expect(response.ok).toBe(true);

    const { events, total } = await response.json();
    expect(total).toBe(totalEvents);
    expect(events.length).toBeLessThanOrEqual(totalEvents); // May be paginated

    // Verify events are in the file system
    const today = new Date().toISOString().split('T')[0];
    const eventsFile = join(testDir, '.cage/events', today, 'events.jsonl');
    expect(existsSync(eventsFile)).toBe(true);

    const logContent = await readFile(eventsFile, 'utf-8');
    const loggedEvents = logContent.trim().split('\n').filter(line => line.trim());
    expect(loggedEvents).toHaveLength(totalEvents);

    // Verify no events were corrupted during high load
    const parsedEvents = loggedEvents.map(line => JSON.parse(line));
    const uniqueEventIndices = new Set(
      parsedEvents
        .filter(e => e.sessionId === sessionId)
        .map(e => e.eventIndex)
        .filter(index => index !== undefined)
    );

    expect(uniqueEventIndices.size).toBe(totalEvents);

    // Performance assertion: Should handle at least 10 events per second
    expect(eventsPerSecond).toBeGreaterThan(10);

    console.log('✅ High load test passed - all events captured and persisted');
  }, 60000); // 60 second timeout for high load test

  it('should maintain chronological order during high load', async () => {
    const sessionId = `chronological-test-${Date.now()}`;
    const totalEvents = 100; // Smaller number for chronological test
    const concurrency = 10;

    console.log(`Testing chronological order with ${totalEvents} events`);

    // Create events with precise timestamps
    const eventPayloads = Array.from({ length: totalEvents }, (_, i) => {
      const timestamp = new Date(Date.now() + i * 10).toISOString(); // 10ms intervals
      return {
        toolName: 'Read',
        arguments: { file_path: `/chronological-${i}.txt` },
        sessionId,
        timestamp,
        eventIndex: i
      };
    });

    // Send events with some concurrency but controlled timing
    const batches: Array<typeof eventPayloads> = [];
    for (let i = 0; i < eventPayloads.length; i += concurrency) {
      batches.push(eventPayloads.slice(i, i + concurrency));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(payload =>
        triggerHook('pre-tool-use', payload)
      );
      await Promise.all(batchPromises);
      await new Promise(resolve => setTimeout(resolve, 50)); // Pause between batches
    }

    // Wait for events to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify chronological order is maintained
    const response = await fetch(`http://localhost:${backendPort}/events/list?sessionId=${sessionId}&limit=${totalEvents}`);
    expect(response.ok).toBe(true);

    const { events } = await response.json();
    expect(events).toHaveLength(totalEvents);

    // Check that events are in chronological order
    for (let i = 1; i < events.length; i++) {
      const prevTime = new Date(events[i-1].timestamp);
      const currTime = new Date(events[i].timestamp);
      expect(currTime >= prevTime).toBe(true);
    }

    // Verify file-based logging maintains order too
    const today = new Date().toISOString().split('T')[0];
    const eventsFile = join(testDir, '.cage/events', today, 'events.jsonl');
    const logContent = await readFile(eventsFile, 'utf-8');
    const loggedEvents = logContent.trim().split('\n')
      .map(line => JSON.parse(line))
      .filter(e => e.sessionId === sessionId);

    expect(loggedEvents).toHaveLength(totalEvents);

    // Check chronological order in file
    for (let i = 1; i < loggedEvents.length; i++) {
      const prevTime = new Date(loggedEvents[i-1].timestamp);
      const currTime = new Date(loggedEvents[i].timestamp);
      expect(currTime >= prevTime).toBe(true);
    }

    console.log('✅ Chronological order maintained during high load');
  }, 30000);

  it('should not crash or slow down Claude Code during high load', async () => {
    // This test verifies that hook response times remain fast during high load
    const sessionId = `performance-test-${Date.now()}`;
    const totalEvents = 200;
    const maxResponseTime = 100; // 100ms max response time per hook

    console.log(`Testing hook response times during load of ${totalEvents} events`);

    const responseTimes: number[] = [];
    const promises: Promise<void>[] = [];

    // Send events and measure individual response times
    for (let i = 0; i < totalEvents; i++) {
      const payload = {
        toolName: 'Read',
        arguments: { file_path: `/performance-${i}.txt` },
        sessionId,
        timestamp: new Date().toISOString()
      };

      const promise = (async () => {
        const startTime = Date.now();
        await triggerHook('pre-tool-use', payload);
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      })();

      promises.push(promise);

      // Stagger the requests slightly
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }

    // Wait for all hooks to complete
    await Promise.all(promises);

    // Calculate statistics
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxActualResponseTime = Math.max(...responseTimes);
    const slowHooks = responseTimes.filter(time => time > maxResponseTime).length;

    console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Max response time: ${maxActualResponseTime}ms`);
    console.log(`Hooks slower than ${maxResponseTime}ms: ${slowHooks}/${totalEvents}`);

    // Performance assertions
    expect(avgResponseTime).toBeLessThan(maxResponseTime);
    expect(slowHooks).toBeLessThan(totalEvents * 0.05); // Less than 5% of hooks should be slow

    // Verify all events were still captured
    await new Promise(resolve => setTimeout(resolve, 500));
    const response = await fetch(`http://localhost:${backendPort}/events/list?sessionId=${sessionId}`);
    expect(response.ok).toBe(true);
    const { total } = await response.json();
    expect(total).toBe(totalEvents);

    console.log('✅ Performance maintained during high load');
  }, 45000);

  // Helper function
  async function triggerHook(hookType: string, payload: Record<string, unknown>): Promise<void> {
    const hookHandler = spawn('node', [
      join(originalCwd, 'packages/hooks/dist/cage-hook-handler.js'),
      hookType
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    hookHandler.stdin.write(JSON.stringify(payload));
    hookHandler.stdin.end();

    const exitCode = await new Promise<number>((resolve) => {
      hookHandler.on('exit', (code) => resolve(code || 0));
    });

    if (exitCode !== 0) {
      throw new Error(`Hook handler exited with code ${exitCode}`);
    }
  }
});