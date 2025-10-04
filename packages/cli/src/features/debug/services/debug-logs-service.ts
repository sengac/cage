/**
 * Debug Logs Service - Singleton service for managing debug logs
 *
 * This service fetches initial debug logs and then relies on SSE notifications
 * (via StreamService) to trigger real-time updates through the Zustand store.
 *
 * EXACT same pattern as HooksStatusService - manages Zustand state.
 */

import type { AppState } from '../../../shared/stores/appStore';
import { useAppStore } from '../../../shared/stores/appStore';
import { Logger } from '@cage/shared';

const logger = new Logger({ context: 'DebugLogsService' });

interface CageGlobal {
  __cageDebugLogsService?: DebugLogsService;
}

declare const global: CageGlobal;

// Dependencies that can be injected for testing
export interface DebugLogsServiceDependencies {
  getStore: () => AppState;
}

export class DebugLogsService {
  private started = false;
  private deps: DebugLogsServiceDependencies;

  private constructor(deps?: Partial<DebugLogsServiceDependencies>) {
    this.deps = {
      getStore: deps?.getStore || (() => useAppStore.getState()),
    };
  }

  static getInstance(
    deps?: Partial<DebugLogsServiceDependencies>
  ): DebugLogsService {
    if (!global.__cageDebugLogsService) {
      global.__cageDebugLogsService = new DebugLogsService(deps);
    }
    return global.__cageDebugLogsService;
  }

  /**
   * Reset singleton instance (for testing only)
   */
  static resetInstance(): void {
    global.__cageDebugLogsService = undefined;
  }

  /**
   * Start the debug logs service
   * Fetches initial logs, then relies on SSE for real-time updates
   */
  start(): void {
    if (this.started) {
      logger.warn('DebugLogsService already started');
      return;
    }

    this.started = true;

    logger.info('Starting debug logs service');

    // Fetch initial logs immediately
    void this.fetchDebugLogs();

    // Real-time updates come from SSE notifications:
    // StreamService receives 'debug_log_added' → calls store.setLastDebugLogTimestamp()
    // → store automatically fetches latest logs
  }

  /**
   * Stop the service
   */
  stop(): void {
    if (this.started) {
      this.started = false;
      logger.info('Stopped debug logs service');
    }
  }

  /**
   * Fetch debug logs and update store
   */
  private async fetchDebugLogs(): Promise<void> {
    try {
      const store = this.deps.getStore();
      await store.fetchLatestDebugLogs();
    } catch (error) {
      logger.error('Failed to fetch debug logs', { error });
    }
  }

  /**
   * Force an immediate refresh
   */
  async refresh(): Promise<void> {
    await this.fetchDebugLogs();
  }
}
