/**
 * Vitest mock for EventSource
 */

import { vi } from 'vitest';

// Define proper type for EventListener
type EventListenerFunc = (_event: Event) => void;

// Define the type for our mock instance
interface MockEventSourceInstance {
  url: string;
  readyState: number;
  withCredentials: boolean;
  CONNECTING: number;
  OPEN: number;
  CLOSED: number;
  onopen: ((_event: Event) => void) | null;
  onmessage: ((_event: MessageEvent) => void) | null;
  onerror: ((_event: Event) => void) | null;
  eventListeners: Map<string, Set<EventListenerFunc>>;
  close: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
  simulateOpen: () => void;
  simulateMessage: (data: unknown) => void;
  simulateError: (closeConnection?: boolean) => void;
  simulateCustomEvent: (eventType: string, data: unknown) => void;
}

// Create a properly typed mock constructor function
const createMockEventSource = vi.fn();

// Add static properties and methods to the mock
const mockConstructor = Object.assign(createMockEventSource, {
  instances: [] as MockEventSourceInstance[],
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
  mockImplementation: createMockEventSource.mockImplementation.bind(
    createMockEventSource
  ),
});

// Export the fully typed mock
export const MockEventSource = mockConstructor;

// Mock implementation
MockEventSource.mockImplementation(function (url: string) {
  // Create the instance
  const instance = {
    url,
    readyState: MockEventSource.CONNECTING,
    withCredentials: false,

    // Constants
    CONNECTING: 0,
    OPEN: 1,
    CLOSED: 2,

    // Event handlers
    onopen: null as ((event: Event) => void) | null,
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: Event) => void) | null,

    // Event listeners map
    eventListeners: new Map<string, Set<EventListenerFunc>>(),

    // Methods
    close: vi.fn(function () {
      instance.readyState = MockEventSource.CLOSED;
      instance.eventListeners.clear();
    }),

    addEventListener: vi.fn(function (
      type: string,
      listener: EventListenerFunc
    ) {
      if (!instance.eventListeners.has(type)) {
        instance.eventListeners.set(type, new Set());
      }
      instance.eventListeners.get(type)?.add(listener);
    }),

    removeEventListener: vi.fn(function (
      type: string,
      listener: EventListenerFunc
    ) {
      const listeners = instance.eventListeners.get(type);
      if (listeners) {
        listeners.delete(listener);
      }
    }),

    dispatchEvent: vi.fn(function (event: Event) {
      // Call event listeners
      const listeners = instance.eventListeners.get(event.type);
      if (listeners) {
        listeners.forEach(listener => listener(event));
      }

      // Call on* handlers
      if (event.type === 'open' && instance.onopen) {
        instance.onopen(event);
      } else if (event.type === 'message' && instance.onmessage) {
        instance.onmessage(event as MessageEvent);
      } else if (event.type === 'error' && instance.onerror) {
        instance.onerror(event);
      }

      return true;
    }),

    // Helper methods for testing
    simulateOpen: function () {
      instance.readyState = MockEventSource.OPEN;
      const event = new Event('open');
      instance.dispatchEvent(event);
    },

    simulateMessage: function (data: unknown) {
      if (instance.readyState !== MockEventSource.OPEN) {
        throw new Error('Cannot send message on closed connection');
      }
      const event = new MessageEvent('message', {
        data: typeof data === 'string' ? data : JSON.stringify(data),
      });
      instance.dispatchEvent(event);
    },

    simulateError: function (closeConnection = true) {
      if (closeConnection) {
        instance.readyState = MockEventSource.CLOSED;
      }
      const event = new Event('error');
      instance.dispatchEvent(event);
    },

    simulateCustomEvent: function (eventType: string, data: unknown) {
      if (instance.readyState !== MockEventSource.OPEN) {
        throw new Error('Cannot send event on closed connection');
      }
      const event = new MessageEvent(eventType, {
        data: typeof data === 'string' ? data : JSON.stringify(data),
      });
      instance.dispatchEvent(event);
    },
  };

  // Track the instance
  MockEventSource.instances.push(instance);

  return instance;
});
