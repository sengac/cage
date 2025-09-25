# Phase 1: Backend Package Implementation

## Overview

The backend package provides the NestJS server that receives and processes all 9 Claude Code hook events, implements file-based event logging, and provides event query endpoints.

## Acceptance Criteria Coverage

This implementation covers:

- **Backend Event Processing**: All 9 hook types (PreToolUse, PostToolUse, UserPromptSubmit, Notification, Stop, SubagentStop, SessionStart, SessionEnd, PreCompact)
- **File-Based Event Logging**: Append-only logs, daily rotation, high-frequency handling
- **Error Handling and Recovery**: Malformed data, disk space issues, concurrent triggers

## Package Structure

```
packages/backend/
├── src/
│   ├── hooks/
│   │   ├── hooks.module.ts
│   │   ├── hooks.controller.ts     # All 9 hook endpoints
│   │   ├── hooks.service.ts        # Hook processing logic
│   │   └── hooks.controller.spec.ts
│   ├── storage/
│   │   ├── storage.module.ts
│   │   ├── storage.service.ts      # File-based event logging
│   │   └── storage.service.spec.ts
│   ├── events/
│   │   ├── events.module.ts
│   │   ├── events.controller.ts    # Query and streaming endpoints
│   │   ├── events.service.ts
│   │   └── events.controller.spec.ts
│   ├── app.module.ts
│   └── main.ts
├── test/
│   ├── acceptance/                  # Acceptance tests for each scenario
│   │   ├── server-startup.test.ts
│   │   ├── hook-endpoints.test.ts  # Tests for all 9 hooks
│   │   ├── event-logging.test.ts
│   │   ├── event-queries.test.ts
│   │   ├── error-handling.test.ts
│   │   └── performance.test.ts
│   ├── mocks/
│   │   └── file-system.mock.ts
│   └── utils/
│       └── performance.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Step 1: Test Environment Setup

### Create Test Utilities

**Create `packages/backend/test/utils/performance.ts`**:

```typescript
export const measureResponseTime = async (
  request: () => Promise<any>
): Promise<number> => {
  const start = process.hrtime.bigint();
  await request();
  const end = process.hrtime.bigint();
  return Number(end - start) / 1_000_000; // Convert to milliseconds
};

export const expectPerformance = (
  duration: number,
  maxMs: number,
  operation: string = 'Operation'
) => {
  if (duration > maxMs) {
    throw new Error(
      `${operation} took ${duration.toFixed(2)}ms, exceeding ${maxMs}ms limit`
    );
  }
};
```

**Create `packages/backend/test/mocks/file-system.mock.ts`**:

```typescript
import { vi } from 'vitest';

export const createFileSystemMock = () => {
  return {
    writeFile: vi.fn().mockResolvedValue(undefined),
    appendFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('{}'),
    mkdir: vi.fn().mockResolvedValue(undefined),
    existsSync: vi.fn().mockReturnValue(true),
    stat: vi.fn().mockResolvedValue({ size: 1000 }),
    readdir: vi.fn().mockResolvedValue([]),
  };
};

