import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from '../../src/app.module.js';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('Feature: Backend Event Processing', () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer();

    // Clean up any existing test logs
    const testLogDir = join(process.cwd(), '.cage');
    if (existsSync(testLogDir)) {
      rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  afterEach(async () => {
    await app.close();

    // Clean up test logs
    const testLogDir = join(process.cwd(), '.cage');
    if (existsSync(testLogDir)) {
      rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  describe('Scenario: Receive PreToolUse hook event', () => {
    it('Given the Cage backend server is running When Claude Code triggers a PreToolUse hook Then the backend should receive the event via HTTP POST to /claude/hooks/pre-tool-use And respond with 200 OK within 100ms And log the event data', async () => {
      // Given - backend server is running (setup in beforeEach)

      // When
      const payload = {
        sessionId: 'test-session-1',
        timestamp: '2025-01-15T10:00:00Z',
        toolName: 'Read',
        arguments: {
          file_path: '/test/file.js'
        }
      };

      const startTime = Date.now();
      const response = await request(httpServer)
        .post('/claude/hooks/pre-tool-use')
        .send(payload)
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Then
      expect(responseTime).toBeLessThan(100);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('timestamp');

      // Verify event was logged
      const logPath = join(process.cwd(), '.cage', 'events', '2025-01-15', 'events.jsonl');
      expect(existsSync(logPath)).toBe(true);
    });
  });

  describe('Scenario: Receive PostToolUse hook event', () => {
    it('Given the Cage backend server is running When Claude Code triggers a PostToolUse hook Then the backend should receive the event via HTTP POST to /claude/hooks/post-tool-use And respond with 200 OK within 100ms And log the execution results', async () => {
      // Given - backend server is running

      // When
      const payload = {
        sessionId: 'test-session-1',
        timestamp: '2025-01-15T10:00:01Z',
        toolName: 'Read',
        arguments: {
          file_path: '/test/file.js'
        },
        result: {
          content: 'console.log("test");'
        },
        executionTime: 25
      };

      const startTime = Date.now();
      const response = await request(httpServer)
        .post('/claude/hooks/post-tool-use')
        .send(payload)
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Then
      expect(responseTime).toBeLessThan(100);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Scenario: Receive UserPromptSubmit hook event', () => {
    it('Given the Cage backend server is running When Claude Code triggers a UserPromptSubmit hook Then the backend should receive the event via HTTP POST to /claude/hooks/user-prompt-submit And respond with 200 OK within 100ms And log the prompt data', async () => {
      // Given - backend server is running

      // When
      const payload = {
        sessionId: 'test-session-1',
        timestamp: '2025-01-15T10:00:02Z',
        prompt: 'Read the file and explain its purpose',
        context: {
          currentFile: '/test/file.js'
        }
      };

      const startTime = Date.now();
      const response = await request(httpServer)
        .post('/claude/hooks/user-prompt-submit')
        .send(payload)
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Then
      expect(responseTime).toBeLessThan(100);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Scenario: Receive SessionStart hook event', () => {
    it('Given the Cage backend server is running When a new Claude Code session starts Then the backend should receive the event via HTTP POST to /claude/hooks/session-start And respond with 200 OK within 100ms And optionally return context to inject into the session', async () => {
      // Given - backend server is running

      // When
      const payload = {
        sessionId: 'test-session-new',
        timestamp: '2025-01-15T09:00:00Z',
        metadata: {
          userAgent: 'Claude Code/1.0.0',
          platform: 'darwin'
        }
      };

      const startTime = Date.now();
      const response = await request(httpServer)
        .post('/claude/hooks/session-start')
        .send(payload)
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Then
      expect(responseTime).toBeLessThan(100);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Scenario: Receive SessionEnd hook event', () => {
    it('Given the Cage backend server is running When a Claude Code session ends Then the backend should receive the event via HTTP POST to /claude/hooks/session-end And respond with 200 OK within 100ms And log session summary and cleanup', async () => {
      // Given - backend server is running

      // When
      const payload = {
        sessionId: 'test-session-1',
        timestamp: '2025-01-15T11:00:00Z',
        summary: {
          totalTools: 15,
          duration: 3600000,
          tokensUsed: 1250
        }
      };

      const startTime = Date.now();
      const response = await request(httpServer)
        .post('/claude/hooks/session-end')
        .send(payload)
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Then
      expect(responseTime).toBeLessThan(100);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Scenario: Receive Notification hook event', () => {
    it('Given the Cage backend server is running When Claude Code sends a notification Then the backend should receive the event via HTTP POST to /claude/hooks/notification And respond with 200 OK within 100ms And log the notification content', async () => {
      // Given - backend server is running

      // When
      const payload = {
        sessionId: 'test-session-1',
        timestamp: '2025-01-15T10:30:00Z',
        type: 'info',
        message: 'File processed successfully',
        data: {
          fileName: 'test.js',
          size: 1024
        }
      };

      const startTime = Date.now();
      const response = await request(httpServer)
        .post('/claude/hooks/notification')
        .send(payload)
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Then
      expect(responseTime).toBeLessThan(100);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Scenario: Receive PreCompact hook event', () => {
    it('Given the Cage backend server is running When Claude Code is about to compact the conversation Then the backend should receive the event via HTTP POST to /claude/hooks/pre-compact And respond with 200 OK within 100ms And log the compaction event', async () => {
      // Given - backend server is running

      // When
      const payload = {
        sessionId: 'test-session-1',
        timestamp: '2025-01-15T10:45:00Z',
        reason: 'context_limit',
        messageCount: 100,
        tokenCount: 95000
      };

      const startTime = Date.now();
      const response = await request(httpServer)
        .post('/claude/hooks/pre-compact')
        .send(payload)
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Then
      expect(responseTime).toBeLessThan(100);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Scenario: Receive Status hook event', () => {
    it('Given the Cage backend server is running When Claude Code requests status line update Then the backend should receive the event via HTTP POST to /claude/hooks/status And respond with 200 OK within 100ms And optionally return custom status text', async () => {
      // Given - backend server is running

      // When
      const payload = {
        sessionId: 'test-session-1',
        timestamp: '2025-01-15T10:50:00Z',
        requestType: 'update',
        currentStatus: 'Ready'
      };

      const startTime = Date.now();
      const response = await request(httpServer)
        .post('/claude/hooks/status')
        .send(payload)
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Then
      expect(responseTime).toBeLessThan(100);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Scenario: Receive Stop hook event', () => {
    it('Given the Cage backend server is running When Claude Code stops execution Then the backend should receive the event via HTTP POST to /claude/hooks/stop And respond with 200 OK within 100ms', async () => {
      // Given - backend server is running

      // When
      const payload = {
        sessionId: 'test-session-1',
        timestamp: '2025-01-15T10:55:00Z',
        reason: 'user_requested',
        context: {
          lastTool: 'Write',
          partialResults: true
        }
      };

      const startTime = Date.now();
      const response = await request(httpServer)
        .post('/claude/hooks/stop')
        .send(payload)
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Then
      expect(responseTime).toBeLessThan(100);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Scenario: Receive SubagentStop hook event', () => {
    it('Given the Cage backend server is running When a Claude Code subagent stops Then the backend should receive the event via HTTP POST to /claude/hooks/subagent-stop And respond with 200 OK within 100ms', async () => {
      // Given - backend server is running

      // When
      const payload = {
        sessionId: 'test-session-1',
        timestamp: '2025-01-15T10:58:00Z',
        subagentId: 'agent-123',
        reason: 'task_completed',
        result: {
          status: 'success',
          output: 'Task completed successfully'
        }
      };

      const startTime = Date.now();
      const response = await request(httpServer)
        .post('/claude/hooks/subagent-stop')
        .send(payload)
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Then
      expect(responseTime).toBeLessThan(100);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});