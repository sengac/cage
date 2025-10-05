# CAGE CLI Documentation

## Overview

CAGE provides a comprehensive command-line interface for managing the Code Alignment Guard Engine. The CLI offers both traditional command-based operations and a full-screen interactive Terminal User Interface (TUI).

## Installation

```bash
# Clone and install
git clone https://github.com/sengac/cage.git
cd cage
npm install

# Install cage command globally (for local development)
npm run install:local

# Verify installation
cage --version
```

## Command Structure

```bash
cage [command] [subcommand] [options]
```

## Interactive Mode

### Launch Interactive TUI

```bash
# Launch full-screen interactive interface
cage

# Launch with debug mode enabled
cage --debug
```

The interactive mode provides a visual interface for all CAGE features. See [TUI Documentation](TUI.md) for details.

## Commands Reference

### Project Initialization

#### `cage init`

Initialize CAGE in the current project directory.

```bash
cage init
```

**What it does:**
- Creates `.cage/` directory for event storage and configuration
- Creates `cage.config.json` with default settings
- Sets up directory structure for event logging

**Output:**
```
✓ Created .cage directory
✓ Created cage.config.json
✓ Cage initialized successfully
```

### Hook Management

#### `cage hooks setup`

Configure Claude Code hooks in the local project.

```bash
cage hooks setup
```

**What it does:**
- Detects or creates `.claude/` directory in current working directory
- Creates `.claude/settings.json` with hook configuration (backs up existing)
- Copies `cage-hook-handler.js` to `.claude/hooks/`
- Creates individual `.mjs` wrapper scripts for each hook type
- Preserves existing hooks (e.g., quality-check.js)

**Output:**
```
✓ Found .claude directory
✓ Backed up existing settings.json (settings.json.backup.2025-01-24T10-30-45)
✓ Copied hook handler to .claude/hooks/
✓ Created hook wrappers for: PreToolUse, PostToolUse, UserPromptSubmit, Stop, SubagentStop, SessionStart, SessionEnd, Notification, PreCompact
✓ Hooks configured successfully
```

**Hook Types Configured:**
- **PreToolUse** - Validate and provide context before tool execution
- **PostToolUse** - Analyze results after tool execution
- **UserPromptSubmit** - Enhance prompts with project context
- **Stop** - Final quality checks when Claude finishes
- **SubagentStop** - Capture subagent results
- **SessionStart** - Provide initial context at session start
- **SessionEnd** - Cleanup and session summary
- **Notification** - Capture Claude's notifications
- **PreCompact** - Handle conversation compaction events

#### `cage hooks status`

Display the status of installed hooks.

```bash
cage hooks status
```

**Output:**
```
📎 Hooks Status

Location: .claude/settings.json
Hook Handler: .claude/hooks/cage-hook-handler.js

Installed Hooks:
  ✅ PreToolUse
  ✅ PostToolUse (with quality-check.js)
  ✅ UserPromptSubmit
  ✅ Stop
  ✅ SubagentStop
  ✅ SessionStart
  ✅ SessionEnd
  ✅ Notification
  ✅ PreCompact

Server Status: Running
```

### Server Management

#### `cage start`

Start the CAGE backend server.

```bash
cage start
```

**What it does:**
- Starts NestJS backend server on port 3790
- Runs in background and returns to shell prompt
- Creates PID file at `.cage/server.pid`
- Enables API endpoints and SSE streaming

**Output:**
```
✓ Cage backend server running on http://localhost:3790
  PID: 12345
  API Docs: http://localhost:3790/api-docs
  Health: http://localhost:3790/health
```

**Available Endpoints:**
- `http://localhost:3790/api-docs` - Swagger UI documentation
- `http://localhost:3790/api-docs-json` - OpenAPI JSON spec
- `http://localhost:3790/health` - Health check
- `http://localhost:3790/api/events/*` - Event endpoints
- `http://localhost:3790/api/hooks/*` - Hook endpoints
- `http://localhost:3790/api/debug/logs` - Debug logs

#### `cage stop`

Stop the CAGE backend server.

```bash
cage stop

# Force stop if not responding
cage stop --force
```

**Output:**
```
✓ Cage server stopped
  PID: 12345
```

#### `cage status`

Display comprehensive system status.

```bash
cage status

# JSON output for scripting
cage status --json
```

**Output:**
```
🟢 Server Status: Running
  Port: 3790
  PID: 12345
  Uptime: 2h 15m
  Health: OK

📎 Hooks: Installed
  Location: .claude/settings.json
  Hook Types: 9
  - PreToolUse: ✅
  - PostToolUse: ✅ (with quality-check.js)
  - UserPromptSubmit: ✅
  ...

📊 Events:
  Total Captured: 247
  Today: 15
  Location: .cage/events/
  Latest: 2025-01-24T10:45:23.123Z

⚙️ Configuration:
  Port: 3790
  Log Level: info
  Events Dir: .cage/events
```

### Event Management

#### `cage events stream`

Stream events in real-time (command-line version).

```bash
cage events stream

# Filter by event type
cage events stream --filter PreToolUse

# Filter by session
cage events stream --session abc123
```

