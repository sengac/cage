import { Module } from '@nestjs/common';
import { HooksController } from './hooks.controller.js';
import { HooksService } from './hooks.service.js';
import { EventLoggerService } from '../services/event-logger.service.js';

@Module({
  controllers: [HooksController],
  providers: [HooksService, EventLoggerService],
  exports: [HooksService, EventLoggerService],
})
export class HooksModule {}