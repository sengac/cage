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
  @ApiPropertyOptional({
    description:
      'Unique session identifier (not always provided by Claude Code)',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId?: string;

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
}

/**
 * Post Tool Use Hook - Triggered after Claude executes a tool
 */
export class PostToolUseDto {
  @ApiPropertyOptional({
    description:
      'Unique session identifier (not always provided by Claude Code)',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId?: string;

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
    example: 1500,
    minimum: 0,
  })
  executionTime: number;

  @ApiPropertyOptional({
    description: 'Error message if the tool execution failed',
    example: 'File not found',
  })
  error?: string;
}

/**
 * User Prompt Submit Hook - Triggered when user submits a prompt
 */
export class UserPromptSubmitDto {
  @ApiPropertyOptional({
    description:
      'Unique session identifier (not always provided by Claude Code)',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId?: string;

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

  @ApiPropertyOptional({
    description: 'Additional context about the prompt submission',
    example: {
      previousMessages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ],
      currentFile: '/src/index.ts',
    },
    type: 'object',
    additionalProperties: true,
  })
  context?: unknown;
}

/**
 * Session Start Hook - Triggered when a new Claude session begins
 */
export class SessionStartDto {
  @ApiPropertyOptional({
    description: 'Unique session identifier',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId?: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the session started',
    example: '2025-01-24T10:00:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiPropertyOptional({
    description: 'Path to the project directory',
    example: '/Users/developer/projects/my-app',
  })
  projectPath?: string;

  @ApiPropertyOptional({
    description: 'Environment information',
    example: {
      os: 'darwin',
      node: 'v20.0.0',
      cwd: '/Users/developer/projects',
    },
    type: 'object',
    additionalProperties: true,
  })
  environment?: Record<string, unknown>;
}

/**
 * Session End Hook - Triggered when a Claude session ends
 */
export class SessionEndDto {
  @ApiPropertyOptional({
    description: 'Unique session identifier',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId?: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the session ended',
    example: '2025-01-24T11:00:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiPropertyOptional({
    description: 'Duration of the session in milliseconds',
    example: 3600000,
    minimum: 0,
  })
  duration?: number;

  @ApiPropertyOptional({
    description: 'Summary of what was accomplished in the session',
    example: { toolsUsed: 42, filesModified: 5, testsRun: 10 },
    type: 'object',
    additionalProperties: true,
  })
  summary?: Record<string, unknown>;
}

/**
 * Notification Hook - Triggered when Claude sends a notification
 */
export class NotificationDto {
  @ApiPropertyOptional({
    description: 'Unique session identifier',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId?: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the notification was sent',
    example: '2025-01-24T10:30:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'Severity level of the notification',
    enum: ['info', 'warning', 'error'],
    example: 'info',
  })
  level: 'info' | 'warning' | 'error';

  @ApiProperty({
    description: 'Notification message content',
    example: 'Successfully completed code refactoring',
  })
  message: string;
}

/**
 * Pre-Compact Hook - Triggered before Claude compacts conversation history
 */
export class PreCompactDto {
  @ApiPropertyOptional({
    description: 'Unique session identifier',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId?: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when compaction was initiated',
    example: '2025-01-24T10:30:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiPropertyOptional({
    description: 'Reason for triggering the compaction',
    example: 'Approaching token limit',
  })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Current token count before compaction',
    example: 95000,
    minimum: 0,
  })
  currentTokenCount?: number;

  @ApiPropertyOptional({
    description: 'Maximum allowed token count',
    example: 100000,
    minimum: 0,
  })
  maxTokenCount?: number;
}

/**
 * Stop Hook - Triggered when Claude completes a task or is interrupted
 */
export class StopDto {
  @ApiPropertyOptional({
    description: 'Unique session identifier',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId?: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the stop occurred',
    example: '2025-01-24T10:30:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'Reason for stopping',
    example: 'Task completed successfully',
  })
  reason: string;

  @ApiPropertyOptional({
    description: 'Final state information at the time of stopping',
    example: { completedTasks: 5, pendingTasks: 0, errors: [] },
    type: 'object',
    additionalProperties: true,
  })
  finalState?: Record<string, unknown>;
}

/**
 * Subagent Stop Hook - Triggered when a subagent completes its task
 */
export class SubagentStopDto {
  @ApiPropertyOptional({
    description: 'Unique session identifier',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  sessionId?: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the subagent stopped',
    example: '2025-01-24T10:30:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'Unique identifier for the subagent',
    example: 'subagent-789',
  })
  subagentId: string;

  @ApiProperty({
    description: 'Session ID of the parent agent that spawned this subagent',
    example: 'session-parent-456',
  })
  parentSessionId: string;

  @ApiPropertyOptional({
    description: 'Result information from the subagent execution',
    example: {
      success: true,
      output: 'Refactored 5 functions and added unit tests',
      metrics: { duration: 5000, toolsUsed: 10, filesModified: 3 },
    },
    type: 'object',
    additionalProperties: true,
  })
  result?: unknown;
}
