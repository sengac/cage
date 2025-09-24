import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';

/**
 * Event type enumeration
 */
export enum EventType {
  PreToolUse = 'PreToolUse',
  PostToolUse = 'PostToolUse',
  UserPromptSubmit = 'UserPromptSubmit',
  SessionStart = 'SessionStart',
  SessionEnd = 'SessionEnd',
  Notification = 'Notification',
  PreCompact = 'PreCompact',
  Stop = 'Stop',
  SubagentStop = 'SubagentStop'
}

/**
 * Query parameters for fetching events
 */
export class EventsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter events by session ID',
    example: 'session-123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Filter events by type',
    enum: EventType,
    example: EventType.PreToolUse
  })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiPropertyOptional({
    description: 'Start timestamp for date range filter (ISO 8601)',
    example: '2025-01-24T00:00:00.000Z'
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End timestamp for date range filter (ISO 8601)',
    example: '2025-01-24T23:59:59.999Z'
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of events to return',
    minimum: 1,
    maximum: 1000,
    default: 100,
    example: 50
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of events to skip for pagination',
    minimum: 0,
    default: 0,
    example: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    description: 'Filter events by tool name',
    example: 'Read'
  })
  @IsOptional()
  @IsString()
  toolName?: string;

  @ApiPropertyOptional({
    description: 'Sort order for results',
    enum: ['asc', 'desc'],
    default: 'desc',
    example: 'desc'
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sort?: 'asc' | 'desc';
}

/**
 * Event response object
 */
export class EventDto {
  @ApiProperty({
    description: 'Unique event identifier',
    example: 'evt_123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the event occurred',
    example: '2025-01-24T10:30:00.000Z',
    type: String
  })
  timestamp: string;

  @ApiProperty({
    description: 'Type of the event',
    enum: EventType,
    example: EventType.PreToolUse
  })
  eventType: EventType;

  @ApiPropertyOptional({
    description: 'Session ID associated with the event',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
    type: String
  })
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Tool name (for tool-related events)',
    example: 'Read'
  })
  toolName?: string;

  @ApiPropertyOptional({
    description: 'Arguments passed to the tool',
    type: 'object',
    additionalProperties: true,
    example: { file_path: '/src/index.ts', limit: 100 }
  })
  arguments?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Result of the operation',
    example: 'File contents...',
    type: 'object',
    additionalProperties: true
  })
  result?: unknown;

  @ApiPropertyOptional({
    description: 'Execution time in milliseconds',
    example: 1500
  })
  executionTime?: number;

  @ApiPropertyOptional({
    description: 'Error message if applicable',
    example: 'File not found'
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'User prompt (for UserPromptSubmit events)',
    example: 'Please help me refactor this function'
  })
  prompt?: string;

  @ApiPropertyOptional({
    description: 'Notification level (for Notification events)',
    enum: ['info', 'warning', 'error'],
    example: 'info'
  })
  level?: 'info' | 'warning' | 'error';

  @ApiPropertyOptional({
    description: 'Message content (for Notification events)',
    example: 'Task completed successfully'
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata specific to the event type',
    type: 'object',
    additionalProperties: true,
    example: { custom: 'data' }
  })
  metadata?: Record<string, unknown>;
}

/**
 * Paginated events response
 */
export class EventsResponseDto {
  @ApiProperty({
    description: 'Array of events',
    type: () => [EventDto],
    isArray: true
  })
  events: EventDto[];

  @ApiProperty({
    description: 'Total number of events matching the query',
    example: 150
  })
  total: number;

  @ApiProperty({
    description: 'Number of events returned in this response',
    example: 50
  })
  count: number;

  @ApiProperty({
    description: 'Offset used for this query',
    example: 0
  })
  offset: number;

  @ApiProperty({
    description: 'Limit used for this query',
    example: 50
  })
  limit: number;

  @ApiPropertyOptional({
    description: 'URL for the next page of results',
    example: '/api/events?offset=50&limit=50'
  })
  nextPage?: string;

  @ApiPropertyOptional({
    description: 'URL for the previous page of results',
    example: '/api/events?offset=0&limit=50'
  })
  previousPage?: string;
}

/**
 * Event statistics response
 */
export class EventStatsDto {
  @ApiProperty({
    description: 'Total number of events',
    example: 1500
  })
  totalEvents: number;

  @ApiProperty({
    description: 'Number of events today',
    example: 42
  })
  eventsToday: number;

  @ApiProperty({
    description: 'Number of events in the last hour',
    example: 5
  })
  eventsLastHour: number;

  @ApiProperty({
    description: 'Breakdown of events by type',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: {
      PreToolUse: 500,
      PostToolUse: 500,
      UserPromptSubmit: 200,
      Notification: 100,
      SessionStart: 100,
      SessionEnd: 100
    }
  })
  eventsByType: Record<string, number>;

  @ApiProperty({
    description: 'Most used tools',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        toolName: { type: 'string' },
        count: { type: 'number' }
      }
    },
    example: [
      { toolName: 'Read', count: 250 },
      { toolName: 'Write', count: 150 },
      { toolName: 'Bash', count: 100 }
    ]
  })
  topTools: Array<{ toolName: string; count: number }>;

  @ApiProperty({
    description: 'Number of unique sessions',
    example: 25
  })
  uniqueSessions: number;

  @ApiProperty({
    description: 'Average events per session',
    example: 60
  })
  averageEventsPerSession: number;

  @ApiProperty({
    description: 'Error rate (percentage of events with errors)',
    example: 2.5
  })
  errorRate: number;
}

/**
 * Export events request
 */
export class ExportEventsDto {
  @ApiProperty({
    description: 'Export format',
    enum: ['json', 'csv', 'ndjson'],
    example: 'json'
  })
  @IsEnum(['json', 'csv', 'ndjson'])
  format: 'json' | 'csv' | 'ndjson';

  @ApiPropertyOptional({
    description: 'Include only specific fields in the export',
    type: [String],
    example: ['timestamp', 'eventType', 'toolName', 'sessionId']
  })
  @IsOptional()
  fields?: string[];

  @ApiPropertyOptional({
    description: 'Compress the export file',
    default: false,
    example: true
  })
  @IsOptional()
  compress?: boolean;
}