import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base response for all hook endpoints
 */
export class HookResponseDto {
  @ApiProperty({
    description: 'Indicates whether the hook was processed successfully',
    example: true,
    type: Boolean,
  })
  success: boolean;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the hook was processed',
    example: '2025-01-24T10:30:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiPropertyOptional({
    description:
      'Error message if the hook processing failed (still returns success: true)',
    example: 'Invalid payload structure',
  })
  error?: string;
}

/**
 * Pre Tool Use Hook - Triggered before Claude executes a tool
 */
export class PreToolUseDto {
  @ApiProperty({
    description: 'Unique session identifier',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the tool use was initiated',
    example: '2025-01-24T10:30:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'Name of the tool being invoked',
    example: 'Read',
    enum: [
      'Read',
      'Write',
      'Edit',
      'MultiEdit',
      'Bash',
      'Grep',
      'Glob',
      'WebSearch',
      'WebFetch',
      'Task',
      'NotebookEdit',
      'TodoWrite',
      'ExitPlanMode',
      'BashOutput',
      'KillShell',
      'SlashCommand',
    ],
  })
  toolName: string;

  @ApiProperty({
    description: 'Arguments passed to the tool',
    example: { file_path: '/src/index.ts', limit: 100 },
    type: 'object',
    additionalProperties: true,
  })
  arguments: Record<string, unknown>;

  @ApiProperty({
    description: 'Path to the conversation transcript file',
    example:
      '/Users/user/.claude/projects/-Users-user-project/session-id.jsonl',
    type: String,
  })
  transcriptPath: string;

  @ApiPropertyOptional({
    description: 'Current working directory',
    example: '/Users/user/project',
    type: String,
  })
  cwd?: string;

  @ApiPropertyOptional({
    description: 'Hook type metadata',
    example: 'PreToolUse',
    type: String,
  })
  hook_type?: string;

  @ApiPropertyOptional({
    description: 'Project directory path',
    example: '/Users/user/project',
    type: String,
  })
  project_dir?: string;
}

/**
 * Post Tool Use Hook - Triggered after Claude executes a tool
 */
export class PostToolUseDto {
  @ApiProperty({
    description: 'Unique session identifier',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the tool execution completed',
    example: '2025-01-24T10:30:01.500Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'Name of the tool that was executed',
    example: 'Read',
  })
  toolName: string;

  @ApiProperty({
    description: 'Arguments that were passed to the tool',
    example: { file_path: '/src/index.ts', limit: 100 },
    type: 'object',
    additionalProperties: true,
  })
  arguments: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Result returned by the tool execution',
    example: 'File contents...',
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  result?: unknown;

  @ApiProperty({
    description: 'Time taken to execute the tool in milliseconds',
    example: 0,
    minimum: 0,
  })
  executionTime: number;

  @ApiPropertyOptional({
    description: 'Error message if the tool execution failed',
    example: 'File not found',
  })
  error?: string;

  @ApiProperty({
    description: 'Path to the conversation transcript file',
    example:
      '/Users/user/.claude/projects/-Users-user-project/session-id.jsonl',
    type: String,
  })
  transcriptPath: string;

  @ApiPropertyOptional({
    description: 'Current working directory',
    example: '/Users/user/project',
    type: String,
  })
  cwd?: string;

  @ApiPropertyOptional({
    description: 'Hook type metadata',
    example: 'PostToolUse',
    type: String,
  })
  hook_type?: string;

  @ApiPropertyOptional({
    description: 'Project directory path',
    example: '/Users/user/project',
    type: String,
  })
  project_dir?: string;
}

/**
 * User Prompt Submit Hook - Triggered when user submits a prompt
 */
export class UserPromptSubmitDto {
  @ApiProperty({
    description: 'Unique session identifier',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the prompt was submitted',
    example: '2025-01-24T10:30:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'The prompt text submitted by the user',
    example: 'Please help me refactor this function to be more efficient',
  })
  prompt: string;

  @ApiProperty({
    description: 'Path to the conversation transcript file',
    example:
      '/Users/user/.claude/projects/-Users-user-project/session-id.jsonl',
    type: String,
  })
  transcriptPath: string;

  @ApiPropertyOptional({
    description: 'Current working directory',
    example: '/Users/user/project',
    type: String,
  })
  cwd?: string;

  @ApiPropertyOptional({
    description: 'Additional context about the prompt submission',
    example: {
      previousMessages: [],
    },
    type: 'object',
    additionalProperties: true,
  })
  context?: unknown;

  @ApiPropertyOptional({
    description: 'Hook type metadata',
    example: 'UserPromptSubmit',
    type: String,
  })
  hook_type?: string;

  @ApiPropertyOptional({
    description: 'Project directory path',
    example: '/Users/user/project',
    type: String,
  })
  project_dir?: string;
}

/**
 * Session Start Hook - Triggered when a new Claude session begins
 */
export class SessionStartDto {
  @ApiProperty({
    description: 'Unique session identifier',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the session started',
    example: '2025-01-24T10:00:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'Path to the conversation transcript file',
    example:
      '/Users/user/.claude/projects/-Users-user-project/session-id.jsonl',
    type: String,
  })
  transcriptPath: string;

  @ApiPropertyOptional({
    description: 'Source of the session start',
    example: 'cli',
  })
  source?: string;

  @ApiPropertyOptional({
    description: 'Hook type metadata',
    example: 'SessionStart',
    type: String,
  })
  hook_type?: string;

  @ApiPropertyOptional({
    description: 'Hook event name',
    example: 'SessionStart',
    type: String,
  })
  hook_event_name?: string;
}

