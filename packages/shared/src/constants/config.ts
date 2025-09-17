/**
 * Configuration constants for Cage
 */

export const DEFAULT_PORT = 3790;
export const CAGE_DIR = '.cage';
export const EVENTS_DIR = 'events';
export const OFFLINE_LOG_FILE = 'hooks-offline.log';
export const CONFIG_FILE_NAME = 'cage.config.json';

export const HOOK_RESPONSE_TIMEOUT = {
  nonBlocking: 100, // milliseconds
  userInput: 60000, // 1 minute
  llmAnalysis: 30000 // 30 seconds
} as const;

export const MAX_EVENT_SIZE = 1048576; // 1MB
export const MAX_LOG_FILE_SIZE = 104857600; // 100MB
export const LOG_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export const SUPPORTED_AGENT_TYPES = [
  'claude',
  'openai',
  'cursor',
  'windsurf',
  'continue',
  'copilot'
] as const;

export type SupportedAgentType = typeof SUPPORTED_AGENT_TYPES[number];