export const createDiskSpaceMock = () => {
  return {
    check: vi.fn().mockResolvedValue({
      free: 1000000000, // 1GB
      total: 10000000000, // 10GB
    }),
  };
};
```

## Step 2: Acceptance Tests for All Hook Types (Write FIRST)

### A. Test: All 10 Hook Endpoints

**Create `packages/backend/test/acceptance/hook-endpoints.test.ts`**:

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
// These imports will fail initially - that's expected!
// import { INestApplication } from '@nestjs/common';
// import { Test } from '@nestjs/testing';
// import request from 'supertest';
// import { AppModule } from '../../src/app.module';

import { measureResponseTime, expectPerformance } from '../utils/performance';
import { createFileSystemMock } from '../mocks/file-system.mock';

// Temporary mock while backend doesn't exist
const mockApp = {
  getHttpServer: () => null,
  init: vi.fn(),
  close: vi.fn(),
};

describe('Feature: Backend Event Processing - All 10 Hooks', () => {
  let app: any; // Will be INestApplication
  const fsMock = createFileSystemMock();

  beforeAll(async () => {
    vi.mock('fs/promises', () => fsMock);
    app = mockApp;

    // Uncomment when AppModule exists
    // const moduleRef = await Test.createTestingModule({
    //   imports: [AppModule],
    // }).compile();
    // app = moduleRef.createNestApplication();
    // await app.init();
  });

  afterAll(async () => {
    await app?.close();
    vi.clearAllMocks();
  });

  describe('Scenario: Start the backend server', () => {
    it.skip('Given I run cage start server Then the NestJS backend should start on port 3790', async () => {
      // This will fail without real server
      expect(true).toBe(false);

      // Uncomment when server exists
      // const response = await request(app.getHttpServer())
      //   .get('/health');
      // expect(response.status).toBe(200);
      // expect(response.body).toHaveProperty('status', 'healthy');
    });

    it.skip('Then the Swagger documentation should be available at /api-docs', async () => {
      // Uncomment when server exists
      // const response = await request(app.getHttpServer())
      //   .get('/api-docs');
      // expect(response.status).toBe(200);
      // expect(response.text).toContain('Swagger UI');
    });
  });

  describe('Scenario: Receive PreToolUse hook event', () => {
    it.skip('Given the backend server is running When Claude Code triggers a PreToolUse hook Then backend receives via /claude/hooks/pre-tool-use', async () => {
      const payload = {
        toolName: 'Read',
        arguments: { file_path: '/test.txt' },
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        agentType: 'claude',
      };

      // This will fail without real server
      expect(true).toBe(false);

      // Uncomment when server exists
      // const response = await request(app.getHttpServer())
      //   .post('/claude/hooks/pre-tool-use')
      //   .send(payload);
      //
      // expect(response.status).toBe(200);
      // expect(response.body).toHaveProperty('success', true);
      // expect(fsMock.appendFile).toHaveBeenCalled();
    });

    it.skip('Then should respond within 100ms', async () => {
      const payload = {
        toolName: 'Read',
        arguments: { file_path: '/test.txt' },
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
      };

      // Uncomment when server exists
      // const duration = await measureResponseTime(async () => {
      //   await request(app.getHttpServer())
      //     .post('/claude/hooks/pre-tool-use')
      //     .send(payload);
      // });
      // expectPerformance(duration, 100, 'PreToolUse hook');
    });
  });

  describe('Scenario: Receive PostToolUse hook event', () => {
    it.skip('Given the backend server is running When Claude Code triggers a PostToolUse hook Then backend receives via /claude/hooks/post-tool-use', async () => {
      const payload = {
        toolName: 'Write',
        arguments: { file_path: '/test.txt', content: 'data' },
        result: { success: true },
        executionTime: 150,
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
      };

      // Uncomment when server exists
      // const response = await request(app.getHttpServer())
      //   .post('/claude/hooks/post-tool-use')
      //   .send(payload);
      //
      // expect(response.status).toBe(200);
      // expect(response.body).toHaveProperty('success', true);
      // expect(fsMock.appendFile).toHaveBeenCalled();
    });
  });

  describe('Scenario: Receive UserPromptSubmit hook event', () => {
    it.skip('Given the backend server is running When user submits prompt Then backend receives via /claude/hooks/user-prompt-submit', async () => {
      const payload = {
        prompt: 'Help me write a test',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
      };

      // Uncomment when server exists
      // const response = await request(app.getHttpServer())
      //   .post('/claude/hooks/user-prompt-submit')
      //   .send(payload);
      //
      // expect(response.status).toBe(200);
      // expect(response.body).toHaveProperty('success', true);
      // // Can optionally return context to inject
      // if (response.body.output) {
      //   expect(typeof response.body.output).toBe('string');
      // }
    });
  });

  describe('Scenario: Receive Notification hook event', () => {
    it.skip('Given the backend server is running When Claude sends notification Then backend receives via /claude/hooks/notification', async () => {
      const payload = {
        level: 'info',
        message: 'Task completed',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
      };

      // Uncomment when server exists
      // const response = await request(app.getHttpServer())
      //   .post('/claude/hooks/notification')
      //   .send(payload);
      //
      // expect(response.status).toBe(200);
      // expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Scenario: Receive Stop hook event', () => {
    it.skip('Given the backend server is running When Claude completes or is interrupted Then backend receives via /claude/hooks/stop', async () => {
      const payload = {
        reason: 'completed',
        finalState: { filesModified: 5 },
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
      };

      // Uncomment when server exists
      // const response = await request(app.getHttpServer())
      //   .post('/claude/hooks/stop')
      //   .send(payload);
      //
      // expect(response.status).toBe(200);
      // expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Scenario: Receive SubagentStop hook event', () => {
    it.skip('Given the backend server is running When subagent completes Then backend receives via /claude/hooks/subagent-stop', async () => {
      const payload = {
        subagentId: 'subagent-456',
        result: { output: 'Task completed' },
        executionTime: 5000,
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
      };

      // Uncomment when server exists
      // const response = await request(app.getHttpServer())
      //   .post('/claude/hooks/subagent-stop')
      //   .send(payload);
      //
      // expect(response.status).toBe(200);
      // expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Scenario: Receive SessionStart hook event', () => {
    it.skip('Given the backend server is running When new session starts Then backend receives via /claude/hooks/session-start', async () => {
      const payload = {
        model: {
          id: 'claude-3-opus',
          displayName: 'Claude 3 Opus',
        },
        workspace: {
          currentDir: '/Users/test/project',
          projectDir: '/Users/test/project',
        },
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
      };

      // Uncomment when server exists
      // const response = await request(app.getHttpServer())
      //   .post('/claude/hooks/session-start')
      //   .send(payload);
      //
      // expect(response.status).toBe(200);
      // expect(response.body).toHaveProperty('success', true);
      // // Can optionally return context to inject
      // if (response.body.output) {
      //   expect(typeof response.body.output).toBe('string');
      // }
    });
  });

  describe('Scenario: Receive SessionEnd hook event', () => {
    it.skip('Given the backend server is running When session ends Then backend receives via /claude/hooks/session-end', async () => {
      const payload = {
        duration: 300000,
        totalCost: 0.05,
        eventsProcessed: 150,
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
      };

      // Uncomment when server exists
      // const response = await request(app.getHttpServer())
      //   .post('/claude/hooks/session-end')
      //   .send(payload);
      //
      // expect(response.status).toBe(200);
      // expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Scenario: Receive PreCompact hook event', () => {
    it.skip('Given the backend server is running When conversation compaction starts Then backend receives via /claude/hooks/pre-compact', async () => {
      const payload = {
        messageCount: 50,
        currentTokens: 100000,
        targetTokens: 50000,
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
      };

      // Uncomment when server exists
      // const response = await request(app.getHttpServer())
      //   .post('/claude/hooks/pre-compact')
      //   .send(payload);
      //
      // expect(response.status).toBe(200);
      // expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Scenario: Handle hook when server is down', () => {
    it('should be tested in hook handler integration test', () => {
      // This scenario is tested in hooks-integration.md
      // The hook handler should log offline when backend is unreachable
      expect(true).toBe(true);
    });
  });
});
```

