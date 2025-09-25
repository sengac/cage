# Phase 1: Claude Code Hooks Integration

## Overview

This guide explains how Claude Code hooks actually work and how to integrate them with the Cage backend. Claude Code uses a JSON configuration system, NOT standalone scripts.

## How Claude Code Hooks Work

### Hook Mechanism

1. **Configuration**: Hooks are defined in `~/.claude/settings.json`
2. **Execution**: Claude Code executes shell commands at specific events
3. **Data Flow**: JSON sent via stdin to hook command
4. **Control**: Exit codes and stdout control Claude's behavior

### Available Hook Types

All 10 Claude Code hook events:

| Hook Event       | Trigger                        | Can Block?   | Can Inject Context? |
| ---------------- | ------------------------------ | ------------ | ------------------- |
| PreToolUse       | Before tool execution          | Yes (exit 2) | No                  |
| PostToolUse      | After tool execution           | No           | No                  |
| UserPromptSubmit | User submits prompt            | No           | Yes (stdout)        |
| Notification     | Claude sends notification      | No           | No                  |
| Stop             | Claude finishes responding     | No           | No                  |
| SubagentStop     | Subagent completes             | No           | No                  |
| SessionStart     | New session begins             | No           | Yes (stdout)        |
| SessionEnd       | Session ends                   | No           | No                  |
| PreCompact       | Before conversation compaction | No           | No                  |
| Status           | Status line update             | No           | Yes (stdout)        |

## Hook Handler Implementation

### Package Structure

```
packages/hooks/
├── src/
│   ├── cage-hook-handler.js    # Main executable
│   └── utils/
│       └── config-finder.js
├── test/
│   ├── handler.test.js
│   └── offline-logging.test.js
├── package.json
└── build.js                    # Build script for executable
```

## Step 1: Test-First Implementation

### A. Test: Hook Handler Functionality

**Create `packages/hooks/test/handler.test.js`**:

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import { mkdtemp, rm, writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

describe('Hook Handler Integration', () => {
  let testDir;
  let originalCwd;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'cage-hook-test-'));
    process.chdir(testDir);

    // Create cage config
    await writeFile(
      'cage.config.json',
      JSON.stringify({
        port: 3790,
      })
    );
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Hook Data Reception', () => {
    it.skip('should receive JSON from stdin and forward to backend', async () => {
      // Mock HTTP server
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = fetchMock;

      const hookData = {
        toolName: 'Read',
        arguments: { file_path: '/test.txt' },
        sessionId: 'test-session',
      };

      // THIS WILL FAIL INITIALLY - handler.js doesn't exist yet
      const handler = spawn('node', [
        '../../src/cage-hook-handler.js',
        'pre-tool-use',
      ]);

      // Send data to stdin
      handler.stdin.write(JSON.stringify(hookData));
      handler.stdin.end();

      // Wait for handler to complete
      await new Promise(resolve => {
        handler.on('exit', code => {
          resolve(code);
        });
      });

      // Verify fetch was called correctly
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3790/claude/hooks/pre-tool-use',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Read'),
        })
      );
    });
  });

  describe('Offline Logging', () => {
    it.skip('should log to file when backend is unreachable', async () => {
      // Mock failed HTTP request
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const hookData = {
        toolName: 'Write',
        arguments: { file_path: '/test.txt' },
        sessionId: 'test-session',
      };

      // Create .cage directory
      await mkdir(join(testDir, '.cage'), { recursive: true });

      const handler = spawn('node', [
        '../../src/cage-hook-handler.js',
        'post-tool-use',
      ]);

      handler.stdin.write(JSON.stringify(hookData));
      handler.stdin.end();

      const exitCode = await new Promise(resolve => {
        handler.on('exit', resolve);
      });

      // Should not block Claude (exit 0)
      expect(exitCode).toBe(0);

      // Check offline log was created
      const logPath = join(testDir, '.cage', 'hooks-offline.log');
      expect(existsSync(logPath)).toBe(true);

      const logContent = await readFile(logPath, 'utf-8');
      expect(logContent).toContain('post-tool-use');
      expect(logContent).toContain('Connection refused');
    });
  });

  describe('Blocking Operations', () => {
    it.skip('should block Claude when backend returns block=true', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          block: true,
          message: 'Operation not allowed',
        }),
      });

      const handler = spawn('node', [
        '../../src/cage-hook-handler.js',
        'pre-tool-use',
      ]);

      handler.stdin.write(JSON.stringify({ toolName: 'Delete' }));
      handler.stdin.end();

      let stderr = '';
      handler.stderr.on('data', data => {
        stderr += data.toString();
      });

      const exitCode = await new Promise(resolve => {
        handler.on('exit', resolve);
      });

      // Exit code 2 blocks Claude
      expect(exitCode).toBe(2);
      expect(stderr).toContain('Operation not allowed');
    });
  });

  describe('Context Injection', () => {
    it.skip('should output context to stdout for injection', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          output: 'Additional context: Project uses TypeScript',
        }),
      });

      const handler = spawn('node', [
        '../../src/cage-hook-handler.js',
        'user-prompt-submit',
      ]);

      handler.stdin.write(JSON.stringify({ prompt: 'Help me write code' }));
      handler.stdin.end();

      let stdout = '';
      handler.stdout.on('data', data => {
        stdout += data.toString();
      });

      const exitCode = await new Promise(resolve => {
        handler.on('exit', resolve);
      });

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Additional context: Project uses TypeScript');
    });
  });
});
```

## Step 2: Hook Handler Implementation

### A. Create Hook Handler Executable

**Create `packages/hooks/src/cage-hook-handler.js`**:

```javascript
#!/usr/bin/env node

