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

## Critical Implementation Note: Claude Code Hook Payloads

**IMPORTANT**: Claude Code sends hook events with specific field names that MUST be used:

### PreToolUse Payload Format:

```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "hook_event_name": "PreToolUse",
  "tool_name": "Read", // NOT "tool"
  "tool_input": {
    // NOT "arguments"
    "file_path": "/path/to/file.txt"
  }
}
```

### PostToolUse Payload Format:

```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "hook_event_name": "PostToolUse",
  "tool_name": "Write", // NOT "tool"
  "tool_input": {
    // NOT "arguments"
    "file_path": "/path/to/file.txt",
    "content": "content"
  },
  "tool_response": {
    // Tool-specific response
  }
}
```

### Common Tool Names:

- `"Read"`, `"Write"`, `"Edit"`, `"MultiEdit"`, `"Bash"`, `"Grep"`, `"Glob"`, `"WebSearch"`, `"WebFetch"`

**ALL IMPLEMENTATIONS MUST USE THESE EXACT FIELD NAMES**

## Acceptance Criteria

### Feature: CLI Installation and Setup

#### Scenario: Install Cage for development

**Given** I have Node.js 18+ and npm installed
**And** I have cloned the Cage repository
**When** I run `npm install` in the project root
**And** I run `npm run build`
**And** I run `./scripts/install-local.sh`
**Then** the `cage` command should be available in my terminal
**And** running `cage --version` should display the current version (0.0.1)
**And** the command should work from any directory
**And** hook handler should be built and available in packages/hooks/dist/

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
**And** copy the cage-hook-handler.js to .claude/hooks/ directory
**And** create individual .mjs wrapper scripts for each hook type in .claude/hooks/
**And** display "Hooks configured in .claude/ for: PreToolUse, PostToolUse, UserPromptSubmit, Notification, Stop, SubagentStop, SessionStart, SessionEnd, PreCompact"
**And** the hook handler should be executable and process stdin correctly

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
**And** the Cage PostToolUse hook should be added with a different matcher (e.g., "\*")
**And** the quality-check hook should execute before Cage hooks

#### Scenario: Handle different hook configuration formats

**Given** Claude Code supports different hook configuration formats
**When** merging hooks
**Then** the installer should preserve the existing format style
**And** add Cage hooks using the same format

#### Scenario: Backup original settings with timestamp

**Given** any existing `.claude/settings.json` file
**When** I run `cage hooks setup`
**Then** a backup file should be created with timestamp (e.g., `.claude/settings.json.backup.2025-09-18T02-42-49`)
**And** the user should be informed about the backup location
**And** the original file should be preserved exactly
**And** multiple backups should be created if run multiple times

#### Scenario: Handle conflicting matchers

**Given** an existing hook with matcher "_" for a hook type
**And** Cage wants to add a hook with matcher "_" for the same hook type
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
**And** the health check endpoint should be available at http://localhost:3790/health
**And** the server should respond to health checks with 200 OK and uptime information

#### Scenario: Receive PreToolUse hook event

**Given** the Cage backend server is running
**When** Claude Code triggers a PreToolUse hook
**Then** the backend should receive the event via HTTP POST to /api/claude/hooks/pre-tool-use
**And** respond with 200 OK within 100ms
**And** log the event to the file system

#### Scenario: Receive PostToolUse hook event

**Given** the Cage backend server is running
**When** Claude Code triggers a PostToolUse hook
**Then** the backend should receive the event via HTTP POST to /api/claude/hooks/post-tool-use
**And** respond with 200 OK within 100ms
**And** log the event with tool results to the file system

#### Scenario: Receive UserPromptSubmit hook event

**Given** the Cage backend server is running
**When** a user submits a prompt to Claude Code
**Then** the backend should receive the event via HTTP POST to /api/claude/hooks/user-prompt-submit
**And** respond with 200 OK within 100ms
**And** log the user prompt and context to the file system

