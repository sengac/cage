# Phase 1: Shared Package Implementation

## Overview
The shared package contains types, schemas, and utilities used across all packages. This must be implemented first as other packages depend on it.

## Package Structure
```
packages/shared/
├── src/
│   ├── types/
│   │   ├── hooks.ts         # Hook payload schemas for all 10 hook types
│   │   ├── config.ts        # Configuration types
│   │   └── events.ts        # Event logging types
│   ├── constants/
│   │   ├── config.ts        # Configuration constants
│   │   └── endpoints.ts     # API endpoint constants
│   ├── utils/
│   │   └── logger.ts        # Shared logger utility
│   └── index.ts             # Barrel exports
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Step 1: Package Configuration

### Update `packages/shared/package.json`
```json
{
  "name": "@cage/shared",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/types/index.js"
    },
    "./constants": {
      "types": "./dist/constants/index.d.ts",
      "import": "./dist/constants/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest watch"
  },
  "dependencies": {
    "zod": "^3.23.0",
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

## Step 2: Test-First Implementation

### A. Write Tests FIRST for Hook Schemas

**Create `packages/shared/src/types/hooks.test.ts`** (BEFORE implementing hooks.ts):

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// THESE IMPORTS WILL FAIL - THAT'S EXPECTED!
// Uncomment after implementing hooks.ts
/*
import {
  PreToolUsePayloadSchema,
  PostToolUsePayloadSchema,
  UserPromptSubmitPayloadSchema,
  NotificationPayloadSchema,
  StopPayloadSchema,
  SubagentStopPayloadSchema,
  SessionStartPayloadSchema,
  SessionEndPayloadSchema,
  PreCompactPayloadSchema,
  StatusPayloadSchema,
  HookResponseSchema
} from './hooks';
*/

describe('Hook Payload Schemas - Complete Coverage', () => {
  describe('PreToolUsePayloadSchema', () => {
    it.skip('should validate a valid PreToolUse payload', () => {
      const payload = {
        toolName: 'Read',
        arguments: { file_path: '/test.txt' },
        sessionId: 'session-123',
        timestamp: new Date().toISOString()
      };

      // Uncomment when hooks.ts exists
      // const result = PreToolUsePayloadSchema.safeParse(payload);
      // expect(result.success).toBe(true);

      expect(true).toBe(false); // Temporary failing assertion
    });

    it.skip('should reject invalid payload', () => {
      const payload = { toolName: 123 }; // Invalid type

      // Uncomment when hooks.ts exists
      // const result = PreToolUsePayloadSchema.safeParse(payload);
      // expect(result.success).toBe(false);

      expect(true).toBe(false); // Temporary failing assertion
    });
  });

  describe('PostToolUsePayloadSchema', () => {
    it.skip('should validate PostToolUse with result and execution time', () => {
      const payload = {
        toolName: 'Write',
        arguments: { file_path: '/test.txt', content: 'data' },
        result: { success: true },
        executionTime: 150,
        sessionId: 'session-123',
        timestamp: new Date().toISOString()
      };

      // Uncomment when hooks.ts exists
      // const result = PostToolUsePayloadSchema.safeParse(payload);
      // expect(result.success).toBe(true);

      expect(true).toBe(false); // Temporary failing assertion
    });

    it.skip('should accept optional error field', () => {
      const payload = {
        toolName: 'Read',
        arguments: { file_path: '/nonexistent.txt' },
        result: null,
        executionTime: 50,
        error: 'File not found',
        sessionId: 'session-123',
        timestamp: new Date().toISOString()
      };

      // Uncomment when hooks.ts exists
      // const result = PostToolUsePayloadSchema.safeParse(payload);
      // expect(result.success).toBe(true);
      // if (result.success) {
      //   expect(result.data.error).toBe('File not found');
      // }

      expect(true).toBe(false); // Temporary failing assertion
    });
  });

  describe('UserPromptSubmitPayloadSchema', () => {
    it.skip('should validate user prompt with context', () => {
      const payload = {
        prompt: 'Help me write a function',
        context: {
          previousMessages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' }
          ]
        },
        sessionId: 'session-123',
        timestamp: new Date().toISOString()
      };

      // Uncomment when hooks.ts exists
      // const result = UserPromptSubmitPayloadSchema.safeParse(payload);
      // expect(result.success).toBe(true);

      expect(true).toBe(false); // Temporary failing assertion
    });
  });

  describe('NotificationPayloadSchema', () => {
    it.skip('should validate notification with different levels', () => {
      const payloads = [
        { level: 'info', message: 'Task completed' },
        { level: 'warning', message: 'Low disk space' },
        { level: 'error', message: 'Operation failed' }
      ];

      payloads.forEach(p => {
        const payload = {
          ...p,
          sessionId: 'session-123',
          timestamp: new Date().toISOString()
        };

        // Uncomment when hooks.ts exists
        // const result = NotificationPayloadSchema.safeParse(payload);
        // expect(result.success).toBe(true);
      });

      expect(true).toBe(false); // Temporary failing assertion
    });
  });

  describe('StopPayloadSchema', () => {
    it.skip('should validate Stop event with different reasons', () => {
      const reasons = ['completed', 'interrupted', 'error'];

      reasons.forEach(reason => {
        const payload = {
          reason,
          finalState: { filesModified: 5 },
          sessionId: 'session-123',
          timestamp: new Date().toISOString()
        };

        // Uncomment when hooks.ts exists
        // const result = StopPayloadSchema.safeParse(payload);
        // expect(result.success).toBe(true);
      });

      expect(true).toBe(false); // Temporary failing assertion
    });
  });

  describe('SubagentStopPayloadSchema', () => {
    it.skip('should validate SubagentStop with result', () => {
      const payload = {
        subagentId: 'subagent-456',
        result: { output: 'Task completed successfully' },
        executionTime: 5000,
        sessionId: 'session-123',
        timestamp: new Date().toISOString()
      };

      // Uncomment when hooks.ts exists
      // const result = SubagentStopPayloadSchema.safeParse(payload);
      // expect(result.success).toBe(true);

      expect(true).toBe(false); // Temporary failing assertion
    });
  });

  describe('SessionStartPayloadSchema', () => {
    it.skip('should validate SessionStart with model and workspace', () => {
      const payload = {
        model: {
          id: 'claude-3-opus',
          displayName: 'Claude 3 Opus'
        },
        workspace: {
          currentDir: '/Users/test/project',
          projectDir: '/Users/test/project'
        },
        sessionId: 'session-123',
        timestamp: new Date().toISOString()
      };

      // Uncomment when hooks.ts exists
      // const result = SessionStartPayloadSchema.safeParse(payload);
      // expect(result.success).toBe(true);

      expect(true).toBe(false); // Temporary failing assertion
    });
  });

  describe('SessionEndPayloadSchema', () => {
    it.skip('should validate SessionEnd with metrics', () => {
      const payload = {
        duration: 300000, // 5 minutes
        totalCost: 0.05,
        eventsProcessed: 150,
        sessionId: 'session-123',
        timestamp: new Date().toISOString()
      };

      // Uncomment when hooks.ts exists
      // const result = SessionEndPayloadSchema.safeParse(payload);
      // expect(result.success).toBe(true);

      expect(true).toBe(false); // Temporary failing assertion
    });
  });

  describe('PreCompactPayloadSchema', () => {
    it.skip('should validate PreCompact with token counts', () => {
      const payload = {
        messageCount: 50,
        currentTokens: 100000,
        targetTokens: 50000,
        sessionId: 'session-123',
        timestamp: new Date().toISOString()
      };

      // Uncomment when hooks.ts exists
      // const result = PreCompactPayloadSchema.safeParse(payload);
      // expect(result.success).toBe(true);

      expect(true).toBe(false); // Temporary failing assertion
    });
  });

  describe('StatusPayloadSchema', () => {
    it.skip('should validate Status with rich metadata', () => {
      const payload = {
        hookEventName: 'Status',
        sessionId: 'session-123',
        transcriptPath: '/tmp/claude-transcript.json',
        cwd: '/Users/test/project',
        model: {
          id: 'claude-3-opus',
          displayName: 'Claude 3 Opus'
        },
        workspace: {
          currentDir: '/Users/test/project',
          projectDir: '/Users/test/project'
        },
        version: '1.0.0',
        cost: {
          totalCostUsd: 0.10,
          totalDurationMs: 60000,
          totalApiDurationMs: 5000,
          totalLinesAdded: 100,
          totalLinesRemoved: 20
        }
      };

      // Uncomment when hooks.ts exists
      // const result = StatusPayloadSchema.safeParse(payload);
      // expect(result.success).toBe(true);

      expect(true).toBe(false); // Temporary failing assertion
    });
  });

  describe('HookResponseSchema', () => {
    it.skip('should allow optional warning field', () => {
      const response = {
        success: true,
        warning: 'Low disk space, events not persisted'
      };

      // Uncomment when hooks.ts exists
      // const result = HookResponseSchema.safeParse(response);
      // expect(result.success).toBe(true);
      // if (result.success) {
      //   expect(result.data.warning).toBe('Low disk space, events not persisted');
      // }

      expect(true).toBe(false); // Temporary failing assertion
    });

    it.skip('should allow blocking response', () => {
      const response = {
        success: false,
        block: true,
        message: 'Operation not allowed by Cage policy'
      };

      // Uncomment when hooks.ts exists
      // const result = HookResponseSchema.safeParse(response);
      // expect(result.success).toBe(true);
      // if (result.success) {
      //   expect(result.data.block).toBe(true);
      //   expect(result.data.message).toBe('Operation not allowed by Cage policy');
      // }

      expect(true).toBe(false); // Temporary failing assertion
    });

    it.skip('should allow context injection output', () => {
      const response = {
        success: true,
        output: 'Additional context: The project uses TypeScript'
      };

      // Uncomment when hooks.ts exists
      // const result = HookResponseSchema.safeParse(response);
      // expect(result.success).toBe(true);
      // if (result.success) {
      //   expect(result.data.output).toBe('Additional context: The project uses TypeScript');
      // }

      expect(true).toBe(false); // Temporary failing assertion
    });
  });
});
```

### B. Run Tests to Verify Failure

```bash
cd packages/shared
npm test

