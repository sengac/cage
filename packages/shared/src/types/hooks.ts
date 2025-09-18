/**
 * Hook payload schemas for all 9 Claude Code hook types
 * These schemas define the structure of data sent from Claude Code to Cage backend
 */

import * as z from 'zod';

/**
 * PreToolUse hook payload
 * Triggered before Claude executes a tool
 *
 * Note: Claude Code's actual output differs from documentation
 * - Sends 'tool' instead of 'tool_name'
 * - Sends 'arguments' instead of 'tool_input'
 * - Does not include session_id, transcript_path, cwd, or hook_event_name
 */
export const PreToolUsePayloadSchema = z.object({
  sessionId: z.string().optional(), // Not provided by Claude Code currently
  timestamp: z.string(), // ISO 8601 timestamp
  toolName: z.string(), // Mapped from 'tool' field
  arguments: z.record(z.string(), z.unknown()) // Claude Code sends this correctly
});

export type PreToolUsePayload = z.infer<typeof PreToolUsePayloadSchema>;

/**
 * PostToolUse hook payload
 * Triggered after Claude executes a tool
 */
export const PostToolUsePayloadSchema = z.object({
  sessionId: z.string().optional(), // Not provided by Claude Code currently
  timestamp: z.string(), // ISO 8601 timestamp
  toolName: z.string(),
  arguments: z.record(z.string(), z.unknown()),
  result: z.unknown().nullable(),
  executionTime: z.number(), // milliseconds
  error: z.string().optional()
});

export type PostToolUsePayload = z.infer<typeof PostToolUsePayloadSchema>;

/**
 * UserPromptSubmit hook payload
 * Triggered when user submits a prompt
 */
export const UserPromptSubmitPayloadSchema = z.object({
  sessionId: z.string().optional(), // Not provided by Claude Code currently
  timestamp: z.string(), // ISO 8601 timestamp
  prompt: z.string(),
  context: z.object({
    previousMessages: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string()
    })).optional(),
    currentFile: z.string().optional()
  }).optional()
});

export type UserPromptSubmitPayload = z.infer<typeof UserPromptSubmitPayloadSchema>;

/**
 * Notification hook payload
 * Triggered when Claude sends a notification
 */
export const NotificationPayloadSchema = z.object({
  sessionId: z.string().optional(), // Not provided by Claude Code currently
  timestamp: z.string(), // ISO 8601 timestamp
  level: z.enum(['info', 'warning', 'error']),
  message: z.string()
});

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;

/**
 * Stop hook payload
 * Triggered when Claude completes a task or is interrupted
 */
export const StopPayloadSchema = z.object({
  sessionId: z.string().optional(), // Not provided by Claude Code currently
  timestamp: z.string(), // ISO 8601 timestamp
  reason: z.string(),
  finalState: z.record(z.string(), z.unknown()).optional()
});

export type StopPayload = z.infer<typeof StopPayloadSchema>;

/**
 * SubagentStop hook payload
 * Triggered when a subagent completes its task
 */
export const SubagentStopPayloadSchema = z.object({
  sessionId: z.string().optional(), // Not provided by Claude Code currently
  timestamp: z.string(), // ISO 8601 timestamp
  subagentId: z.string(),
  parentSessionId: z.string(),
  result: z.object({
    success: z.boolean(),
    output: z.string().optional(),
    metrics: z.record(z.string(), z.unknown()).optional()
  }).optional()
});

export type SubagentStopPayload = z.infer<typeof SubagentStopPayloadSchema>;

/**
 * SessionStart hook payload
 * Triggered when a new Claude Code session starts
 */
export const SessionStartPayloadSchema = z.object({
  sessionId: z.string().optional(), // Not provided by Claude Code currently
  timestamp: z.string(), // ISO 8601 timestamp
  projectPath: z.string(),
  environment: z.object({
    nodeVersion: z.string().optional(),
    platform: z.string().optional(),
    cwd: z.string().optional()
  }).optional()
});

export type SessionStartPayload = z.infer<typeof SessionStartPayloadSchema>;

/**
 * SessionEnd hook payload
 * Triggered when a Claude Code session ends
 */
export const SessionEndPayloadSchema = z.object({
  sessionId: z.string().optional(), // Not provided by Claude Code currently
  timestamp: z.string(), // ISO 8601 timestamp
  duration: z.number(), // milliseconds
  summary: z.object({
    toolsUsed: z.array(z.string()).optional(),
    filesModified: z.array(z.string()).optional(),
    errors: z.number().optional(),
    warnings: z.number().optional()
  }).optional()
});

export type SessionEndPayload = z.infer<typeof SessionEndPayloadSchema>;

/**
 * PreCompact hook payload
 * Triggered when Claude is about to compact the conversation
 */
export const PreCompactPayloadSchema = z.object({
  sessionId: z.string().optional(), // Not provided by Claude Code currently
  timestamp: z.string(), // ISO 8601 timestamp
  reason: z.string(),
  currentTokenCount: z.number().optional(),
  maxTokenCount: z.number().optional()
});

export type PreCompactPayload = z.infer<typeof PreCompactPayloadSchema>;

/**
 * Union type for all hook payloads
 */
export const HookPayloadSchema = z.discriminatedUnion('type', [
  z.object({
    ...PreToolUsePayloadSchema.shape,
    type: z.literal('PreToolUse')
  }),
  z.object({
    ...PostToolUsePayloadSchema.shape,
    type: z.literal('PostToolUse')
  }),
  z.object({
    ...UserPromptSubmitPayloadSchema.shape,
    type: z.literal('UserPromptSubmit')
  }),
  z.object({
    ...NotificationPayloadSchema.shape,
    type: z.literal('Notification')
  }),
  z.object({
    ...StopPayloadSchema.shape,
    type: z.literal('Stop')
  }),
  z.object({
    ...SubagentStopPayloadSchema.shape,
    type: z.literal('SubagentStop')
  }),
  z.object({
    ...SessionStartPayloadSchema.shape,
    type: z.literal('SessionStart')
  }),
  z.object({
    ...SessionEndPayloadSchema.shape,
    type: z.literal('SessionEnd')
  }),
  z.object({
    ...PreCompactPayloadSchema.shape,
    type: z.literal('PreCompact')
  })
]);

export type HookPayload = z.infer<typeof HookPayloadSchema>;

/**
 * Hook response schema
 * Standard response from Cage backend to Claude Code hooks
 */
export const HookResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  warning: z.string().optional(),
  contextToInject: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional()
});

export type HookResponse = z.infer<typeof HookResponseSchema>;

/**
 * Hook type enum for better type safety
 */
export enum HookType {
  PreToolUse = 'PreToolUse',
  PostToolUse = 'PostToolUse',
  UserPromptSubmit = 'UserPromptSubmit',
  Notification = 'Notification',
  Stop = 'Stop',
  SubagentStop = 'SubagentStop',
  SessionStart = 'SessionStart',
  SessionEnd = 'SessionEnd',
  PreCompact = 'PreCompact'
}