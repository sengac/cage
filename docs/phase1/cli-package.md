# Phase 1: CLI Package Implementation

## Overview

The CLI package provides the `cage` command-line interface using Ink (React for CLI). This covers all CLI-related acceptance criteria from PHASE1.md.

## Acceptance Criteria Coverage

This implementation covers:

- **CLI Installation and Setup**: Initialize, configure hooks, verify status
- **CLI Event Monitoring**: Stream, filter, tail, and query events

## Package Structure

```
packages/cli/
├── src/
│   ├── commands/
│   │   ├── init.tsx           # cage init command
│   │   ├── hooks/
│   │   │   ├── setup.tsx       # cage hooks setup
│   │   │   └── status.tsx      # cage hooks status
│   │   ├── events/
│   │   │   ├── stream.tsx      # cage events stream
│   │   │   ├── tail.tsx        # cage events tail
│   │   │   ├── list.tsx        # cage events list
│   │   │   └── stats.tsx       # cage events stats
│   │   └── start/
│   │       └── server.tsx      # cage start server
│   ├── components/
│   │   ├── Spinner.tsx
│   │   ├── ErrorMessage.tsx
│   │   └── SuccessMessage.tsx
│   ├── utils/
│   │   ├── config.ts
│   │   └── hooks-installer.ts
│   └── index.tsx               # CLI entry point
├── test/
│   ├── acceptance/             # Acceptance tests for each scenario
│   │   ├── installation.test.ts
│   │   ├── initialization.test.ts
│   │   ├── hooks-setup.test.ts
│   │   └── events-commands.test.ts
│   └── setup.ts                # Test environment setup
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Step 1: Test Environment Setup

### Create `packages/cli/test/setup.ts`

```typescript
import { vi } from 'vitest';

// Mock console methods that Ink uses internally
global.console = {
  ...console,
  clear: vi.fn(),
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

// Setup test environment for React components
process.env.NODE_ENV = 'test';
```

### Create `packages/cli/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    threads: false, // Important for Ink components
    testTimeout: 10000,
  },
});
```

## Step 2: Acceptance Tests (Write FIRST)

### A. Test: Initialize Cage in a project

**Create `packages/cli/test/acceptance/initialization.test.ts`**:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import React from 'react';

// THIS IMPORT WILL FAIL - THAT'S EXPECTED!
// import { InitCommand } from '../../src/commands/init';

// Temporary mock while InitCommand doesn't exist
const InitCommand = () => React.createElement('text', {}, 'Not implemented');

describe('Feature: CLI Installation and Setup', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'cage-test-'));
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Scenario: Initialize Cage in a project', () => {
    it.skip('Given I am in a project directory When I run cage init Then .cage directory should be created', async () => {
      // Given - we are in testDir (setup in beforeEach)

      // When
      const { lastFrame, waitUntilExit } = render(<InitCommand />);

      // Mock immediate exit for now
      setTimeout(() => process.exit(0), 100);

      try {
        await waitUntilExit();
      } catch {
        // Expected to fail initially
      }

      // Then
      expect(existsSync(join(testDir, '.cage'))).toBe(true);
      expect(lastFrame()).toContain('Cage initialized successfully');
    });

    it.skip('Given I am in a project directory When I run cage init Then cage.config.json should be created with default settings', async () => {
      // When
      const { waitUntilExit } = render(<InitCommand />);

      setTimeout(() => process.exit(0), 100);

      try {
        await waitUntilExit();
      } catch {
        // Expected to fail initially
      }

      // Then
      const configPath = join(testDir, 'cage.config.json');
      expect(existsSync(configPath)).toBe(true);

      if (existsSync(configPath)) {
        const config = JSON.parse(await readFile(configPath, 'utf-8'));
        expect(config).toHaveProperty('version');
        expect(config).toHaveProperty('port', 3790);
      }
    });
  });
});
```

### B. Test: Configure Claude Code hooks

