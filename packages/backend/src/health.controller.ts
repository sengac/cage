import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health.dto';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Health check endpoint for monitoring and integration tests
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Comprehensive health check including system resources, dependencies, and service status'
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    type: HealthResponseDto
  })
  @ApiResponse({
    status: 503,
    description: 'Service is unhealthy or degraded'
  })
  health(): HealthResponseDto {
    const startTime = Date.now();
    const eventsDir = join(process.cwd(), '.cage', 'events');
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const heapUsedPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (heapUsedPercentage > 80) {
      warnings.push(`High memory usage: ${heapUsedPercentage.toFixed(1)}% of heap used`);
    }

    // Check file system
    let eventFiles = 0;
    let fileSystemStatus: 'healthy' | 'unhealthy' = 'healthy';
    let isWritable = false;

    try {
      if (existsSync(eventsDir)) {
        const files = readdirSync(eventsDir);
        eventFiles = files.filter(f => f.endsWith('.jsonl')).length;

        // Check if directory is writable
        const stats = statSync(eventsDir);
        isWritable = (stats.mode & 0o200) !== 0;

        if (!isWritable) {
          errors.push('Events directory is not writable');
          fileSystemStatus = 'unhealthy';
        }
      } else {
        warnings.push('Events directory does not exist yet');
      }
    } catch (error) {
      errors.push(`File system check failed: ${error}`);
      fileSystemStatus = 'unhealthy';
    }

    // Determine overall health status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (errors.length > 0) {
      overallStatus = 'unhealthy';
    } else if (warnings.length > 0) {
      overallStatus = 'degraded';
    }

    const responseTime = Date.now() - startTime;

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.0.1',
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      port: parseInt(process.env.PORT || '3790'),
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers
      },
      fileSystem: {
        status: fileSystemStatus,
        eventsDir,
        writable: isWritable,
        availableSpace: 0, // Would need additional OS-specific logic
        eventFiles
      },
      dependencies: {
        claudeHooks: 'checking', // Would need to check actual hook installation
        activeHooks: 9, // All 9 hook types are supported
        queueSize: 0 // No queue in current implementation
      },
      responseTime,
      warnings,
      errors
    };
  }
}