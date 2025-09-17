import { Module } from '@nestjs/common';
import { HooksController } from './hooks.controller';
import { EventsController } from './events.controller';
import { HealthController } from './health.controller';
import { EventLoggerService } from './event-logger.service';

@Module({
  imports: [],
  controllers: [HooksController, EventsController, HealthController],
  providers: [EventLoggerService],
})
export class AppModule {}