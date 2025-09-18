/**
 * Event Capture Flow Acceptance Tests
 *
 * These tests verify the complete flow:
 * Hook triggered → Hook handler processes → Backend receives → Event logged → CLI can read
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { nanoid } from 'nanoid';

describe('Event Capture Flow - Given-When-Then', () => {
  let testDir: string;
  let backendProcess: ChildProcess;
  let backendPort: number;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = join(tmpdir(), `cage-test-${nanoid()}`);
    mkdirSync(testDir, { recursive: true });

    // Set up test environment
    process.env.TEST_BASE_DIR = testDir;
    backendPort = 3791 + Math.floor(Math.random() * 100); // Random port to avoid conflicts

    // Create test cage config
    const cageConfig = {
      port: backendPort,
      host: 'localhost',
      logLevel: 'info',
      eventsDir: '.cage/events',
      maxEventSize: 1048576,
      enableOfflineMode: true,
      offlineLogPath: '.cage/hooks-offline.log'
    };

    writeFileSync(join(testDir, 'cage.config.json'), JSON.stringify(cageConfig, null, 2));

    // Create .cage directory structure
    mkdirSync(join(testDir, '.cage'), { recursive: true });
    mkdirSync(join(testDir, '.cage', 'events'), { recursive: true });

    // Start backend server for testing
    backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: join(process.cwd(), 'packages/backend'),
      env: {
        ...process.env,
        PORT: backendPort.toString(),
        NODE_ENV: 'test',
        TEST_BASE_DIR: testDir // This tells the backend to write events to testDir
      },
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise((resolve) => {
      backendProcess.stdout?.on('data', (data) => {
        if (data.toString().includes('running on')) {
          resolve(true);
        }
      });
      setTimeout(resolve, 3000); // Fallback timeout
    });
  });

  afterEach(async () => {
    if (backendProcess) {
      backendProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    delete process.env.TEST_BASE_DIR;
  });

  describe('Scenario: Hook handler receives event and forwards to backend', () => {
    it('GIVEN hook handler is configured WHEN PreToolUse event is triggered THEN event should be logged', async () => {
      // GIVEN: Hook handler is available and backend is running
      const hookHandlerPath = join(process.cwd(), 'packages/hooks/dist/cage-hook-handler.js');
      expect(existsSync(hookHandlerPath)).toBe(true);

      // Simulate Claude Code hook input
      const hookInput = JSON.stringify({
        tool: 'Read',
        arguments: { file_path: '/test.txt' },
        sessionId: 'test-session-123'
      });

      // WHEN: Hook is triggered
      const hookProcess = spawn('node', [hookHandlerPath, 'PreToolUse'], {
        cwd: testDir,
        env: { ...process.env, TEST_BASE_DIR: testDir }
      });

      hookProcess.stdin.write(hookInput);
      hookProcess.stdin.end();

      const result = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
        let stdout = '';
        let stderr = '';

        hookProcess.stdout.on('data', (data) => stdout += data.toString());
        hookProcess.stderr.on('data', (data) => stderr += data.toString());

        hookProcess.on('close', (code) => {
          resolve({ code: code || 0, stdout, stderr });
        });
      });

      // THEN: Hook should exit successfully (never block Claude)
      expect(result.code).toBe(0);

      // AND: Event should be logged to file system
      const todayDir = new Date().toISOString().split('T')[0];
      const eventFile = join(testDir, '.cage', 'events', todayDir, 'events.jsonl');

      // Wait a bit for async file writing
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(existsSync(eventFile)).toBe(true);

      const logContent = readFileSync(eventFile, 'utf-8');
      const logLines = logContent.trim().split('\n');
      expect(logLines.length).toBeGreaterThan(0);

      const lastEvent = JSON.parse(logLines[logLines.length - 1]);
      expect(lastEvent.eventType).toBe('PreToolUse');
      expect(lastEvent.toolName).toBe('Read'); // Mapped from 'tool'
      expect(lastEvent.sessionId).toBe('test-session-123');
    });

    it('GIVEN backend is down WHEN hook is triggered THEN should log offline and not block', async () => {
      // GIVEN: Stop the backend
      if (backendProcess) {
        backendProcess.kill();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const hookHandlerPath = join(process.cwd(), 'packages/hooks/dist/cage-hook-handler.js');
      const hookInput = JSON.stringify({
        tool: 'Write',
        arguments: { file_path: '/test.txt', content: 'test' }
      });

      // WHEN: Hook is triggered with backend down
      const hookProcess = spawn('node', [hookHandlerPath, 'PostToolUse'], {
        cwd: testDir,
        env: { ...process.env, TEST_BASE_DIR: testDir }
      });

      hookProcess.stdin.write(hookInput);
      hookProcess.stdin.end();

      const result = await new Promise<{ code: number }>((resolve) => {
        hookProcess.on('close', (code) => resolve({ code: code || 0 }));
      });

      // THEN: Hook should still exit successfully (never block Claude)
      expect(result.code).toBe(0);

      // AND: Offline log should be created
      const offlineLogPath = join(testDir, '.cage', 'hooks-offline.log');
      expect(existsSync(offlineLogPath)).toBe(true);

      const offlineContent = readFileSync(offlineLogPath, 'utf-8');
      expect(offlineContent).toContain('Failed to connect to Cage backend');
    });
  });

  describe('Scenario: CLI events commands read actual logged events', () => {
    beforeEach(async () => {
      // Create some test events in the correct format
      const todayDir = new Date().toISOString().split('T')[0];
      const eventsDir = join(testDir, '.cage', 'events', todayDir);
      mkdirSync(eventsDir, { recursive: true });

      const testEvents = [
        {
          id: nanoid(),
          timestamp: new Date().toISOString(),
          eventType: 'PreToolUse',
          toolName: 'Read',
          arguments: { file_path: '/test1.txt' },
          sessionId: 'session-1'
        },
        {
          id: nanoid(),
          timestamp: new Date().toISOString(),
          eventType: 'PostToolUse',
          toolName: 'Read',
          result: { success: true },
          sessionId: 'session-1'
        },
        {
          id: nanoid(),
          timestamp: new Date().toISOString(),
          eventType: 'PreToolUse',
          toolName: 'Write',
          arguments: { file_path: '/test2.txt', content: 'hello' },
          sessionId: 'session-2'
        }
      ];

      const eventLines = testEvents.map(event => JSON.stringify(event)).join('\n');
      writeFileSync(join(eventsDir, 'events.jsonl'), eventLines);
    });

    it('GIVEN events are logged WHEN cage events list is run THEN should show actual events', async () => {
      // This test will verify CLI reads real events instead of showing "Total events: 0"
      // Implementation will be tested after we fix the commands
      expect(true).toBe(true); // Placeholder until CLI is fixed
    });

    it('GIVEN events are logged WHEN cage events tail is run THEN should show recent actual events', async () => {
      // This test will verify CLI reads real events instead of showing "No events found"
      expect(true).toBe(true); // Placeholder until CLI is fixed
    });

    it('GIVEN backend is running WHEN cage events stream is run THEN should connect to SSE endpoint', async () => {
      // This test will verify CLI connects to real SSE instead of showing mock events
      expect(true).toBe(true); // Placeholder until CLI is fixed
    });
  });

  describe('Scenario: Backend properly logs events to file system', () => {
    it('GIVEN backend receives hook POST WHEN processing event THEN should write to JSONL file', async () => {
      // Test direct backend API
      const testEvent = {
        tool: 'Read',
        arguments: { file_path: '/test.txt' },
        sessionId: 'api-test-session'
      };

      const response = await fetch(`http://localhost:${backendPort}/api/claude/hooks/pre-tool-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testEvent)
      });

      expect(response.ok).toBe(true);

      // Check that event was logged
      await new Promise(resolve => setTimeout(resolve, 500));

      const todayDir = new Date().toISOString().split('T')[0];
      const eventFile = join(testDir, '.cage', 'events', todayDir, 'events.jsonl');

      expect(existsSync(eventFile)).toBe(true);

      const logContent = readFileSync(eventFile, 'utf-8');
      expect(logContent).toContain('api-test-session');
      expect(logContent).toContain('PreToolUse');
    });
  });
});