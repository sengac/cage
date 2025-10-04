/**
 * Barrel exports for @cage/shared package
 */

// Export all types
export * from './types';

// Export all constants
export * from './constants';

// Export logger utility
export {
  Logger,
  LogLevel,
  defaultLogger,
  setGlobalLogTransport,
  getGlobalLogTransport,
} from './utils/logger';
export type { LoggerOptions, LogTransport } from './utils/logger';

// Export path utilities
export {
  getProjectRoot,
  getClaudeDir,
  getClaudeSettingsPath,
  getCageHooksDir,
  getCageDir,
  getEventsDir,
  getCageConfigPath,
  getServerPidPath,
  getOfflineLogPath,
} from './utils/paths';

// Export utility functions
import { nanoid } from 'nanoid';

export function generateEventId(): string {
  return nanoid();
}
