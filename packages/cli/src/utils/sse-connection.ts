export type SSEConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

export type SSEReconnectStrategy = 'linear' | 'exponential';

export interface SSEMessage {
  id: string;
  event: string;
  data: unknown;
  timestamp: number;
}

export interface SSEConnectionOptions {
  reconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  reconnectAttempts?: number;
  reconnectStrategy?: SSEReconnectStrategy;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  headers?: Record<string, string>;
  bufferSize?: number;
}

export interface ConnectionStats {
  messagesReceived: number;
  connectionState: SSEConnectionState;
  lastMessageTime?: number;
  connectedAt?: number;
  disconnectedAt?: number;
  reconnectCount: number;
  currentReconnectAttempt: number;
  uptime?: number;
  bytesReceived: number;
}

export interface MessageFilter {
  eventTypes?: string[];
  dataFilter?: (data: unknown) => boolean;
}

export interface ReconnectInfo {
  attempt: number;
  delay: number;
  nextAttemptAt: number;
}

export interface ErrorInfo {
  type: 'connection' | 'parse' | 'timeout' | 'network';
  message: string;
  error?: Error;
  timestamp: number;
}

export class SSEConnection {
  private url: string;
  private options: SSEConnectionOptions;
  private state: SSEConnectionState = 'disconnected';
  private eventSource: EventSource | null = null;
  private messageBuffer: SSEMessage[] = [];
  private stats: ConnectionStats = {
    messagesReceived: 0,
    connectionState: 'disconnected',
    reconnectCount: 0,
    currentReconnectAttempt: 0,
    bytesReceived: 0,
  };

  // Event handlers
  private messageHandlers: Array<{
    handler: (message: SSEMessage) => void;
    filter?: MessageFilter;
  }> = [];
  private errorHandlers: Array<(error: ErrorInfo) => void> = [];
  private reconnectingHandlers: Array<(info: ReconnectInfo) => void> = [];
  private heartbeatHandlers: Array<() => void> = [];
  private timeoutHandlers: Array<() => void> = [];
  private stateChangeHandlers: Array<(state: SSEConnectionState) => void> = [];

  // Connection management
  private connectPromise: Promise<void> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeatTime: number = 0;
  private customEventTypes: Set<string> = new Set([
    'heartbeat',
    'tool-use',
    'user-message',
    'error',
  ]);

  constructor(url: string, options: SSEConnectionOptions = {}) {
    this.url = url;
    this.options = {
      reconnect: options.reconnect ?? false,
      reconnectDelay: options.reconnectDelay ?? 3000,
      maxReconnectDelay: options.maxReconnectDelay ?? 60000,
      reconnectAttempts: options.reconnectAttempts ?? Infinity,
      reconnectStrategy: options.reconnectStrategy ?? 'linear',
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      heartbeatTimeout: options.heartbeatTimeout ?? 60000,
      headers: options.headers ?? {},
      bufferSize: options.bufferSize ?? 0,
    };
  }

