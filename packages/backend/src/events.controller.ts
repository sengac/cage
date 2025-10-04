import { Controller, Get, Res, Query } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { EventLoggerService } from './event-logger.service';
import { EventsResponseDto, EventStatsDto } from './dto/events.dto';
import { Logger } from '@cage/shared';

interface SSENotification {
  type: 'connected' | 'heartbeat' | 'event_added' | 'debug_log_added';
  timestamp?: string;
  level?: string;
  component?: string;
  eventType?: string;
  sessionId?: string;
}

@ApiTags('Events')
@Controller('events')
export class EventsController {
  private readonly logger = new Logger({ context: 'EventsController' });
  private sseClients: Response[] = [];

  constructor(private readonly eventLogger: EventLoggerService) {}
  @Get('stream')
  @ApiOperation({
    summary: 'Stream events in real-time',
    description:
      'Server-Sent Events (SSE) endpoint for real-time event streaming. Keeps connection alive with heartbeat messages every 30 seconds.',
  })
  @ApiProduces('text/event-stream')
  @ApiResponse({
    status: 200,
    description: 'SSE stream established',
    schema: {
      example: 'data: {"type":"connected"}\n\n',
    },
  })
  async streamEvents(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      res.write('data: {"type":"connected"}\n\n');
    } catch (error) {
      this.logger.error('Failed to write initial SSE message', { error });
      return;
    }

    this.sseClients.push(res);
    this.logger.info('SSE client connected', {
      totalClients: this.sseClients.length,
    });

    const heartbeat = setInterval(() => {
      try {
        res.write('data: {"type":"heartbeat"}\n\n');
      } catch (error) {
        this.logger.debug('Heartbeat write failed, client likely disconnected');
      }
    }, 30000);

    res.on('close', () => {
      clearInterval(heartbeat);
      this.sseClients = this.sseClients.filter(client => client !== res);
      this.logger.info('SSE client disconnected', {
        remainingClients: this.sseClients.length,
      });
    });
  }

  @OnEvent('debug.log.added')
  handleDebugLogAdded(payload: {
    level: string;
    component: string;
    timestamp: string;
  }): void {
    this.broadcast({
      type: 'debug_log_added',
      level: payload.level,
      component: payload.component,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent('hook.event.added')
  handleEventAdded(payload: {
    eventType: string;
    sessionId: string;
    timestamp: string;
  }): void {
    this.broadcast({
      type: 'event_added',
      eventType: payload.eventType,
      sessionId: payload.sessionId,
      timestamp: payload.timestamp,
    });
  }

  private broadcast(notification: SSENotification): void {
    const message = `data: ${JSON.stringify(notification)}\n\n`;
    const payloadSize = Buffer.byteLength(message, 'utf8');

    if (payloadSize > 200) {
      this.logger.warn('SSE notification payload exceeds 200 bytes', {
        size: payloadSize,
        notification,
      });
    }

    const failedClients: Response[] = [];

    this.sseClients.forEach(client => {
      try {
        client.write(message);
      } catch (error) {
        this.logger.error('Failed to write to SSE client', { error });
        failedClients.push(client);
      }
    });

    if (failedClients.length > 0) {
      this.sseClients = this.sseClients.filter(
        client => !failedClients.includes(client)
      );
      this.logger.info('Removed failed SSE clients', {
        removedCount: failedClients.length,
        remainingClients: this.sseClients.length,
      });
    }

    this.logger.debug('Broadcasted SSE notification', {
      type: notification.type,
      clients: this.sseClients.length,
    });
  }

  @Get('tail')
  @ApiOperation({
    summary: 'Get most recent events',
    description:
      'Retrieve the most recent events, similar to tail command for logs',
  })
  @ApiQuery({
    name: 'count',
    required: false,
    type: Number,
    description: 'Number of events to return',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Recent events retrieved successfully',
    type: EventsResponseDto,
  })
  async getTailEvents(@Query('count') count?: string) {
    const countNum = count ? parseInt(count, 10) : 10;
    const events = await this.eventLogger.getTailEvents(countNum);
    return { events };
  }

  @Get('list')
  @ApiOperation({
    summary: 'List events with pagination and filtering',
    description:
      'Get a paginated list of events with optional filtering by date and session ID, or incremental fetching with since parameter',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of events per page',
    example: 50,
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Filter by date (YYYY-MM-DD format)',
    example: '2025-01-24',
  })
  @ApiQuery({
    name: 'sessionId',
    required: false,
    type: String,
    description: 'Filter by session ID',
    example: 'session-123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'since',
    required: false,
    type: String,
    description:
      'Return only events newer than this timestamp (ISO 8601 format). Used for incremental fetching after SSE notifications.',
    example: '2025-01-24T10:00:00.000Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Events list retrieved successfully',
    type: EventsResponseDto,
  })
  async getEventsList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('date') date?: string,
    @Query('sessionId') sessionId?: string,
    @Query('since') since?: string
  ) {
    if (since) {
      let events = await this.eventLogger.getEventsSince(since);

      if (sessionId) {
        events = events.filter(
          (event: { sessionId: string }) => event.sessionId === sessionId
        );
      }

      return {
        events,
        total: events.length,
        pagination: {
          page: 1,
          limit: events.length,
          total: events.length,
        },
      };
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    return await this.eventLogger.getEventsList(
      pageNum,
      limitNum,
      date,
      sessionId
    );
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get event statistics',
    description:
      'Retrieve aggregated statistics about events, including counts by type, top tools, and error rates',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Filter statistics by date (YYYY-MM-DD format)',
    example: '2025-01-24',
  })
  @ApiResponse({
    status: 200,
    description: 'Event statistics retrieved successfully',
    type: EventStatsDto,
  })
  async getEventsStats(@Query('date') date?: string) {
    const stats = await this.eventLogger.getEventsStats(date);
    return stats;
  }
}
