/**
 * Barrel exports for @cage/shared package
 */

// Export all types
export * from './types';

// Export all constants
export * from './constants';

// Export logger utility
export { Logger, LogLevel, defaultLogger } from './utils/logger';
export type { LoggerOptions } from './utils/logger';

// Export utility functions
import { nanoid } from 'nanoid';

export function generateEventId(): string {
  return nanoid();
}