#### Scenario: Receive Stop hook event

**Given** the Cage backend server is running
**When** Claude Code completes a task or is interrupted
**Then** the backend should receive the event via HTTP POST to /api/claude/hooks/stop
**And** respond with 200 OK within 100ms
**And** log the final state and any cleanup actions to the file system

#### Scenario: Receive SubagentStop hook event

**Given** the Cage backend server is running
**When** a Claude Code subagent completes its task
**Then** the backend should receive the event via HTTP POST to /api/claude/hooks/subagent-stop
**And** respond with 200 OK within 100ms
**And** log the subagent results and execution summary to the file system

#### Scenario: Receive SessionStart hook event

**Given** the Cage backend server is running
**When** a new Claude Code session starts
**Then** the backend should receive the event via HTTP POST to /api/claude/hooks/session-start
**And** respond with 200 OK within 100ms
**And** optionally return context to inject into the session

#### Scenario: Receive SessionEnd hook event

**Given** the Cage backend server is running
**When** a Claude Code session ends
**Then** the backend should receive the event via HTTP POST to /api/claude/hooks/session-end
**And** respond with 200 OK within 100ms
**And** log session summary and cleanup

#### Scenario: Receive Notification hook event

**Given** the Cage backend server is running
**When** Claude Code sends a notification
**Then** the backend should receive the event via HTTP POST to /api/claude/hooks/notification
**And** respond with 200 OK within 100ms
**And** log the notification content

#### Scenario: Receive PreCompact hook event

**Given** the Cage backend server is running
**When** Claude Code is about to compact the conversation
**Then** the backend should receive the event via HTTP POST to /api/claude/hooks/pre-compact
**And** respond with 200 OK within 100ms
**And** log the compaction event

#### Scenario: Handle hook when server is down

**Given** the Cage backend server is NOT running
**When** Claude Code triggers any hook
**Then** the hook handler should attempt to connect with 5 second timeout
**And** log "Failed to connect to Cage backend" to .cage/hooks-offline.log
**And** include timestamp and error details in offline log
**And** Claude Code should continue operating normally
**And** not block or delay Claude's execution
**And** the hook should always exit with code 0

### Feature: Centralized API Client

#### Scenario: All server communication uses centralized client

**Given** any component needs to communicate with the CAGE server
**When** making HTTP requests or establishing SSE connections
**Then** it MUST use the centralized CageApiClient
**And** NEVER hardcode URLs or server addresses
**And** NEVER access the filesystem directly for data that should come from the server
**And** NEVER create separate fetch() calls or SSE connections outside the client

#### Scenario: API client handles configuration

**Given** the CageApiClient is initialized
**When** it needs server connection details
**Then** it should read from cage.config.json
**And** fall back to defaults (localhost:3790) if config is missing
**And** allow runtime configuration updates
**And** maintain a singleton instance for the entire application

#### Scenario: API client provides typed interfaces

**Given** a component uses the CageApiClient
**When** making API calls
**Then** all requests and responses should be fully typed with TypeScript
**And** use consistent error handling patterns
**And** return ApiResponse<T> wrappers for all operations
**And** handle network failures gracefully

#### Scenario: SSE streaming through API client

**Given** a component needs real-time event updates
**When** establishing an SSE connection
**Then** it MUST use the CageApiClient.streamEvents() method
**And** NOT create SSEConnection instances directly
**And** handle reconnection through the centralized client
**And** properly clean up connections when done

### Feature: Backend API Endpoints

#### Scenario: Query events via API

**Given** events have been logged to the system
**When** I send GET request to `/api/events/list`
**Then** I should receive a paginated list of events
**And** the response should include total count and pagination metadata
**And** support query parameters: page, limit, date, sessionId
**And** events should be returned in chronological order

#### Scenario: Get event statistics via API

**Given** events have been logged
**When** I send GET request to `/api/events/stats`
**Then** I should receive statistics including:

