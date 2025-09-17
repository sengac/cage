import { Controller, Get } from '@nestjs/common';

/**
 * Health check endpoint for monitoring and integration tests
 */
@Controller('health')
export class HealthController {
  @Get()
  health(): { status: string; timestamp: string; service: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'cage-backend'
    };
  }
}