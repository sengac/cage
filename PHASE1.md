# Phase 1: Core Hook Infrastructure - Acceptance Criteria

## Overview
Phase 1 establishes the foundational hook infrastructure for Cage, implementing the CLI tool, basic backend event processing, and file-based event logging system. This phase focuses on capturing and persisting hook events before adding intelligence layers.

## User Stories

### Story 1: Developer Sets Up Cage Hook System
**As a** developer using Claude Code
**I want to** install and configure Cage hooks with a single command
**So that** I can start capturing Claude Code events immediately without complex setup

### Story 2: Developer Monitors Hook Events
**As a** developer using Claude Code
**I want to** see real-time feedback when hooks fire
**So that** I understand what Claude is doing and when interventions occur

### Story 3: Developer Reviews Historical Events
**As a** developer debugging Claude behavior
**I want to** access a complete log of all hook events
**So that** I can understand past decisions and troubleshoot issues

## Acceptance Criteria

### Feature: CLI Installation and Setup

#### Scenario: Install Cage globally
**Given** I have Node.js LTS installed
**When** I run `npm install -g @cage/cli`
**Then** the `cage` command should be available in my terminal
**And** running `cage --version` should display the current version

#### Scenario: Initialize Cage in a project
**Given** I am in a project directory
**When** I run `cage init`
**Then** a `.cage` directory should be created
**And** a `cage.config.json` file should be created with default settings
**And** the console should display "Cage initialized successfully"

#### Scenario: Configure Claude Code hooks in local project
**Given** I have Cage initialized in my project
**And** I am in a project directory with a .claude folder
**When** I run `cage hooks setup`
**Then** the system should use the local .claude directory in the current working directory
**And** create or update .claude/settings.json with hook configuration
**And** NOT modify any global Claude configuration files
**And** create hook scripts in .claude/hooks/ directory
**And** display "Hooks configured in .claude/ for: PreToolUse, PostToolUse, UserPromptSubmit, Notification, Stop, SubagentStop, SessionStart, SessionEnd, PreCompact, Status"

#### Scenario: Handle missing .claude directory
**Given** I am in a project directory without a .claude folder
**When** I run `cage hooks setup`
**Then** the system should create a .claude directory in the current working directory
**And** create .claude/settings.json with hook configuration
**And** create .claude/hooks/ directory structure
**And** display "Created .claude/ directory and configured hooks"

#### Scenario: Detect and use existing .claude directory
**Given** I have an existing .claude directory with settings.json
**When** I run `cage hooks setup`
**Then** the system should preserve existing settings in .claude/settings.json
**And** merge Cage hook configurations without overwriting other settings
**And** backup the original settings.json as settings.json.backup
**And** display "Updated existing .claude/settings.json (backup saved)"

#### Scenario: Preserve existing hooks configuration (Critical Bug Fix)
**Given** a `.claude/settings.json` with a quality-check hook for PostToolUse
**And** the quality-check hook is configured for "Edit|MultiEdit|Write" matcher
**When** I run `cage hooks setup`
**Then** the quality-check hook should remain in the settings
**And** the Cage PostToolUse hook should be added with a different matcher (e.g., "*")
**And** the quality-check hook should execute before Cage hooks

#### Scenario: Handle different hook configuration formats
**Given** Claude Code supports different hook configuration formats
**When** merging hooks
**Then** the installer should preserve the existing format style
**And** add Cage hooks using the same format

#### Scenario: Backup original settings with timestamp
**Given** any existing `.claude/settings.json` file
**When** I run `cage hooks setup`
**Then** a backup file should be created with timestamp (e.g., `.claude/settings.json.backup.20250918-105500`)
**And** the user should be informed about the backup location

#### Scenario: Handle conflicting matchers
**Given** an existing hook with matcher "*" for a hook type
**And** Cage wants to add a hook with matcher "*" for the same hook type
**When** merging the configurations
**Then** both hooks should be preserved
**And** they should execute in order (existing hooks first, then Cage hooks)

#### Scenario: Validate merged configuration
**Given** the hooks have been merged
**When** the merge is complete
**Then** the resulting JSON should be validated for correctness
**And** a test should verify the merged configuration is valid Claude Code format

#### Scenario: Inform user of changes
**Given** hooks have been merged
**When** the setup completes
**Then** the user should see a summary of:
  - Which hooks were preserved
  - Which hooks were added
  - The backup file location
  - Instructions to verify the hooks are working

