import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { EventLoggerService } from './event-logger.service';
import { Logger } from '@cage/shared';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  PreToolUseDto,
  PostToolUseDto,
  UserPromptSubmitDto,
  SessionStartDto,
  SessionEndDto,
  NotificationDto,
  PreCompactDto,
  StopDto,
  SubagentStopDto,
  HookResponseDto,
  HooksStatusDto,
  HookInfoDto,
} from './dto/hooks.dto';

@ApiTags('Hooks')
@Controller('claude/hooks')
export class HooksController {
  private readonly logger = new Logger({ context: 'HooksController' });

  constructor(private readonly eventLogger: EventLoggerService) {}

  @Post('pre-tool-use')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pre-Tool Use Hook',
    description:
      'Triggered before Claude executes a tool. This allows you to validate, modify, or block tool executions.',
  })
  @ApiBody({ type: PreToolUseDto })
  @ApiResponse({
    status: 200,
    description: 'Hook processed successfully',
    type: HookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload structure',
  })
  async preToolUse(
    @Body() payload: Record<string, unknown>
  ): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      this.logger.info('PreToolUse payload:', JSON.stringify(payload, null, 2));

      await this.eventLogger.logEvent({
        timestamp: payload.timestamp || timestamp,
        eventType: 'PreToolUse',
        sessionId: payload.sessionId || 'unknown',
        toolName: payload.toolName,
        arguments: payload.arguments,
        raw_payload: payload,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      this.logger.error('PreToolUse hook error:', error);
      return {
        success: true,
        timestamp,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('post-tool-use')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Post-Tool Use Hook',
    description:
      'Triggered after Claude executes a tool. Captures tool execution results and performance metrics.',
  })
  @ApiBody({ type: PostToolUseDto })
  @ApiResponse({
    status: 200,
    description: 'Hook processed successfully',
    type: HookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload structure',
  })
  async postToolUse(
    @Body() payload: Record<string, unknown>
  ): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      this.logger.info('PostToolUse payload:', JSON.stringify(payload, null, 2));

      await this.eventLogger.logEvent({
        timestamp: payload.timestamp || timestamp,
        eventType: 'PostToolUse',
        sessionId: payload.sessionId || 'unknown',
        toolName: payload.toolName,
        arguments: payload.arguments,
        result: payload.result,
        executionTime: payload.executionTime,
        error: payload.error,
        raw_payload: payload,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      this.logger.error('PostToolUse hook error:', error);
      return {
        success: true,
        timestamp,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('user-prompt-submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User Prompt Submit Hook',
    description:
      'Triggered when a user submits a prompt to Claude. Captures user intent and context.',
  })
  @ApiBody({ type: UserPromptSubmitDto })
  @ApiResponse({
    status: 200,
    description: 'Hook processed successfully',
    type: HookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload structure',
  })
  async userPromptSubmit(
    @Body() payload: Record<string, unknown>
  ): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      this.logger.info(
        'UserPromptSubmit payload:',
        JSON.stringify(payload, null, 2)
      );

      await this.eventLogger.logEvent({
        timestamp: payload.timestamp || timestamp,
        eventType: 'UserPromptSubmit',
        sessionId: payload.sessionId || 'unknown',
        prompt: payload.prompt,
        context: payload.context,
        raw_payload: payload,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      this.logger.error('UserPromptSubmit hook error:', error);
      return {
        success: true,
        timestamp,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('session-start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Session Start Hook',
    description:
      'Triggered when a new Claude session begins. Captures session initialization and environment details.',
  })
  @ApiBody({ type: SessionStartDto })
  @ApiResponse({
    status: 200,
    description: 'Hook processed successfully',
    type: HookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload structure',
  })
  async sessionStart(
    @Body() payload: Record<string, unknown>
  ): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      this.logger.info('SessionStart payload:', JSON.stringify(payload, null, 2));

      await this.eventLogger.logEvent({
        timestamp: payload.timestamp || timestamp,
        eventType: 'SessionStart',
        sessionId: payload.sessionId || 'unknown',
        projectPath: payload.projectPath,
        environment: payload.environment,
        raw_payload: payload,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      this.logger.error('SessionStart hook error:', error);
      return {
        success: true,
        timestamp,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('session-end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Session End Hook',
    description:
      'Triggered when a Claude session ends. Captures session duration and summary statistics.',
  })
  @ApiBody({ type: SessionEndDto })
  @ApiResponse({
    status: 200,
    description: 'Hook processed successfully',
    type: HookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload structure',
  })
  async sessionEnd(
    @Body() payload: Record<string, unknown>
  ): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      this.logger.info('SessionEnd payload:', JSON.stringify(payload, null, 2));

      await this.eventLogger.logEvent({
        timestamp: payload.timestamp || timestamp,
        eventType: 'SessionEnd',
        sessionId: payload.sessionId || 'unknown',
        duration: payload.duration,
        summary: payload.summary,
        raw_payload: payload,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      this.logger.error('SessionEnd hook error:', error);
      return {
        success: true,
        timestamp,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('notification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Notification Hook',
    description:
      'Triggered when Claude sends notifications. Captures info, warning, and error messages.',
  })
  @ApiBody({ type: NotificationDto })
  @ApiResponse({
    status: 200,
    description: 'Hook processed successfully',
    type: HookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload structure',
  })
  async notification(
    @Body() payload: Record<string, unknown>
  ): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      this.logger.info('Notification payload:', JSON.stringify(payload, null, 2));

      await this.eventLogger.logEvent({
        timestamp: payload.timestamp || timestamp,
        eventType: 'Notification',
        sessionId: payload.sessionId || 'unknown',
        message: payload.message,
        level: payload.level,
        raw_payload: payload,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      this.logger.error('Notification hook error:', error);
      return {
        success: true,
        timestamp,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('pre-compact')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pre-Compact Hook',
    description:
      'Triggered before Claude compacts conversation history to manage token limits.',
  })
  @ApiBody({ type: PreCompactDto })
  @ApiResponse({
    status: 200,
    description: 'Hook processed successfully',
    type: HookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload structure',
  })
  async preCompact(
    @Body() payload: Record<string, unknown>
  ): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      this.logger.info('PreCompact payload:', JSON.stringify(payload, null, 2));

      await this.eventLogger.logEvent({
        timestamp: payload.timestamp || timestamp,
        eventType: 'PreCompact',
        sessionId: payload.sessionId || 'unknown',
        reason: payload.reason,
        currentTokenCount: payload.currentTokenCount,
        maxTokenCount: payload.maxTokenCount,
        raw_payload: payload,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      this.logger.error('PreCompact hook error:', error);
      return {
        success: true,
        timestamp,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stop Hook',
    description:
      'Triggered when Claude completes a task or is interrupted by the user.',
  })
  @ApiBody({ type: StopDto })
  @ApiResponse({
    status: 200,
    description: 'Hook processed successfully',
    type: HookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload structure',
  })
  async stop(
    @Body() payload: Record<string, unknown>
  ): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      this.logger.info('Stop payload:', JSON.stringify(payload, null, 2));

      await this.eventLogger.logEvent({
        timestamp: payload.timestamp || timestamp,
        eventType: 'Stop',
        sessionId: payload.sessionId || 'unknown',
        reason: payload.reason,
        finalState: payload.finalState,
        raw_payload: payload,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      this.logger.error('Stop hook error:', error);
      return {
        success: true,
        timestamp,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('subagent-stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Subagent Stop Hook',
    description: 'Triggered when a subagent completes its delegated task.',
  })
  @ApiBody({ type: SubagentStopDto })
  @ApiResponse({
    status: 200,
    description: 'Hook processed successfully',
    type: HookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload structure',
  })
  async subagentStop(
    @Body() payload: Record<string, unknown>
  ): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      this.logger.info('SubagentStop payload:', JSON.stringify(payload, null, 2));

      await this.eventLogger.logEvent({
        timestamp: payload.timestamp || timestamp,
        eventType: 'SubagentStop',
        sessionId: payload.sessionId || 'unknown',
        subagentId: payload.subagentId,
        parentSessionId: payload.parentSessionId,
        result: payload.result,
        raw_payload: payload,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      this.logger.error('SubagentStop hook error:', error);
      return {
        success: true,
        timestamp,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
