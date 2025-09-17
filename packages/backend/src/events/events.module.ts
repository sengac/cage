import { Module } from '@nestjs/common';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { EventLoggerService } from '../services/event-logger.service.js';

@Module({
  controllers: [EventsController],
  providers: [EventsService, EventLoggerService],
  exports: [EventsService, EventLoggerService],
})
export class EventsModule {}