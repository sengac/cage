import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  WinstonLoggerService,
  DebugLogEntry,
} from '../src/winston-logger.service';

describe('WinstonLoggerService', () => {
  let service: WinstonLoggerService;
  let eventEmitter: EventEmitter2;
  let emittedEvents: Array<{
    eventName: string;
    payload: unknown;
  }>;

  beforeEach(() => {
    eventEmitter = new EventEmitter2();
    emittedEvents = [];

    // Capture all emitted events
    eventEmitter.on('debug.log.added', (payload: unknown) => {
      emittedEvents.push({ eventName: 'debug.log.added', payload });
    });

    service = new WinstonLoggerService(eventEmitter);
  });

  afterEach(() => {
    eventEmitter.removeAllListeners();
  });

  describe('addLog', () => {
    it('should emit debug.log.added when addLog is called', () => {
      service.addLog({
        level: 'ERROR',
        component: 'TestComponent',
        message: 'Test error message',
      });

      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].eventName).toBe('debug.log.added');

      const payload = emittedEvents[0].payload as {
        level: string;
        component: string;
        timestamp: string;
      };
      expect(payload.level).toBe('ERROR');
      expect(payload.component).toBe('TestComponent');
      expect(payload.timestamp).toBeDefined();
      expect(new Date(payload.timestamp)).toBeInstanceOf(Date);
    });

    it('should emit notification payload under 200 bytes', () => {
      service.addLog({
        level: 'ERROR',
        component: 'TestComponent',
        message: 'Test error message',
      });

      const payload = emittedEvents[0].payload;
      const payloadSize = Buffer.byteLength(JSON.stringify(payload), 'utf8');
      expect(payloadSize).toBeLessThan(200);
    });

    it('should store log in memory', () => {
      service.addLog({
        level: 'INFO',
        component: 'TestComponent',
        message: 'Test message',
      });

      const logs = service.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('INFO');
      expect(logs[0].component).toBe('TestComponent');
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].id).toBeDefined();
      expect(logs[0].timestamp).toBeDefined();
    });

    it('should emit event for each log added', () => {
      service.addLog({
        level: 'INFO',
        component: 'Component1',
        message: 'First',
      });
      service.addLog({
        level: 'ERROR',
        component: 'Component2',
        message: 'Second',
      });
      service.addLog({
        level: 'WARN',
        component: 'Component3',
        message: 'Third',
      });

      expect(emittedEvents).toHaveLength(3);
      expect(
        (emittedEvents[0].payload as { level: string }).level
      ).toBe('INFO');
      expect(
        (emittedEvents[1].payload as { level: string }).level
      ).toBe('ERROR');
      expect(
        (emittedEvents[2].payload as { level: string }).level
      ).toBe('WARN');
    });

    it('should not exceed MAX_LOGS (10000)', () => {
      // Add 11000 logs
      for (let i = 0; i < 11000; i++) {
        service.addLog({
          level: 'INFO',
          component: 'Test',
          message: `Log ${i}`,
        });
      }

      const logCount = service.getLogCount();
      expect(logCount).toBeLessThanOrEqual(10000);
      expect(logCount).toBe(10000); // Should be exactly 10000
    });
  });

  describe('getLogsSince', () => {
    it('should return only logs since timestamp', async () => {
      service.addLog({
        level: 'INFO',
        component: 'A',
        message: 'First',
      });

      // Wait 10ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      const timestamp = new Date().toISOString();
      await new Promise(resolve => setTimeout(resolve, 10));

      service.addLog({
        level: 'INFO',
        component: 'B',
        message: 'Second',
      });
      service.addLog({
        level: 'INFO',
        component: 'C',
        message: 'Third',
      });

      const logs = service.getLogsSince(timestamp);
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('Second');
      expect(logs[1].message).toBe('Third');
    });

    it('should not return logs equal to timestamp', async () => {
      const exactTimestamp = new Date().toISOString();

      // Manually create log with exact timestamp (for testing)
      const service2 = new WinstonLoggerService(eventEmitter);
      service2.addLog({
        level: 'INFO',
        component: 'Test',
        message: 'At timestamp',
      });

      // Get the actual timestamp from the log
      const logs = service2.getLogs();
      const logTimestamp = logs[0].timestamp;

      // Query with exact timestamp - should exclude it
      const result = service2.getLogsSince(logTimestamp);
      expect(result).toHaveLength(0);
    });

    it('should return empty array when no logs are newer', () => {
      service.addLog({
        level: 'INFO',
        component: 'Test',
        message: 'Old log',
      });

      const futureTimestamp = new Date(
        Date.now() + 10000
      ).toISOString();
      const logs = service.getLogsSince(futureTimestamp);
      expect(logs).toHaveLength(0);
    });

    it('should return all logs when timestamp is very old', () => {
      service.addLog({ level: 'INFO', component: 'A', message: '1' });
      service.addLog({ level: 'INFO', component: 'B', message: '2' });
      service.addLog({ level: 'INFO', component: 'C', message: '3' });

      const oldTimestamp = new Date(0).toISOString();
      const logs = service.getLogsSince(oldTimestamp);
      expect(logs).toHaveLength(3);
    });
  });

  describe('existing functionality', () => {
    it('should filter logs by level', () => {
      service.addLog({ level: 'INFO', component: 'A', message: '1' });
      service.addLog({ level: 'ERROR', component: 'B', message: '2' });
      service.addLog({ level: 'INFO', component: 'C', message: '3' });

      const logs = service.getLogs({ level: 'INFO' });
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.level === 'INFO')).toBe(true);
    });

    it('should filter logs by component', () => {
      service.addLog({
        level: 'INFO',
        component: 'ComponentA',
        message: '1',
      });
      service.addLog({
        level: 'ERROR',
        component: 'ComponentB',
        message: '2',
      });
      service.addLog({
        level: 'INFO',
        component: 'ComponentA',
        message: '3',
      });

      const logs = service.getLogs({ component: 'ComponentA' });
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.component === 'ComponentA')).toBe(true);
    });

    it('should clear logs', () => {
      service.addLog({ level: 'INFO', component: 'A', message: '1' });
      service.addLog({ level: 'INFO', component: 'B', message: '2' });

      expect(service.getLogCount()).toBe(2);

      service.clearLogs();

      expect(service.getLogCount()).toBe(0);
      expect(service.getLogs()).toHaveLength(0);
    });
  });
});