**Output:**
```
Streaming events... (Press Ctrl+C to stop)

10:45:23.123  PreToolUse    Edit     main.ts:45
10:45:23.456  PostToolUse   Edit     ✓ Changed 3 lines
10:45:24.789  PreToolUse    Bash     npm test
10:45:26.012  PostToolUse   Bash     ✓ 15 tests passed
...
```

#### `cage events tail`

Display recent events.

```bash
cage events tail

# Show last 50 events
cage events tail -n 50

# Show events from specific date
cage events tail --from 2025-01-24
```

**Output:**
```
Latest Events (last 10):

10:45:23.123  PreToolUse    Edit     main.ts:45
10:45:23.456  PostToolUse   Edit     ✓ Changed 3 lines
10:45:24.789  PreToolUse    Bash     npm test
10:45:26.012  PostToolUse   Bash     ✓ 15 tests passed
...

Total events: 247
```

#### `cage events list`

List events with filtering and pagination.

```bash
cage events list

# Filter by type
cage events list --type PostToolUse

# Filter by date range
cage events list --from 2025-01-20 --to 2025-01-24

# Filter by session
cage events list --session abc123

# Pagination
cage events list --page 2 --limit 50
```

#### `cage events stats`

Display event statistics.

```bash
cage events stats

# Stats for specific date
cage events stats --date 2025-01-24
```

**Output:**
```
📊 Event Statistics

Total Events: 247
Sessions: 12

Events by Type:
  PreToolUse:    98 ==================== 40%
  PostToolUse:   98 ==================== 40%
  UserPromptSubmit: 32 ======== 13%
  Stop:          12 === 5%
  Other:         7  == 2%

Most Used Tools:
  Edit:   45 events
  Bash:   32 events
  Write:  21 events

Average Events per Session: 20.6
Peak Activity: 10:00-11:00 (89 events)
```

### Logs Management

#### `cage logs`

View various log types.

```bash
# Server logs
cage logs server

# Offline hook logs (connection failures)
cage logs offline

# Recent events (alias for events tail)
cage logs events
```

### Global Options

All commands support these global options:

```bash
--debug          # Enable debug mode with verbose output
--no-logo        # Suppress ASCII logo display
--json           # Output in JSON format (where applicable)
--quiet          # Minimal output
--help, -h       # Show help for command
--version, -v    # Show CAGE version
```

## Configuration

### Configuration File: `cage.config.json`

Default configuration created by `cage init`:

```json
{
  "port": 3790,
  "host": "localhost",
  "logLevel": "info",
  "eventsDir": ".cage/events",
  "maxEventSize": 1048576,
  "enableMetrics": false,
  "enableOfflineMode": true,
  "offlineLogPath": ".cage/hooks-offline.log"
}
```

### Environment Variables

Override configuration via environment variables:

```bash
# Server port
export CAGE_PORT=3791

# Log level
export CAGE_LOG_LEVEL=debug

# Events directory
export CAGE_EVENTS_DIR=/custom/path/events

# Config file location
export CAGE_CONFIG_PATH=/custom/path/cage.config.json
```

**Priority order:** Environment variables > Config file > Defaults

## Exit Codes

CAGE CLI uses standard exit codes:

- `0` - Success
- `1` - General error
- `2` - Invalid arguments
- `3` - Server not running (when required)
- `4` - Configuration error
- `5` - Hook setup error

## Examples

### Complete Setup Workflow

```bash
# 1. Initialize CAGE in your project
cd /path/to/your/project
cage init

# 2. Set up Claude Code hooks
cage hooks setup

# 3. Start the backend server
cage start

# 4. Verify everything is working
cage status

# 5. Launch interactive mode
cage
```

### Monitor Events While Working

```bash
# Terminal 1: Work with Claude Code
claude

# Terminal 2: Monitor events in real-time
cage events stream

# Or use interactive TUI
cage
```

### Debugging Issues

```bash
# Check system status
cage status

# View server logs
cage logs server

# Check offline logs (if server was down)
cage logs offline

# Launch debug console
cage --debug
```

### Export Events for Analysis

```bash
# Get all events from today
cage events list --from $(date +%Y-%m-%d) --json > today-events.json

# Get statistics
cage events stats --json > stats.json
```

## Troubleshooting

### Command Not Found

```bash
# Reinstall cage command
npm run install:local

# Or use via npx
npx cage status
```

### Server Won't Start

```bash
# Check if port is in use
lsof -i :3790

# Use different port
export CAGE_PORT=3791
cage start
```

### Hooks Not Working

```bash
# Verify hook installation
cage hooks status

# Reinstall hooks
cage hooks setup

# Check offline logs
cage logs offline
```

### Events Not Appearing

```bash
# Check server status
cage status

# Verify hooks are installed
cage hooks status

# Check event directory
ls -la .cage/events/
```

## Related Documentation

- [Interactive TUI](TUI.md) - Full-screen terminal interface
- [Backend API](BACKEND.md) - REST API documentation
- [Hooks System](HOOKS.md) - Claude Code hooks integration
- [Development Guide](DEVELOPMENT.md) - Contributing guidelines
