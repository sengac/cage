import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { createServer } from 'http';
import type { Server } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';

const HOOK_HANDLER_PATH = join(process.cwd(), 'packages/hooks/dist/cage-hook-handler.js');

// Mock server response interface
interface MockResponse {
  status?: number;
  body?: unknown;
  error?: boolean;
}

describe('Hook Handler Integration', { concurrent: false }, () => {
  let testDir: string;
  let originalCwd: string;
  let testServer: Server;
  let mockResponses: Map<string, MockResponse> = new Map();

  // Helper to create a clean mock server
  const createMockServer = () => {
    return createServer((req: IncomingMessage, res: ServerResponse) => {
      const path = req.url || '';
      const mock = mockResponses.get(path);

      if (mock?.error) {
        // Simulate network error by destroying the connection
        req.socket.destroy();
        return;
      }

      const status = mock?.status || 200;
      const body = mock?.body || { success: true };

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(status);
      res.end(JSON.stringify(body));
    });
  };

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'cage-hook-test-'));
    process.chdir(testDir);

    // Clear mock responses
    mockResponses.clear();

    // Create and start test server
    testServer = createMockServer();
    await new Promise<void>((resolve) => {
      testServer.listen(3790, resolve);
    });

    // Create cage config
    await writeFile('cage.config.json', JSON.stringify({
      port: 3790
    }));
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });

    if (testServer) {
      await new Promise<void>((resolve) => {
        testServer.close(() => resolve());
      });
    }
  });

  describe('Hook Data Reception', () => {
    it('should receive JSON from stdin and forward to backend', async () => {
      // Set up mock response for successful case
      mockResponses.set('/api/claude/hooks/pre-tool-use', {
        body: { success: true }
      });

      const hookData = {
        toolName: 'Read',
        arguments: { file_path: '/test.txt' },
        sessionId: 'test-session'
      };

      const handler = spawn('node', [HOOK_HANDLER_PATH, 'pre-tool-use'], {
        env: {
          ...process.env,
          TEST_BASE_DIR: testDir,
          CLAUDE_PROJECT_DIR: testDir
        }
      });

      // Send data to stdin
      handler.stdin.write(JSON.stringify(hookData));
      handler.stdin.end();

      // Wait for handler to complete
      const exitCode = await new Promise<number>((resolve) => {
        handler.on('exit', (code) => {
          resolve(code || 0);
        });
      });

      // Should exit successfully
      expect(exitCode).toBe(0);
    });
  });

  describe('Offline Logging', () => {
    it('should log to file when backend is unreachable', async () => {
      // Set up mock to simulate network error
      mockResponses.set('/api/claude/hooks/post-tool-use', {
        error: true
      });

      const hookData = {
        toolName: 'Write',
        arguments: { file_path: '/test.txt' },
        sessionId: 'test-session'
      };

      // Create .cage directory
      await mkdir(join(testDir, '.cage'), { recursive: true });

      const handler = spawn('node', [HOOK_HANDLER_PATH, 'post-tool-use'], {
        env: {
          ...process.env,
          TEST_BASE_DIR: testDir,
          CLAUDE_PROJECT_DIR: testDir
        }
      });

      handler.stdin.write(JSON.stringify(hookData));
      handler.stdin.end();

      const exitCode = await new Promise<number>((resolve) => {
        handler.on('exit', (code) => resolve(code || 0));
      });

      // Should not block Claude (exit 0)
      expect(exitCode).toBe(0);

      // Check offline log was created
      const logPath = join(testDir, '.cage', 'hooks-offline.log');
      expect(existsSync(logPath)).toBe(true);

      const logContent = await readFile(logPath, 'utf-8');
      expect(logContent).toContain('post-tool-use');
      expect(logContent).toContain('fetch failed');
    });
  });

  describe('Blocking Operations', () => {
    it('should block Claude when backend returns block=true', async () => {
      // Set up mock response for blocking case
      mockResponses.set('/api/claude/hooks/pre-tool-use', {
        body: {
          success: false,
          block: true,
          message: 'Operation not allowed'
        }
      });

      const handler = spawn('node', [HOOK_HANDLER_PATH, 'pre-tool-use'], {
        env: {
          ...process.env,
          TEST_BASE_DIR: testDir,
          CLAUDE_PROJECT_DIR: testDir
        }
      });

      handler.stdin.write(JSON.stringify({ toolName: 'Delete' }));
      handler.stdin.end();

      let stderr = '';
      handler.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const exitCode = await new Promise<number>((resolve) => {
        handler.on('exit', (code) => resolve(code || 0));
      });

      // Exit code 2 blocks Claude
      expect(exitCode).toBe(2);
      expect(stderr).toContain('Operation not allowed');
    });
  });

  describe('Context Injection', () => {
    it('should output context to stdout for injection', async () => {
      // Set up mock response for context injection case
      mockResponses.set('/api/claude/hooks/user-prompt-submit', {
        body: {
          success: true,
          output: 'Additional context: Project uses TypeScript'
        }
      });

      const handler = spawn('node', [HOOK_HANDLER_PATH, 'user-prompt-submit'], {
        env: {
          ...process.env,
          TEST_BASE_DIR: testDir,
          CLAUDE_PROJECT_DIR: testDir
        }
      });

      handler.stdin.write(JSON.stringify({ prompt: 'Help me write code' }));
      handler.stdin.end();

      let stdout = '';
      handler.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      const exitCode = await new Promise<number>((resolve) => {
        handler.on('exit', (code) => resolve(code || 0));
      });

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Additional context: Project uses TypeScript');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON input gracefully', async () => {
      // Set up mock response for successful case
      mockResponses.set('/api/claude/hooks/pre-tool-use', {
        body: { success: true }
      });

      const handler = spawn('node', [HOOK_HANDLER_PATH, 'pre-tool-use'], {
        env: {
          ...process.env,
          TEST_BASE_DIR: testDir,
          CLAUDE_PROJECT_DIR: testDir
        }
      });

      // Send malformed JSON
      handler.stdin.write('this is not valid json');
      handler.stdin.end();

      const exitCode = await new Promise<number>((resolve) => {
        handler.on('exit', (code) => resolve(code || 0));
      });

      // Should not block Claude Code even with malformed data
      expect(exitCode).toBe(0);
    });

    it('should handle empty input gracefully', async () => {
      // Set up mock response for successful case
      mockResponses.set('/api/claude/hooks/pre-tool-use', {
        body: { success: true }
      });

      const handler = spawn('node', [HOOK_HANDLER_PATH, 'pre-tool-use'], {
        env: {
          ...process.env,
          TEST_BASE_DIR: testDir,
          CLAUDE_PROJECT_DIR: testDir
        }
      });

      // Send empty input
      handler.stdin.end();

      const exitCode = await new Promise<number>((resolve) => {
        handler.on('exit', (code) => resolve(code || 0));
      });

      // Should not block Claude Code with empty input
      expect(exitCode).toBe(0);
    });

    it('should handle backend 400 responses gracefully', async () => {
      // Set up mock response for 400 error case
      mockResponses.set('/api/claude/hooks/pre-tool-use', {
        status: 400,
        body: { error: 'Bad Request' }
      });

      const handler = spawn('node', [HOOK_HANDLER_PATH, 'pre-tool-use'], {
        env: {
          ...process.env,
          TEST_BASE_DIR: testDir,
          CLAUDE_PROJECT_DIR: testDir
        }
      });

      handler.stdin.write(JSON.stringify({ toolName: 'Read' }));
      handler.stdin.end();

      const exitCode = await new Promise<number>((resolve) => {
        handler.on('exit', (code) => resolve(code || 0));
      });

      // Should log error but not block Claude Code
      expect(exitCode).toBe(0);

      // Check offline log was created
      const logPath = join(testDir, '.cage', 'hooks-offline.log');
      expect(existsSync(logPath)).toBe(true);

      const logContent = await readFile(logPath, 'utf-8');
      expect(logContent).toContain('Backend returned 400');
    });
  });
});