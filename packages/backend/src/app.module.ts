import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HooksModule } from './hooks/hooks.module.js';
import { EventsModule } from './events/events.module.js';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    HooksModule,
    EventsModule,
  ],
})
export class AppModule {}