- Total events by type
- Events by date
- Session counts
- Average events per session
  **And** support optional date parameter for filtering

#### Scenario: Tail events via API

**Given** events have been logged
**When** I send GET request to `/api/events/tail?count=50`
**Then** I should receive the most recent 50 events
**And** default count should be 10 if not specified
**And** events should be in chronological order

#### Scenario: Stream events via Server-Sent Events

**Given** the backend server is running
**When** I connect to `/api/events/stream`
**Then** I should receive a Server-Sent Events stream
**And** new events should be broadcast to all connected clients
**And** the connection should remain open until client disconnects
**And** support heartbeat to maintain connection

#### Scenario: Health check endpoint

**Given** the backend server is running
**When** I send GET request to `/health`
**Then** I should receive 200 OK status
**And** response should include server uptime
**And** response should include memory usage information

#### Scenario: OpenAPI documentation

**Given** the backend server is running
**When** I navigate to `/api-docs`
**Then** I should see Swagger UI documentation
**And** all endpoints should be documented with schemas
**And** I should be able to test endpoints directly from the UI

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
  - UserPromptSubmit: ✓
  - SessionStart: ✓
  - SessionEnd: ✓
  - Notification: ✓
  - PreCompact: ✓
  - Stop: ✓
  - SubagentStop: ✓
