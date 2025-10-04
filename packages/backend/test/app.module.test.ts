import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppModule } from '../src/app.module';

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should load successfully with EventEmitterModule', () => {
    expect(module).toBeDefined();
  });

  it('should provide EventEmitter2 for injection', () => {
    const eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    expect(eventEmitter).toBeDefined();
    expect(eventEmitter).toBeInstanceOf(EventEmitter2);
  });
});