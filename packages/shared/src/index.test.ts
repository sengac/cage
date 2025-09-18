import { describe, it, expect } from 'vitest';
import {
  // Hook schemas
  PreToolUsePayloadSchema,
  PostToolUsePayloadSchema,
  UserPromptSubmitPayloadSchema,
  NotificationPayloadSchema,
  StopPayloadSchema,
  SubagentStopPayloadSchema,
  SessionStartPayloadSchema,
  SessionEndPayloadSchema,
  PreCompactPayloadSchema,
  HookType,

  // Config
  CageConfigSchema,
  defaultConfig,

  // Events
  EventSchema,
  EventQuerySchema,

  // Constants
  DEFAULT_PORT,
  API_ENDPOINTS,

  // Logger
  Logger,
  LogLevel,

  // Utils
  generateEventId
} from './index';

describe('Shared package exports', () => {
  it('should export all hook schemas', () => {
    expect(PreToolUsePayloadSchema).toBeDefined();
    expect(PostToolUsePayloadSchema).toBeDefined();
    expect(UserPromptSubmitPayloadSchema).toBeDefined();
    expect(NotificationPayloadSchema).toBeDefined();
    expect(StopPayloadSchema).toBeDefined();
    expect(SubagentStopPayloadSchema).toBeDefined();
    expect(SessionStartPayloadSchema).toBeDefined();
    expect(SessionEndPayloadSchema).toBeDefined();
    expect(PreCompactPayloadSchema).toBeDefined();
  });

  it('should export HookType enum', () => {
    expect(HookType.PreToolUse).toBe('PreToolUse');
    expect(HookType.PostToolUse).toBe('PostToolUse');
    expect(HookType.UserPromptSubmit).toBe('UserPromptSubmit');
  });

  it('should export config schemas', () => {
    expect(CageConfigSchema).toBeDefined();
    expect(defaultConfig).toBeDefined();
    expect(defaultConfig.port).toBe(3790);
  });

  it('should export event schemas', () => {
    expect(EventSchema).toBeDefined();
    expect(EventQuerySchema).toBeDefined();
  });

  it('should export constants', () => {
    expect(DEFAULT_PORT).toBe(3790);
    expect(API_ENDPOINTS).toBeDefined();
    expect(API_ENDPOINTS.claude.events).toBe('/claude/events');
  });

  it('should export Logger class', () => {
    expect(Logger).toBeDefined();
    expect(LogLevel).toBeDefined();
    const logger = new Logger();
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should export generateEventId function', () => {
    const id = generateEventId();
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});