import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find cage config - check current dir, parent dirs, and home
function findCageConfig() {
  const locations = [
    process.cwd(),
    join(process.cwd(), '..'),
    join(process.cwd(), '../..'),
    homedir(),
  ];

  for (const dir of locations) {
    const configPath = join(dir, 'cage.config.json');
    if (existsSync(configPath)) {
      try {
        return JSON.parse(readFileSync(configPath, 'utf-8'));
      } catch {
        // Invalid JSON, continue searching
      }
    }
  }

  // Default config if none found
  return { port: 3790 };
}

// Main handler
async function main() {
  const config = findCageConfig();
  const hookType = process.argv[2] || 'unknown'; // Pass hook type as argument

  // Read Claude Code's input from stdin
  let inputData = '';
  process.stdin.setEncoding('utf-8');

  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  let hookData;
  try {
    hookData = JSON.parse(inputData);
  } catch (error) {
    // If not JSON, treat as raw text
    hookData = { raw: inputData };
  }

  // Add metadata
  const enrichedData = {
    ...hookData,
    hook_type: hookType,
    timestamp: new Date().toISOString(),
    project_dir: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  };

  // Forward to Cage backend
  try {
    const response = await fetch(
      `http://localhost:${config.port}/claude/hooks/${hookType}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedData),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const result = await response.json();

    // Handle Cage backend's response
    if (result.block) {
      // Exit code 2 blocks Claude Code
      console.error(result.message || 'Operation blocked by Cage');
      process.exit(2);
    }

    if (result.output) {
      // Send output back to Claude Code for context injection
      console.log(result.output);
    }

    if (result.warning) {
      // Inject warning into Claude's context
      console.log(`[CAGE WARNING] ${result.warning}`);
    }

    // Success
    process.exit(0);
  } catch (error) {
    // Log offline when backend is unreachable
    const cageDir = join(process.cwd(), '.cage');

    // Ensure .cage directory exists
    if (!existsSync(cageDir)) {
      try {
        mkdirSync(cageDir, { recursive: true });
      } catch {
        // Can't create directory, fail silently
      }
    }

    const logPath = join(cageDir, 'hooks-offline.log');
    const logEntry = {
      timestamp: new Date().toISOString(),
      hookType,
      data: enrichedData,
      error: error.message,
    };

    try {
      appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    } catch {
      // Can't log, silent fail
    }

    // Don't block Claude Code when backend is down
    process.exit(0);
  }
}

// Run the handler
main().catch(err => {
  // Silent fail to not block Claude Code
  process.exit(0);
});
```

### B. Create Package Configuration

**Create `packages/hooks/package.json`**:

```json
{
  "name": "@cage/hooks",
  "version": "0.0.1",
  "type": "module",
  "bin": {
    "cage-hook-handler": "./dist/cage-hook-handler.js"
  },
  "scripts": {
    "build": "node build.js",
    "test": "vitest run"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### C. Create Build Script

**Create `packages/hooks/build.js`**:

```javascript
import { copyFileSync, mkdirSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create dist directory
const distDir = join(__dirname, 'dist');
mkdirSync(distDir, { recursive: true });

// Copy handler to dist
copyFileSync(
  join(__dirname, 'src', 'cage-hook-handler.js'),
  join(distDir, 'cage-hook-handler.js')
);

// Make executable
chmodSync(join(distDir, 'cage-hook-handler.js'), 0o755);

console.log('✅ Hook handler built successfully');
```

## Step 3: Claude Code Configuration

### Hook Configuration Format

The actual Claude Code `settings.json` structure for hooks:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/cage-hook-handler pre-tool-use",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/cage-hook-handler post-tool-use",
            "timeout": 5
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/cage-hook-handler user-prompt-submit",
            "timeout": 5
          }
        ]
      }
    ],
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/cage-hook-handler notification",
            "timeout": 2
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/cage-hook-handler stop",
            "timeout": 5
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/cage-hook-handler subagent-stop",
            "timeout": 5
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/cage-hook-handler session-start",
            "timeout": 5
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/cage-hook-handler session-end",
            "timeout": 5
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/cage-hook-handler pre-compact",
            "timeout": 10
          }
        ]
      }
    ],
    "Status": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/cage-hook-handler status",
            "timeout": 1
          }
        ]
      }
    ]
  }
}
```

## Step 4: Installation Process

### Manual Installation Steps

1. **Build the hook handler**:

```bash
cd packages/hooks
npm run build
```

2. **Install globally or locally**:

```bash
# Global installation
npm install -g .

# Or copy to project
cp dist/cage-hook-handler.js ~/.cage/bin/
chmod +x ~/.cage/bin/cage-hook-handler.js
```

3. **Configure Claude Code**:

```bash
# Run from CLI
cage hooks setup

# Or manually edit ~/.claude/settings.json
```

### Automated Installation via CLI

The `cage hooks setup` command (implemented in [cli-package.md](cli-package.md)) automates this process:

1. Finds or installs the hook handler
2. Updates Claude Code settings.json
3. Verifies configuration

## Testing the Integration

### End-to-End Test

```bash
# 1. Start the backend
cage start server

# 2. Trigger a hook manually (simulate Claude Code)
echo '{"toolName":"Read","arguments":{"file_path":"test.txt"}}' | \
  cage-hook-handler pre-tool-use

# 3. Check the logs
cage events tail

# 4. Test offline logging (stop server first)
cage stop server
echo '{"toolName":"Write"}' | cage-hook-handler post-tool-use
cat .cage/hooks-offline.log
```

## Troubleshooting

### Common Issues

1. **Hook not firing**: Check Claude Code settings.json has correct path
2. **Backend unreachable**: Check server is running on correct port
3. **Permission denied**: Ensure handler is executable (chmod +x)
4. **No logs**: Check .cage directory exists and is writable

### Debug Mode

Add debug output to handler for troubleshooting:

```javascript
if (process.env.CAGE_DEBUG) {
  console.error('[CAGE DEBUG]', {
    hookType,
    config,
    data: enrichedData,
  });
}
```

Run with: `CAGE_DEBUG=1 cage-hook-handler pre-tool-use`

## Next Steps

Once hooks are integrated, proceed to:

- [Integration Testing](testing.md)
- [Implementation Checklist](checklist.md)