#### Scenario: Verify hook configuration
**Given** I have configured Cage hooks
**When** I run `cage hooks status`
**Then** I should see the status of each hook from .claude/settings.json
**And** the path to the local .claude/hooks/ directory
**And** verification that hook scripts exist in .claude/hooks/
**And** whether the backend server is running

### Feature: Backend Event Processing

#### Scenario: Start the backend server
**Given** I have Cage initialized
**When** I run `cage start`
**Then** the NestJS backend should actually start on port 3790
**And** display "Cage backend server running on http://localhost:3790"
**And** the server process should run in the background
**And** return to the shell prompt immediately
**And** create a PID file at `.cage/server.pid`
**And** the Swagger documentation should be available at http://localhost:3790/api-docs

#### Scenario: Receive PreToolUse hook event
**Given** the Cage backend server is running
**When** Claude Code triggers a PreToolUse hook
**Then** the backend should receive the event via HTTP POST to /claude/hooks/pre-tool-use
**And** respond with 200 OK within 100ms
**And** log the event to the file system

#### Scenario: Receive PostToolUse hook event
**Given** the Cage backend server is running
**When** Claude Code triggers a PostToolUse hook
**Then** the backend should receive the event via HTTP POST to /claude/hooks/post-tool-use
**And** respond with 200 OK within 100ms
**And** log the event with tool results to the file system

#### Scenario: Receive UserPromptSubmit hook event
**Given** the Cage backend server is running
**When** a user submits a prompt to Claude Code
**Then** the backend should receive the event via HTTP POST to /claude/hooks/user-prompt-submit
**And** respond with 200 OK within 100ms
**And** log the user prompt and context to the file system

#### Scenario: Receive Stop hook event
**Given** the Cage backend server is running
**When** Claude Code completes a task or is interrupted
**Then** the backend should receive the event via HTTP POST to /claude/hooks/stop
**And** respond with 200 OK within 100ms
**And** log the final state and any cleanup actions to the file system

#### Scenario: Receive SubagentStop hook event
**Given** the Cage backend server is running
**When** a Claude Code subagent completes its task
**Then** the backend should receive the event via HTTP POST to /claude/hooks/subagent-stop
**And** respond with 200 OK within 100ms
**And** log the subagent results and execution summary to the file system

#### Scenario: Receive SessionStart hook event
**Given** the Cage backend server is running
**When** a new Claude Code session starts
**Then** the backend should receive the event via HTTP POST to /claude/hooks/session-start
**And** respond with 200 OK within 100ms
**And** optionally return context to inject into the session

#### Scenario: Receive SessionEnd hook event
**Given** the Cage backend server is running
**When** a Claude Code session ends
**Then** the backend should receive the event via HTTP POST to /claude/hooks/session-end
**And** respond with 200 OK within 100ms
**And** log session summary and cleanup

#### Scenario: Receive Notification hook event
**Given** the Cage backend server is running
**When** Claude Code sends a notification
**Then** the backend should receive the event via HTTP POST to /claude/hooks/notification
**And** respond with 200 OK within 100ms
**And** log the notification content

#### Scenario: Receive PreCompact hook event
**Given** the Cage backend server is running
**When** Claude Code is about to compact the conversation
**Then** the backend should receive the event via HTTP POST to /claude/hooks/pre-compact
**And** respond with 200 OK within 100ms
**And** log the compaction event

#### Scenario: Receive Status hook event
**Given** the Cage backend server is running
**When** Claude Code requests status line update
**Then** the backend should receive the event via HTTP POST to /claude/hooks/status
**And** respond with 200 OK within 100ms
**And** optionally return custom status text

#### Scenario: Handle hook when server is down
**Given** the Cage backend server is NOT running
**When** Claude Code triggers any hook
**Then** the hook script should log "Failed to connect to Cage backend" to .cage/hooks-offline.log
**And** Claude Code should continue operating normally
**And** not block or delay Claude's execution

### Feature: Server Management

#### Scenario: Stop the backend server
**Given** the Cage backend server is running on port 3790
**When** I run `cage stop`
**Then** the server should be gracefully stopped
**And** I should see a confirmation message "✓ Cage server stopped"
**And** the process should be terminated
**And** port 3790 should be freed
**And** the PID file should be removed

#### Scenario: Stop when server not running
**Given** the Cage backend server is NOT running
**When** I run `cage stop`
**Then** I should see a message "ℹ No Cage server is running"
**And** the command should exit with code 0 (not an error)

#### Scenario: Force stop the server
**Given** the server is not responding to graceful shutdown
**When** I run `cage stop --force`
**Then** the server process should be killed with SIGKILL
**And** I should see "✓ Cage server forcefully stopped"

