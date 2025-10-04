/**
 * SSE Stream Service - Notification Bus
 *
 * CRITICAL: This service ONLY processes lightweight notifications (~200 bytes).
 * It does NOT send full events - only signals that new data is available.
 *
 * Flow:
 * 1. Backend creates event → Sends SSE: {type: 'event_added', timestamp: '2025-01-24T10:00:00.000Z'}
 * 2. This service receives notification → Updates store.setLastEventTimestamp(timestamp)
 * 3. Store setter triggers store.fetchLatestEvents() → GET /api/events/list?since=timestamp
 * 4. Store receives full events → Appends to state.events array
 * 5. Components re-render automatically (reading from Zustand)
 *
 * NO POLLING - SSE notifications replace interval-based polling
 */

import { EventSource } from 'eventsource';
import type { AppState } from '../../../shared/stores/appStore';
import { useAppStore } from '../../../shared/stores/appStore';
import { Logger } from '@cage/shared';

const logger = new Logger({ context: 'StreamService', silent: true });

interface SSENotification {
  type: 'connected' | 'heartbeat' | 'event_added' | 'debug_log_added';
  timestamp?: string;
  eventType?: string;
  sessionId?: string;
  level?: string;
  component?: string;
}

interface CageGlobal {
  __cageStreamService?: StreamService;
}

declare const global: CageGlobal;

// Dependencies that can be injected for testing
export interface StreamServiceDependencies {
  EventSourceClass: typeof EventSource;
  getStore: () => AppState;
}

export class StreamService {
  private eventSource: EventSource | null = null;
  private url: string;
  private deps: StreamServiceDependencies;

  private constructor(
    url: string,
    deps?: Partial<StreamServiceDependencies>
  ) {
    this.url = url;
    this.deps = {
      EventSourceClass: deps?.EventSourceClass || EventSource,
      getStore: deps?.getStore || (() => useAppStore.getState()),
    };
  }

  static getInstance(
    url: string = 'http://localhost:3790/api/events/stream',
    deps?: Partial<StreamServiceDependencies>
  ): StreamService {
    if (!global.__cageStreamService) {
      global.__cageStreamService = new StreamService(url, deps);
    }
    return global.__cageStreamService;
  }

  /**
   * Reset singleton instance (for testing only)
   */
  static resetInstance(): void {
    global.__cageStreamService = undefined;
  }

  connect(): void {
    if (this.eventSource) {
      logger.warn('Stream already connected');
      return;
    }

    const store = this.deps.getStore();
    this.eventSource = new this.deps.EventSourceClass(this.url);

    this.eventSource.onopen = () => {
      logger.info('Stream connected');
      store.setStreamingStatus(true);
    };

    this.eventSource.onmessage = (messageEvent: MessageEvent) => {
      try {
        const notification = JSON.parse(messageEvent.data) as SSENotification;

        switch (notification.type) {
          case 'connected':
            logger.info('SSE connection established');
            break;

          case 'heartbeat':
            break;

          case 'event_added':
            if (notification.timestamp) {
              logger.info('SSE: event_added notification received', {
                eventType: notification.eventType,
                timestamp: notification.timestamp,
                sessionId: notification.sessionId,
              });
              store.setLastEventTimestamp(notification.timestamp);
              logger.info('SSE: setLastEventTimestamp called, will trigger fetchLatestEvents');
            } else {
              logger.warn('SSE: event_added notification missing timestamp', notification);
            }
            break;

          case 'debug_log_added':
            if (notification.timestamp) {
              logger.debug('New debug log notification', {
                level: notification.level,
                component: notification.component,
                timestamp: notification.timestamp,
              });
              store.setLastDebugLogTimestamp(notification.timestamp);
            }
            break;

          default:
            logger.warn('Unknown SSE notification type', {
              type: (notification as SSENotification).type,
            });
        }
      } catch (error) {
        logger.error('Failed to parse SSE notification', { error });
      }
    };

    this.eventSource.onerror = () => {
      logger.error('Stream connection error');
      this.cleanup();
      store.setStreamingStatus(false);
    };
  }

  disconnect(): void {
    this.cleanup();
    this.deps.getStore().setStreamingStatus(false);
  }

  private cleanup(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  get isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}