/**
 * Session End Hook - Triggered when a Claude session ends
 */
export class SessionEndDto {
  @ApiProperty({
    description: 'Unique session identifier',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the session ended',
    example: '2025-01-24T11:00:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'Path to the conversation transcript file',
    example:
      '/Users/user/.claude/projects/-Users-user-project/session-id.jsonl',
    type: String,
  })
  transcriptPath: string;

  @ApiPropertyOptional({
    description: 'Current working directory',
    example: '/Users/user/project',
    type: String,
  })
  cwd?: string;

  @ApiPropertyOptional({
    description: 'Reason for session end',
    example: 'user_exit',
  })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Hook type metadata',
    example: 'SessionEnd',
    type: String,
  })
  hook_type?: string;

  @ApiPropertyOptional({
    description: 'Hook event name',
    example: 'SessionEnd',
    type: String,
  })
  hook_event_name?: string;
}

/**
 * Notification Hook - Triggered when Claude sends a notification
 */
export class NotificationDto {
  @ApiProperty({
    description: 'Unique session identifier',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the notification was sent',
    example: '2025-01-24T10:30:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'Notification message content',
    example: 'Successfully completed code refactoring',
  })
  message: string;

  @ApiProperty({
    description: 'Path to the conversation transcript file',
    example:
      '/Users/user/.claude/projects/-Users-user-project/session-id.jsonl',
    type: String,
  })
  transcriptPath: string;

  @ApiPropertyOptional({
    description: 'Hook type metadata',
    example: 'Notification',
    type: String,
  })
  hook_type?: string;

  @ApiPropertyOptional({
    description: 'Hook event name',
    example: 'Notification',
    type: String,
  })
  hook_event_name?: string;
}

/**
 * Pre-Compact Hook - Triggered before Claude compacts conversation history
 */
export class PreCompactDto {
  @ApiProperty({
    description: 'Unique session identifier',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when compaction was initiated',
    example: '2025-01-24T10:30:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'Path to the conversation transcript file',
    example:
      '/Users/user/.claude/projects/-Users-user-project/session-id.jsonl',
    type: String,
  })
  transcriptPath: string;

  @ApiPropertyOptional({
    description: 'Trigger for the compaction',
    example: 'token_limit',
  })
  trigger?: string;

  @ApiPropertyOptional({
    description: 'Custom instructions for compaction',
    example: 'Preserve all code snippets',
  })
  customInstructions?: string;

  @ApiPropertyOptional({
    description: 'Hook type metadata',
    example: 'PreCompact',
    type: String,
  })
  hook_type?: string;

  @ApiPropertyOptional({
    description: 'Hook event name',
    example: 'PreCompact',
    type: String,
  })
  hook_event_name?: string;
}

/**
 * Stop Hook - Triggered when Claude completes a task or is interrupted
 */
export class StopDto {
  @ApiProperty({
    description: 'Unique session identifier',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the stop occurred',
    example: '2025-01-24T10:30:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'Path to the conversation transcript file',
    example:
      '/Users/user/.claude/projects/-Users-user-project/session-id.jsonl',
    type: String,
  })
  transcriptPath: string;

  @ApiPropertyOptional({
    description: 'Whether stop hook is active',
    example: true,
  })
  stopHookActive?: boolean;

  @ApiPropertyOptional({
    description: 'Hook type metadata',
    example: 'Stop',
    type: String,
  })
  hook_type?: string;

  @ApiPropertyOptional({
    description: 'Hook event name',
    example: 'Stop',
    type: String,
  })
  hook_event_name?: string;
}

/**
 * Subagent Stop Hook - Triggered when a subagent completes its task
 */
export class SubagentStopDto {
  @ApiProperty({
    description: 'Unique session identifier',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the subagent stopped',
    example: '2025-01-24T10:30:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'Path to the conversation transcript file',
    example:
      '/Users/user/.claude/projects/-Users-user-project/session-id.jsonl',
    type: String,
  })
  transcriptPath: string;

  @ApiPropertyOptional({
    description: 'Whether stop hook is active',
    example: true,
  })
  stopHookActive?: boolean;

  @ApiPropertyOptional({
    description: 'Hook type metadata',
    example: 'SubagentStop',
    type: String,
  })
  hook_type?: string;

  @ApiPropertyOptional({
    description: 'Hook event name',
    example: 'SubagentStop',
    type: String,
  })
  hook_event_name?: string;
}

/**
 * Hook information DTO
 */
export class HookInfoDto {
  @ApiProperty({ 
    description: 'Name of the hook',
    example: 'PreToolUse'
  })
  name: string;

  @ApiProperty({ 
    description: 'Whether the hook is enabled',
    example: true
  })
  enabled: boolean;

  @ApiProperty({ 
    description: 'Number of events for this hook type',
    example: 42
  })
  eventCount: number;
}

/**
 * Hooks status response DTO
 */
export class HooksStatusDto {
  @ApiProperty({ 
    description: 'Whether CAGE hooks are installed',
    example: true
  })
  isInstalled: boolean;

  @ApiProperty({ 
    description: 'Path to Claude settings file',
    example: '/home/user/.claude/settings.json'
  })
  settingsPath: string;

  @ApiProperty({ 
    description: 'Backend server port',
    example: 3790
  })
  backendPort: number;

  @ApiProperty({ 
    description: 'Whether backend is enabled',
    example: true
  })
  backendEnabled: boolean;

  @ApiProperty({ 
    description: 'List of hooks with their status',
    type: [HookInfoDto]
  })
  installedHooks: HookInfoDto[];

  @ApiProperty({ 
    description: 'Total number of events',
    example: 150
  })
  totalEvents: number;
}
