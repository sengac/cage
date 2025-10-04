import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HooksController } from './hooks.controller';
import { HooksApiController } from './hooks-api.controller';
import { EventsController } from './events.controller';
import { HealthController } from './health.controller';
import { DebugLogsController } from './debug-logs.controller';
import { EventLoggerService } from './event-logger.service';
import { WinstonLoggerService } from './winston-logger.service';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  controllers: [
    HooksController,
    HooksApiController,
    EventsController,
    HealthController,
    DebugLogsController,
  ],
  providers: [EventLoggerService, WinstonLoggerService],
})
export class AppModule {}
