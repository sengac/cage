import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StatusMonitor } from './status-monitor';
import * as serverStatus from './real-server-status';
import * as hooksStatus from './real-hooks';
import * as eventsStatus from './real-events';
import type { RealHooksStatus } from './real-hooks';

vi.mock('./real-server-status');
vi.mock('./real-hooks');
vi.mock('./real-events');

describe('StatusMonitor', () => {
  let monitor: StatusMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Get the singleton instance for testing
    monitor = StatusMonitor.getInstance();
    // Stop any existing monitoring from previous tests
    monitor.stop();

    // Mock implementations
    vi.mocked(serverStatus.getRealServerStatus).mockResolvedValue({
      status: 'running',
      serverInfo: {
        status: 'running',
        port: 3790,
        pid: 1234,
        uptime: 60000
      },
      fullStatus: undefined
    });

    const mockHooksStatus: RealHooksStatus = {
      isInstalled: true,
      installedHooks: [
        { type: 'preToolUse', enabled: true, name: 'preToolUse', eventCount: 0 },
        { type: 'postToolUse', enabled: false, name: 'postToolUse', eventCount: 0 }
      ],
      totalEvents: 0
    };
    vi.mocked(hooksStatus.getRealHooksStatus).mockResolvedValue(mockHooksStatus);

    vi.mocked(eventsStatus.getEventsCounts).mockResolvedValue({
      total: 100,
      today: 50,
      byType: {}
    });
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  it('should enforce minimum 10 second update interval', async () => {
    // Start with 5 second interval (should be upgraded to 10 seconds)
    await monitor.start(5000);

    // Initial call
    expect(serverStatus.getRealServerStatus).toHaveBeenCalledTimes(1);

    // Advance time by 5 seconds
    vi.advanceTimersByTime(5000);

    // Should not update yet (minimum 10 seconds)
    expect(serverStatus.getRealServerStatus).toHaveBeenCalledTimes(1);

    // Advance to 10 seconds total
    vi.advanceTimersByTime(5000);

    // Now it should update
    expect(serverStatus.getRealServerStatus).toHaveBeenCalledTimes(2);
  });

  it('should not allow updates faster than 10 seconds even when forced', async () => {
    await monitor.start();

    // Initial update
    expect(serverStatus.getRealServerStatus).toHaveBeenCalledTimes(1);

    // Try to update immediately (should be skipped)
    await monitor.updateStatus();
    expect(serverStatus.getRealServerStatus).toHaveBeenCalledTimes(1);

    // Advance time by 5 seconds
    vi.advanceTimersByTime(5000);

    // Try again (still should be skipped)
    await monitor.updateStatus();
    expect(serverStatus.getRealServerStatus).toHaveBeenCalledTimes(1);

    // Advance to 10 seconds total
    vi.advanceTimersByTime(5000);

    // Now update should work
    await monitor.updateStatus();
    expect(serverStatus.getRealServerStatus).toHaveBeenCalledTimes(2);
  });

  it('should allow forceUpdate to bypass the interval limit', async () => {
    await monitor.start();

    // Initial update
    expect(serverStatus.getRealServerStatus).toHaveBeenCalledTimes(1);

    // Force update immediately
    await monitor.forceUpdate();
    expect(serverStatus.getRealServerStatus).toHaveBeenCalledTimes(2);
  });

  it('should emit events on status changes', async () => {
    const statusChangedHandler = vi.fn();
    const statusUpdatedHandler = vi.fn();

    monitor.on('statusChanged', statusChangedHandler);
    monitor.on('statusUpdated', statusUpdatedHandler);

    await monitor.start();

    expect(statusUpdatedHandler).toHaveBeenCalledTimes(1);
    expect(statusChangedHandler).toHaveBeenCalledTimes(1);

    const status = monitor.getStatus();
    expect(status.server.status).toBe('running');
    expect(status.server.port).toBe(3790);
    expect(status.hooks.active).toBe(1);
    expect(status.events.total).toBe(100);
  });

  it('should calculate event rate correctly', async () => {
    await monitor.start();

    // First update
    let status = monitor.getStatus();
    expect(status.events.rate).toBe(0); // No rate on first update

    // Mock increased event count
    vi.mocked(eventsStatus.getEventsCounts).mockResolvedValue({
      total: 200,
      today: 150,
      byType: {}
    });

    // Advance time by 10 seconds and trigger update
    vi.advanceTimersByTime(10000);

    // The interval timer should trigger the update
    await vi.runOnlyPendingTimersAsync();

    status = monitor.getStatus();
    // 100 new events in 10 seconds = 600 events per minute
    expect(status.events.rate).toBeGreaterThan(0);
  });

  it('should handle errors gracefully', async () => {
    const errorHandler = vi.fn();
    monitor.on('statusError', errorHandler);

    // Mock error
    vi.mocked(serverStatus.getRealServerStatus).mockRejectedValue(new Error('Connection failed'));

    await monitor.start();

    expect(errorHandler).toHaveBeenCalled();
    const status = monitor.getStatus();
    expect(status.server.status).toBe('error');
  });
});