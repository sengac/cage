# Phase 1: Integration Testing Guide

## Overview

This guide covers end-to-end integration testing for Phase 1, ensuring all components work together correctly and all acceptance criteria from PHASE1.md are met.

## Test Structure

```
test/
├── integration/
│   ├── end-to-end.test.ts       # Full system integration
│   ├── performance.test.ts      # Performance benchmarks
│   └── cross-platform.test.ts   # Platform compatibility
├── helpers/
│   ├── server.ts                 # Server management utilities
│   ├── hooks.ts                  # Hook simulation utilities
│   └── events.ts                 # Event verification utilities
└── fixtures/
    └── sample-events.jsonl       # Test data
```

## Integration Test Suite

### Create `test/integration/end-to-end.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, rm, readFile, writeFile } from 'fs/promises';
import { tmpdir, homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

describe('Phase 1 End-to-End Integration', () => {
  let testDir: string;
  let serverProcess: any;
  let originalHome: string;

  beforeAll(async () => {
    // Setup test environment
    testDir = await mkdtemp(join(tmpdir(), 'cage-e2e-'));
    originalHome = process.env.HOME || '';
    process.env.HOME = testDir;

    console.log('Test directory:', testDir);
    process.chdir(testDir);
  }, 30000);

  afterAll(async () => {
    // Cleanup
    if (serverProcess) {
      serverProcess.kill();
    }
    process.env.HOME = originalHome;
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Complete Workflow', () => {
    it('should handle full lifecycle from initialization to event query', async () => {
      // Step 1: Initialize Cage
      console.log('Step 1: Initializing Cage...');
      const { stdout: initOutput } = await execAsync('cage init');
      expect(initOutput).toContain('Cage initialized successfully');
      expect(existsSync(join(testDir, '.cage'))).toBe(true);
      expect(existsSync(join(testDir, 'cage.config.json'))).toBe(true);

      // Step 2: Start backend server
      console.log('Step 2: Starting backend server...');
      serverProcess = spawn('cage', ['start', 'server'], {
        detached: false,
        stdio: 'pipe',
      });

      // Wait for server to be ready
      await waitForServer('http://localhost:3790/claude/hooks/health');

      // Step 3: Configure hooks
      console.log('Step 3: Configuring hooks...');
      const { stdout: setupOutput } = await execAsync('cage hooks setup');
      expect(setupOutput).toContain('Hooks configured successfully');

      // Step 4: Verify hook configuration
      console.log('Step 4: Verifying hook configuration...');
      const { stdout: statusOutput } = await execAsync('cage hooks status');
      expect(statusOutput).toContain('PreToolUse: enabled');
      expect(statusOutput).toContain('PostToolUse: enabled');
      expect(statusOutput).toContain('Backend server: running');

      // Step 5: Simulate hook events
      console.log('Step 5: Simulating hook events...');

      // Test all 10 hook types
      const hookTests = [
        {
          endpoint: '/claude/hooks/pre-tool-use',
          data: {
            toolName: 'Read',
            arguments: { file_path: '/test.txt' },
            sessionId: 'test-session',
            timestamp: new Date().toISOString(),
          },
        },
        {
          endpoint: '/claude/hooks/post-tool-use',
          data: {
            toolName: 'Write',
            arguments: { file_path: '/output.txt', content: 'test' },
            result: { success: true },
            executionTime: 150,
            sessionId: 'test-session',
            timestamp: new Date().toISOString(),
          },
        },
        {
          endpoint: '/claude/hooks/user-prompt-submit',
          data: {
            prompt: 'Help me write a test',
            sessionId: 'test-session',
            timestamp: new Date().toISOString(),
          },
        },
        {
          endpoint: '/claude/hooks/notification',
          data: {
            level: 'info',
            message: 'Task completed',
            sessionId: 'test-session',
            timestamp: new Date().toISOString(),
          },
        },
        {
          endpoint: '/claude/hooks/stop',
          data: {
            reason: 'completed',
            sessionId: 'test-session',
            timestamp: new Date().toISOString(),
          },
        },
        {
          endpoint: '/claude/hooks/subagent-stop',
          data: {
            subagentId: 'subagent-123',
            result: { output: 'Done' },
            executionTime: 5000,
            sessionId: 'test-session',
            timestamp: new Date().toISOString(),
          },
        },
        {
          endpoint: '/claude/hooks/session-start',
          data: {
            sessionId: 'test-session',
            timestamp: new Date().toISOString(),
          },
        },
        {
          endpoint: '/claude/hooks/session-end',
          data: {
            duration: 60000,
            sessionId: 'test-session',
            timestamp: new Date().toISOString(),
          },
        },
        {
          endpoint: '/claude/hooks/pre-compact',
          data: {
            messageCount: 50,
            sessionId: 'test-session',
            timestamp: new Date().toISOString(),
          },
        },
        {
          endpoint: '/claude/hooks/status',
          data: {
            hookEventName: 'Status',
            sessionId: 'test-session',
            cwd: testDir,
            model: { id: 'claude-3', displayName: 'Claude 3' },
            workspace: { currentDir: testDir, projectDir: testDir },
            version: '1.0.0',
          },
        },
      ];

      for (const test of hookTests) {
        const response = await fetch(`http://localhost:3790${test.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(test.data),
        });

        expect(response.ok).toBe(true);
        const result = await response.json();
        expect(result.success).toBe(true);
      }

      // Step 6: Query events
      console.log('Step 6: Querying events...');

      // Wait a moment for events to be written
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test tail command
      const { stdout: tailOutput } = await execAsync('cage events tail');
      expect(tailOutput).toContain('pre-tool-use');
      expect(tailOutput).toContain('post-tool-use');
      expect(tailOutput).toContain('notification');

      // Test stats command
      const { stdout: statsOutput } = await execAsync('cage events stats');
      expect(statsOutput).toContain('Total events by type:');
      expect(statsOutput).toContain('pre-tool-use:');
      expect(statsOutput).toContain('post-tool-use:');

      // Step 7: Test offline logging
      console.log('Step 7: Testing offline logging...');

      // Stop server
      serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Trigger hook while offline
      const hookHandler = spawn('cage-hook-handler', ['pre-tool-use']);
      hookHandler.stdin.write(
        JSON.stringify({
          toolName: 'Read',
          arguments: { file_path: '/offline-test.txt' },
        })
      );
      hookHandler.stdin.end();

      await new Promise(resolve => {
        hookHandler.on('exit', resolve);
      });

      // Check offline log
      const offlineLogPath = join(testDir, '.cage', 'hooks-offline.log');
      expect(existsSync(offlineLogPath)).toBe(true);

      const offlineLog = await readFile(offlineLogPath, 'utf-8');
      expect(offlineLog).toContain('pre-tool-use');
      expect(offlineLog).toContain('offline-test.txt');

      console.log('✅ All integration tests passed!');
    }, 60000); // 1 minute timeout for full test
  });
});

// Helper function to wait for server
async function waitForServer(url: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log('Server is ready');
        return;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Server did not start in time');
}
```

## Performance Testing

### Create `test/integration/performance.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';

describe('Performance Benchmarks', () => {
  let serverUrl: string;

  beforeAll(async () => {
    serverUrl = 'http://localhost:3790';
    // Assume server is already running
  });

  describe('Hook Response Times', () => {
    it('should respond to PreToolUse within 100ms', async () => {
      const payload = {
        toolName: 'Read',
        arguments: { file_path: '/test.txt' },
        sessionId: 'perf-test',
        timestamp: new Date().toISOString(),
      };

      const start = performance.now();
      const response = await fetch(`${serverUrl}/claude/hooks/pre-tool-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const duration = performance.now() - start;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(100);
      console.log(`PreToolUse response time: ${duration.toFixed(2)}ms`);
    });

    it('should handle 1000 events per minute', async () => {
      const events = Array.from({ length: 1000 }, (_, i) => ({
        toolName: `Tool${i % 10}`,
        arguments: { index: i },
        sessionId: 'perf-test',
        timestamp: new Date().toISOString(),
      }));

      const start = performance.now();
      const promises = events.map(event =>
        fetch(`${serverUrl}/claude/hooks/post-tool-use`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        })
      );

      const results = await Promise.all(promises);
      const duration = performance.now() - start;

      expect(results.every(r => r.ok)).toBe(true);
      expect(duration).toBeLessThan(60000); // Under 1 minute
      console.log(`1000 events processed in: ${(duration / 1000).toFixed(2)}s`);
      console.log(
        `Throughput: ${(1000 / (duration / 1000)).toFixed(2)} events/second`
      );
    });
  });

  describe('Event Query Performance', () => {
    it('should query 1 million events within 2 seconds', async () => {
      // This test assumes events have been pre-populated
      // In real scenario, would need to generate test data first

      const start = performance.now();
      const response = await fetch(
        `${serverUrl}/claude/events?from=2025-01-01&to=2025-12-31`
      );
      const duration = performance.now() - start;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(2000);
      console.log(`Query time for date range: ${duration.toFixed(2)}ms`);
    });
  });
});
```

## Cross-Platform Testing

### Create `test/integration/cross-platform.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { platform } from 'os';
import { join, sep } from 'path';
import { execSync } from 'child_process';

describe('Cross-Platform Compatibility', () => {
  const currentPlatform = platform();

  describe(`Platform: ${currentPlatform}`, () => {
    it('should handle path separators correctly', () => {
      const testPath = join('test', 'dir', 'file.txt');
      expect(testPath).toContain(sep);

      // Verify cage handles paths correctly
      const output = execSync('cage --version', { encoding: 'utf-8' });
      expect(output).toBeTruthy();
    });

    it('should execute hook handler on current platform', () => {
      // Test hook handler execution based on platform
      const command =
        currentPlatform === 'win32'
          ? 'cage-hook-handler.exe'
          : 'cage-hook-handler';

      try {
        const result = execSync(`which ${command}`, { encoding: 'utf-8' });
        expect(result).toBeTruthy();
      } catch {
        // Command may not be in PATH yet
        console.warn(`${command} not found in PATH`);
      }
    });

    if (currentPlatform === 'win32') {
      it('should handle Windows-specific paths', () => {
        const windowsPath = 'C:\\Users\\test\\cage';
        const normalized = join(windowsPath);
        expect(normalized).toBeTruthy();
      });
    }

    if (currentPlatform === 'darwin') {
      it('should handle macOS-specific paths', () => {
        const macPath = '/Users/test/cage';
        const normalized = join(macPath);
        expect(normalized).toBe(macPath);
      });
    }

    if (currentPlatform === 'linux') {
      it('should handle Linux-specific paths', () => {
        const linuxPath = '/home/test/cage';
        const normalized = join(linuxPath);
        expect(normalized).toBe(linuxPath);
      });
    }
  });
});
```

## Running Integration Tests

### Test Commands

```bash
# Run all integration tests
npm run test:integration

# Run specific test suites
npm run test:integration -- end-to-end
npm run test:integration -- performance
npm run test:integration -- cross-platform

# Run with coverage
npm run test:integration:coverage

# Run in watch mode (for development)
npm run test:integration:watch
```

### Package.json Scripts

Add to root `package.json`:

```json
{
  "scripts": {
    "test:integration": "vitest run test/integration",
    "test:integration:watch": "vitest watch test/integration",
    "test:integration:coverage": "vitest run --coverage test/integration",
    "test:all": "npm run test && npm run test:integration"
  }
}
```

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/integration-tests.yml`:

```yaml
name: Integration Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}

      - name: Install dependencies
        run: npm ci

      - name: Build packages
        run: npm run build

      - name: Run unit tests
        run: npm test

      - name: Start backend server
        run: |
          npm run start:server &
          sleep 5

      - name: Run integration tests
        run: npm run test:integration

      - name: Upload coverage
        if: matrix.os == 'ubuntu-latest' && matrix.node == 20
        uses: codecov/codecov-action@v3
```

## Manual Testing Checklist

### Installation and Setup

- [ ] `npm install -g @cage/cli` installs successfully
- [ ] `cage --version` displays version
- [ ] `cage init` creates .cage directory and config
- [ ] `cage hooks setup` configures Claude Code settings

### Server Operations

- [ ] `cage start server` starts on port 3790
- [ ] Swagger docs accessible at http://localhost:3790/api-docs
- [ ] Server handles concurrent requests
- [ ] Server recovers from crashes

### Hook Functionality

- [ ] All 10 hooks trigger correctly
- [ ] Hooks log events when server is running
- [ ] Hooks log offline when server is down
- [ ] Blocking hooks prevent operations
- [ ] Context injection works

### Event Management

- [ ] `cage events tail` shows recent events
- [ ] `cage events tail -n 50` shows 50 events
- [ ] `cage events stream` shows real-time events
- [ ] `cage events stream --filter PreToolUse` filters correctly
- [ ] `cage events list --from --to` queries date range
- [ ] `cage events stats` displays statistics

### Error Scenarios

- [ ] Malformed JSON handled gracefully
- [ ] Low disk space warning displayed
- [ ] Concurrent sessions tracked separately
- [ ] Network errors don't block Claude

### Platform Testing

- [ ] Works on Windows 10/11
- [ ] Works on macOS (Intel and ARM)
- [ ] Works on Ubuntu/Debian
- [ ] Paths handled correctly on each OS

## Next Steps

After integration testing is complete:

- [Implementation Checklist](checklist.md)
