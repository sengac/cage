import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EventLoggerService, type EventStats } from './event-logger.service';
import { Logger, getClaudeSettingsPath } from '@cage/shared';
import * as fs from 'fs/promises';
import { HooksStatusDto, HookInfoDto } from './dto/hooks.dto';

/**
 * Controller for hooks management API endpoints
 * These are different from the Claude hook endpoints
 */
@ApiTags('Hooks Management')
@Controller('hooks')
export class HooksApiController {
  private readonly logger = new Logger({ context: 'HooksApiController' });

  constructor(private readonly eventLogger: EventLoggerService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get hooks installation status',
    description:
      'Retrieve the current status of CAGE hooks installation including installed hooks, event counts, and configuration paths',
  })
  @ApiResponse({
    status: 200,
    description: 'Hooks status retrieved successfully',
    type: HooksStatusDto,
  })
  async getHooksStatus(): Promise<HooksStatusDto> {
    this.logger.info('Getting hooks status');

    try {
      // Get the project's .claude settings path from centralized utility
      const settingsPath = getClaudeSettingsPath();
      
      // Check if Claude settings exist and read them
      let isInstalled = false;
      const installedHooks: HookInfoDto[] = [];
      const hookTypes = [
        'PreToolUse',
        'PostToolUse',
        'UserPromptSubmit',
        'Stop',
        'SubagentStop',
        'SessionStart',
        'SessionEnd',
        'Notification',
        'PreCompact',
      ];

      try {
        await fs.access(settingsPath);
        const settingsContent = await fs.readFile(settingsPath, 'utf-8');
        const settings = JSON.parse(settingsContent);

        // Check each hook type for CAGE hooks
        for (const hookType of hookTypes) {
          const hookConfig = settings.hooks?.[hookType];
          let enabled = false;

          if (hookConfig) {
            // Check if it's a CAGE hook by looking for our hook path pattern
            if (Array.isArray(hookConfig)) {
              interface HookEntry {
                hooks?: Array<{ command?: string }>;
              }
              enabled = hookConfig.some((entry: HookEntry) =>
                entry?.hooks?.some((h) =>
                  h?.command?.includes('.claude/hooks/cage/')
                )
              );
            } else if (typeof hookConfig === 'string') {
              enabled = hookConfig.includes('.claude/hooks/cage/');
            }
          }

          installedHooks.push({
            name: hookType,
            enabled,
            eventCount: 0, // Will be filled from stats
          });

          if (enabled) {
            isInstalled = true; // At least one CAGE hook is installed
          }
        }

        this.logger.debug('Read Claude settings successfully', {
          path: settingsPath,
          hooksFound: installedHooks.filter(h => h.enabled).map(h => h.name),
        });
      } catch (error) {
        this.logger.debug('Claude settings not found or invalid', {
          path: settingsPath,
          error: error instanceof Error ? error.message : String(error),
        });

        // Settings don't exist - return all hooks as not installed
        for (const hookType of hookTypes) {
          installedHooks.push({
            name: hookType,
            enabled: false,
            eventCount: 0,
          });
        }
      }

      // Get event statistics to populate event counts
      const stats: EventStats = await this.eventLogger.getEventsStats();

      // Update event counts from stats (now type-safe!)
      for (const hook of installedHooks) {
        hook.eventCount = stats.byEventType[hook.name] || 0;
      }

      // Get backend configuration
      const backendPort = parseInt(process.env.PORT || '3790', 10);
      const backendEnabled = true; // Backend is running if this endpoint is responding

      const result: HooksStatusDto = {
        isInstalled,
        settingsPath,
        backendPort,
        backendEnabled,
        installedHooks,
        totalEvents: stats.total || 0,
      };

      this.logger.info('Hooks status retrieved', {
        isInstalled,
        enabledHooks: installedHooks.filter(h => h.enabled).length,
        totalEvents: result.totalEvents,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to get hooks status', { error });
      throw error;
    }
  }
}