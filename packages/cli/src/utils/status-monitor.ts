import { EventEmitter } from 'events';
import { Logger } from '@cage/shared';
import { getRealServerStatus } from './real-server-status';
import { getRealHooksStatus } from './real-hooks';
import { getEventsCounts } from './real-events';
import type { ServerStatus } from '../commands/server-management';

const logger = new Logger({ context: 'status-monitor' });

interface ServerInfo {
  status: 'running' | 'stopped' | 'error';
  port: number;
  pid?: number;
  uptime?: number;
  memoryUsage?: number;
}

export interface SystemStatus {
  server: {
    status: 'running' | 'stopped' | 'connecting' | 'error';
    port?: number;
    pid?: number;
    uptime?: number;
    serverInfo?: ServerInfo | null;
    fullStatus?: ServerStatus;
  };
  hooks: {
    installed: boolean;
    active: number;
    total: number;
  };
  events: {
    total: number;
    today: number;
    rate: number;
  };
  lastUpdated: number;
}

export class StatusMonitor extends EventEmitter {
  private static instance: StatusMonitor | null = null;
  private status: SystemStatus;
  private updateTimer: NodeJS.Timeout | null = null;
  private lastUpdateTime: number = 0;
  private lastEventCount: number = 0;
  private isUpdating: boolean = false;
  private updateInterval: number = 10000; // Default 10 seconds
  private minUpdateInterval: number = 10000; // Minimum 10 seconds between updates

  private constructor() {
    super();
    this.status = {
      server: { status: 'stopped' },
      hooks: { installed: false, active: 0, total: 0 },
      events: { total: 0, today: 0, rate: 0 },
      lastUpdated: 0,
    };
  }

  public static getInstance(): StatusMonitor {
    if (!StatusMonitor.instance) {
      StatusMonitor.instance = new StatusMonitor();
    }
    return StatusMonitor.instance;
  }

  public async start(intervalMs?: number): Promise<void> {
    if (intervalMs && intervalMs >= this.minUpdateInterval) {
      this.updateInterval = intervalMs;
    } else if (intervalMs && intervalMs < this.minUpdateInterval) {
      logger.warn(
        `Update interval ${intervalMs}ms is below minimum ${this.minUpdateInterval}ms, using minimum`
      );
      this.updateInterval = this.minUpdateInterval;
    }

    // Stop any existing timer
    this.stop();

    // Do initial update
    await this.updateStatus();

    // Set up periodic updates
    this.updateTimer = setInterval(() => {
      this.updateStatus().catch(error => {
        logger.error('Failed to update status', { error });
      });
    }, this.updateInterval);
  }

  public stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  public async updateStatus(force: boolean = false): Promise<SystemStatus> {
    // Prevent concurrent updates
    if (this.isUpdating && !force) {
      return this.status;
    }

    // Enforce minimum update interval unless forced
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    if (!force && timeSinceLastUpdate < this.minUpdateInterval) {
      logger.debug(
        `Skipping update, only ${timeSinceLastUpdate}ms since last update`
      );
      return this.status;
    }

    this.isUpdating = true;

    try {
      const [serverStatus, hooksStatus, eventsCounts] = await Promise.all([
        getRealServerStatus(),
        getRealHooksStatus(),
        getEventsCounts(),
      ]);

      // Calculate events per minute rate
      const timeDiff = (now - this.lastUpdateTime) / 1000 / 60; // minutes
      const eventDiff = eventsCounts.total - this.lastEventCount;
      const rate = timeDiff > 0.1 ? Math.round(eventDiff / timeDiff) : 0;

      const newStatus: SystemStatus = {
        server: {
          status: serverStatus.status,
          port: serverStatus.serverInfo?.port,
          pid: serverStatus.serverInfo?.pid,
          uptime: serverStatus.serverInfo?.uptime,
          serverInfo: serverStatus.serverInfo,
          fullStatus: serverStatus.fullStatus,
        },
        hooks: {
          installed: hooksStatus.isInstalled,
          active: hooksStatus.installedHooks.filter(h => h.enabled).length,
          total: hooksStatus.installedHooks.length,
        },
        events: {
          total: eventsCounts.total,
          today: eventsCounts.today,
          rate: rate > 0 ? rate : 0,
        },
        lastUpdated: now,
      };

      // Check for changes
      const hasChanged = this.hasStatusChanged(this.status, newStatus);

      this.status = newStatus;
      this.lastUpdateTime = now;
      this.lastEventCount = eventsCounts.total;

      // Emit change event if status changed
      if (hasChanged) {
        this.emit('statusChanged', this.status);
      }

      // Always emit update event
      this.emit('statusUpdated', this.status);

      return this.status;
    } catch (error) {
      logger.error('Failed to update status', { error });

      const errorStatus: SystemStatus = {
        server: { status: 'error' },
        hooks: { installed: false, active: 0, total: 0 },
        events: { total: 0, today: 0, rate: 0 },
        lastUpdated: now,
      };

      this.status = errorStatus;
      this.emit('statusError', error);

      return this.status;
    } finally {
      this.isUpdating = false;
    }
  }

  public getStatus(): SystemStatus {
    return this.status;
  }

  public async forceUpdate(): Promise<SystemStatus> {
    return this.updateStatus(true);
  }

  private hasStatusChanged(
    oldStatus: SystemStatus,
    newStatus: SystemStatus
  ): boolean {
    // Check server changes
    if (
      oldStatus.server.status !== newStatus.server.status ||
      oldStatus.server.port !== newStatus.server.port ||
      oldStatus.server.pid !== newStatus.server.pid
    ) {
      return true;
    }

    // Check hooks changes
    if (
      oldStatus.hooks.installed !== newStatus.hooks.installed ||
      oldStatus.hooks.active !== newStatus.hooks.active ||
      oldStatus.hooks.total !== newStatus.hooks.total
    ) {
      return true;
    }

    // Check events changes (significant changes only)
    const eventsDiff = Math.abs(
      newStatus.events.total - oldStatus.events.total
    );
    if (eventsDiff > 10) {
      // Only notify if more than 10 events
      return true;
    }

    return false;
  }

  // Allow external triggers for status update (e.g., after server start/stop)
  public triggerUpdate(): void {
    // This will respect the minimum interval unless forced
    this.updateStatus().catch(error => {
      logger.error('Failed to trigger status update', { error });
    });
  }
}

// Export singleton instance getter
export const getStatusMonitor = (): StatusMonitor =>
  StatusMonitor.getInstance();
