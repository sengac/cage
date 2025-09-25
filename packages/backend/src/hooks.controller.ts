import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { EventLoggerService } from './event-logger.service';
import {
  PreToolUsePayloadSchema,
  PostToolUsePayloadSchema,
  UserPromptSubmitPayloadSchema,
  SessionStartPayloadSchema,
  SessionEndPayloadSchema,
  NotificationPayloadSchema,
  PreCompactPayloadSchema,
  StopPayloadSchema,
  SubagentStopPayloadSchema,
} from '@cage/shared';
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
} from './dto/hooks.dto';

@ApiTags('Hooks')
@Controller('claude/hooks')
export class HooksController {
  private eventLogger = new EventLoggerService();

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
  async preToolUse(@Body() payload: PreToolUseDto): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = PreToolUsePayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'PreToolUse',
        sessionId: validatedPayload.sessionId || 'unknown',
        toolName: validatedPayload.toolName,
        arguments: validatedPayload.arguments,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      console.error('PreToolUse hook error:', error);
      // Still return success but log the error for debugging
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
  async postToolUse(@Body() payload: PostToolUseDto): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = PostToolUsePayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'PostToolUse',
        sessionId: validatedPayload.sessionId || 'unknown',
        toolName: validatedPayload.toolName,
        arguments: validatedPayload.arguments,
        result: validatedPayload.result,
        executionTime: validatedPayload.executionTime,
        error: validatedPayload.error,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      console.error('PostToolUse hook error:', error);
      // Still return success but log the error for debugging
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
    @Body() payload: UserPromptSubmitDto
  ): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = UserPromptSubmitPayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'UserPromptSubmit',
        sessionId: validatedPayload.sessionId || 'unknown',
        prompt: validatedPayload.prompt,
        context: validatedPayload.context,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      console.error('UserPromptSubmit hook error:', error);
      // Still return success but log the error for debugging
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
    @Body() payload: SessionStartDto
  ): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = SessionStartPayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'SessionStart',
        sessionId: validatedPayload.sessionId || 'unknown',
        projectPath: validatedPayload.projectPath,
        environment: validatedPayload.environment,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      console.error('SessionStart hook error:', error);
      // Still return success but log the error for debugging
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
  async sessionEnd(@Body() payload: SessionEndDto): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = SessionEndPayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'SessionEnd',
        sessionId: validatedPayload.sessionId || 'unknown',
        duration: validatedPayload.duration,
        summary: validatedPayload.summary,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      console.error('SessionEnd hook error:', error);
      // Still return success but log the error for debugging
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
    @Body() payload: NotificationDto
  ): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = NotificationPayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'Notification',
        sessionId: validatedPayload.sessionId || 'unknown',
        message: validatedPayload.message,
        level: validatedPayload.level,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      console.error('Notification hook error:', error);
      // Still return success but log the error for debugging
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
  async preCompact(@Body() payload: PreCompactDto): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = PreCompactPayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'PreCompact',
        sessionId: validatedPayload.sessionId || 'unknown',
        reason: validatedPayload.reason,
        currentTokenCount: validatedPayload.currentTokenCount,
        maxTokenCount: validatedPayload.maxTokenCount,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      console.error('PreCompact hook error:', error);
      // Still return success but log the error for debugging
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
  async stop(@Body() payload: StopDto): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = StopPayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'Stop',
        sessionId: validatedPayload.sessionId || 'unknown',
        reason: validatedPayload.reason,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      console.error('Stop hook error:', error);
      // Still return success but log the error for debugging
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
    @Body() payload: SubagentStopDto
  ): Promise<HookResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      // Validate payload
      const validatedPayload = SubagentStopPayloadSchema.parse(payload);

      // Log the event
      await this.eventLogger.logEvent({
        timestamp: validatedPayload.timestamp || timestamp,
        eventType: 'SubagentStop',
        sessionId: validatedPayload.sessionId || 'unknown',
        subagentId: validatedPayload.subagentId,
        parentSessionId: validatedPayload.parentSessionId,
        result: validatedPayload.result,
      });

      return {
        success: true,
        timestamp,
      };
    } catch (error) {
      console.error('SubagentStop hook error:', error);
      // Still return success but log the error for debugging
      return {
        success: true,
        timestamp,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