**Create `packages/cli/test/acceptance/hooks-setup.test.ts`**:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises';
import { tmpdir, homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import React from 'react';

// These will fail initially
// import { HooksSetupCommand } from '../../src/commands/hooks/setup';
// import { HooksStatusCommand } from '../../src/commands/hooks/status';

const HooksSetupCommand = () => React.createElement('text', {}, 'Not implemented');
const HooksStatusCommand = () => React.createElement('text', {}, 'Not implemented');

describe('Feature: Claude Code Hook Configuration', () => {
  let testDir: string;
  let originalCwd: string;
  let originalHome: string;
  let testHome: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalHome = process.env.HOME || '';

    testDir = await mkdtemp(join(tmpdir(), 'cage-test-'));
    testHome = await mkdtemp(join(tmpdir(), 'cage-home-'));

    process.chdir(testDir);
    process.env.HOME = testHome;

    // Create cage config
    await writeFile(join(testDir, 'cage.config.json'), JSON.stringify({
      version: '1.0.0',
      port: 3790
    }));

    // Create .cage directory
    await mkdir(join(testDir, '.cage'), { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.env.HOME = originalHome;
    await rm(testDir, { recursive: true, force: true });
    await rm(testHome, { recursive: true, force: true });
  });

  describe('Scenario: Configure Claude Code hooks', () => {
    it.skip('Given I have Cage initialized When I run cage hooks setup Then Claude Code settings.json should be updated', async () => {
      // Given - Cage is initialized (in beforeEach)

      // Create mock Claude settings
      const claudeDir = join(testHome, '.claude');
      await mkdir(claudeDir, { recursive: true });
      await writeFile(join(claudeDir, 'settings.json'), JSON.stringify({}));

      // When
      const { lastFrame, waitUntilExit } = render(<HooksSetupCommand />);

      setTimeout(() => process.exit(0), 100);

      try {
        await waitUntilExit();
      } catch {}

      // Then
      expect(lastFrame()).toContain('Hooks configured successfully');
      expect(lastFrame()).toContain('PreToolUse');
      expect(lastFrame()).toContain('PostToolUse');
      expect(lastFrame()).toContain('UserPromptSubmit');
      expect(lastFrame()).toContain('Notification');
      expect(lastFrame()).toContain('Stop');
      expect(lastFrame()).toContain('SubagentStop');
      expect(lastFrame()).toContain('SessionStart');
      expect(lastFrame()).toContain('SessionEnd');
      expect(lastFrame()).toContain('PreCompact');
      expect(lastFrame()).toContain('Status');

      const settings = JSON.parse(
        await readFile(join(claudeDir, 'settings.json'), 'utf-8')
      );
      expect(settings).toHaveProperty('hooks');
      expect(settings.hooks).toHaveProperty('PreToolUse');
      expect(settings.hooks).toHaveProperty('PostToolUse');
      // ... check all 10 hooks
    });
  });

  describe('Scenario: Verify hook configuration', () => {
    it.skip('Given I have configured Cage hooks When I run cage hooks status Then I should see status of each hook', async () => {
      // Given - hooks are configured
      const claudeDir = join(testHome, '.claude');
      await mkdir(claudeDir, { recursive: true });
      await writeFile(join(claudeDir, 'settings.json'), JSON.stringify({
        hooks: {
          PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: 'cage-hook-handler pre-tool-use' }] }],
          PostToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: 'cage-hook-handler post-tool-use' }] }],
          // ... other hooks
        }
      }));

      // When
      const { lastFrame } = render(<HooksStatusCommand />);

      // Then
      expect(lastFrame()).toContain('PreToolUse: enabled');
      expect(lastFrame()).toContain('PostToolUse: enabled');
      expect(lastFrame()).toContain('Backend server: not running');
    });
  });
});
```

### C. Test: Event Monitoring Commands

**Create `packages/cli/test/acceptance/events-commands.test.ts`**:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import React from 'react';

// These will fail initially
// import { EventsStreamCommand } from '../../src/commands/events/stream';
// import { EventsTailCommand } from '../../src/commands/events/tail';
// import { EventsListCommand } from '../../src/commands/events/list';
// import { EventsStatsCommand } from '../../src/commands/events/stats';

const EventsStreamCommand = () => React.createElement('text', {}, 'Not implemented');
const EventsTailCommand = () => React.createElement('text', {}, 'Not implemented');
const EventsListCommand = () => React.createElement('text', {}, 'Not implemented');
const EventsStatsCommand = () => React.createElement('text', {}, 'Not implemented');

describe('Feature: CLI Event Monitoring', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'cage-test-'));
    process.chdir(testDir);

    // Create .cage directory with sample events
    const cageDir = join(testDir, '.cage');
    const eventsDir = join(cageDir, 'events', '2025-01-15');
    await mkdir(eventsDir, { recursive: true });

    // Create sample event log
    const events = [
      { timestamp: '2025-01-15T10:00:00Z', eventType: 'pre-tool-use', toolName: 'Read', sessionId: 'session-1' },
      { timestamp: '2025-01-15T10:00:01Z', eventType: 'post-tool-use', toolName: 'Read', sessionId: 'session-1' },
      { timestamp: '2025-01-15T10:00:02Z', eventType: 'pre-tool-use', toolName: 'Write', sessionId: 'session-1' },
      { timestamp: '2025-01-15T10:00:03Z', eventType: 'post-tool-use', toolName: 'Write', sessionId: 'session-1' },
    ];

    const jsonl = events.map(e => JSON.stringify(e)).join('\n');
    await writeFile(join(eventsDir, 'events.jsonl'), jsonl);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Scenario: Tail recent events', () => {
    it.skip('Given I have logged events When I run cage events tail Then I should see the last 10 events', async () => {
      // When
      const { lastFrame } = render(<EventsTailCommand />);

      // Then
      expect(lastFrame()).toContain('2025-01-15T10:00:00Z');
      expect(lastFrame()).toContain('pre-tool-use');
      expect(lastFrame()).toContain('Read');
      expect(lastFrame()).toContain('Write');
    });

    it.skip('Given I have logged events When I run cage events tail -n 2 Then I should see the last 2 events', async () => {
      // When
      const { lastFrame } = render(<EventsTailCommand count={2} />);

      // Then
      expect(lastFrame()).toContain('2025-01-15T10:00:02Z');
      expect(lastFrame()).toContain('2025-01-15T10:00:03Z');
      expect(lastFrame()).not.toContain('2025-01-15T10:00:00Z');
      expect(lastFrame()).not.toContain('2025-01-15T10:00:01Z');
    });
  });

  describe('Scenario: Stream events in real-time', () => {
    it.skip('Given the backend server is running When I run cage events stream Then I should see live events', async () => {
      // Mock server connection
      const mockEventSource = {
        addEventListener: vi.fn(),
        close: vi.fn()
      };
      global.EventSource = vi.fn(() => mockEventSource);

      // When
      const { lastFrame, rerender } = render(<EventsStreamCommand />);

      // Simulate receiving an event
      const eventHandler = mockEventSource.addEventListener.mock.calls[0][1];
      eventHandler({
        data: JSON.stringify({
          timestamp: '2025-01-15T10:00:05Z',
          eventType: 'pre-tool-use',
          toolName: 'Read'
        })
      });

      // Force re-render to update the display
      rerender(<EventsStreamCommand />);

      // Then
      expect(lastFrame()).toContain('2025-01-15T10:00:05Z');
      expect(lastFrame()).toContain('pre-tool-use');
      expect(lastFrame()).toContain('Read');
    });

    it.skip('Given I am streaming events When I run cage events stream --filter PreToolUse Then I should only see PreToolUse events', async () => {
      // Mock filtered stream
      const { lastFrame } = render(<EventsStreamCommand filter="PreToolUse" />);

      // Then - verify filter is applied
      expect(lastFrame()).toContain('Filtering: PreToolUse');
    });
  });

  describe('Scenario: Query events by date range', () => {
    it.skip('Given I have logged events When I run cage events list --from 2025-01-15 --to 2025-01-15 Then I should see events summary', async () => {
      // When
      const { lastFrame } = render(
        <EventsListCommand from="2025-01-15" to="2025-01-15" />
      );

      // Then
      expect(lastFrame()).toContain('Events from 2025-01-15 to 2025-01-15');
      expect(lastFrame()).toContain('Total events: 4');
      expect(lastFrame()).toContain('pre-tool-use: 2');
      expect(lastFrame()).toContain('post-tool-use: 2');
    });
  });

  describe('Scenario: Display event statistics', () => {
    it.skip('Given I have logged events When I run cage events stats Then I should see statistics', async () => {
      // When
      const { lastFrame } = render(<EventsStatsCommand />);

      // Then
      expect(lastFrame()).toContain('Total events by type:');
      expect(lastFrame()).toContain('pre-tool-use: 2');
      expect(lastFrame()).toContain('post-tool-use: 2');
      expect(lastFrame()).toContain('Most frequently used tools:');
      expect(lastFrame()).toContain('Read: 2');
      expect(lastFrame()).toContain('Write: 2');
      expect(lastFrame()).toContain('Average events per session: 4');
    });
  });
});
```

