import { Controller, Get, Res, Query } from '@nestjs/common';
import type { Response } from 'express';
import { EventLoggerService } from './event-logger.service';

@Controller('events')
export class EventsController {
  private eventLogger = new EventLoggerService();
  @Get('stream')
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
  async getTailEvents(@Query('count') count?: string) {
    const countNum = count ? parseInt(count, 10) : 10;
    const events = await this.eventLogger.getTailEvents(countNum);
    return events;
  }

  @Get('list')
  async getEventsList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('date') date?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const result = await this.eventLogger.getEventsList(pageNum, limitNum, date);
    return result;
  }

  @Get('stats')
  async getEventsStats(@Query('date') date?: string) {
    const stats = await this.eventLogger.getEventsStats(date);
    return stats;
  }
}