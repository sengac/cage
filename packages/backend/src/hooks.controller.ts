import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { EventLoggerService } from './event-logger.service';
import {
  PreToolUsePayload, PreToolUsePayloadSchema,
  PostToolUsePayload, PostToolUsePayloadSchema,
  UserPromptSubmitPayload, UserPromptSubmitPayloadSchema,
  SessionStartPayload, SessionStartPayloadSchema,
  SessionEndPayload, SessionEndPayloadSchema,
  NotificationPayload, NotificationPayloadSchema,
  PreCompactPayload, PreCompactPayloadSchema,
  StopPayload, StopPayloadSchema,
  SubagentStopPayload, SubagentStopPayloadSchema
} from '@cage/shared';

@Controller('claude/hooks')
export class HooksController {
  private eventLogger = new EventLoggerService();

  @Post('pre-tool-use')
  @HttpCode(HttpStatus.OK)
  async preToolUse(@Body() payload: PreToolUsePayload) {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = PreToolUsePayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'PreToolUse',
        sessionId: validatedPayload.sessionId,
        toolName: validatedPayload.toolName,
        arguments: validatedPayload.arguments,
      });

      return {
        success: true,
        timestamp
      };
    } catch (error) {
      console.error('PreToolUse hook error:', error);
      // Still return success but log the error for debugging
      return {
        success: true,
        timestamp,
        error: error.message
      };
    }
  }

  @Post('post-tool-use')
  @HttpCode(HttpStatus.OK)
  async postToolUse(@Body() payload: PostToolUsePayload) {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = PostToolUsePayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'PostToolUse',
        sessionId: validatedPayload.sessionId,
        toolName: validatedPayload.toolName,
        arguments: validatedPayload.arguments,
        result: validatedPayload.result,
        executionTime: validatedPayload.executionTime,
        error: validatedPayload.error,
      });

      return {
        success: true,
        timestamp
      };
    } catch (error) {
      console.error('PostToolUse hook error:', error);
      // Still return success but log the error for debugging
      return {
        success: true,
        timestamp,
        error: error.message
      };
    }
  }

  @Post('user-prompt-submit')
  @HttpCode(HttpStatus.OK)
  async userPromptSubmit(@Body() payload: UserPromptSubmitPayload) {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = UserPromptSubmitPayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'UserPromptSubmit',
        sessionId: validatedPayload.sessionId,
        prompt: validatedPayload.prompt,
        context: validatedPayload.context,
      });

      return {
        success: true,
        timestamp
      };
    } catch (error) {
      console.error('UserPromptSubmit hook error:', error);
      // Still return success but log the error for debugging
      return {
        success: true,
        timestamp,
        error: error.message
      };
    }
  }

  @Post('session-start')
  @HttpCode(HttpStatus.OK)
  async sessionStart(@Body() payload: SessionStartPayload) {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = SessionStartPayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'SessionStart',
        sessionId: validatedPayload.sessionId,
        projectPath: validatedPayload.projectPath,
        environment: validatedPayload.environment,
      });

      return {
        success: true,
        timestamp
      };
    } catch (error) {
      console.error('SessionStart hook error:', error);
      // Still return success but log the error for debugging
      return {
        success: true,
        timestamp,
        error: error.message
      };
    }
  }

  @Post('session-end')
  @HttpCode(HttpStatus.OK)
  async sessionEnd(@Body() payload: SessionEndPayload) {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = SessionEndPayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'SessionEnd',
        sessionId: validatedPayload.sessionId,
        duration: validatedPayload.duration,
        summary: validatedPayload.summary,
      });

      return {
        success: true,
        timestamp
      };
    } catch (error) {
      console.error('SessionEnd hook error:', error);
      // Still return success but log the error for debugging
      return {
        success: true,
        timestamp,
        error: error.message
      };
    }
  }

  @Post('notification')
  @HttpCode(HttpStatus.OK)
  async notification(@Body() payload: NotificationPayload) {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = NotificationPayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'Notification',
        sessionId: validatedPayload.sessionId,
        message: validatedPayload.message,
        level: validatedPayload.level,
      });

      return {
        success: true,
        timestamp
      };
    } catch (error) {
      console.error('Notification hook error:', error);
      // Still return success but log the error for debugging
      return {
        success: true,
        timestamp,
        error: error.message
      };
    }
  }

  @Post('pre-compact')
  @HttpCode(HttpStatus.OK)
  async preCompact(@Body() payload: PreCompactPayload) {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = PreCompactPayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'PreCompact',
        sessionId: validatedPayload.sessionId,
        reason: validatedPayload.reason,
        currentTokenCount: validatedPayload.currentTokenCount,
        maxTokenCount: validatedPayload.maxTokenCount,
      });

      return {
        success: true,
        timestamp
      };
    } catch (error) {
      console.error('PreCompact hook error:', error);
      // Still return success but log the error for debugging
      return {
        success: true,
        timestamp,
        error: error.message
      };
    }
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  async stop(@Body() payload: StopPayload) {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = StopPayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'Stop',
        sessionId: validatedPayload.sessionId,
        reason: validatedPayload.reason,
      });

      return {
        success: true,
        timestamp
      };
    } catch (error) {
      console.error('Stop hook error:', error);
      // Still return success but log the error for debugging
      return {
        success: true,
        timestamp,
        error: error.message
      };
    }
  }

  @Post('subagent-stop')
  @HttpCode(HttpStatus.OK)
  async subagentStop(@Body() payload: SubagentStopPayload) {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = SubagentStopPayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'SubagentStop',
        sessionId: validatedPayload.sessionId,
        subagentId: validatedPayload.subagentId,
        parentSessionId: validatedPayload.parentSessionId,
        result: validatedPayload.result,
      });

      return {
        success: true,
        timestamp
      };
    } catch (error) {
      console.error('SubagentStop hook error:', error);
      // Still return success but log the error for debugging
      return {
        success: true,
        timestamp,
        error: error.message
      };
    }
  }
}