/**
 * HooksController SSE Integration Tests
 *
 * CRITICAL: These tests verify the COMPLETE end-to-end flow:
 * HooksController → EventLoggerService → EventEmitter2 → SSE broadcast
 *
 * This test would have caught the bug where HooksController was using
 * `new EventLoggerService()` instead of dependency injection.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppModule } from '../../src/app.module';
import { HooksController } from '../../src/hooks.controller';

describe('HooksController SSE Integration (Acceptance)', () => {
  let module: TestingModule;
  let hooksController: HooksController;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await module.init();

    hooksController = module.get<HooksController>(HooksController);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('PreToolUse Hook', () => {
    it('CRITICAL: Must emit hook.event.added event through EventLoggerService when preToolUse is called', async () => {
      let eventReceived = false;
      let receivedPayload: {
        eventType: string;
        sessionId: string;
        timestamp: string;
      } | null = null;

      // Listen for the SSE notification event
      eventEmitter.on('hook.event.added', (payload) => {
        eventReceived = true;
        receivedPayload = payload;
      });

      // Call the actual controller method (this goes through EventLoggerService)
      await hooksController.preToolUse({
        timestamp: new Date().toISOString(),
        sessionId: 'test-session-123',
        toolName: 'Read',
        arguments: {
          file_path: '/test/file.ts',
        },
      });

      // CRITICAL: This MUST be true - if false, SSE notifications are broken
      expect(eventReceived).toBe(true);
      expect(receivedPayload).toBeDefined();
      expect(receivedPayload?.eventType).toBe('PreToolUse');
      expect(receivedPayload?.sessionId).toBe('test-session-123');
      expect(receivedPayload?.timestamp).toBeDefined();
    });

    it('Must emit hook.event.added with correct notification size (<200 bytes)', async () => {
      let receivedPayload: unknown = null;

      eventEmitter.on('hook.event.added', (payload) => {
        receivedPayload = payload;
      });

      await hooksController.preToolUse({
        timestamp: new Date().toISOString(),
        sessionId: 'test-session-123',
        toolName: 'Read',
        arguments: { file_path: '/test/file.ts' },
      });

      expect(receivedPayload).toBeDefined();

      const notificationSize = Buffer.byteLength(
        JSON.stringify(receivedPayload),
        'utf8'
      );
      expect(notificationSize).toBeLessThan(200);
    });
  });

  describe('PostToolUse Hook', () => {
    it('CRITICAL: Must emit hook.event.added event when postToolUse is called', async () => {
      let eventReceived = false;

      eventEmitter.on('hook.event.added', () => {
        eventReceived = true;
      });

      await hooksController.postToolUse({
        timestamp: new Date().toISOString(),
        sessionId: 'test-session-456',
        toolName: 'Write',
        arguments: { file_path: '/test/output.ts' },
        result: { success: true },
      });

      expect(eventReceived).toBe(true);
    });
  });

  describe('UserPromptSubmit Hook', () => {
    it('CRITICAL: Must emit hook.event.added event when userPromptSubmit is called', async () => {
      let eventReceived = false;

      eventEmitter.on('hook.event.added', () => {
        eventReceived = true;
      });

      await hooksController.userPromptSubmit({
        timestamp: new Date().toISOString(),
        sessionId: 'test-session-789',
        prompt: 'Test user prompt',
      });

      expect(eventReceived).toBe(true);
    });
  });

  describe('SessionStart Hook', () => {
    it('CRITICAL: Must emit hook.event.added event when sessionStart is called', async () => {
      let eventReceived = false;

      eventEmitter.on('hook.event.added', () => {
        eventReceived = true;
      });

      await hooksController.sessionStart({
        timestamp: new Date().toISOString(),
        sessionId: 'test-session-new',
      });

      expect(eventReceived).toBe(true);
    });
  });

  describe('SessionEnd Hook', () => {
    it('CRITICAL: Must emit hook.event.added event when sessionEnd is called', async () => {
      let eventReceived = false;

      eventEmitter.on('hook.event.added', () => {
        eventReceived = true;
      });

      await hooksController.sessionEnd({
        timestamp: new Date().toISOString(),
        sessionId: 'test-session-end',
      });

      expect(eventReceived).toBe(true);
    });
  });

  describe('Notification Hook', () => {
    it('CRITICAL: Must emit hook.event.added event when notification is called', async () => {
      let eventReceived = false;

      eventEmitter.on('hook.event.added', () => {
        eventReceived = true;
      });

      await hooksController.notification({
        timestamp: new Date().toISOString(),
        sessionId: 'test-session-notify',
        message: 'Test notification',
      });

      expect(eventReceived).toBe(true);
    });
  });

  describe('PreCompact Hook', () => {
    it('CRITICAL: Must emit hook.event.added event when preCompact is called', async () => {
      let eventReceived = false;

      eventEmitter.on('hook.event.added', () => {
        eventReceived = true;
      });

      await hooksController.preCompact({
        timestamp: new Date().toISOString(),
        sessionId: 'test-session-compact',
      });

      expect(eventReceived).toBe(true);
    });
  });

  describe('Stop Hook', () => {
    it('CRITICAL: Must emit hook.event.added event when stop is called', async () => {
      let eventReceived = false;

      eventEmitter.on('hook.event.added', () => {
        eventReceived = true;
      });

      await hooksController.stop({
        timestamp: new Date().toISOString(),
        sessionId: 'test-session-stop',
      });

      expect(eventReceived).toBe(true);
    });
  });

  describe('SubagentStop Hook', () => {
    it('CRITICAL: Must emit hook.event.added event when subagentStop is called', async () => {
      let eventReceived = false;

      eventEmitter.on('hook.event.added', () => {
        eventReceived = true;
      });

      await hooksController.subagentStop({
        timestamp: new Date().toISOString(),
        sessionId: 'test-session-subagent',
      });

      expect(eventReceived).toBe(true);
    });
  });

  describe('EventLoggerService Dependency Injection', () => {
    it('CRITICAL: HooksController MUST use dependency injection for EventLoggerService', async () => {
      // This test verifies that EventLoggerService is properly injected
      // If HooksController uses `new EventLoggerService()`, this will fail
      // because the eventEmitter will be undefined

      // Verify by testing the actual behavior: if DI works, events are emitted
      let eventReceived = false;

      eventEmitter.on('hook.event.added', () => {
        eventReceived = true;
      });

      // If EventLoggerService was manually instantiated, eventEmitter is undefined
      // and this will NOT emit an event, causing the test to fail
      await hooksController.preToolUse({
        timestamp: new Date().toISOString(),
        sessionId: 'di-test',
        toolName: 'Test',
        arguments: {},
      });

      // This PROVES dependency injection works - if eventEmitter was undefined,
      // no event would be emitted and this would fail
      expect(eventReceived).toBe(true);
    });
  });

  describe('Full End-to-End Flow', () => {
    it('CRITICAL: Multiple hooks must all emit events correctly', async () => {
      const receivedEvents: string[] = [];

      eventEmitter.on('hook.event.added', (payload: { eventType: string }) => {
        receivedEvents.push(payload.eventType);
      });

      // Call multiple hook endpoints
      await hooksController.preToolUse({
        timestamp: new Date().toISOString(),
        sessionId: 'test-multi',
        toolName: 'Read',
        arguments: {},
      });

      await hooksController.postToolUse({
        timestamp: new Date().toISOString(),
        sessionId: 'test-multi',
        toolName: 'Read',
        arguments: {},
        result: {},
      });

      await hooksController.userPromptSubmit({
        timestamp: new Date().toISOString(),
        sessionId: 'test-multi',
        prompt: 'test',
      });

      // All three events should have been emitted
      expect(receivedEvents).toHaveLength(3);
      expect(receivedEvents).toContain('PreToolUse');
      expect(receivedEvents).toContain('PostToolUse');
      expect(receivedEvents).toContain('UserPromptSubmit');
    });
  });
});