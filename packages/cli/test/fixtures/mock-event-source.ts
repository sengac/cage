/**
 * Mock EventSource for testing
 * Provides a controllable EventSource implementation that can be used in tests
 */

export class MockEventSource {
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState: number = 0; // CONNECTING

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Simulate successful connection
   */
  simulateOpen(): void {
    this.readyState = MockEventSource.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  /**
   * Simulate receiving a message
   */
  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data),
      });
      this.onmessage(event);
    }
  }

  /**
   * Simulate an error
   */
  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  /**
   * Close the connection
   */
  close(): void {
    this.readyState = MockEventSource.CLOSED;
  }
}