# Should show all tests skipped
```

### C. Implement Hook Schemas

Now create `packages/shared/src/types/hooks.ts`:

```typescript
import { z } from 'zod';

// Base schema for all hook payloads
const BaseHookPayloadSchema = z.object({
  sessionId: z.string(),
  timestamp: z.string().datetime(),
  agentType: z.enum(['claude', 'opencode', 'cursor', 'windsurf']).default('claude')
});

// PreToolUse hook payload - before tool execution
export const PreToolUsePayloadSchema = BaseHookPayloadSchema.extend({
  toolName: z.string(),
  arguments: z.record(z.unknown()),
  context: z.object({
    currentFile: z.string().optional(),
    workingDirectory: z.string().optional()
  }).optional()
});

export type PreToolUsePayload = z.infer<typeof PreToolUsePayloadSchema>;

// PostToolUse hook payload - after tool execution
export const PostToolUsePayloadSchema = BaseHookPayloadSchema.extend({
  toolName: z.string(),
  arguments: z.record(z.unknown()),
  result: z.unknown(),
  executionTime: z.number(), // milliseconds
  error: z.string().optional()
});

export type PostToolUsePayload = z.infer<typeof PostToolUsePayloadSchema>;

// UserPromptSubmit hook payload - user submits prompt
export const UserPromptSubmitPayloadSchema = BaseHookPayloadSchema.extend({
  prompt: z.string(),
  context: z.object({
    previousMessages: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string()
    })).optional()
  }).optional()
});

