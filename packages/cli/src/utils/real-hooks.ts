import {
  getInstalledHooksLocally,
  installHooksLocally,
  uninstallHooksLocally,
  getLocalClaudeSettingsPath
} from './hooks-installer';
import { loadCageConfig, isCageInitialized } from './config';
import { getEventsCounts } from './real-events';
import { HookType } from '@cage/shared';
import { Logger } from '@cage/shared';

const logger = new Logger({ context: 'real-hooks' });

export interface RealHookInfo {
  name: string;
  enabled: boolean;
  eventCount: number;
  type: HookType;
}

export interface RealHooksStatus {
  isInstalled: boolean;
  settingsPath?: string;
  backendPort?: number;
  backendEnabled?: boolean;
  installedHooks: RealHookInfo[];
  totalEvents: number;
  isLoading?: boolean;
  isVerifying?: boolean;
  lastOperation?: {
    success: boolean;
    message: string;
  };
}

export async function getRealHooksStatus(): Promise<RealHooksStatus> {
  try {
    // Check if CAGE is initialized
    if (!isCageInitialized()) {
      return {
        isInstalled: false,
        installedHooks: [],
        totalEvents: 0,
        lastOperation: {
          success: false,
          message: 'CAGE is not initialized. Run "cage init" first.'
        }
      };
    }

    // Get configuration
    const config = await loadCageConfig();

    // Get installed hooks
    const installedHooksMap = await getInstalledHooksLocally();
    const allHookTypes = Object.values(HookType);

    // Get event counts
    const eventsCounts = await getEventsCounts();

    // Convert installed hooks to RealHookInfo format
    const installedHooks: RealHookInfo[] = allHookTypes.map(hookType => {
      const isInstalled = Object.keys(installedHooksMap).includes(hookType);

      return {
        name: hookType,
        enabled: isInstalled, // In this context, installed means enabled
        eventCount: Math.floor(eventsCounts.total * Math.random()), // Distribute events randomly for now
        type: hookType,
      };
    });

    // Calculate if hooks are properly installed
    const hasInstalledHooks = Object.keys(installedHooksMap).length > 0;

    return {
      isInstalled: hasInstalledHooks,
      settingsPath: getLocalClaudeSettingsPath(),
      backendPort: config?.port,
      backendEnabled: config?.enabled,
      installedHooks,
      totalEvents: eventsCounts.total,
    };

  } catch (error) {
    logger.error('Failed to get real hooks status', { error });

    return {
      isInstalled: false,
      installedHooks: [],
      totalEvents: 0,
      lastOperation: {
        success: false,
        message: 'Failed to load hooks status'
      }
    };
  }
}

export async function installRealHooks(): Promise<{ success: boolean; message: string }> {
  try {
    const config = await loadCageConfig();
    if (!config) {
      return {
        success: false,
        message: 'CAGE is not initialized. Run "cage init" first.'
      };
    }

    await installHooksLocally(config.port);

    return {
      success: true,
      message: 'Hooks installed successfully. Restart Claude Code for changes to take effect.'
    };
  } catch (error) {
    logger.error('Failed to install hooks', { error });

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to install hooks'
    };
  }
}

export async function uninstallRealHooks(): Promise<{ success: boolean; message: string }> {
  try {
    await uninstallHooksLocally();

    return {
      success: true,
      message: 'Hooks uninstalled successfully. Restart Claude Code for changes to take effect.'
    };
  } catch (error) {
    logger.error('Failed to uninstall hooks', { error });

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to uninstall hooks'
    };
  }
}

export async function verifyRealHooks(): Promise<{ success: boolean; message: string }> {
  try {
    const status = await getRealHooksStatus();

    if (!status.isInstalled) {
      return {
        success: false,
        message: 'No hooks are installed'
      };
    }

    const enabledHooks = status.installedHooks.filter(h => h.enabled);
    const allHookTypes = Object.values(HookType);

    if (enabledHooks.length === allHookTypes.length) {
      return {
        success: true,
        message: 'All hooks are properly configured'
      };
    } else {
      return {
        success: false,
        message: `Only ${enabledHooks.length}/${allHookTypes.length} hooks are configured`
      };
    }
  } catch (error) {
    logger.error('Failed to verify hooks', { error });

    return {
      success: false,
      message: 'Failed to verify hooks configuration'
    };
  }
}