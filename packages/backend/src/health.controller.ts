import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface HealthResponse {
  status: 'ok';
}

/**
 * Basic health check endpoint
 * Returns simple status to indicate server is responding
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Basic health check',
    description: 'Returns ok status if server is responding',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
  })
  health(): HealthResponse {
    return {
      status: 'ok',
    };
  }
}
