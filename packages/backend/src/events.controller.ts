import { Controller, Get, Res, Query } from '@nestjs/common';
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

@ApiTags('Events')
@Controller('events')
export class EventsController {
  private eventLogger = new EventLoggerService();
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
  streamEvents(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');

    // Keep connection alive
    const heartbeat = setInterval(() => {
      res.write('data: {"type":"heartbeat"}\n\n');
    }, 30000);

    // Clean up on client disconnect
    res.on('close', () => {
      clearInterval(heartbeat);
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
      'Get a paginated list of events with optional filtering by date and session ID',
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
  @ApiResponse({
    status: 200,
    description: 'Events list retrieved successfully',
    type: EventsResponseDto,
  })
  async getEventsList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('date') date?: string,
    @Query('sessionId') sessionId?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const result = await this.eventLogger.getEventsList(
      pageNum,
      limitNum,
      date,
      sessionId
    );
    return result;
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