export type UserPromptSubmitPayload = z.infer<typeof UserPromptSubmitPayloadSchema>;

// Notification hook payload - Claude sends notification
export const NotificationPayloadSchema = BaseHookPayloadSchema.extend({
  level: z.enum(['info', 'warning', 'error']),
  message: z.string(),
  details: z.record(z.unknown()).optional()
});

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;

// Stop hook payload - Claude finishes responding
export const StopPayloadSchema = BaseHookPayloadSchema.extend({
  reason: z.enum(['completed', 'interrupted', 'error']),
  finalState: z.record(z.unknown()).optional()
});

export type StopPayload = z.infer<typeof StopPayloadSchema>;

// SubagentStop hook payload - subagent completes
export const SubagentStopPayloadSchema = BaseHookPayloadSchema.extend({
  subagentId: z.string(),
  result: z.unknown(),
  executionTime: z.number()
});

export type SubagentStopPayload = z.infer<typeof SubagentStopPayloadSchema>;

// SessionStart hook payload - new session begins
export const SessionStartPayloadSchema = BaseHookPayloadSchema.extend({
  model: z.object({
    id: z.string(),
    displayName: z.string()
  }).optional(),
  workspace: z.object({
    currentDir: z.string(),
    projectDir: z.string()
  }).optional()
});