### B. Test: File-Based Event Logging

**Create `packages/backend/test/acceptance/event-logging.test.ts`**:

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  createFileSystemMock,
  createDiskSpaceMock,
} from '../mocks/file-system.mock';

describe('Feature: File-Based Event Logging', () => {
  const fsMock = createFileSystemMock();
  const diskMock = createDiskSpaceMock();

  beforeAll(() => {
    vi.mock('fs/promises', () => fsMock);
    vi.mock('check-disk-space', () => diskMock);
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  describe('Scenario: Log event with complete data', () => {
    it.skip('Given backend receives hook event When processed Then entry appended to .cage/events/{date}/events.jsonl', async () => {
      const today = new Date().toISOString().split('T')[0];
      const expectedPath = `.cage/events/${today}/events.jsonl`;

      // Simulate event processing
      // This will fail without real implementation

      // Uncomment when StorageService exists
      // const storage = new StorageService();
      // await storage.logEvent({
      //   timestamp: new Date().toISOString(),
      //   eventType: 'pre-tool-use',
      //   toolName: 'Read',
      //   arguments: { file_path: '/test.txt' },
      //   sessionId: 'test-session'
      // });

      // expect(fsMock.mkdir).toHaveBeenCalledWith(
      //   expect.stringContaining('.cage/events'),
      //   expect.objectContaining({ recursive: true })
      // );
      // expect(fsMock.appendFile).toHaveBeenCalledWith(
      //   expect.stringContaining(expectedPath),
      //   expect.stringContaining('pre-tool-use')
      // );
    });
  });

  describe('Scenario: Rotate log files daily', () => {
    it.skip('Given events are being logged When date changes Then new events written to new date directory', async () => {
      // Test date rotation logic
      const yesterday = '2025-01-14';
      const today = '2025-01-15';

      // Uncomment when StorageService exists
      // const storage = new StorageService();
      //
      // // Log event on yesterday's date
      // vi.setSystemTime(new Date('2025-01-14T23:59:59Z'));
      // await storage.logEvent({ ... });
      // expect(fsMock.appendFile).toHaveBeenCalledWith(
      //   expect.stringContaining(`${yesterday}/events.jsonl`),
      //   expect.any(String)
      // );
      //
      // // Log event on today's date
      // vi.setSystemTime(new Date('2025-01-15T00:00:01Z'));
      // await storage.logEvent({ ... });
      // expect(fsMock.appendFile).toHaveBeenCalledWith(
      //   expect.stringContaining(`${today}/events.jsonl`),
      //   expect.any(String)
      // );
    });
  });

  describe('Scenario: Handle high-frequency events', () => {
    it.skip('Given Claude rapidly triggers hooks When 100+ events within 1 second Then all captured without loss', async () => {
      // Test buffering and batch writing
      const events = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        eventType: 'pre-tool-use',
        toolName: 'Read',
        sessionId: 'test-session',
        index: i,
      }));

      // Uncomment when StorageService exists
      // const storage = new StorageService();
      // const promises = events.map(e => storage.logEvent(e));
      // await Promise.all(promises);
      //
      // expect(fsMock.appendFile).toHaveBeenCalledTimes(100);
      // // Verify all events were written
      // const calls = fsMock.appendFile.mock.calls;
      // const writtenIndices = calls.map(c =>
      //   JSON.parse(c[1]).index
      // ).sort((a, b) => a - b);
      // expect(writtenIndices).toEqual(Array.from({ length: 100 }, (_, i) => i));
    });
  });
});
```

### C. Test: Error Handling

**Create `packages/backend/test/acceptance/error-handling.test.ts`**:

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  createFileSystemMock,
  createDiskSpaceMock,
} from '../mocks/file-system.mock';

describe('Feature: Error Handling and Recovery', () => {
  const fsMock = createFileSystemMock();
  const diskMock = createDiskSpaceMock();

  beforeAll(() => {
    vi.mock('fs/promises', () => fsMock);
    vi.mock('check-disk-space', () => diskMock);
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  describe('Scenario: Handle malformed hook data', () => {
    it.skip('Given backend receives malformed JSON When processing Then logs error and returns 400', async () => {
      // Uncomment when server exists
      // const response = await request(app.getHttpServer())
      //   .post('/claude/hooks/pre-tool-use')
      //   .send('not valid json');
      //
      // expect(response.status).toBe(400);
      // expect(response.body).toHaveProperty('success', false);
      // expect(response.body).toHaveProperty('message', 'Invalid payload');
    });
  });

  describe('Scenario: Recover from disk space issues', () => {
    it.skip('Given disk space < 100MB When event received Then returns warning and continues without logging', async () => {
      // Mock low disk space
      diskMock.check.mockResolvedValueOnce({
        free: 50_000_000, // 50MB
        total: 10_000_000_000,
      });

      const payload = {
        toolName: 'Write',
        arguments: { file_path: '/test.txt' },
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
      };

      // Uncomment when server exists
      // const response = await request(app.getHttpServer())
      //   .post('/claude/hooks/post-tool-use')
      //   .send(payload);
      //
      // expect(response.status).toBe(200);
      // expect(response.body).toHaveProperty('success', true);
      // expect(response.body).toHaveProperty('warning', 'Low disk space, events not persisted');
      // expect(fsMock.appendFile).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: Handle concurrent hook triggers', () => {
    it.skip('Given multiple Claude instances When triggering hooks simultaneously Then all processed without conflicts', async () => {
      const sessions = ['session-1', 'session-2', 'session-3'];
      const promises = sessions.map(sessionId =>
        // Uncomment when server exists
        // request(app.getHttpServer())
        //   .post('/claude/hooks/pre-tool-use')
        //   .send({
        //     toolName: 'Read',
        //     arguments: { file_path: '/test.txt' },
        //     sessionId,
        //     timestamp: new Date().toISOString()
        //   })
        Promise.resolve({ status: 200 })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      results.forEach(r => expect(r.status).toBe(200));
    });
  });
});
```

