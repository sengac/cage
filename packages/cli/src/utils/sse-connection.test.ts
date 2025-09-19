import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockEventSource } from '../__mocks__/EventSource';

import {
  SSEConnection,
  SSEConnectionOptions,
  SSEConnectionState,
  SSEMessage,
  SSEReconnectStrategy,
  ConnectionStats
} from './sse-connection';

// Mock the global EventSource
vi.stubGlobal('EventSource', MockEventSource);

describe('SSEConnection', () => {
  let connection: SSEConnection | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    MockEventSource.instances = [];
  });

  afterEach(() => {
    if (connection) {
      connection.disconnect();
      connection = null;
    }
    MockEventSource.instances.forEach(instance => instance.close());
    MockEventSource.instances = [];
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Connection Management', () => {
    it('should create connection with default options', () => {
      connection = new SSEConnection('http://localhost:3790/events');

      expect(connection).toBeDefined();
      expect(connection.getState()).toBe('disconnected');
      expect(connection.getUrl()).toBe('http://localhost:3790/events');
    });

    it('should create connection with custom options', () => {
      const options: SSEConnectionOptions = {
        reconnect: true,
        reconnectDelay: 5000,
        maxReconnectDelay: 30000,
        reconnectAttempts: 5,
        heartbeatInterval: 15000,
        headers: { 'Authorization': 'Bearer token' }
      };

      connection = new SSEConnection('http://localhost:3790/events', options);

      expect(connection.getOptions()).toEqual(expect.objectContaining(options));
    });

    it('should connect to SSE endpoint', async () => {
      connection = new SSEConnection('http://localhost:3790/events');
      const connectPromise = connection.connect();

      expect(connection.getState()).toBe('connecting');

      // Get the mock instance that was created
      expect(MockEventSource.instances).toHaveLength(1);
      const mockEventSource = MockEventSource.instances[0];

      // Simulate successful connection
      mockEventSource.simulateOpen();

      await expect(connectPromise).resolves.toBeUndefined();
      expect(connection.getState()).toBe('connected');
    });

    it('should handle connection errors', async () => {
      connection = new SSEConnection('http://localhost:3790/events');
      const connectPromise = connection.connect();

      // Get the mock instance
      const mockEventSource = MockEventSource.instances[0];

      // Simulate connection error
      mockEventSource.simulateError(true);

      await expect(connectPromise).rejects.toThrow('Failed to connect');
    });

    it('should disconnect properly', async () => {
      connection = new SSEConnection('http://localhost:3790/events');
      const connectPromise = connection.connect();

      const mockEventSource = MockEventSource.instances[0];
      mockEventSource.simulateOpen();

      await connectPromise;

      connection.disconnect();

      expect(mockEventSource.readyState).toBe(MockEventSource.CLOSED);
      expect(connection.getState()).toBe('disconnected');
    });
  });

  describe('Message Handling', () => {
    let mockEventSource: MockEventSource;

    beforeEach(async () => {
      connection = new SSEConnection('http://localhost:3790/events');
      const connectPromise = connection.connect();
      mockEventSource = MockEventSource.instances[0];
      mockEventSource.simulateOpen();
      await connectPromise;
    });

    it('should receive and parse messages', () => {
      const onMessage = vi.fn();
      connection!.onMessage(onMessage);

      const messageData = { type: 'ToolUse', tool: 'Edit', timestamp: '2025-01-01T00:00:00Z' };
      mockEventSource.simulateMessage(messageData);

      expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: expect.any(String),
        event: 'message',
        data: messageData,
        timestamp: expect.any(Number)
      }));
    });

    it('should handle malformed JSON messages', () => {
      const onError = vi.fn();
      connection!.onError(onError);

      // Simulate a message with invalid JSON
      mockEventSource.simulateMessage('invalid json{');

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Failed to parse message')
      }));
    });

    it('should handle custom event types', () => {
      const onMessage = vi.fn();
      connection!.onMessage(onMessage);

      const messageData = { tool: 'Edit', file: 'test.ts' };

      // Simulate a custom event
      mockEventSource.simulateCustomEvent('tool-use', messageData);

      expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({
        event: 'tool-use',
        data: messageData
      }));
    });

    it('should buffer messages when specified', async () => {
      // Create a new connection with buffer
      const bufferedConnection = new SSEConnection('http://localhost:3790/events', {
        bufferSize: 100
      });
      const connectPromise = bufferedConnection.connect();
      const bufferedEventSource = MockEventSource.instances[MockEventSource.instances.length - 1];
      bufferedEventSource.simulateOpen();
      await connectPromise;

      for (let i = 0; i < 5; i++) {
        bufferedEventSource.simulateMessage({ index: i });
      }

      const buffer = bufferedConnection.getMessageBuffer();
      expect(buffer).toHaveLength(5);
      expect(buffer[0].data).toEqual({ index: 0 });

      bufferedConnection.disconnect();
    });

    it('should respect buffer size limit', async () => {
      // Create a new connection with limited buffer
      const bufferedConnection = new SSEConnection('http://localhost:3790/events', {
        bufferSize: 3
      });
      const connectPromise = bufferedConnection.connect();
      const bufferedEventSource = MockEventSource.instances[MockEventSource.instances.length - 1];
      bufferedEventSource.simulateOpen();
      await connectPromise;

      for (let i = 0; i < 5; i++) {
        bufferedEventSource.simulateMessage({ index: i });
      }

      const buffer = bufferedConnection.getMessageBuffer();
      expect(buffer).toHaveLength(3);
      expect(buffer[0].data).toEqual({ index: 2 }); // Oldest messages removed
      expect(buffer[2].data).toEqual({ index: 4 });

      bufferedConnection.disconnect();
    });
  });

  describe('Reconnection Logic', () => {
    let mockEventSource: ReturnType<typeof MockEventSource>;
    it('should auto-reconnect on connection loss', async () => {
      connection = new SSEConnection('http://localhost:3790/events', {
        reconnect: true,
        reconnectDelay: 1000
      });

      const onReconnecting = vi.fn();
      connection.onReconnecting(onReconnecting);

      const connectPromise = connection.connect();
      mockEventSource = MockEventSource.instances[0];
      mockEventSource.simulateOpen();
      await connectPromise;

      // Simulate connection loss
      mockEventSource.simulateError(false); // Don't close connection yet, let error handler do it

      expect(onReconnecting).toHaveBeenCalledWith(expect.objectContaining({
        attempt: 1,
        delay: 1000
      }));

      // Advance timer to trigger reconnection
      vi.advanceTimersByTime(1000);

      // New connection should be created
      expect(MockEventSource.instances).toHaveLength(2);
    });

    it('should use exponential backoff for reconnection', async () => {
      connection = new SSEConnection('http://localhost:3790/events', {
        reconnect: true,
        reconnectDelay: 1000,
        reconnectStrategy: 'exponential' as SSEReconnectStrategy
      });

      const onReconnecting = vi.fn();
      connection.onReconnecting(onReconnecting);

      const connectPromise = connection.connect();
      mockEventSource = MockEventSource.instances[0];
      mockEventSource.simulateOpen();
      await connectPromise;

      // First reconnection attempt
      mockEventSource.simulateError(false);
      expect(onReconnecting).toHaveBeenCalledWith(expect.objectContaining({
        attempt: 1,
        delay: 1000
      }));

      // Advance time to trigger first reconnection
      vi.advanceTimersByTime(1000);

      // A new EventSource should be created for reconnection
      expect(MockEventSource.instances).toHaveLength(2);
      const secondEventSource = MockEventSource.instances[1];

      // The state should now be 'connecting' from doConnect()
      expect(connection.getState()).toBe('connecting');

      // Simulate error during the second connection attempt
      // This will reject the doConnect promise, triggering handleReconnection again
      secondEventSource.simulateError(true);

      // The rejection happens asynchronously, advance timers to process
      await vi.runOnlyPendingTimersAsync();

      // Now check for second reconnection attempt with exponential backoff
      expect(onReconnecting).toHaveBeenCalledTimes(2);
      expect(onReconnecting).toHaveBeenNthCalledWith(2, expect.objectContaining({
        attempt: 2,
        delay: 2000 // Exponential backoff
      }));
    });

    it('should respect max reconnection attempts', async () => {
      connection = new SSEConnection('http://localhost:3790/events', {
        reconnect: true,
        reconnectDelay: 100,
        reconnectAttempts: 2
      });

      const onError = vi.fn();
      connection.onError(onError);

      const connectPromise = connection.connect();
      mockEventSource = MockEventSource.instances[0];
      mockEventSource.simulateOpen();
      await connectPromise;

      // First error on connected state triggers reconnection attempt #1
      mockEventSource.simulateError(false);

      // Wait for reconnection timer
      vi.advanceTimersByTime(100);

      // Check if second EventSource was created for first reconnection
      expect(MockEventSource.instances).toHaveLength(2);
      const secondEventSource = MockEventSource.instances[1];

      // Second error during connection triggers reconnection attempt #2
      secondEventSource.simulateError(true); // Close to trigger reconnection

      // Process any pending async operations
      await vi.runOnlyPendingTimersAsync();

      // Wait for second reconnection timer
      vi.advanceTimersByTime(100);

      // Check if third EventSource was created for second reconnection
      expect(MockEventSource.instances).toHaveLength(3);
      const thirdEventSource = MockEventSource.instances[2];

      // Third error should hit the max attempts (2) and give up
      thirdEventSource.simulateError(true);

      // Process the promise rejection that triggers final handleReconnection
      await vi.runOnlyPendingTimersAsync();

      // Check that max reconnection attempts message was sent
      const errorCalls = onError.mock.calls;
      const maxAttemptsError = errorCalls.find(call =>
        call[0].message?.includes('Max reconnection attempts reached')
      );
      expect(maxAttemptsError).toBeDefined();
      expect(connection.getState()).toBe('disconnected');
    });

    it('should reset reconnection count on successful connection', async () => {
      connection = new SSEConnection('http://localhost:3790/events', {
        reconnect: true,
        reconnectDelay: 100
      });

      const connectPromise = connection.connect();
      mockEventSource = MockEventSource.instances[0];
      mockEventSource.simulateOpen();
      await connectPromise;

      // First failure and reconnection
      mockEventSource.onerror?.(new Event('error'));
      vi.advanceTimersByTime(100);

      // Successful reconnection
      const secondEventSource = MockEventSource.instances[1];
      secondEventSource.readyState = MockEventSource.OPEN;
      secondEventSource.onopen?.(new Event('open'));

      const stats = connection.getConnectionStats();
      expect(stats.reconnectCount).toBe(1);
      expect(stats.currentReconnectAttempt).toBe(0); // Reset after success
    });
  });

  describe('Heartbeat Monitoring', () => {
    let mockEventSource: ReturnType<typeof MockEventSource>;
    it('should send heartbeat messages', () => {
      connection = new SSEConnection('http://localhost:3790/events', {
        heartbeatInterval: 5000,
        heartbeatTimeout: 10000
      });

      connection.connect();
      mockEventSource = MockEventSource.instances[0];
      mockEventSource.readyState = MockEventSource.OPEN;
      mockEventSource.onopen?.(new Event('open'));

      const onHeartbeat = vi.fn();
      connection.onHeartbeat(onHeartbeat);

      // Simulate heartbeat message
      const event = new MessageEvent('heartbeat', {
        data: JSON.stringify({ timestamp: Date.now() })
      });

      const heartbeatListener = mockEventSource.addEventListener.mock.calls
        .find(call => call[0] === 'heartbeat')?.[1];

      heartbeatListener?.(event as Event);

      expect(onHeartbeat).toHaveBeenCalled();
    });

    it('should detect connection timeout', async () => {
      connection = new SSEConnection('http://localhost:3790/events', {
        reconnect: true,
        heartbeatInterval: 5000,
        heartbeatTimeout: 10000
      });

      const onTimeout = vi.fn();
      connection.onTimeout(onTimeout);

      const connectPromise = connection.connect();
      mockEventSource = MockEventSource.instances[0];
      mockEventSource.simulateOpen();
      await connectPromise;

      // The heartbeat timer checks every 5000ms if time since last heartbeat > 10000ms
      // Initially lastHeartbeatTime is set to Date.now() when connection opens

      // Advance time to first heartbeat check (at 5000ms)
      vi.advanceTimersByTime(5000);

      // No timeout yet (only 5 seconds since connection, timeout is 10 seconds)
      expect(onTimeout).not.toHaveBeenCalled();

      // Advance to second heartbeat check (at 10000ms total)
      vi.advanceTimersByTime(5000);

      // Still no timeout (exactly 10 seconds, not exceeding timeout)
      expect(onTimeout).not.toHaveBeenCalled();

      // Advance to third heartbeat check (at 15000ms total)
      vi.advanceTimersByTime(5000);

      // Now timeout should trigger (15 seconds > 10 second timeout)
      expect(onTimeout).toHaveBeenCalled();
      expect(connection.getState()).toBe('reconnecting');
    });
  });

  describe('Connection Statistics', () => {
    let mockEventSource: ReturnType<typeof MockEventSource>;
    it('should track connection statistics', async () => {
      connection = new SSEConnection('http://localhost:3790/events');

      const connectPromise = connection.connect();
      mockEventSource = MockEventSource.instances[0];
      mockEventSource.simulateOpen();
      await connectPromise;

      // Send some messages
      for (let i = 0; i < 5; i++) {
        const event = new MessageEvent('message', {
          data: JSON.stringify({ index: i })
        });
        mockEventSource.onmessage?.(event);
      }

      const stats = connection.getConnectionStats();
      expect(stats).toEqual(expect.objectContaining({
        messagesReceived: 5,
        connectionState: 'connected',
        lastMessageTime: expect.any(Number),
        connectedAt: expect.any(Number),
        reconnectCount: 0
      }));
    });

    it('should calculate uptime correctly', async () => {
      connection = new SSEConnection('http://localhost:3790/events');

      const connectPromise = connection.connect();
      mockEventSource = MockEventSource.instances[0];
      mockEventSource.simulateOpen();
      await connectPromise;

      vi.advanceTimersByTime(5000);

      const stats = connection.getConnectionStats();
      expect(stats.uptime).toBeGreaterThanOrEqual(5000);
    });

    it('should track bytes received', async () => {
      connection = new SSEConnection('http://localhost:3790/events');

      const connectPromise = connection.connect();
      mockEventSource = MockEventSource.instances[0];
      mockEventSource.simulateOpen();
      await connectPromise;

      const testData = { message: 'test', value: 123 };
      const event = new MessageEvent('message', {
        data: JSON.stringify(testData)
      });
      mockEventSource.onmessage?.(event);

      const stats = connection.getConnectionStats();
      expect(stats.bytesReceived).toBe(JSON.stringify(testData).length);
    });
  });

  describe('Event Filtering', () => {
    let mockEventSource: ReturnType<typeof MockEventSource>;
    beforeEach(() => {
      connection = new SSEConnection('http://localhost:3790/events');
      connection.connect();
      mockEventSource = MockEventSource.instances[0];
      mockEventSource.readyState = MockEventSource.OPEN;
      mockEventSource.onopen?.(new Event('open'));
    });

    it('should filter messages by event type', () => {
      const onMessage = vi.fn();
      connection.onMessage(onMessage, { eventTypes: ['tool-use'] });

      // This should be received
      const toolUseListener = mockEventSource.addEventListener.mock.calls
        .find(call => call[0] === 'tool-use')?.[1];

      toolUseListener?.(new MessageEvent('tool-use', {
        data: JSON.stringify({ tool: 'Edit' })
      }) as Event);

      // This should be filtered out
      mockEventSource.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify({ type: 'other' })
      }));

      expect(onMessage).toHaveBeenCalledTimes(1);
      expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({
        event: 'tool-use'
      }));
    });

    it('should filter messages by data properties', () => {
      const onMessage = vi.fn();
      connection.onMessage(onMessage, {
        dataFilter: (data: unknown) => {
          const obj = data as Record<string, unknown>;
          return obj.tool === 'Edit';
        }
      });

      mockEventSource.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify({ tool: 'Edit', file: 'test.ts' })
      }));

      mockEventSource.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify({ tool: 'Write', file: 'test.ts' })
      }));

      expect(onMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    let mockEventSource: ReturnType<typeof MockEventSource>;
    it('should handle network errors', () => {
      connection = new SSEConnection('http://invalid-url');
      const onError = vi.fn();
      connection.onError(onError);

      const connectPromise = connection.connect();
      mockEventSource = MockEventSource.instances[0];
      mockEventSource.onerror?.(new Event('error'));

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        type: 'connection',
        message: expect.stringContaining('Failed to connect')
      }));

      return expect(connectPromise).rejects.toThrow();
    });

    it('should handle parse errors gracefully', () => {
      connection = new SSEConnection('http://localhost:3790/events');
      const onError = vi.fn();
      connection.onError(onError);

      connection.connect();
      mockEventSource = MockEventSource.instances[0];
      mockEventSource.readyState = MockEventSource.OPEN;
      mockEventSource.onopen?.(new Event('open'));

      mockEventSource.onmessage?.(new MessageEvent('message', {
        data: 'not valid json'
      }));

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        type: 'parse',
        message: expect.stringContaining('Failed to parse message')
      }));
    });

    it('should cleanup on error', () => {
      connection = new SSEConnection('http://localhost:3790/events');
      connection.connect();
      mockEventSource = MockEventSource.instances[0];
      mockEventSource.readyState = MockEventSource.OPEN;
      mockEventSource.onopen?.(new Event('open'));

      // Simulate critical error
      mockEventSource.readyState = MockEventSource.CLOSED;
      mockEventSource.onerror?.(new Event('error'));

      expect(mockEventSource.close).toHaveBeenCalled();
    });
  });

  describe('Custom Headers', () => {
    it('should support custom headers', () => {
      const headers = {
        'Authorization': 'Bearer token123',
        'X-Custom-Header': 'value'
      };

      connection = new SSEConnection('http://localhost:3790/events', {
        headers
      });

      const config = connection.getOptions();
      expect(config.headers).toEqual(headers);
    });
  });

  describe('Connection State Management', () => {
    let mockEventSource: ReturnType<typeof MockEventSource>;
    it('should transition through states correctly', async () => {
      connection = new SSEConnection('http://localhost:3790/events');
      const states: SSEConnectionState[] = [];

      connection.onStateChange((state) => {
        states.push(state);
      });

      expect(connection.getState()).toBe('disconnected');

      const connectPromise = connection.connect();
      expect(connection.getState()).toBe('connecting');

      mockEventSource = MockEventSource.instances[0];
      mockEventSource.readyState = MockEventSource.OPEN;
      mockEventSource.onopen?.(new Event('open'));

      await connectPromise;
      expect(connection.getState()).toBe('connected');

      connection.disconnect();
      expect(connection.getState()).toBe('disconnected');

      expect(states).toEqual(['connecting', 'connected', 'disconnected']);
    });

    it('should prevent multiple simultaneous connections', async () => {
      connection = new SSEConnection('http://localhost:3790/events');

      const promise1 = connection.connect();
      const promise2 = connection.connect();

      // Both promises should resolve to the same result
      expect(MockEventSource.instances).toHaveLength(1); // Only one connection created

      // Simulate connection success
      const mockEventSource = MockEventSource.instances[0];
      mockEventSource.simulateOpen();

      // Both promises should resolve without error
      await expect(promise1).resolves.toBeUndefined();
      await expect(promise2).resolves.toBeUndefined();
    });

    it('should handle reconnecting state', () => {
      connection = new SSEConnection('http://localhost:3790/events', {
        reconnect: true
      });

      connection.connect();
      mockEventSource = MockEventSource.instances[0];
      mockEventSource.readyState = MockEventSource.OPEN;
      mockEventSource.onopen?.(new Event('open'));

      // Trigger reconnection
      mockEventSource.onerror?.(new Event('error'));

      expect(connection.getState()).toBe('reconnecting');
    });
  });
});