export type SessionStartPayload = z.infer<typeof SessionStartPayloadSchema>;

// SessionEnd hook payload - session ends
export const SessionEndPayloadSchema = BaseHookPayloadSchema.extend({
  duration: z.number(), // milliseconds
  totalCost: z.number().optional(),
  eventsProcessed: z.number().optional()
});

export type SessionEndPayload = z.infer<typeof SessionEndPayloadSchema>;

// PreCompact hook payload - before conversation compaction
export const PreCompactPayloadSchema = BaseHookPayloadSchema.extend({
  messageCount: z.number(),
  currentTokens: z.number().optional(),
  targetTokens: z.number().optional()
});

export type PreCompactPayload = z.infer<typeof PreCompactPayloadSchema>;

// Status hook payload - custom status line update
export const StatusPayloadSchema = z.object({
  hookEventName: z.literal('Status'),
  sessionId: z.string(),
  transcriptPath: z.string().optional(),
  cwd: z.string(),
  model: z.object({
    id: z.string(),
    displayName: z.string()
  }),
  workspace: z.object({
    currentDir: z.string(),
    projectDir: z.string()
  }),
  version: z.string(),
  outputStyle: z.object({
    name: z.string()
  }).optional(),
  cost: z.object({
    totalCostUsd: z.number(),
    totalDurationMs: z.number(),
    totalApiDurationMs: z.number(),
    totalLinesAdded: z.number(),
    totalLinesRemoved: z.number()
  }).optional()
});

export type StatusPayload = z.infer<typeof StatusPayloadSchema>;

// Hook Response schema - what backend returns to hook
export const HookResponseSchema = z.object({
  success: z.boolean(),
  warning: z.string().optional(),
  block: z.boolean().optional(),
  message: z.string().optional(),
  output: z.string().optional(), // For status line or context injection
  modifiedArguments: z.record(z.unknown()).optional()
});

export type HookResponse = z.infer<typeof HookResponseSchema>;
```

## Step 3: Constants Implementation

### Create `packages/shared/src/constants/config.ts`

```typescript
export const DEFAULT_PORT = 3790;
export const CAGE_DIR = '.cage';
export const EVENTS_DIR = 'events';
export const OFFLINE_LOG_FILE = 'hooks-offline.log';
export const CONFIG_FILE_NAME = 'cage.config.json';

export const API_ENDPOINTS = {
  claude: {
    preToolUse: '/claude/hooks/pre-tool-use',
    postToolUse: '/claude/hooks/post-tool-use',
    userPromptSubmit: '/claude/hooks/user-prompt-submit',
    notification: '/claude/hooks/notification',
    stop: '/claude/hooks/stop',
    subagentStop: '/claude/hooks/subagent-stop',
    sessionStart: '/claude/hooks/session-start',
    sessionEnd: '/claude/hooks/session-end',
    preCompact: '/claude/hooks/pre-compact',
    status: '/claude/hooks/status',
    events: '/claude/events',
    eventsStream: '/claude/events/stream',
    eventsStats: '/claude/events/stats'
  }
} as const;

export const HOOK_RESPONSE_TIMEOUT = {
  nonBlocking: 100, // milliseconds
  userInput: 60000, // 1 minute
  llmAnalysis: 30000 // 30 seconds
} as const;
```

## Step 4: Update Tests and Run

Remove `.skip` from tests and uncomment imports, then run:

```bash
cd packages/shared
npm test

# All tests should pass
```

## Next Steps

Once the shared package tests pass, proceed to:
- [CLI Package Implementation](cli-package.md)