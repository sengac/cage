import { ApiProperty } from '@nestjs/swagger';

/**
 * Database health status
 */
export class DatabaseHealthDto {
  @ApiProperty({
    description: 'Database connection status',
    example: 'healthy',
  })
  status: 'healthy' | 'unhealthy';

  @ApiProperty({
    description: 'Response time in milliseconds',
    example: 5,
  })
  responseTime: number;

  @ApiProperty({
    description: 'Number of active connections',
    example: 2,
  })
  connections: number;
}

/**
 * File system health status
 */
export class FileSystemHealthDto {
  @ApiProperty({
    description: 'File system status',
    example: 'healthy',
  })
  status: 'healthy' | 'unhealthy';

  @ApiProperty({
    description: 'Events directory path',
    example: '.cage/events',
  })
  eventsDir: string;

  @ApiProperty({
    description: 'Whether the events directory is writable',
    example: true,
  })
  writable: boolean;

  @ApiProperty({
    description: 'Available disk space in bytes',
    example: 50000000000,
  })
  availableSpace: number;

  @ApiProperty({
    description: 'Number of event files',
    example: 42,
  })
  eventFiles: number;
}

/**
 * Memory usage information
 */
export class MemoryHealthDto {
  @ApiProperty({
    description: 'RSS memory in bytes',
    example: 104857600,
  })
  rss: number;

  @ApiProperty({
    description: 'Heap total in bytes',
    example: 73728000,
  })
  heapTotal: number;

  @ApiProperty({
    description: 'Heap used in bytes',
    example: 52428800,
  })
  heapUsed: number;

  @ApiProperty({
    description: 'External memory in bytes',
    example: 1048576,
  })
  external: number;

  @ApiProperty({
    description: 'Array buffers in bytes',
    example: 262144,
  })
  arrayBuffers: number;
}

/**
 * Service dependencies health
 */
export class DependenciesHealthDto {
  @ApiProperty({
    description: 'Claude Code hooks installation status',
    example: 'installed',
  })
  claudeHooks: 'installed' | 'not_installed' | 'checking';

  @ApiProperty({
    description: 'Number of active hook types',
    example: 9,
  })
  activeHooks: number;

  @ApiProperty({
    description: 'Event processing queue size',
    example: 0,
  })
  queueSize: number;
}

/**
 * Complete health check response
 */
export class HealthResponseDto {
  @ApiProperty({
    description: 'Overall health status',
    example: 'healthy',
    enum: ['healthy', 'degraded', 'unhealthy'],
  })
  status: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({
    description: 'ISO 8601 timestamp of the health check',
    example: '2025-01-24T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Server uptime in seconds',
    example: 3600,
  })
  uptime: number;

  @ApiProperty({
    description: 'Server version',
    example: '0.0.1',
  })
  version: string;

  @ApiProperty({
    description: 'Node.js version',
    example: 'v20.0.0',
  })
  nodeVersion: string;

  @ApiProperty({
    description: 'Environment (development/production)',
    example: 'production',
  })
  environment: string;

  @ApiProperty({
    description: 'Server process ID',
    example: 12345,
  })
  pid: number;

  @ApiProperty({
    description: 'Server port',
    example: 3790,
  })
  port: number;

  @ApiProperty({
    description: 'Memory usage information',
    type: MemoryHealthDto,
  })
  memory: MemoryHealthDto;

  @ApiProperty({
    description: 'File system health',
    type: FileSystemHealthDto,
  })
  fileSystem: FileSystemHealthDto;

  @ApiProperty({
    description: 'Dependencies health',
    type: DependenciesHealthDto,
  })
  dependencies: DependenciesHealthDto;

  @ApiProperty({
    description: 'Response time of this health check in milliseconds',
    example: 15,
  })
  responseTime: number;

  @ApiProperty({
    description: 'Any health warnings',
    type: [String],
    example: ['High memory usage detected'],
  })
  warnings: string[];

  @ApiProperty({
    description: 'Any health errors',
    type: [String],
    example: [],
  })
  errors: string[];
}