## Step 3: Implementation (After Tests)

### A. Create App Module

**Create `packages/backend/src/app.module.ts`**:

```typescript
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HooksModule } from './hooks/hooks.module';
import { StorageModule } from './storage/storage.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    HooksModule,
    StorageModule,
    EventsModule,
  ],
})
export class AppModule {}
```

### B. Create Hooks Controller for All 10 Hooks

**Create `packages/backend/src/hooks/hooks.controller.ts`**:

```typescript
import { Controller, Post, Body, HttpCode, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HooksService } from './hooks.service';
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
  HookResponse,
} from '@cage/shared/types';

@ApiTags('Claude Hooks')
@Controller('claude/hooks')
export class HooksController {
  constructor(private readonly hooksService: HooksService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  health() {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  }

  @Post('pre-tool-use')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle PreToolUse hook' })
  @ApiResponse({ status: 200, description: 'Hook processed successfully' })
  async handlePreToolUse(@Body() payload: unknown): Promise<HookResponse> {
    const validated = PreToolUsePayloadSchema.safeParse(payload);
    if (!validated.success) {
      return { success: false, message: 'Invalid payload' };
    }
    return this.hooksService.processPreToolUse(validated.data);
  }

  @Post('post-tool-use')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle PostToolUse hook' })
  async handlePostToolUse(@Body() payload: unknown): Promise<HookResponse> {
    const validated = PostToolUsePayloadSchema.safeParse(payload);
    if (!validated.success) {
      return { success: false, message: 'Invalid payload' };
    }
    return this.hooksService.processPostToolUse(validated.data);
  }

  @Post('user-prompt-submit')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle UserPromptSubmit hook' })
  async handleUserPromptSubmit(
    @Body() payload: unknown
  ): Promise<HookResponse> {
    const validated = UserPromptSubmitPayloadSchema.safeParse(payload);
    if (!validated.success) {
      return { success: false, message: 'Invalid payload' };
    }
    return this.hooksService.processUserPromptSubmit(validated.data);
  }

  @Post('notification')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Notification hook' })
  async handleNotification(@Body() payload: unknown): Promise<HookResponse> {
    const validated = NotificationPayloadSchema.safeParse(payload);
    if (!validated.success) {
      return { success: false, message: 'Invalid payload' };
    }
    return this.hooksService.processNotification(validated.data);
  }

  @Post('stop')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Stop hook' })
  async handleStop(@Body() payload: unknown): Promise<HookResponse> {
    const validated = StopPayloadSchema.safeParse(payload);
    if (!validated.success) {
      return { success: false, message: 'Invalid payload' };
    }
    return this.hooksService.processStop(validated.data);
  }

  @Post('subagent-stop')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle SubagentStop hook' })
  async handleSubagentStop(@Body() payload: unknown): Promise<HookResponse> {
    const validated = SubagentStopPayloadSchema.safeParse(payload);
    if (!validated.success) {
      return { success: false, message: 'Invalid payload' };
    }
    return this.hooksService.processSubagentStop(validated.data);
  }

  @Post('session-start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle SessionStart hook' })
  async handleSessionStart(@Body() payload: unknown): Promise<HookResponse> {
    const validated = SessionStartPayloadSchema.safeParse(payload);
    if (!validated.success) {
      return { success: false, message: 'Invalid payload' };
    }
    return this.hooksService.processSessionStart(validated.data);
  }

  @Post('session-end')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle SessionEnd hook' })
  async handleSessionEnd(@Body() payload: unknown): Promise<HookResponse> {
    const validated = SessionEndPayloadSchema.safeParse(payload);
    if (!validated.success) {
      return { success: false, message: 'Invalid payload' };
    }
    return this.hooksService.processSessionEnd(validated.data);
  }

  @Post('pre-compact')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle PreCompact hook' })
  async handlePreCompact(@Body() payload: unknown): Promise<HookResponse> {
    const validated = PreCompactPayloadSchema.safeParse(payload);
    if (!validated.success) {
      return { success: false, message: 'Invalid payload' };
    }
    return this.hooksService.processPreCompact(validated.data);
  }
}
```

## Step 4: Run Tests and Verify

Remove `.skip` from tests, update imports, then run:

```bash
cd packages/backend
npm test

# All acceptance tests should pass
```

## Next Steps

Once backend tests pass, proceed to:

- [Hooks Integration](hooks-integration.md)
- [Integration Testing](testing.md)
