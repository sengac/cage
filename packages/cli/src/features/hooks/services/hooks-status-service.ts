/**
 * Hooks Status Service - Singleton service for periodically refreshing hooks status
 *
 * This service polls the /api/hooks/status endpoint and updates the Zustand store.
 * It should be initialized once at app startup and run in the background.
 */

import type { AppState } from '../../../shared/stores/appStore';
import { useAppStore } from '../../../shared/stores/appStore';
import { Logger } from '@cage/shared';

const logger = new Logger({ context: 'HooksStatusService' });

interface CageGlobal {
  __cageHooksStatusService?: HooksStatusService;
}

declare const global: CageGlobal;

// Dependencies that can be injected for testing
export interface HooksStatusServiceDependencies {
  getStore: () => AppState;
  setIntervalFn: typeof setInterval;
  clearIntervalFn: typeof clearInterval;
}

export class HooksStatusService {
  private intervalId: NodeJS.Timeout | null = null;
  private pollInterval: number;
  private deps: HooksStatusServiceDependencies;

  private constructor(
    pollInterval: number = 30000,
    deps?: Partial<HooksStatusServiceDependencies>
  ) {
    // Poll every 30 seconds by default
    this.pollInterval = pollInterval;
    this.deps = {
      getStore: deps?.getStore || (() => useAppStore.getState()),
      setIntervalFn: deps?.setIntervalFn || setInterval,
      clearIntervalFn: deps?.clearIntervalFn || clearInterval,
    };
  }

  static getInstance(
    pollInterval?: number,
    deps?: Partial<HooksStatusServiceDependencies>
  ): HooksStatusService {
    if (!global.__cageHooksStatusService) {
      global.__cageHooksStatusService = new HooksStatusService(pollInterval, deps);
    }
    return global.__cageHooksStatusService;
  }

  /**
   * Reset singleton instance (for testing only)
   */
  static resetInstance(): void {
    global.__cageHooksStatusService = undefined;
  }

  /**
   * Start polling for hooks status
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('HooksStatusService already started');
      return;
    }

    logger.info('Starting hooks status polling', {
      interval: this.pollInterval,
    });

    // Fetch immediately on start
    void this.fetchHooksStatus();

    // Then poll at interval
    this.intervalId = this.deps.setIntervalFn(() => {
      void this.fetchHooksStatus();
    }, this.pollInterval);
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.intervalId) {
      this.deps.clearIntervalFn(this.intervalId);
      this.intervalId = null;
      logger.info('Stopped hooks status polling');
    }
  }

  /**
   * Fetch hooks status and update store
   */
  private async fetchHooksStatus(): Promise<void> {
    try {
      const store = this.deps.getStore();
      await store.refreshHooksStatus();
    } catch (error) {
      logger.error('Failed to fetch hooks status', { error });
    }
  }

  /**
   * Force an immediate refresh
   */
  async refresh(): Promise<void> {
    await this.fetchHooksStatus();
  }
}
