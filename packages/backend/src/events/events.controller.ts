import { Controller, Get, Query, Res, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { EventsService } from './events.service.js';

interface MessageEvent {
  data: string;
  type?: string;
  id?: string;
  retry?: number;
}

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('stream')
  @ApiOperation({ summary: 'Stream events in real-time via Server-Sent Events' })
  @ApiQuery({ name: 'filter', required: false, description: 'Filter events by type' })
  @ApiResponse({ status: 200, description: 'Event stream' })
  @Sse()
  streamEvents(@Query('filter') filter?: string): Observable<MessageEvent> {
    return this.eventsService.getEventStream(filter);
  }

  @Get('list')
  @ApiOperation({ summary: 'List events within date range' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Events list' })
  async listEvents(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response
  ) {
    const events = await this.eventsService.getEventsList(from, to);
    return res?.json(events) ?? events;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get event statistics' })
  @ApiResponse({ status: 200, description: 'Event statistics' })
  async getStats(@Res() res?: Response) {
    const stats = await this.eventsService.getEventStats();
    return res?.json(stats) ?? stats;
  }

  @Get('tail')
  @ApiOperation({ summary: 'Get recent events' })
  @ApiQuery({ name: 'count', required: false, description: 'Number of events to return' })
  @ApiResponse({ status: 200, description: 'Recent events' })
  async tailEvents(
    @Query('count') count?: string,
    @Res() res?: Response
  ) {
    const eventCount = count ? parseInt(count, 10) : 10;
    const events = await this.eventsService.getTailEvents(eventCount);
    return res?.json(events) ?? events;
  }
}