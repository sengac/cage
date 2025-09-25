import { describe, it, expect } from 'vitest';
import type { z } from 'zod';

import {
  PreToolUsePayloadSchema,
  PostToolUsePayloadSchema,
  UserPromptSubmitPayloadSchema,
  NotificationPayloadSchema,
  StopPayloadSchema,
  SubagentStopPayloadSchema,
  SessionStartPayloadSchema,
  SessionEndPayloadSchema,
  PreCompactPayloadSchema,
  HookResponseSchema,
} from './hooks';

describe('Hook Payload Schemas - Complete Coverage for All 9 Hook Types', () => {
  describe('PreToolUsePayloadSchema', () => {
    it('should validate a valid PreToolUse payload', () => {
      const payload = {
        toolName: 'Read',
        arguments: { file_path: '/test.txt' },
        sessionId: 'session-123',
        timestamp: new Date().toISOString(),
      };

      const result = PreToolUsePayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.toolName).toBe('Read');
        expect(result.data.arguments).toEqual({ file_path: '/test.txt' });
      }
    });

    it('should reject invalid payload missing required fields', () => {
      const payload = { toolName: 123 }; // Invalid type and missing fields

      const result = PreToolUsePayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('PostToolUsePayloadSchema', () => {
    it('should validate PostToolUse with result and execution time', () => {
      const payload = {
        toolName: 'Write',
        arguments: { file_path: '/test.txt', content: 'data' },
        result: { success: true, bytesWritten: 4 },
        executionTime: 150,
        sessionId: 'session-123',
        timestamp: new Date().toISOString(),
      };

      const result = PostToolUsePayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.executionTime).toBe(150);
        expect(result.data.result).toEqual({ success: true, bytesWritten: 4 });
      }
    });

    it('should accept optional error field', () => {
      const payload = {
        toolName: 'Read',
        arguments: { file_path: '/nonexistent.txt' },
        result: null,
        executionTime: 50,
        error: 'File not found',
        sessionId: 'session-123',
        timestamp: new Date().toISOString(),
      };

      const result = PostToolUsePayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error).toBe('File not found');
      }
    });
  });

  describe('UserPromptSubmitPayloadSchema', () => {
    it('should validate user prompt with context', () => {
      const payload = {
        prompt: 'Help me write a function',
        context: {
          previousMessages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
          ],
          currentFile: '/src/app.ts',
        },
        sessionId: 'session-123',
        timestamp: new Date().toISOString(),
      };

      const result = UserPromptSubmitPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prompt).toBe('Help me write a function');
        expect(result.data.context?.previousMessages).toHaveLength(2);
      }
    });

    it('should accept payload without optional context', () => {
      const payload = {
        prompt: 'Simple question',
        sessionId: 'session-123',
        timestamp: new Date().toISOString(),
      };

      const result = UserPromptSubmitPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('NotificationPayloadSchema', () => {
    it('should validate notification with different levels', () => {
      const payloads = [
        { level: 'info', message: 'Task completed' },
        { level: 'warning', message: 'Low disk space' },
        { level: 'error', message: 'Operation failed' },
      ];

      payloads.forEach(p => {
        const payload = {
          ...p,
          sessionId: 'session-123',
          timestamp: new Date().toISOString(),
        };

        const result = NotificationPayloadSchema.safeParse(payload);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.level).toBe(p.level);
          expect(result.data.message).toBe(p.message);
        }
      });
    });

    it('should reject invalid notification level', () => {
      const payload = {
        level: 'critical', // Invalid level
        message: 'Test',
        sessionId: 'session-123',
        timestamp: new Date().toISOString(),
      };

      const result = NotificationPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('StopPayloadSchema', () => {
    it('should validate Stop event with reason', () => {
      const payload = {
        reason: 'Task completed successfully',
        finalState: {
          filesModified: 3,
          testsRun: 10,
          testsPassed: 10,
        },
        sessionId: 'session-123',
        timestamp: new Date().toISOString(),
      };

      const result = StopPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBe('Task completed successfully');
        expect(result.data.finalState?.filesModified).toBe(3);
      }
    });
  });

  describe('SubagentStopPayloadSchema', () => {
    it('should validate SubagentStop event with results', () => {
      const payload = {
        subagentId: 'subagent-456',
        parentSessionId: 'session-123',
        result: {
          success: true,
          output: 'Analysis complete',
          metrics: {
            duration: 5000,
            resourcesUsed: ['file-reader', 'analyzer'],
          },
        },
        sessionId: 'subagent-session-789',
        timestamp: new Date().toISOString(),
      };

      const result = SubagentStopPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subagentId).toBe('subagent-456');
        expect(result.data.result?.success).toBe(true);
      }
    });
  });

  describe('SessionStartPayloadSchema', () => {
    it('should validate SessionStart event', () => {
      const payload = {
        sessionId: 'session-123',
        projectPath: '/home/user/project',
        environment: {
          nodeVersion: '20.0.0',
          platform: 'darwin',
          cwd: '/home/user/project',
        },
        timestamp: new Date().toISOString(),
      };

      const result = SessionStartPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projectPath).toBe('/home/user/project');
        expect(result.data.environment?.platform).toBe('darwin');
      }
    });
  });

  describe('SessionEndPayloadSchema', () => {
    it('should validate SessionEnd event with summary', () => {
      const payload = {
        sessionId: 'session-123',
        duration: 30000,
        summary: {
          toolsUsed: ['Read', 'Write', 'Bash'],
          filesModified: ['app.ts', 'test.ts'],
          errors: 0,
          warnings: 2,
        },
        timestamp: new Date().toISOString(),
      };

      const result = SessionEndPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.duration).toBe(30000);
        expect(result.data.summary?.toolsUsed).toContain('Read');
      }
    });
  });

  describe('PreCompactPayloadSchema', () => {
    it('should validate PreCompact event', () => {
      const payload = {
        sessionId: 'session-123',
        reason: 'Context limit approaching',
        currentTokenCount: 95000,
        maxTokenCount: 100000,
        timestamp: new Date().toISOString(),
      };

      const result = PreCompactPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBe('Context limit approaching');
        expect(result.data.currentTokenCount).toBe(95000);
      }
    });
  });

  describe('HookResponseSchema', () => {
    it('should validate standard hook response', () => {
      const response = {
        success: true,
        message: 'Hook processed successfully',
      };

      const result = HookResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
        expect(result.data.message).toBe('Hook processed successfully');
      }
    });

    it('should validate hook response with context injection', () => {
      const response = {
        success: true,
        message: 'Context injected',
        contextToInject: 'Remember to follow coding standards',
        data: {
          customField: 'value',
        },
      };

      const result = HookResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.contextToInject).toBe(
          'Remember to follow coding standards'
        );
        expect(result.data.data?.customField).toBe('value');
      }
    });

    it('should validate hook response with warning', () => {
      const response = {
        success: false,
        message: 'Low disk space',
        warning: 'Low disk space, events not persisted',
      };

      const result = HookResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(false);
        expect(result.data.warning).toBe(
          'Low disk space, events not persisted'
        );
      }
    });
  });
});