```

**And** detect and display existing quality-check hooks
**And** show if cage-hook-handler.js is present in .claude/hooks/

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

### Feature: Event Logging Implementation Details

#### Scenario: Backend validates hook schemas with Zod

**Given** the backend receives a hook event
**When** processing the event
**Then** it should validate the payload against the appropriate Zod schema
**And** reject events missing required fields (like timestamp)
**And** return validation errors in response for debugging
**And** still return 200 OK to not block Claude Code

#### Scenario: Backend writes events to correct working directory

**Given** the backend server is running from any directory
**When** processing hook events
**Then** it should write events to {process.cwd()}/.cage/events/{date}/events.jsonl
**And** create directory structure if it doesn't exist
**And** use TEST_BASE_DIR environment variable if running in test mode

#### Scenario: Event ID generation with nanoid

**Given** the backend processes any hook event
**When** logging the event
**Then** it should generate a unique ID using nanoid
**And** include the ID in the logged event data
**And** the ID should be returned in API responses

### Feature: File-Based Event Logging

#### Scenario: Log event with complete data

**Given** the backend receives a hook event
**When** the event is processed
**Then** an entry should be appended to .cage/events/{date}/events.jsonl
**And** the entry should contain: timestamp, eventType, toolName, toolInput, sessionId
**And** include additional fields based on hook type (result, error, etc.)
**And** the file should use append-only mode (no overwrites)
**And** each line should be valid JSON (JSONL format)
**And** events from the same day should be in the same date directory

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
**Then** it should connect to the backend SSE endpoint at /api/events/stream
**And** display "Streaming events..." when connected
**And** show live events as they occur in real-time
**And** each event should display: timestamp, type, tool name, and session ID
**And** the display should use color coding for different event types
**And** gracefully handle connection failures with error messages
**And** close SSE connection when command is terminated

#### Scenario: Filter streamed events by type

**Given** I am streaming events
**When** I run `cage events stream --filter PreToolUse`
**Then** the filter should be applied client-side to incoming SSE events
**And** I should only see events containing "PreToolUse" (case-insensitive)
**And** other event types should be hidden from display
**And** the filter should persist until I stop streaming
**And** display should show "Streaming events (filtered: PreToolUse)..."

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

### Feature: Hook Handler System

#### Scenario: Process hook events through handler

**Given** a hook is triggered by Claude Code
**When** the cage-hook-handler.js receives stdin input
**Then** it should parse the JSON payload
**And** map Claude Code fields to Cage schema (e.g., tool → toolName)
**And** generate sessionId if not provided by Claude Code
**And** ensure timestamp field is always present for backend validation
**And** validate the transformed data against Zod schemas
**And** forward the event to the backend server via HTTP POST
**And** always exit with code 0 to not block Claude
**And** handle 5-second timeout for backend requests

#### Scenario: Handle malformed hook input

**Given** the hook handler receives invalid JSON on stdin
**When** parsing the input
**Then** it should treat the input as raw text (fallback behavior)
**And** log the raw input to .cage/raw-hooks.log for debugging
**And** still attempt to forward to backend
**And** exit with code 0 to not block Claude Code

#### Scenario: Handle backend connection failure

**Given** the hook handler cannot connect to backend
**When** the HTTP request fails or times out
**Then** it should log to .cage/hooks-offline.log in text format
**And** log entry should include timestamp, hook type, and error message
**And** log format should be: "YYYY-MM-DDTHH:mm:ss.sssZ [HookType] Failed to connect to Cage backend: error message"
**And** exit with code 0 to not block Claude Code

#### Scenario: Configure hook handler via environment

**Given** the hook handler is executed
**When** it needs configuration
**Then** it should read from these sources in order:

1. Environment variable CAGE_CONFIG_PATH
2. ./cage.config.json in current directory
3. ./.cage/cage.config.json
4. Default configuration values
   **And** merge configuration appropriately

#### Scenario: Support multiple Claude settings formats

**Given** different Claude Code hook configuration formats
**When** installing hooks
**Then** the installer should support:

- String format: "path/to/script.js"
- Object format: {"script": "path", "matcher": "pattern"}
- Array format: [{"script": "path1"}, {"script": "path2"}]
  **And** preserve the existing format when merging
  **And** add Cage hooks in the same format

### Feature: Quality Assurance Integration

#### Scenario: Preserve quality-check hooks

**Given** existing quality-check hooks in PostToolUse
**When** installing Cage hooks
**Then** quality-check hooks should be preserved
**And** execute before Cage hooks
**And** both hooks should be listed in status output
**And** quality failures should still block Claude operations

#### Scenario: Detect quality-check configuration

**Given** I run `cage status`
**When** quality-check hooks are present
**Then** they should be detected and displayed
**And** show their matcher patterns
**And** indicate they work alongside Cage hooks

### Feature: Testing Infrastructure

#### Scenario: Run comprehensive test suite

**Given** the Cage project
**When** I run `npm test`
**Then** all packages should be tested using Vitest
**And** tests should include unit tests for all components
**And** integration tests for hook flows
**And** acceptance tests for backend endpoints
**And** CLI tests using Ink testing library
**And** browser tests using @vitest/browser with Playwright

#### Scenario: Validate hook schemas

**Given** hook events are received
**When** processing through the system
**Then** all events should be validated against Zod schemas
**And** invalid events should be rejected with clear errors
**And** schema validation should cover all 9 hook types

#### Scenario: Test cross-platform compatibility

**Given** the Cage system
**When** tested on different platforms
**Then** it should work on Windows (PowerShell/CMD)
**And** work on macOS with correct paths
**And** work on Linux distributions
**And** handle path separators correctly across platforms

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

#### Scenario: Generate unique event IDs

**Given** the backend receives hook events
**When** processing each event
**Then** each event should be assigned a unique ID using nanoid
**And** the ID should be included in the logged event data
**And** the ID should be returned in API responses

#### Scenario: Track session context

**Given** Claude Code is running with a session ID
**When** hooks are triggered
**Then** all events should include the session ID
**And** events from the same session should be linkable
**And** session boundaries should be clear in the logs

#### Scenario: Enforce event size limits

**Given** a hook event with large tool_input or tool_response
**When** the event size exceeds 1MB (configurable limit)
**Then** the event should be truncated to fit the limit
**And** a warning should be logged about truncation
**And** the truncated event should still be processed

#### Scenario: Raw hook logging for debugging

**Given** debug mode is enabled
**When** hook events are received
**Then** raw hook data should be logged to .cage/raw-hooks.log
**And** include timestamp and hook type
**And** preserve original Claude Code format before transformation

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
2. Documentation exists for CLI commands and API endpoints (Swagger docs)
3. Error scenarios are handled gracefully with comprehensive offline logging
4. Cross-platform compatibility is verified (Windows, macOS, Linux)
5. Performance benchmarks meet requirements (<100ms hook response)
6. Code passes all quality checks (no TypeScript `any`, proper error handling)
7. Integration tests verify end-to-end hook flow for all 9 hook types
8. Quality-check hook preservation works correctly
9. Hook handler processes all Claude Code formats correctly
10. Event logging, querying, and statistics work reliably
11. Server management (start/stop/status) works on all platforms
12. Backup and configuration merging works safely

## Test Scenarios

### Integration Tests

1. **Full Hook Lifecycle**: Trigger each hook type and verify event is logged correctly
2. **Server Restart**: Verify no events are lost during backend restart
3. **High Load**: Send 1000 events rapidly and verify all are captured
4. **Offline Mode**: Verify hooks don't block when server is down

### Unit Tests

1. **Event Parser**: Validate hook payloads with tool_name, tool_input, session_id fields
2. **File Writer**: Test append-only behavior and rotation
3. **CLI Commands**: Test each command with various arguments
4. **API Endpoints**: Test each endpoint with valid/invalid data

### Feature: Configuration Management

#### Scenario: Default configuration creation

**Given** I run `cage init`
**When** creating the cage.config.json
**Then** it should include default values:

- port: 3790
- host: "localhost"
- logLevel: "info"
- eventsDir: ".cage/events"
- maxEventSize: 1048576 (1MB)
- enableMetrics: false
- enableOfflineMode: true
- offlineLogPath: ".cage/hooks-offline.log"
  **And** the configuration should be valid JSON
  **And** all paths should be relative to project root

#### Scenario: Override configuration values

**Given** a cage.config.json exists
**When** I modify configuration values
**Then** the system should use the modified values
**And** validate configuration on startup
**And** provide clear error messages for invalid config

#### Scenario: Environment variable support

**Given** configuration needs to be overridden
**When** environment variables are set (e.g., CAGE_PORT=3791)
**Then** they should take precedence over config file
**And** command line arguments should take highest precedence

### Feature: Real Event Integration Verification

#### Scenario: End-to-end event flow validation

**Given** Cage is fully set up with hooks and backend running
**When** Claude Code executes any tool (Read, Write, Edit, etc.)
**Then** the hook should trigger and forward event to backend
**And** the backend should log the event to filesystem
**And** cage events list should show the logged event
**And** cage events tail should display the recent event
**And** cage events stream should broadcast the event via SSE (if connected)

#### Scenario: CLI commands work with actual logged data

**Given** events have been logged by the backend
**When** I run cage events commands
**Then** cage events list should show real statistics (not "Total events: 0")
**And** cage events tail should show actual recent events (not "No events found")
**And** cage events stream should connect to real SSE (not show mock events)
**And** all commands should respect custom eventsDir configuration

## Out of Scope for Phase 1

The following features are NOT part of Phase 1:

- Intelligence or rule processing (Phase 2)
- Context injection into Claude (Phase 3)
- Web frontend UI (Phase 4 - placeholder exists)
- Database storage (future enhancement)
- Multi-user support
- Cloud deployment
- Advanced analytics beyond basic statistics
- Specification management
- Advanced automatic code quality checks (basic quality-check integration exists)
- Global npm package publishing (development installation only)

## Success Metrics

Phase 1 is successful when:

- 100% of Claude Code hook events are captured
- Setup takes less than 2 minutes
- No manual configuration files need editing
- Developers can see what Claude is doing in real-time
- Historical events can be queried for debugging
