import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAppStore } from './appStore';
import * as hooksInstallerModule from '../../features/hooks/utils/hooks-installer';
import * as CageApiClientModule from '../../api/cage-api-client';
import type { CageApiClient } from '../../api/cage-api-client';

/**
 * Tests for hooks operations in appStore
 *
 * Acceptance Criteria:
 * - PHASE1.md lines 97-127: Configure Claude Code hooks in local project
 * - PHASE1.md lines 128-136: Preserve existing hooks configuration
 * - PHASE1.md lines 137-159: Handle different hook configuration formats
 * - PHASE2.md lines 745-751: Setup hooks from TUI
 */

// Create a mock type that satisfies CageApiClient interface
type MockCageApiClient = Pick<
  CageApiClient,
  'getEvents' | 'getDebugLogs' | 'checkHealth' | 'getServerStatus' | 'getEvent' | 'getHooksStatus' | 'getBaseUrl'
>;

describe('AppStore - Hooks Operations (TDD)', () => {
  let mockInstallHooksLocally: ReturnType<typeof vi.fn>;
  let mockUninstallHooksLocally: ReturnType<typeof vi.fn>;
  let mockLoadLocalClaudeSettings: ReturnType<typeof vi.fn>;
  let mockSaveLocalClaudeSettings: ReturnType<typeof vi.fn>;
  let mockGetInstalledHooksLocally: ReturnType<typeof vi.fn>;
  let mockRefreshHooksStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset store to clean state
    useAppStore.setState({
      hooksStatus: {
        isInstalled: false,
        installedHooks: [],
        totalEvents: 0,
      },
      serverStatus: 'running',
    });

    // Create mocks
    mockInstallHooksLocally = vi.fn();
    mockUninstallHooksLocally = vi.fn();
    mockLoadLocalClaudeSettings = vi.fn();
    mockSaveLocalClaudeSettings = vi.fn();
    mockGetInstalledHooksLocally = vi.fn();

    // Spy on hooks-installer functions
    vi.spyOn(hooksInstallerModule, 'installHooksLocally').mockImplementation(mockInstallHooksLocally);
    vi.spyOn(hooksInstallerModule, 'uninstallHooksLocally').mockImplementation(mockUninstallHooksLocally);
    vi.spyOn(hooksInstallerModule, 'loadLocalClaudeSettings').mockImplementation(mockLoadLocalClaudeSettings);
    vi.spyOn(hooksInstallerModule, 'saveLocalClaudeSettings').mockImplementation(mockSaveLocalClaudeSettings);
    vi.spyOn(hooksInstallerModule, 'getInstalledHooksLocally').mockImplementation(mockGetInstalledHooksLocally);

    // Mock CageApiClient
    mockRefreshHooksStatus = vi.fn().mockResolvedValue({
      success: true,
      data: {
        isInstalled: true,
        settingsPath: '/home/user/.claude/settings.json',
        backendPort: 3790,
        backendEnabled: true,
        installedHooks: [
          { name: 'PreToolUse', enabled: true, eventCount: 10 },
          { name: 'PostToolUse', enabled: true, eventCount: 5 },
        ],
        totalEvents: 15,
      },
    });

    const mockClient: MockCageApiClient = {
      getEvents: vi.fn(),
      getDebugLogs: vi.fn(),
      checkHealth: vi.fn(),
      getServerStatus: vi.fn(),
      getEvent: vi.fn(),
      getHooksStatus: mockRefreshHooksStatus,
      getBaseUrl: vi.fn().mockReturnValue('http://localhost:3790'),
    };
    vi.spyOn(CageApiClientModule.CageApiClient, 'initializeFromConfig').mockResolvedValue(mockClient as CageApiClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('installHooks()', () => {
    it('should call installHooksLocally with backend port from config', async () => {
      // GIVEN backend is running
      useAppStore.setState({ serverStatus: 'running' });

      // WHEN installHooks is called
      const installPromise = useAppStore.getState().installHooks();

      // THEN it should show loading state
      expect(useAppStore.getState().hooksStatus?.isLoading).toBe(true);

      // Wait for async operation
      await installPromise;

      // THEN it should call the real installer
      expect(mockInstallHooksLocally).toHaveBeenCalledWith(3790);
    });

    it('should refresh hooks status after successful installation', async () => {
      // GIVEN hooks are not installed
      mockInstallHooksLocally.mockResolvedValue(undefined);

      // WHEN installHooks is called
      await useAppStore.getState().installHooks();

      // THEN it should refresh status from backend
      expect(mockRefreshHooksStatus).toHaveBeenCalled();

      // AND store should be updated with new status
      const state = useAppStore.getState();
      expect(state.hooksStatus?.isInstalled).toBe(true);
      expect(state.hooksStatus?.isLoading).toBe(false);
    });

    it('should handle installation errors gracefully', async () => {
      // GIVEN installation will fail
      const error = new Error('Permission denied');
      mockInstallHooksLocally.mockRejectedValue(error);

      // WHEN installHooks is called
      await useAppStore.getState().installHooks();

      // THEN it should set loading to false
      expect(useAppStore.getState().hooksStatus?.isLoading).toBe(false);

      // AND it should set an error in lastOperation
      expect(useAppStore.getState().hooksStatus?.lastOperation).toEqual({
        success: false,
        message: 'Installation failed: Permission denied',
      });
    });

    it('should preserve existing non-CAGE hooks (PHASE1.md lines 128-136)', async () => {
      // GIVEN there are existing quality-check hooks
      mockLoadLocalClaudeSettings.mockResolvedValue({
        hooks: {
          PreToolUse: 'quality-check verify',
        },
      });
      mockInstallHooksLocally.mockResolvedValue(undefined);

      // WHEN installHooks is called
      await useAppStore.getState().installHooks();

      // THEN installHooksLocally should handle preservation
      // (The actual preservation logic is tested in hooks-installer.test.ts)
      expect(mockInstallHooksLocally).toHaveBeenCalled();
    });

    it('should get backend port from client baseUrl', async () => {
      // GIVEN backend is running on port 4000
      const mockClient: MockCageApiClient = {
        getEvents: vi.fn(),
        getDebugLogs: vi.fn(),
        checkHealth: vi.fn(),
        getServerStatus: vi.fn(),
        getEvent: vi.fn(),
        getHooksStatus: mockRefreshHooksStatus,
        getBaseUrl: vi.fn().mockReturnValue('http://localhost:4000'),
      };
      vi.spyOn(CageApiClientModule.CageApiClient, 'initializeFromConfig').mockResolvedValue(mockClient as CageApiClient);

      // WHEN installHooks is called
      await useAppStore.getState().installHooks();

      // THEN it should extract port from baseUrl
      expect(mockInstallHooksLocally).toHaveBeenCalledWith(4000);
    });
  });

  describe('uninstallHooks()', () => {
    it('should call uninstallHooksLocally', async () => {
      // GIVEN hooks are installed
      useAppStore.setState({
        hooksStatus: {
          isInstalled: true,
          installedHooks: [{ name: 'PreToolUse', enabled: true, eventCount: 10 }],
          totalEvents: 10,
        },
      });

      // WHEN uninstallHooks is called
      await useAppStore.getState().uninstallHooks();

      // THEN it should call the real uninstaller
      expect(mockUninstallHooksLocally).toHaveBeenCalled();
    });

    it('should refresh hooks status after successful uninstallation', async () => {
      // GIVEN hooks are installed
      mockUninstallHooksLocally.mockResolvedValue(undefined);
      mockRefreshHooksStatus.mockResolvedValue({
        success: true,
        data: {
          isInstalled: false,
          installedHooks: [],
          totalEvents: 0,
        },
      });

      useAppStore.setState({
        hooksStatus: {
          isInstalled: true,
          installedHooks: [{ name: 'PreToolUse', enabled: true, eventCount: 10 }],
          totalEvents: 10,
        },
      });

      // WHEN uninstallHooks is called
      await useAppStore.getState().uninstallHooks();

      // THEN it should refresh status from backend
      expect(mockRefreshHooksStatus).toHaveBeenCalled();

      // AND hooks should be uninstalled
      const state = useAppStore.getState();
      expect(state.hooksStatus?.isInstalled).toBe(false);
      expect(state.hooksStatus?.installedHooks).toEqual([]);
    });

    it('should handle uninstallation errors gracefully', async () => {
      // GIVEN uninstallation will fail
      const error = new Error('File not found');
      mockUninstallHooksLocally.mockRejectedValue(error);

      // WHEN uninstallHooks is called
      await useAppStore.getState().uninstallHooks();

      // THEN it should set loading to false
      expect(useAppStore.getState().hooksStatus?.isLoading).toBe(false);

      // AND it should set an error in lastOperation
      expect(useAppStore.getState().hooksStatus?.lastOperation).toEqual({
        success: false,
        message: 'Uninstallation failed: File not found',
      });
    });
  });

  describe('verifyHooks() - PHASE1.md lines 179-198', () => {
    it('should check if hook files exist on filesystem', async () => {
      // GIVEN hooks are installed
      mockGetInstalledHooksLocally.mockResolvedValue({
        PreToolUse: '${CLAUDE_PROJECT_DIR}/.claude/hooks/cage/pretooluse.mjs',
        PostToolUse: '${CLAUDE_PROJECT_DIR}/.claude/hooks/cage/posttooluse.mjs',
      });

      // WHEN verifyHooks is called
      await useAppStore.getState().verifyHooks();

      // THEN it should check installed hooks
      expect(mockGetInstalledHooksLocally).toHaveBeenCalled();
    });

    it('should verify Claude settings.json has correct entries', async () => {
      // GIVEN hooks are installed
      mockLoadLocalClaudeSettings.mockResolvedValue({
        hooks: {
          PreToolUse: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/cage/pretooluse.mjs',
                },
              ],
            },
          ],
        },
      });

      // WHEN verifyHooks is called
      await useAppStore.getState().verifyHooks();

      // THEN it should load settings
      expect(mockLoadLocalClaudeSettings).toHaveBeenCalled();
    });

    it('should test connection to backend endpoints', async () => {
      // GIVEN backend is running
      const mockCheckHealth = vi.fn().mockResolvedValue({ success: true, data: { status: 'ok' } });
      const mockClient: MockCageApiClient = {
        getEvents: vi.fn(),
        getDebugLogs: vi.fn(),
        checkHealth: mockCheckHealth,
        getServerStatus: vi.fn(),
        getEvent: vi.fn(),
        getHooksStatus: mockRefreshHooksStatus,
        getBaseUrl: vi.fn(),
      };
      vi.spyOn(CageApiClientModule.CageApiClient, 'initializeFromConfig').mockResolvedValue(mockClient as CageApiClient);

      // WHEN verifyHooks is called
      await useAppStore.getState().verifyHooks();

      // THEN it should check health endpoint
      expect(mockCheckHealth).toHaveBeenCalled();
    });

    it('should return verification results with success message', async () => {
      // GIVEN all checks pass
      mockGetInstalledHooksLocally.mockResolvedValue({ PreToolUse: 'path' });
      mockLoadLocalClaudeSettings.mockResolvedValue({ hooks: { PreToolUse: 'path' } });
      const mockCheckHealth = vi.fn().mockResolvedValue({ success: true });
      const mockClient: MockCageApiClient = {
        getEvents: vi.fn(),
        getDebugLogs: vi.fn(),
        checkHealth: mockCheckHealth,
        getServerStatus: vi.fn(),
        getEvent: vi.fn(),
        getHooksStatus: mockRefreshHooksStatus,
        getBaseUrl: vi.fn(),
      };
      vi.spyOn(CageApiClientModule.CageApiClient, 'initializeFromConfig').mockResolvedValue(mockClient as CageApiClient);

      // WHEN verifyHooks is called
      await useAppStore.getState().verifyHooks();

      // THEN it should set success message
      expect(useAppStore.getState().hooksStatus?.lastOperation).toEqual({
        success: true,
        message: 'All hooks verified successfully',
      });
    });

    it('should handle verification failures', async () => {
      // GIVEN health check fails
      mockGetInstalledHooksLocally.mockResolvedValue({ PreToolUse: 'path' });
      mockLoadLocalClaudeSettings.mockResolvedValue({ hooks: { PreToolUse: 'path' } });
      const mockCheckHealth = vi.fn().mockResolvedValue({
        success: false,
        error: 'Backend not responding',
      });
      const mockClient: MockCageApiClient = {
        getEvents: vi.fn(),
        getDebugLogs: vi.fn(),
        checkHealth: mockCheckHealth,
        getServerStatus: vi.fn(),
        getEvent: vi.fn(),
        getHooksStatus: mockRefreshHooksStatus,
        getBaseUrl: vi.fn(),
      };
      vi.spyOn(CageApiClientModule.CageApiClient, 'initializeFromConfig').mockResolvedValue(mockClient as CageApiClient);

      // WHEN verifyHooks is called
      await useAppStore.getState().verifyHooks();

      // THEN it should set error message
      expect(useAppStore.getState().hooksStatus?.lastOperation).toEqual({
        success: false,
        message: 'Verification failed: Backend not responding',
      });
    });
  });

  describe('toggleHook()', () => {
    it('should read current settings from filesystem', async () => {
      // GIVEN hook is currently enabled
      mockLoadLocalClaudeSettings.mockResolvedValue({
        hooks: {
          PreToolUse: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/cage/pretooluse.mjs',
                },
              ],
            },
          ],
        },
      });

      // WHEN toggleHook is called
      await useAppStore.getState().toggleHook('PreToolUse');

      // THEN it should load settings
      expect(mockLoadLocalClaudeSettings).toHaveBeenCalled();
    });

    it('should toggle hook enabled state in settings', async () => {
      // GIVEN hook is currently enabled
      mockLoadLocalClaudeSettings.mockResolvedValue({
        hooks: {
          PreToolUse: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/cage/pretooluse.mjs',
                },
              ],
            },
          ],
        },
      });

      // WHEN toggleHook is called to disable
      await useAppStore.getState().toggleHook('PreToolUse');

      // THEN it should save modified settings
      expect(mockSaveLocalClaudeSettings).toHaveBeenCalled();

      // Verify the saved settings removed the hook entry
      const savedSettings = mockSaveLocalClaudeSettings.mock.calls[0][0];
      expect(savedSettings.hooks.PreToolUse).toBeUndefined();
    });

    it('should refresh status from backend after toggle', async () => {
      // GIVEN hook can be toggled
      mockLoadLocalClaudeSettings.mockResolvedValue({ hooks: { PreToolUse: 'some-command' } });

      // WHEN toggleHook is called
      await useAppStore.getState().toggleHook('PreToolUse');

      // THEN it should refresh from backend
      expect(mockRefreshHooksStatus).toHaveBeenCalled();
    });
  });
});
