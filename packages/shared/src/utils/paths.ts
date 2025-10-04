import { join } from 'path';

/**
 * Centralized path resolution for CAGE
 * All path logic should go through these functions to ensure consistency
 */

/**
 * Get the project root directory
 * This is where the .claude directory lives
 */
export function getProjectRoot(): string {
  // In tests, use TEST_BASE_DIR if set
  if (process.env.TEST_BASE_DIR) {
    return process.env.TEST_BASE_DIR;
  }

  // Otherwise use current working directory
  return process.cwd();
}

/**
 * Get the .claude directory path
 */
export function getClaudeDir(): string {
  return join(getProjectRoot(), '.claude');
}

/**
 * Get the Claude Code settings.json path
 * This is in the project's .claude directory
 */
export function getClaudeSettingsPath(): string {
  return join(getClaudeDir(), 'settings.json');
}

/**
 * Get the CAGE hooks directory path
 */
export function getCageHooksDir(): string {
  return join(getClaudeDir(), 'hooks', 'cage');
}

/**
 * Get the .cage directory path
 */
export function getCageDir(): string {
  return join(getProjectRoot(), '.cage');
}

/**
 * Get the events directory path
 */
export function getEventsDir(): string {
  return join(getCageDir(), 'events');
}

/**
 * Get the cage config file path
 */
export function getCageConfigPath(): string {
  return join(getProjectRoot(), 'cage.config.json');
}

/**
 * Get the server PID file path
 */
export function getServerPidPath(): string {
  return join(getCageDir(), 'server.pid');
}

/**
 * Get the offline log file path
 */
export function getOfflineLogPath(): string {
  return join(getCageDir(), 'hooks-offline.log');
}
