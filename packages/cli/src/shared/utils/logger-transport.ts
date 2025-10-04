/**
 * HTTP Transport for CLI Logger
 *
 * Sends all CLI logs to the backend Winston logger via HTTP POST
 * This enables unified logging across frontend and backend components
 *
 * Features:
 * - Retry logic with exponential backoff
 * - Circuit breaker to prevent overwhelming dead backend
 * - Timeout to prevent hanging requests
 * - Graceful degradation when backend unavailable
 */

import type { LogTransport } from '@cage/shared';

interface QueuedLog {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  component: string;
  message: string;
  context?: Record<string, unknown>;
  stackTrace?: string;
}

class HttpLogTransport implements LogTransport {
  private queue: QueuedLog[] = [];
  private sending = false;
  private baseUrl: string;
  private retryCount = 0;
  private readonly maxRetries = 3;
  private readonly baseDelay = 100; // ms
  private circuitOpen = false;
  private circuitOpenUntil = 0;
  private readonly circuitBreakDuration = 30000; // 30 seconds
  private readonly requestTimeout = 5000; // 5 seconds

  constructor(baseUrl: string = 'http://localhost:3790') {
    this.baseUrl = baseUrl;
  }

  log(entry: QueuedLog): void {
    // Add to queue
    this.queue.push(entry);

    // Trigger send (debounced)
    void this.sendBatch();
  }

  private async sendBatch(): Promise<void> {
    // Don't send if already sending or queue is empty
    if (this.sending || this.queue.length === 0) {
      return;
    }

    // Check circuit breaker
    if (this.circuitOpen) {
      if (Date.now() < this.circuitOpenUntil) {
        // Circuit still open, drop logs to prevent memory buildup
        return;
      }
      // Circuit breaker timeout expired, try again
      this.circuitOpen = false;
      this.retryCount = 0;
    }

    this.sending = true;

    // Take all queued logs (outside try so it's accessible in catch)
    const batch = [...this.queue];
    this.queue = [];

    try {
      // Send to backend with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      const response = await fetch(`${this.baseUrl}/api/debug/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: batch }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Success - reset retry count
      this.retryCount = 0;
    } catch (error) {
      // INTENTIONAL: Use console.error here (not Logger) to avoid infinite recursion
      // when Winston transport itself fails. This is a fallback error handler.
      if (this.retryCount === 0) {
        // Only log first failure to avoid spam
        console.error(`[Winston Transport] Failed to send logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      this.retryCount++;

      if (this.retryCount >= this.maxRetries) {
        // Open circuit breaker after max retries
        this.circuitOpen = true;
        this.circuitOpenUntil = Date.now() + this.circuitBreakDuration;
        // INTENTIONAL: Use console.error here (not Logger) to avoid infinite recursion
        console.error('[Winston Transport] Circuit breaker opened - pausing log transmission for 30s');
        this.retryCount = 0;
        // Drop the failed batch to prevent memory buildup
      } else {
        // Re-queue failed batch and retry with exponential backoff
        this.queue.unshift(...batch);
        const delay = this.baseDelay * Math.pow(2, this.retryCount - 1);
        setTimeout(() => void this.sendBatch(), delay);
      }
    } finally {
      this.sending = false;

      // If more logs accumulated while sending, send them (after current retry delay if applicable)
      if (this.queue.length > 0 && this.retryCount === 0 && !this.circuitOpen) {
        setTimeout(() => void this.sendBatch(), 100);
      }
    }
  }
}

export function createHttpLogTransport(baseUrl?: string): LogTransport {
  return new HttpLogTransport(baseUrl);
}