import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  PreToolUsePayload,
  PostToolUsePayload,
  UserPromptSubmitPayload,
  NotificationPayload,
  StopPayload,
  SubagentStopPayload,
  SessionStartPayload,
  SessionEndPayload,
  PreCompactPayload,
  StatusPayload,
  HookType
} from '@cage/shared';
import { HooksService } from './hooks.service.js';

@ApiTags('hooks')
@Controller('claude/hooks')
export class HooksController {
  constructor(private readonly hooksService: HooksService) {}

  @Post('pre-tool-use')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle PreToolUse hook event' })
  @ApiResponse({ status: 200, description: 'Hook processed successfully' })
  async preToolUse(@Body() payload: PreToolUsePayload) {
    return await this.hooksService.handleHook(HookType.PreToolUse, payload);
  }

  @Post('post-tool-use')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle PostToolUse hook event' })
  @ApiResponse({ status: 200, description: 'Hook processed successfully' })
  async postToolUse(@Body() payload: PostToolUsePayload) {
    return await this.hooksService.handleHook(HookType.PostToolUse, payload);
  }

  @Post('user-prompt-submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle UserPromptSubmit hook event' })
  @ApiResponse({ status: 200, description: 'Hook processed successfully' })
  async userPromptSubmit(@Body() payload: UserPromptSubmitPayload) {
    return await this.hooksService.handleHook(HookType.UserPromptSubmit, payload);
  }

  @Post('notification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Notification hook event' })
  @ApiResponse({ status: 200, description: 'Hook processed successfully' })
  async notification(@Body() payload: NotificationPayload) {
    return await this.hooksService.handleHook(HookType.Notification, payload);
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stop hook event' })
  @ApiResponse({ status: 200, description: 'Hook processed successfully' })
  async stop(@Body() payload: StopPayload) {
    return await this.hooksService.handleHook(HookType.Stop, payload);
  }

  @Post('subagent-stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle SubagentStop hook event' })
  @ApiResponse({ status: 200, description: 'Hook processed successfully' })
  async subagentStop(@Body() payload: SubagentStopPayload) {
    return await this.hooksService.handleHook(HookType.SubagentStop, payload);
  }

  @Post('session-start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle SessionStart hook event' })
  @ApiResponse({ status: 200, description: 'Hook processed successfully' })
  async sessionStart(@Body() payload: SessionStartPayload) {
    return await this.hooksService.handleHook(HookType.SessionStart, payload);
  }

  @Post('session-end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle SessionEnd hook event' })
  @ApiResponse({ status: 200, description: 'Hook processed successfully' })
  async sessionEnd(@Body() payload: SessionEndPayload) {
    return await this.hooksService.handleHook(HookType.SessionEnd, payload);
  }

  @Post('pre-compact')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle PreCompact hook event' })
  @ApiResponse({ status: 200, description: 'Hook processed successfully' })
  async preCompact(@Body() payload: PreCompactPayload) {
    return await this.hooksService.handleHook(HookType.PreCompact, payload);
  }

  @Post('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Status hook event' })
  @ApiResponse({ status: 200, description: 'Hook processed successfully' })
  async status(@Body() payload: StatusPayload) {
    return await this.hooksService.handleHook(HookType.Status, payload);
  }
}