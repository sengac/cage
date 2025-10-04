import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StatusMonitor } from './status-monitor';
import * as serverStatus from './real-server-status';
import * as hooksStatus from '../../hooks/utils/real-hooks';
import * as eventsStatus from '../../events/utils/real-events';
import type { RealHooksStatus } from '../../hooks/utils/real-hooks';

vi.mock('./real-server-status');
vi.mock('../../hooks/utils/real-hooks');
vi.mock('../../events/utils/real-events');
vi.mock('../api/cage-api-client', () => ({
  CageApiClient: {
    initializeFromConfig: vi.fn().mockResolvedValue({
      getEvents: vi.fn().mockResolvedValue({
        success: true,
        data: { total: 100 },
      }),
    }),
  },
}));

describe('StatusMonitor', () => {
  let monitor: StatusMonitor;

  beforeEach(() => {
    vi.useFakeTimers();

    monitor = StatusMonitor.getInstance();
    monitor.stop();
    monitor.removeAllListeners(); // Clear all event listeners from previous tests

    // Clear mocks BEFORE setting up new implementations
    vi.clearAllMocks();

    // Set up mock implementations
    vi.mocked(serverStatus.getRealServerStatus).mockResolvedValue({
      status: 'running',
      serverInfo: {
        status: 'running',
        port: 3790,
        pid: 1234,
        uptime: 60000,
      },
      fullStatus: undefined,
    });

    const mockHooksStatus: RealHooksStatus = {
      isInstalled: true,
      installedHooks: [
        {
          type: 'preToolUse',
          enabled: true,
          name: 'preToolUse',
          eventCount: 0,
        },
        {
          type: 'postToolUse',
          enabled: false,
          name: 'postToolUse',
          eventCount: 0,
        },
      ],
      totalEvents: 0,
    };
    vi.mocked(hooksStatus.getRealHooksStatus).mockResolvedValue(
      mockHooksStatus
    );

    vi.mocked(eventsStatus.getEventsCounts).mockResolvedValue({
      total: 100,
      byType: {},
      byHook: {},
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

  it('should not allow updates faster than 10 seconds', async () => {
    await monitor.forceUpdate();
    vi.clearAllMocks();

    await monitor.updateStatus();
    expect(serverStatus.getRealServerStatus).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(5000);
    await monitor.updateStatus();
    expect(serverStatus.getRealServerStatus).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(5000);
    await monitor.updateStatus();
    expect(serverStatus.getRealServerStatus).toHaveBeenCalledTimes(1);
  });

  it('should allow forceUpdate to bypass the interval limit', async () => {
    await monitor.forceUpdate();
    vi.clearAllMocks();

    await monitor.forceUpdate();
    expect(serverStatus.getRealServerStatus).toHaveBeenCalledTimes(1);

    await monitor.forceUpdate();
    expect(serverStatus.getRealServerStatus).toHaveBeenCalledTimes(2);
  });

  it('should correctly aggregate status from all dependencies', async () => {
    // Force an update
    await monitor.forceUpdate();

    // Verify the status contains all expected fields from dependencies
    const status = monitor.getStatus();

    // Server status
    expect(status.server.status).toBe('running');
    expect(status.server.port).toBe(3790);

    // Hooks status
    expect(status.hooks.installed).toBe(true);
    expect(status.hooks.active).toBe(1); // One enabled hook
    expect(status.hooks.total).toBe(2); // Two total hooks

    // Events status
    expect(status.events.total).toBe(100);
    expect(status.lastUpdated).toBeGreaterThan(0);
  });

  it('should calculate event rate correctly', async () => {
    await monitor.start();

    let status = monitor.getStatus();
    expect(status.events.rate).toBe(0);

    vi.advanceTimersByTime(10000);

    await vi.runOnlyPendingTimersAsync();

    status = monitor.getStatus();
    expect(status.events.rate).toBeGreaterThanOrEqual(0);
  });

  it('should handle errors gracefully', async () => {
    const statusErrorSpy = vi.fn();
    const statusChangedSpy = vi.fn();
    monitor.on('statusError', statusErrorSpy);
    monitor.on('statusChanged', statusChangedSpy);

    // Mock error before starting
    vi.mocked(serverStatus.getRealServerStatus).mockRejectedValue(
      new Error('Connection failed')
    );

    await monitor.forceUpdate();

    const status = monitor.getStatus();
    expect(status.server.status).toBe('error');

    // Verify error event was emitted
    expect(statusErrorSpy).toHaveBeenCalledWith(expect.any(Error));

    // Verify statusChanged was emitted with error status
    expect(statusChangedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        server: expect.objectContaining({ status: 'error' })
      })
    );
  });
});