  async connect(): Promise<void> {
    // Prevent multiple simultaneous connections
    if (this.connectPromise) {
      return this.connectPromise;
    }

    if (this.state === 'connected') {
      return Promise.resolve();
    }

    this.connectPromise = this.doConnect();

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private async doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.setState('connecting');

      try {
        // Create EventSource with URL
        this.eventSource = new EventSource(this.url);

        // Set up event handlers
        this.eventSource.onopen = () => {
          this.setState('connected');
          this.stats.connectedAt = Date.now();
          this.stats.currentReconnectAttempt = 0;
          this.stats.connectionState = 'connected';
          this.startHeartbeatMonitoring();
          resolve();
        };

        this.eventSource.onerror = event => {
          const errorInfo: ErrorInfo = {
            type: 'connection',
            message: 'Failed to connect',
            timestamp: Date.now(),
          };

          // Notify error handlers
          this.errorHandlers.forEach(handler => handler(errorInfo));

          if (this.state === 'connecting') {
            reject(new Error('Failed to connect'));
          } else if (this.options.reconnect && this.state === 'connected') {
            this.handleReconnection();
          }

          // Cleanup on critical error
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            this.cleanup();
          }
        };

        this.eventSource.onmessage = (event: MessageEvent) => {
          this.handleMessage('message', event.data);
        };

        // Register custom event listeners
        this.customEventTypes.forEach(eventType => {
          this.eventSource?.addEventListener(eventType, event => {
            const messageEvent = event as MessageEvent;
            this.handleMessage(eventType, messageEvent.data);
          });
        });
      } catch (error) {
        const errorInfo: ErrorInfo = {
          type: 'network',
          message: error instanceof Error ? error.message : 'Network error',
          error: error instanceof Error ? error : undefined,
          timestamp: Date.now(),
        };
        this.errorHandlers.forEach(handler => handler(errorInfo));
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.cleanup();
    this.setState('disconnected');
    this.stats.disconnectedAt = Date.now();
  }

  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private handleMessage(eventType: string, data: string): void {
    try {
      // Parse JSON data
      const parsedData = JSON.parse(data);

      // Create SSE message
      const message: SSEMessage = {
        id: Math.random().toString(36).substr(2, 9),
        event: eventType,
        data: parsedData,
        timestamp: Date.now(),
      };

      // Update statistics
      this.stats.messagesReceived++;
      this.stats.lastMessageTime = Date.now();
      this.stats.bytesReceived += data.length;

      // Handle heartbeat
      if (eventType === 'heartbeat') {
        this.lastHeartbeatTime = Date.now();
        this.heartbeatHandlers.forEach(handler => handler());
        return;
      }

      // Buffer message if needed
      if (this.options.bufferSize && this.options.bufferSize > 0) {
        this.messageBuffer.push(message);
        if (this.messageBuffer.length > this.options.bufferSize) {
          this.messageBuffer.shift();
        }
      }

      // Notify message handlers with filters
      this.messageHandlers.forEach(({ handler, filter }) => {
        // Check event type filter
        if (filter?.eventTypes && !filter.eventTypes.includes(eventType)) {
          return;
        }

        // Check data filter
        if (filter?.dataFilter && !filter.dataFilter(parsedData)) {
          return;
        }

        handler(message);
      });
    } catch (error) {
      const errorInfo: ErrorInfo = {
        type: 'parse',
        message: `Failed to parse message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error : undefined,
        timestamp: Date.now(),
      };
      this.errorHandlers.forEach(handler => handler(errorInfo));
    }
  }

  private handleReconnection(): void {
    if (
      this.stats.currentReconnectAttempt >=
      (this.options.reconnectAttempts ?? Infinity)
    ) {
      const errorInfo: ErrorInfo = {
        type: 'connection',
        message: 'Max reconnection attempts reached',
        timestamp: Date.now(),
      };
      this.errorHandlers.forEach(handler => handler(errorInfo));
      this.setState('disconnected');
      return;
    }

    this.setState('reconnecting');
    this.stats.currentReconnectAttempt++;

    const delay = this.calculateReconnectDelay();
    const reconnectInfo: ReconnectInfo = {
      attempt: this.stats.currentReconnectAttempt,
      delay,
      nextAttemptAt: Date.now() + delay,
    };

    this.reconnectingHandlers.forEach(handler => handler(reconnectInfo));

    this.reconnectTimer = setTimeout(() => {
      this.stats.reconnectCount++;
      this.doConnect().catch(() => {
        this.handleReconnection();
      });
    }, delay);
  }

  private calculateReconnectDelay(): number {
    const baseDelay = this.options.reconnectDelay ?? 3000;
    const maxDelay = this.options.maxReconnectDelay ?? 60000;

    if (this.options.reconnectStrategy === 'exponential') {
      const delay =
        baseDelay * Math.pow(2, this.stats.currentReconnectAttempt - 1);
      return Math.min(delay, maxDelay);
    }

    return baseDelay;
  }

  private startHeartbeatMonitoring(): void {
    if (!this.options.heartbeatInterval || !this.options.heartbeatTimeout) {
      return;
    }

    this.lastHeartbeatTime = Date.now();

    this.heartbeatTimer = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeatTime;

      if (timeSinceLastHeartbeat > (this.options.heartbeatTimeout ?? 60000)) {
        this.timeoutHandlers.forEach(handler => handler());

        if (this.options.reconnect) {
          this.cleanup();
          this.handleReconnection();
        }
      }
    }, this.options.heartbeatInterval);
  }

  private setState(newState: SSEConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.stats.connectionState = newState;
      this.notifyStateChange(newState);
    }
  }

  getState(): SSEConnectionState {
    return this.state;
  }

  getUrl(): string {
    return this.url;
  }

  getOptions(): SSEConnectionOptions {
    return { ...this.options };
  }

  getMessageBuffer(): SSEMessage[] {
    return [...this.messageBuffer];
  }

  getConnectionStats(): ConnectionStats {
    const stats = { ...this.stats };

    // Calculate uptime if connected
    if (this.state === 'connected' && stats.connectedAt) {
      stats.uptime = Date.now() - stats.connectedAt;
    }

    return stats;
  }

  // Event handler registration
  onMessage(
    handler: (message: SSEMessage) => void,
    filter?: MessageFilter
  ): void {
    this.messageHandlers.push({ handler, filter });
  }

  onError(handler: (error: ErrorInfo) => void): void {
    this.errorHandlers.push(handler);
  }

  onReconnecting(handler: (info: ReconnectInfo) => void): void {
    this.reconnectingHandlers.push(handler);
  }

  onHeartbeat(handler: () => void): void {
    this.heartbeatHandlers.push(handler);
  }

  onTimeout(handler: () => void): void {
    this.timeoutHandlers.push(handler);
  }

  onStateChange(handler: (state: SSEConnectionState) => void): void {
    this.stateChangeHandlers.push(handler);
  }

  // Private helper methods
  private notifyStateChange(state: SSEConnectionState): void {
    this.stateChangeHandlers.forEach(handler => handler(state));
  }
}
