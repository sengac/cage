/**
 * Configuration types for Cage
 */

import * as z from 'zod';

/**
 * Main Cage configuration schema
 */
export const CageConfigSchema = z.object({
  // Server configuration
  port: z.number().min(1).max(65535),
  host: z.string().default('localhost'),
  enabled: z.boolean().default(true),

  // Logging configuration
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Event storage configuration
  eventsDir: z.string().default('.cage/events'),
  maxEventSize: z.number().positive().default(1048576), // 1MB default

  // Feature flags
  enableMetrics: z.boolean().default(false),
  enableOfflineMode: z.boolean().default(true),

  // Offline mode configuration
  offlineLogPath: z.string().default('.cage/hooks-offline.log'),

  // Environment configuration
  env: z.enum(['development', 'production', 'test']).optional(),
  debug: z.boolean().optional()
});

export type CageConfig = z.infer<typeof CageConfigSchema>;

/**
 * Partial config for updates
 */
export const PartialCageConfigSchema = CageConfigSchema.partial();
export type PartialCageConfig = z.infer<typeof PartialCageConfigSchema>;

/**
 * Default configuration values
 */
export const defaultConfig: CageConfig = {
  port: 3790,
  host: 'localhost',
  enabled: true,
  logLevel: 'info',
  eventsDir: '.cage/events',
  maxEventSize: 1048576,
  enableMetrics: false,
  enableOfflineMode: true,
  offlineLogPath: '.cage/hooks-offline.log'
};

/**
 * Hook-specific configuration
 */
export const HookConfigSchema = z.object({
  type: z.enum([
    'PreToolUse',
    'PostToolUse',
    'UserPromptSubmit',
    'Notification',
    'Stop',
    'SubagentStop',
    'SessionStart',
    'SessionEnd',
    'PreCompact',
    'Status'
  ]),
  enabled: z.boolean().default(true),
  timeout: z.number().positive().optional(),
  retryOnFailure: z.boolean().default(false),
  maxRetries: z.number().min(0).default(0)
});

export type HookConfig = z.infer<typeof HookConfigSchema>;

/**
 * Complete hooks configuration
 */
export const HooksConfigSchema = z.object({
  hooks: z.array(HookConfigSchema).default([])
});

export type HooksConfig = z.infer<typeof HooksConfigSchema>;