#### Scenario: Check server status when running
**Given** the Cage backend server is running on port 3790
**When** I run `cage status`
**Then** I should see:
```
🟢 Server Status: Running
  Port: 3790
  PID: [process_id]
  Uptime: [duration]
  Health: OK
```

#### Scenario: Check server status when not running
**Given** the Cage backend server is NOT running
**When** I run `cage status`
**Then** I should see:
```
🔴 Server Status: Not Running
  Port: 3790 (available)
```

#### Scenario: Status shows hooks information when installed
**Given** I have run `cage hooks setup`
**When** I run `cage status`
**Then** I should see a hooks section showing:
```
📎 Hooks: Installed
  Location: /path/to/.claude/settings.json
  Hook Types: 10
  - PreToolUse: ✓
  - PostToolUse: ✓ (with quality-check.js)
  - [... other hooks ...]
```

#### Scenario: Status shows no hooks installed
**Given** I have NOT run `cage hooks setup`
**When** I run `cage status`
**Then** I should see:
```
📎 Hooks: Not Installed
  Run 'cage hooks setup' to install
```

#### Scenario: Status shows events information
**Given** events have been captured
**When** I run `cage status`
**Then** I should see:
```
📊 Events:
  Total Captured: 42
  Today: 15
  Location: .cage/events/
  Latest: 2025-09-18T11:23:34.626Z
```

#### Scenario: Status shows no events
**Given** no events have been captured
**When** I run `cage status`
**Then** I should see:
```
📊 Events:
  Total Captured: 0
  No events recorded yet
```

#### Scenario: Status shows offline logs
**Given** there are offline hook logs (connection failures)
**When** I run `cage status`
**Then** I should see:
```
⚠️ Offline Logs: 5 entries
  Location: .cage/hooks-offline.log
  Latest Error: fetch failed (2025-09-18T11:23:34)
  Run 'cage logs offline' to view
```

#### Scenario: Full system status
**Given** a complete Cage installation
**When** I run `cage status`
**Then** I should see ALL sections:
- Server status (running/not running)
- Hooks status (installed/not installed)
- Events status (count and latest)
- Offline logs (if any)
- Config status (port, directories)

#### Scenario: Status with JSON output
**Given** any state of the system
**When** I run `cage status --json`
**Then** the output should be valid JSON containing:
```json
{
  "server": {
    "running": true,
    "port": 3790,
    "pid": 12345,
    "uptime": "5m 23s"
  },
  "hooks": {
    "installed": true,
    "count": 10,
    "location": "/path/to/.claude/settings.json"
  },
  "events": {
    "total": 42,
    "today": 15,
    "latest": "2025-09-18T11:23:34.626Z"
  },
  "offline": {
    "count": 5,
    "latest": "2025-09-18T11:23:34"
  }
}
```

#### Scenario: View server logs
**Given** various log files exist
**When** I run `cage logs [type]`
**Then** I should be able to view:
- `cage logs server` - Server output logs
- `cage logs offline` - Offline hook logs
- `cage logs events` - Recent events (alias for `cage events tail`)

#### Scenario: Port conflict detection
**Given** port 3790 is already in use by another process
**When** I run `cage status`
**Then** I should see:
```
⚠️ Port 3790 is in use by another process (PID: [pid])
  This may not be a Cage server
```

### Feature: File-Based Event Logging

#### Scenario: Log event with complete data
**Given** the backend receives a hook event
**When** the event is processed
**Then** an entry should be appended to .cage/events/{date}/events.jsonl
**And** the entry should contain: timestamp, eventType, toolName, arguments, results, sessionId
**And** the file should use append-only mode (no overwrites)

#### Scenario: Rotate log files daily
**Given** events are being logged
**When** the date changes to a new day
**Then** new events should be written to .cage/events/{new-date}/events.jsonl
**And** previous day's file should remain unchanged
**And** maintain chronological order within each file

#### Scenario: Handle high-frequency events
**Given** Claude Code is rapidly triggering hooks
**When** 100+ events occur within 1 second
**Then** all events should be captured without loss
**And** events should maintain correct chronological order
**And** the system should not crash or slow down Claude Code

#### Scenario: Query events by date range
**Given** I have logged events across multiple days
**When** I run `cage events list --from 2025-01-01 --to 2025-01-07`
**Then** I should see a summary of events within that date range
**And** the output should show event counts by type
**And** total number of Claude Code sessions