## Step 3: Implementation (After Tests)

### A. Implement Init Command

**Create `packages/cli/src/commands/init.tsx`**:

```typescript
import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { CAGE_DIR, CONFIG_FILE_NAME, DEFAULT_PORT } from '@cage/shared/constants';

interface Config {
  version: string;
  port: number;
  agentType: string;
}

export const InitCommand: React.FC = () => {
  const [status, setStatus] = useState<'initializing' | 'success' | 'error'>('initializing');
  const [message, setMessage] = useState('Initializing Cage...');

  useEffect(() => {
    const initialize = async () => {
      try {
        const cageDir = join(process.cwd(), CAGE_DIR);

        // Create .cage directory
        if (!existsSync(cageDir)) {
          await mkdir(cageDir, { recursive: true });
          await mkdir(join(cageDir, 'events'), { recursive: true });
        }

        // Create default config
        const config: Config = {
          version: '1.0.0',
          port: DEFAULT_PORT,
          agentType: 'claude'
        };

        const configPath = join(process.cwd(), CONFIG_FILE_NAME);
        await writeFile(configPath, JSON.stringify(config, null, 2));

        setStatus('success');
        setMessage('Cage initialized successfully');

        // Exit after success
        setTimeout(() => process.exit(0), 100);
      } catch (error) {
        setStatus('error');
        setMessage(`Failed to initialize: ${error}`);
        setTimeout(() => process.exit(1), 100);
      }
    };

    initialize();
  }, []);

  return (
    <Box flexDirection="column">
      <Text color={status === 'error' ? 'red' : 'green'}>
        {status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳'} {message}
      </Text>
    </Box>
  );
};
```

