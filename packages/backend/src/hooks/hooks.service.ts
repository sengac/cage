import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  HookType,
  Logger,
  PreToolUsePayload,
  PostToolUsePayload,
  UserPromptSubmitPayload,
  NotificationPayload,
  StopPayload,
  SubagentStopPayload,
  SessionStartPayload,
  SessionEndPayload,
  PreCompactPayload,
  StatusPayload
} from '@cage/shared';
import { EventLoggerService, EventLogEntry } from '../services/event-logger.service.js';

type HookPayload =
  | PreToolUsePayload
  | PostToolUsePayload
  | UserPromptSubmitPayload
  | NotificationPayload
  | StopPayload
  | SubagentStopPayload
  | SessionStartPayload
  | SessionEndPayload
  | PreCompactPayload
  | StatusPayload;

interface HookEvent {
  type: HookType;
  payload: HookPayload;
  timestamp: string;
}

@Injectable()
export class HooksService {
  private readonly logger = new Logger();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly eventLogger: EventLoggerService
  ) {}

  async handleHook(type: HookType, payload: HookPayload): Promise<{ success: boolean; timestamp: string }> {
    const timestamp = new Date().toISOString();

    try {
      // Log the hook event
      const logEntry: EventLogEntry = {
        timestamp,
        eventType: type,
        sessionId: payload.sessionId
      };

      // Add optional fields if they exist
      if ('toolName' in payload) {
        logEntry.toolName = payload.toolName as string;
      }
      if ('arguments' in payload) {
        logEntry.arguments = payload.arguments as Record<string, unknown>;
      }
      if ('result' in payload) {
        logEntry.results = payload.result as Record<string, unknown>;
      }

      await this.eventLogger.logEvent(logEntry);

      // Emit event for real-time streaming
      const hookEvent: HookEvent = {
        type,
        payload,
        timestamp
      };

      this.eventEmitter.emit('hook.received', hookEvent);

      this.logger.info(`Hook processed: ${type}`, {
        sessionId: payload.sessionId,
        timestamp
      });

      // Return response within 100ms requirement
      return {
        success: true,
        timestamp
      };

    } catch (error) {
      this.logger.error(`Hook processing failed: ${type}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: payload.sessionId
      });

      // Still return success to not block Claude Code
      return {
        success: true,
        timestamp
      };
    }
  }
}