### Feature: CLI Event Monitoring

#### Scenario: Stream events in real-time
**Given** the backend server is running
**When** I run `cage events stream`
**Then** I should see live events as they occur
**And** each event should display: timestamp, type, and tool name
**And** the display should use color coding for different event types

#### Scenario: Filter streamed events by type
**Given** I am streaming events
**When** I run `cage events stream --filter PreToolUse`
**Then** I should only see PreToolUse events
**And** other event types should be hidden
**And** the filter should persist until I stop streaming

#### Scenario: Display event statistics
**Given** I have logged events
**When** I run `cage events stats`
**Then** I should see total events by type
**And** average events per session
**And** most frequently used tools
**And** peak activity time periods

#### Scenario: Tail recent events
**Given** I have logged events
**When** I run `cage events tail`
**Then** I should see the last 10 events by default
**And** each event should show timestamp, type, and tool name
**And** events should be displayed in chronological order (oldest to newest)

#### Scenario: Tail with custom count
**Given** I have logged events
**When** I run `cage events tail -n 50`
**Then** I should see the last 50 events
**And** the output should be paginated if longer than terminal height
**And** I can navigate pages with standard controls

### Feature: Error Handling and Recovery

#### Scenario: Handle malformed hook data
**Given** the backend is running
**When** it receives malformed JSON from a hook
**Then** it should log the error to .cage/errors.log
**And** respond with 400 Bad Request
**And** continue processing subsequent events

#### Scenario: Recover from disk space issues
**Given** the system is logging events
**When** disk space becomes critically low (<100MB)
**Then** the backend should stop writing new events to disk
**And** return a warning message in the hook response (e.g., {"warning": "Low disk space, events not persisted"})
**And** the hook script should inject this warning into Claude's context to inform the developer
**And** continue to process hooks without logging

#### Scenario: Handle concurrent hook triggers
**Given** multiple Claude Code instances are running
**When** they trigger hooks simultaneously
**Then** all events should be processed without conflicts
**And** each event should maintain its unique session context
**And** no events should be lost or corrupted

## Non-Functional Requirements

### Performance
- Hook response time must be <100ms for non-blocking operations (logging, monitoring)
- Blocking hooks (user confirmation, input requests, LLM analysis) may take longer and should properly signal Claude to wait
- LLM-based analysis hooks may take 5-30 seconds depending on the complexity of analysis needed
- System must handle 1000+ events per minute without degradation
- Log queries must return results within 2 seconds for up to 1 million events

### Reliability
- Zero event loss during normal operation
- Graceful degradation when backend is unavailable
- Automatic recovery after system restarts

### Usability
- Single command setup (`cage init && cage hooks setup`)
- Clear error messages with actionable remediation steps
- Intuitive CLI commands following Unix conventions

### Compatibility
- Must work on Windows (PowerShell/CMD), macOS, and Linux
- Support Node.js 18+ (LTS versions)
- Handle path separators correctly across platforms

## Definition of Done

Phase 1 is complete when:
1. All acceptance criteria pass automated tests
2. Documentation exists for CLI commands and API endpoints
3. Error scenarios are handled gracefully
4. Cross-platform compatibility is verified (Windows, macOS, Linux)
5. Performance benchmarks meet requirements
6. Code passes all quality checks (no TypeScript `any`, proper error handling)
7. Integration tests verify end-to-end hook flow

## Test Scenarios

### Integration Tests
1. **Full Hook Lifecycle**: Trigger each hook type and verify event is logged correctly
2. **Server Restart**: Verify no events are lost during backend restart
3. **High Load**: Send 1000 events rapidly and verify all are captured
4. **Offline Mode**: Verify hooks don't block when server is down

### Unit Tests
1. **Event Parser**: Validate all hook payload formats
2. **File Writer**: Test append-only behavior and rotation
3. **CLI Commands**: Test each command with various arguments
4. **API Endpoints**: Test each endpoint with valid/invalid data

## Out of Scope for Phase 1

The following features are NOT part of Phase 1:
- Intelligence or rule processing (Phase 2)
- Context injection into Claude (Phase 3)
- Web frontend UI (Phase 4)
- Database storage (future enhancement)
- Multi-user support
- Cloud deployment
- Advanced analytics
- Specification management
- Automatic code quality checks

## Success Metrics

Phase 1 is successful when:
- 100% of Claude Code hook events are captured
- Setup takes less than 2 minutes
- No manual configuration files need editing
- Developers can see what Claude is doing in real-time
- Historical events can be queried for debugging