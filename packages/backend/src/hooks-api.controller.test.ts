import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HooksApiController } from './hooks-api.controller';
import { EventLoggerService } from './event-logger.service';
import { Logger } from '@cage/shared';
import * as fs from 'fs/promises';
import * as os from 'os';

// Mock the Logger and path utilities
vi.mock('@cage/shared', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
  getClaudeSettingsPath: vi.fn(() => '/mock/path/.claude/settings.json'),
  getProjectRoot: vi.fn(() => '/mock/path'),
  getCageDir: vi.fn(() => '/mock/path/.cage'),
  getEventsDir: vi.fn(() => '/mock/path/.cage/events'),
}));

// Mock fs/promises
vi.mock('fs/promises');

// Mock os
vi.mock('os');

describe('HooksApiController', () => {
  let controller: HooksApiController;
  let eventLogger: EventLoggerService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [HooksApiController],
      providers: [
        {
          provide: EventLoggerService,
          useValue: {
            logEvent: vi.fn(),
            getEventsStats: vi.fn(),
          },
        },
      ],
    }).compile();

    // Initialize the module to create provider instances
    await module.init();

    controller = module.get<HooksApiController>(HooksApiController);
    eventLogger = module.get<EventLoggerService>(EventLoggerService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
    vi.clearAllMocks();
  });

  describe('getHooksStatus', () => {
    it('should return hooks status with installed hooks and event counts', async () => {
      // Mock home directory
      vi.mocked(os.homedir).mockReturnValue('/home/testuser');

      // Mock Claude settings file exists
      vi.mocked(fs.access).mockResolvedValue(undefined);

      // Mock Claude settings content
      const mockSettings = {
        hooks: {
          PreToolUse: [{
            matcher: '*',
            hooks: [{ command: 'node /home/testuser/.claude/hooks/cage/pretooluse.mjs' }]
          }],
          PostToolUse: [{
            matcher: '*',
            hooks: [{ command: 'node /home/testuser/.claude/hooks/cage/posttooluse.mjs' }]
          }],
          UserPromptSubmit: [{
            matcher: '*',
            hooks: [{ command: 'node /home/testuser/.claude/hooks/cage/userpromptsubmit.mjs' }]
          }],
        }
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSettings));

      // Mock event stats from EventLoggerService (using correct EventStats interface)
      const mockStats = {
        total: 150,
        byToolName: {
          Read: 50,
          Write: 30,
          Edit: 25,
        },
        byEventType: {
          PreToolUse: 50,
          PostToolUse: 45,
          UserPromptSubmit: 30,
          Stop: 15,
          SubagentStop: 10,
          SessionStart: 0,
          SessionEnd: 0,
          Notification: 0,
          PreCompact: 0,
        },
        uniqueSessions: 5,
        dateRange: {
          from: '2025-10-01',
          to: '2025-10-01',
        },
      };
      vi.mocked(eventLogger.getEventsStats).mockResolvedValue(mockStats);

      // Call the endpoint
      const result = await controller.getHooksStatus();

      // Verify the response structure
      expect(result).toEqual({
        isInstalled: true,
        settingsPath: '/mock/path/.claude/settings.json',
        backendPort: parseInt(process.env.PORT || '3790', 10),
        backendEnabled: true,
        installedHooks: [
          { name: 'PreToolUse', enabled: true, eventCount: 50 },
          { name: 'PostToolUse', enabled: true, eventCount: 45 },
          { name: 'UserPromptSubmit', enabled: true, eventCount: 30 },
          { name: 'Stop', enabled: false, eventCount: 15 },
          { name: 'SubagentStop', enabled: false, eventCount: 10 },
          { name: 'SessionStart', enabled: false, eventCount: 0 },
          { name: 'SessionEnd', enabled: false, eventCount: 0 },
          { name: 'Notification', enabled: false, eventCount: 0 },
          { name: 'PreCompact', enabled: false, eventCount: 0 },
        ],
        totalEvents: 150,
      });
    });

    it('should return not installed status when Claude settings do not exist', async () => {
      // Mock home directory
      vi.mocked(os.homedir).mockReturnValue('/home/testuser');

      // Mock Claude settings file does not exist
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

      // Mock event stats
      const mockStats = {
        total: 0,
        byToolName: {},
        byEventType: {},
        uniqueSessions: 0,
        dateRange: { from: '', to: '' },
      };
      vi.mocked(eventLogger.getEventsStats).mockResolvedValue(mockStats);

      // Call the endpoint
      const result = await controller.getHooksStatus();

      // Verify the response shows not installed
      expect(result).toEqual({
        isInstalled: false,
        settingsPath: '/mock/path/.claude/settings.json',
        backendPort: parseInt(process.env.PORT || '3790', 10),
        backendEnabled: true,
        installedHooks: [
          { name: 'PreToolUse', enabled: false, eventCount: 0 },
          { name: 'PostToolUse', enabled: false, eventCount: 0 },
          { name: 'UserPromptSubmit', enabled: false, eventCount: 0 },
          { name: 'Stop', enabled: false, eventCount: 0 },
          { name: 'SubagentStop', enabled: false, eventCount: 0 },
          { name: 'SessionStart', enabled: false, eventCount: 0 },
          { name: 'SessionEnd', enabled: false, eventCount: 0 },
          { name: 'Notification', enabled: false, eventCount: 0 },
          { name: 'PreCompact', enabled: false, eventCount: 0 },
        ],
        totalEvents: 0,
      });
    });

    it('should handle partial hook installations', async () => {
      // Mock home directory
      vi.mocked(os.homedir).mockReturnValue('/home/testuser');

      // Mock Claude settings file exists
      vi.mocked(fs.access).mockResolvedValue(undefined);

      // Mock Claude settings with only some hooks installed
      const mockSettings = {
        hooks: {
          PreToolUse: [{
            matcher: '*',
            hooks: [{ command: 'node /home/testuser/.claude/hooks/cage/pretooluse.mjs' }]
          }],
          // PostToolUse not installed
          // Other hooks also not installed
        }
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSettings));

      // Mock event stats (using correct EventStats interface)
      const mockStats = {
        total: 25,
        byToolName: {},
        byEventType: {
          PreToolUse: 25,
        },
        uniqueSessions: 1,
        dateRange: { from: '2025-10-01', to: '2025-10-01' },
      };
      vi.mocked(eventLogger.getEventsStats).mockResolvedValue(mockStats);

      // Call the endpoint
      const result = await controller.getHooksStatus();

      // Verify only PreToolUse is marked as enabled
      expect(result.installedHooks).toEqual([
        { name: 'PreToolUse', enabled: true, eventCount: 25 },
        { name: 'PostToolUse', enabled: false, eventCount: 0 },
        { name: 'UserPromptSubmit', enabled: false, eventCount: 0 },
        { name: 'Stop', enabled: false, eventCount: 0 },
        { name: 'SubagentStop', enabled: false, eventCount: 0 },
        { name: 'SessionStart', enabled: false, eventCount: 0 },
        { name: 'SessionEnd', enabled: false, eventCount: 0 },
        { name: 'Notification', enabled: false, eventCount: 0 },
        { name: 'PreCompact', enabled: false, eventCount: 0 },
      ]);
      expect(result.totalEvents).toBe(25);
    });

    it('should detect non-CAGE hooks and mark them as not enabled', async () => {
      // Mock home directory
      vi.mocked(os.homedir).mockReturnValue('/home/testuser');

      // Mock Claude settings file exists
      vi.mocked(fs.access).mockResolvedValue(undefined);

      // Mock Claude settings with other hooks (not CAGE)
      const mockSettings = {
        hooks: {
          PreToolUse: [{
            matcher: '*',
            hooks: [{ command: 'node /some/other/hook.js' }]  // Not a CAGE hook
          }],
        }
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSettings));

      // Mock event stats (events still being captured even though it's not our hook)
      const mockStats = {
        total: 10,
        byToolName: {},
        byEventType: {
          PreToolUse: 10,
        },
        uniqueSessions: 1,
        dateRange: { from: '2025-10-01', to: '2025-10-01' },
      };
      vi.mocked(eventLogger.getEventsStats).mockResolvedValue(mockStats);

      // Call the endpoint
      const result = await controller.getHooksStatus();

      // Verify PreToolUse is marked as not enabled (not a CAGE hook)
      expect(result.installedHooks[0]).toEqual({ 
        name: 'PreToolUse', 
        enabled: false,  // Not enabled because it's not a CAGE hook
        eventCount: 10   // Still shows event count from our backend
      });
      expect(result.isInstalled).toBe(false); // Not installed because no CAGE hooks found
    });
  });
});