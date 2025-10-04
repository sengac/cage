import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Debug log level enumeration
 */
export enum DebugLogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Single debug log entry (incoming from CLI)
 */
export class DebugLogDto {
  @ApiProperty({
    description: 'Log level',
    enum: DebugLogLevel,
    example: DebugLogLevel.INFO,
  })
  @IsEnum(DebugLogLevel)
  level: DebugLogLevel;

  @ApiProperty({
    description: 'Component name that generated the log',
    example: 'AppStore',
  })
  @IsString()
  component: string;

  @ApiProperty({
    description: 'Log message',
    example: 'fetchLatestEvents called',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Additional context data',
    type: 'object',
    additionalProperties: true,
    example: { eventCount: 42, timestamp: '2025-01-24T10:00:00.000Z' },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Stack trace for error logs',
    example: 'Error: Something went wrong\n    at fetchEvents (app.ts:42)',
  })
  @IsOptional()
  @IsString()
  stackTrace?: string;
}

/**
 * Batch of debug logs from CLI
 */
export class DebugLogsBatchDto {
  @ApiProperty({
    description: 'Array of debug log entries',
    type: () => [DebugLogDto],
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebugLogDto)
  logs: DebugLogDto[];
}

/**
 * Response after receiving logs
 */
export class DebugLogsReceivedDto {
  @ApiProperty({
    description: 'Number of logs received and processed',
    example: 5,
  })
  received: number;
}