### B. Implement Hooks Setup Command

**Create `packages/cli/src/commands/hooks/setup.tsx`**:

```typescript
import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

interface ClaudeSettings {
  hooks?: Record<string, any[]>;
  [key: string]: any;
}

export const HooksSetupCommand: React.FC = () => {
  const [status, setStatus] = useState<'configuring' | 'success' | 'error'>('configuring');
  const [message, setMessage] = useState('Configuring Claude Code hooks...');

  useEffect(() => {
    const setup = async () => {
      try {
        // Find or create the cage-hook-handler executable path
        const handlerPath = findOrInstallHandler();

        // Load existing Claude settings
        const claudeDir = join(homedir(), '.claude');
        if (!existsSync(claudeDir)) {
          mkdirSync(claudeDir, { recursive: true });
        }

        const settingsPath = join(claudeDir, 'settings.json');
        let settings: ClaudeSettings = {};

        if (existsSync(settingsPath)) {
          try {
            settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
          } catch {
            settings = {};
          }
        }

        // Generate Cage hook configuration for ALL 9 hooks
        const hookTypes = [
          'PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'Notification',
          'Stop', 'SubagentStop', 'SessionStart', 'SessionEnd',
          'PreCompact'
        ];

        const cageHooks: Record<string, any[]> = {};

        for (const hookType of hookTypes) {
          const commandSuffix = hookType.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1);

          if (hookType === 'PreToolUse' || hookType === 'PostToolUse') {
            cageHooks[hookType] = [{
              matcher: '*',
              hooks: [{
                type: 'command',
                command: `${handlerPath} ${commandSuffix}`,
                timeout: 5
              }]
            }];
          } else {
            cageHooks[hookType] = [{
              hooks: [{
                type: 'command',
                command: `${handlerPath} ${commandSuffix}`,
                timeout: hookType === 'Status' ? 1 : 5
              }]
            }];
          }
        }

        // Merge with existing hooks
        settings.hooks = {
          ...settings.hooks,
          ...cageHooks
        };

        // Write updated settings
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

        setStatus('success');
        setMessage(`Hooks configured successfully for: ${hookTypes.join(', ')}`);

        setTimeout(() => process.exit(0), 100);
      } catch (error) {
        setStatus('error');
        setMessage(`Failed to configure hooks: ${error}`);
        setTimeout(() => process.exit(1), 100);
      }
    };

    setup();
  }, []);

  return (
    <Box flexDirection="column">
      <Text color={status === 'error' ? 'red' : 'green'}>
        {status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳'} {message}
      </Text>
    </Box>
  );
};

function findOrInstallHandler(): string {
  // Try to find existing handler
  try {
    const path = execSync('which cage-hook-handler', { encoding: 'utf-8' }).trim();
    if (path) return path;
  } catch {}

  // Install handler in .cage/bin
  const binDir = join(process.cwd(), '.cage', 'bin');
  if (!existsSync(binDir)) {
    mkdirSync(binDir, { recursive: true });
  }

  const handlerPath = join(binDir, 'cage-hook-handler');

  // This would be copied from packages/hooks/dist in real implementation
  // For now, return the expected path
  return handlerPath;
}
```

## Step 4: Run Tests and Verify

Remove `.skip` from tests, update imports, then run:

```bash
cd packages/cli
npm test

# All acceptance tests should pass
```

## Next Steps

Once CLI tests pass, proceed to:

- [Backend Package Implementation](backend-package.md)
- [Hooks Integration](hooks-integration.md)
