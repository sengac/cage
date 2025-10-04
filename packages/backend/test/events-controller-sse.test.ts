import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppModule } from '../src/app.module';
import { EventsController } from '../src/events.controller';
import { EventLoggerService } from '../src/event-logger.service';
import { WinstonLoggerService } from '../src/winston-logger.service';
import { Response } from 'express';

describe('EventsController SSE Notification System', () => {
  let controller: EventsController;
  let eventEmitter: EventEmitter2;
  let winstonService: WinstonLoggerService;
  let eventLoggerService: EventLoggerService;
  let mockResponse: Partial<Response>;
  let writtenData: string[];
  let module: TestingModule;

  beforeEach(async () => {
    // Use full AppModule to ensure proper dependency injection
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Initialize the NestJS application to enable @OnEvent decorators
    await module.init();

    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    winstonService = module.get<WinstonLoggerService>(WinstonLoggerService);
    eventLoggerService = module.get<EventLoggerService>(EventLoggerService);
    controller = module.get<EventsController>(EventsController);

    writtenData = [];

    mockResponse = {
      setHeader: vi.fn(),
      write: vi.fn((data: string) => {
        writtenData.push(data);
        return true;
      }),
      on: vi.fn(),
    };
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
    vi.clearAllMocks();
  });

  describe('streamEvents', () => {
    it('should add client to sseClients list on connect', async () => {
      await controller.streamEvents(mockResponse as Response);

      expect(controller['sseClients']).toContain(mockResponse);
      expect(controller['sseClients'].length).toBe(1);
    });

    it('should send connected message on connect', async () => {
      await controller.streamEvents(mockResponse as Response);

      expect(mockResponse.write).toHaveBeenCalledWith(
        'data: {"type":"connected"}\n\n'
      );
    });

    it('should set correct SSE headers', async () => {
      await controller.streamEvents(mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-cache'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Connection',
        'keep-alive'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Accel-Buffering',
        'no'
      );
    });

    it('should register close handler', async () => {
      await controller.streamEvents(mockResponse as Response);

      expect(mockResponse.on).toHaveBeenCalledWith(
        'close',
        expect.any(Function)
      );
    });

    it('should remove client from list on disconnect', async () => {
      let closeHandler: (() => void) | undefined;

      const onMock: Response['on'] = vi.fn((event: string, handler: () => void) => {
        if (event === 'close') {
          closeHandler = handler;
        }
        return mockResponse as Response;
      });

      mockResponse.on = onMock;

      await controller.streamEvents(mockResponse as Response);

      expect(controller['sseClients'].length).toBe(1);

      // Simulate disconnect
      if (closeHandler) {
        closeHandler();
      }

      expect(controller['sseClients'].length).toBe(0);
    });
  });

  describe('@OnEvent listeners', () => {
    beforeEach(async () => {
      // Connect a mock client
      await controller.streamEvents(mockResponse as Response);
      writtenData = []; // Clear initial "connected" message
    });

    it('should broadcast event_added notification when hook.event.added is emitted', () => {
      const payload = {
        eventType: 'PreToolUse',
        sessionId: 'test-session-123',
        timestamp: '2025-01-24T10:00:00.000Z',
      };

      // Emit event (synchronous broadcast)
      eventEmitter.emit('hook.event.added', payload);

      const lastMessage = writtenData[writtenData.length - 1];
      expect(lastMessage).toBeDefined();

      const parsed = JSON.parse(lastMessage.replace('data: ', '').trim());
      expect(parsed.type).toBe('event_added');
      expect(parsed.eventType).toBe('PreToolUse');
      expect(parsed.sessionId).toBe('test-session-123');
      expect(parsed.timestamp).toBe('2025-01-24T10:00:00.000Z');
    });

    it('should broadcast debug_log_added notification when debug.log.added is emitted', () => {
      const payload = {
        level: 'ERROR',
        component: 'TestComponent',
        timestamp: '2025-01-24T10:00:01.000Z',
      };

      eventEmitter.emit('debug.log.added', payload);

      const lastMessage = writtenData[writtenData.length - 1];
      expect(lastMessage).toBeDefined();

      const parsed = JSON.parse(lastMessage.replace('data: ', '').trim());
      expect(parsed.type).toBe('debug_log_added');
      expect(parsed.level).toBe('ERROR');
      expect(parsed.component).toBe('TestComponent');
      expect(parsed.timestamp).toBe('2025-01-24T10:00:01.000Z');
    });

    it('should broadcast to all connected clients', async () => {
      const writtenData2: string[] = [];
      const mockResponse2: Partial<Response> = {
        setHeader: vi.fn(),
        write: vi.fn((data: string) => {
          writtenData2.push(data);
          return true;
        }),
        on: vi.fn(),
      };

      // Connect second client
      await controller.streamEvents(mockResponse2 as Response);

      // Clear connected messages
      writtenData = [];
      writtenData2.length = 0;

      // Emit event (synchronous)
      eventEmitter.emit('hook.event.added', {
        eventType: 'PostToolUse',
        sessionId: 'test-session',
        timestamp: '2025-01-24T10:00:00.000Z',
      });

      // Broadcast is synchronous, no wait needed
      expect(writtenData.length).toBeGreaterThan(0);
      expect(writtenData2.length).toBeGreaterThan(0);

      const message = writtenData[writtenData.length - 1];
      expect(message).toContain('"type":"event_added"');
      expect(writtenData2[writtenData2.length - 1]).toContain('"type":"event_added"');
    });
  });

  describe('broadcast method', () => {
    beforeEach(async () => {
      await controller.streamEvents(mockResponse as Response);
      writtenData = [];
    });

    it('should not exceed 200 bytes per notification', () => {
      const payload = {
        eventType: 'PreToolUse',
        sessionId: 'session-123',
        timestamp: '2025-01-24T10:00:00.000Z',
      };

      eventEmitter.emit('hook.event.added', payload);

      const lastMessage = writtenData[writtenData.length - 1];
      const size = Buffer.byteLength(lastMessage, 'utf8');
      expect(size).toBeLessThan(200);
    });

    it('should handle write errors gracefully', async () => {
      const failingResponse: Partial<Response> = {
        setHeader: vi.fn(),
        write: vi.fn(() => {
          throw new Error('Write failed');
        }),
        on: vi.fn(),
      };

      await controller.streamEvents(failingResponse as Response);

      // Should not throw when writing fails
      expect(() => {
        eventEmitter.emit('hook.event.added', {
          eventType: 'PreToolUse',
          sessionId: 'test',
          timestamp: '2025-01-24T10:00:00.000Z',
        });
      }).not.toThrow();
    });
  });

  describe('integration with services', () => {
    beforeEach(async () => {
      await controller.streamEvents(mockResponse as Response);
      writtenData = [];
    });

    it('should broadcast when eventEmitter emits hook.event.added', () => {
      eventEmitter.emit('hook.event.added', {
        eventType: 'PreToolUse',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
      });

      const messages = writtenData.filter(msg =>
        msg.includes('event_added')
      );
      expect(messages.length).toBeGreaterThan(0);

      const parsed = JSON.parse(messages[0].replace('data: ', '').trim());
      expect(parsed.type).toBe('event_added');
      expect(parsed.eventType).toBe('PreToolUse');
    });

    it('should broadcast when eventEmitter emits debug.log.added', () => {
      eventEmitter.emit('debug.log.added', {
        level: 'ERROR',
        component: 'TestComponent',
        timestamp: new Date().toISOString(),
      });

      const messages = writtenData.filter(msg =>
        msg.includes('debug_log_added')
      );
      expect(messages.length).toBeGreaterThan(0);

      const parsed = JSON.parse(messages[0].replace('data: ', '').trim());
      expect(parsed.type).toBe('debug_log_added');
      expect(parsed.level).toBe('ERROR');
      expect(parsed.component).toBe('TestComponent');
    });
  });

  describe('no polling behavior', () => {
    it('should not use setInterval for event polling', async () => {
      const originalSetInterval = global.setInterval;
      const intervalCalls: Array<{
        callback: () => void;
        delay: number;
      }> = [];

      const setIntervalMock: typeof global.setInterval = vi.fn((callback: () => void, delay: number) => {
        intervalCalls.push({ callback, delay });
        return originalSetInterval(callback, delay);
      });

      global.setInterval = setIntervalMock;

      await controller.streamEvents(mockResponse as Response);

      // Should only have heartbeat interval (30000ms), no event polling
      expect(intervalCalls.length).toBe(1);
      expect(intervalCalls[0].delay).toBe(30000);

      global.setInterval = originalSetInterval;
    });

    it('should send heartbeat every 30 seconds', async () => {
      vi.useFakeTimers();

      await controller.streamEvents(mockResponse as Response);

      writtenData = [];

      // Advance time by 30 seconds
      vi.advanceTimersByTime(30000);

      expect(writtenData.length).toBe(1);
      expect(writtenData[0]).toContain('"type":"heartbeat"');

      // Advance another 30 seconds
      vi.advanceTimersByTime(30000);

      expect(writtenData.length).toBe(2);
      expect(writtenData[1]).toContain('"type":"heartbeat"');

      vi.useRealTimers();
    });
  });
});