# CAGE Backend API Documentation

## Overview

The CAGE backend is built with NestJS and provides a RESTful API with Server-Sent Events (SSE) for real-time updates. It processes Claude Code hook events, stores them in file-based logs, and exposes endpoints for querying and streaming.

## Architecture

### Technology Stack

- **Framework**: NestJS (Node.js/TypeScript)
- **API Documentation**: Swagger/OpenAPI 3.0
- **Real-time Communication**: Server-Sent Events (SSE)
- **Event System**: @nestjs/event-emitter with EventEmitter2
- **Logging**: Winston with in-memory transport
- **Validation**: Zod schemas + class-validator
- **Storage**: File-based append-only logs (JSONL format)

### Core Patterns

**Event-Driven Architecture:**
- Hook events trigger backend processing
- Internal events (`hook.event.added`, `debug.log.added`) broadcast via EventEmitter2
- Controllers listen with `@OnEvent` decorators and emit SSE notifications
- Decoupled notification bus pattern: data layer emits, SSE layer broadcasts

**SSE Notification Bus:**
- Backend emits lightweight notifications (~200 bytes) when data changes
- Single `/api/events/stream` endpoint handles all notification types
- Clients fetch only NEW data using `?since=timestamp` parameter
- Zero polling - all real-time updates driven by SSE

## Base URL

```
http://localhost:3790
```

Default port can be changed via `PORT` environment variable.

## API Documentation

### Interactive Swagger UI

```
http://localhost:3790/api-docs
```

Features:
- Try-it-out functionality for all endpoints
- Monokai syntax highlighting
- Persistent authorization
- Alpha-sorted tags and operations
- Search/filter capabilities

### OpenAPI JSON Specification

```
http://localhost:3790/api-docs-json
```

Raw OpenAPI 3.0 specification for API client generation.

## API Endpoints

### Health Check

#### GET `/health`

System health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "uptime": "2h 15m 32s",
  "timestamp": "2025-01-24T10:45:23.123Z",
  "memory": {
    "used": 45678912,
    "total": 134217728
  }
}
```

### Hook Events

#### POST `/api/claude/hooks/pre-tool-use`

Receive PreToolUse hook events from Claude Code.

**Request Body:**
```json
{
  "session_id": "abc123...",
  "transcript_path": "/path/to/transcript.md",
  "cwd": "/path/to/project",
  "hook_event_name": "PreToolUse",
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/path/to/file.ts",
    "old_string": "old code",
    "new_string": "new code"
  }
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "evt_abc123",
  "timestamp": "2025-01-24T10:45:23.123Z"
}
```

**Other Hook Endpoints:**
- `POST /api/claude/hooks/post-tool-use`
- `POST /api/claude/hooks/user-prompt-submit`
- `POST /api/claude/hooks/stop`
- `POST /api/claude/hooks/subagent-stop`
- `POST /api/claude/hooks/session-start`
- `POST /api/claude/hooks/session-end`
- `POST /api/claude/hooks/notification`
- `POST /api/claude/hooks/pre-compact`

All hook endpoints follow the same request/response pattern.

### Events Management

#### GET `/api/events/list`

Query events with filtering and pagination.

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 10, max: 100)
- `type` (string) - Filter by event type (e.g., "PreToolUse")
- `sessionId` (string) - Filter by session ID
- `from` (ISO date) - Start date filter
- `to` (ISO date) - End date filter
- `since` (ISO timestamp) - Get events after this timestamp (for incremental fetching)

**Response:**
```json
{
  "events": [
    {
      "id": "evt_abc123",
      "timestamp": "2025-01-24T10:45:23.123Z",
      "eventType": "PreToolUse",
      "toolName": "Edit",
      "sessionId": "abc123...",
      "toolInput": { ... },
      "toolResponse": { ... }
    }
  ],
  "pagination": {
    "total": 247,
    "page": 1,
    "limit": 10,
    "pages": 25
  }
}
```

#### GET `/api/events/tail`

Get the most recent events.

**Query Parameters:**
- `count` (number) - Number of events to return (default: 10, max: 100)

**Response:**
```json
{
  "events": [ /* array of event objects */ ],
  "total": 247
}
```

#### GET `/api/events/stats`

Get event statistics.

**Query Parameters:**
- `from` (ISO date) - Optional start date
- `to` (ISO date) - Optional end date

**Response:**
```json
{
  "totalEvents": 247,
  "sessionCount": 12,
  "eventsByType": {
    "PreToolUse": 98,
    "PostToolUse": 98,
    "UserPromptSubmit": 32,
    "Stop": 12,
    "Other": 7
  },
  "mostUsedTools": [
    { "name": "Edit", "count": 45 },
    { "name": "Bash", "count": 32 },
    { "name": "Write", "count": 21 }
  ],
  "averageEventsPerSession": 20.6,
  "peakActivity": {
    "hour": "10:00-11:00",
    "count": 89
  }
}
```

#### GET `/api/events/stream`

Server-Sent Events stream for real-time updates.

**SSE Message Types:**

**1. Connection Established:**
```javascript
event: message
data: {"type":"connected"}
```

**2. Event Added Notification:**
```javascript
event: message
data: {
  "type": "event_added",
  "eventType": "PreToolUse",
  "sessionId": "abc123...",
  "timestamp": "2025-01-24T10:45:23.123Z"
}
```

**3. Debug Log Added Notification:**
```javascript
event: message
data: {
  "type": "debug_log_added",
  "level": "ERROR",
  "component": "HooksController",
  "timestamp": "2025-01-24T10:45:23.456Z"
}
```

**4. Heartbeat (every 30 seconds):**
```javascript
event: message
data: {"type":"heartbeat"}
```

**Client Usage:**
```javascript
const eventSource = new EventSource('http://localhost:3790/api/events/stream');

eventSource.onmessage = (event) => {
  const notification = JSON.parse(event.data);

  if (notification.type === 'event_added') {
    // Fetch new events since timestamp
    fetch(`/api/events/list?since=${notification.timestamp}`)
      .then(res => res.json())
      .then(data => updateUI(data.events));
  }

  if (notification.type === 'debug_log_added') {
    // Fetch new logs since timestamp
    fetch(`/api/debug/logs?since=${notification.timestamp}`)
      .then(res => res.json())
      .then(data => updateDebugConsole(data.logs));
  }
};
```

### Debug Logs

#### GET `/api/debug/logs`

Get Winston logger events.

**Query Parameters:**
- `level` (string) - Filter by log level (DEBUG, INFO, WARN, ERROR)
- `component` (string) - Filter by component name
- `limit` (number) - Max logs to return (default: 100, max: 1000)
- `since` (ISO timestamp) - Get logs after this timestamp (for incremental fetching)

**Response:**
```json
{
  "logs": [
    {
      "id": "log_abc123",
      "timestamp": "2025-01-24T10:45:23.123Z",
      "level": "ERROR",
      "component": "HooksController",
      "message": "Failed to process hook event",
      "context": {
        "error": "Connection timeout",
        "hookType": "PreToolUse"
      },
      "stackTrace": "Error: Connection timeout\n  at ..."
    }
  ],
  "total": 523
}
```

#### POST `/api/debug/logs`

Add a debug log entry (used by CLI for remote logging).

**Request Body:**
```json
{
  "level": "INFO",
  "component": "CLI",
  "message": "User action performed",
  "context": {
    "action": "stream_events",
    "filter": "PreToolUse"
  }
}
```

### Hooks Status

#### GET `/api/hooks/status`

Get hooks installation status.

**Response:**
```json
{
  "installed": true,
  "location": ".claude/settings.json",
  "hookTypes": 9,
  "installedHooks": [
    { "type": "PreToolUse", "active": true },
    { "type": "PostToolUse", "active": true, "additional": ["quality-check.js"] },
    { "type": "UserPromptSubmit", "active": true },
    { "type": "Stop", "active": true },
    { "type": "SubagentStop", "active": true },
    { "type": "SessionStart", "active": true },
    { "type": "SessionEnd", "active": true },
    { "type": "Notification", "active": true },
    { "type": "PreCompact", "active": true }
  ],
  "handlerPath": ".claude/hooks/cage-hook-handler.js",
  "handlerExists": true
}
```

## Data Models

### Event Model

```typescript
interface Event {
  id: string;                    // nanoid
  timestamp: string;             // ISO 8601
  eventType: string;             // PreToolUse, PostToolUse, etc.
  toolName: string;              // Edit, Bash, Write, etc.
  sessionId: string;
  toolInput: Record<string, any>;
  toolResponse?: Record<string, any>;
  error?: string;
  executionTime?: number;        // milliseconds
}
```

### Debug Log Model

```typescript
interface DebugLog {
  id: string;                    // nanoid
  timestamp: string;             // ISO 8601
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  component: string;
  message: string;
  context?: Record<string, unknown>;
  stackTrace?: string;
}
```

## File Storage

### Event Logs

Events are stored in append-only JSONL files:

```
.cage/events/
    2025-01-24/
       events.jsonl
    2025-01-25/
       events.jsonl
   ...
```

**Format:** One JSON object per line
```json
{"id":"evt_abc","timestamp":"2025-01-24T10:45:23.123Z","eventType":"PreToolUse",...}
{"id":"evt_def","timestamp":"2025-01-24T10:45:24.456Z","eventType":"PostToolUse",...}
```

### Log Rotation

- Daily rotation: New directory created each day
- No automatic cleanup (manual management required)
- Easy to archive/compress old logs

## Error Handling

### Standard Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": {
    "field": "tool_name",
    "issue": "Required field missing"
  }
}
```

### HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Server not ready

## Performance Considerations

### Rate Limiting

No built-in rate limiting (single developer use case).

### Response Time

- Hook endpoints: < 100ms (non-blocking)
- Query endpoints: < 2s for up to 1M events
- SSE: Real-time (push on event)

### Scalability

- Designed for single developer use
- No concurrent user handling
- File-based storage (can migrate to database later)

## Security

### Local Development Only

- No authentication required (localhost only)
- No HTTPS (local traffic)
- CORS enabled for localhost

### Production Considerations (Future)

When deploying beyond localhost:
- Add JWT authentication
- Enable HTTPS
- Implement rate limiting
- Add CORS restrictions
- Secure sensitive endpoints

## Configuration

### Environment Variables

```bash
# Server port
PORT=3790

# Node environment
NODE_ENV=development

# Log level
LOG_LEVEL=info

# Events directory
EVENTS_DIR=.cage/events

# Max event size (bytes)
MAX_EVENT_SIZE=1048576
```

### NestJS Configuration

Module configuration in `app.module.ts`:

```typescript
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    // ... other modules
  ],
  // ...
})
```

## Development

### Running Backend Locally

```bash
# Development mode with hot reload
npm run dev --workspace @cage/backend

# Production build
npm run build --workspace @cage/backend
npm run start:prod --workspace @cage/backend
```

### Testing

```bash
# Unit tests
npm run test --workspace @cage/backend

# E2E tests
npm run test:e2e --workspace @cage/backend

# Test coverage
npm run test:cov --workspace @cage/backend
```

### Debugging

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev --workspace @cage/backend

# Inspect in Chrome DevTools
node --inspect dist/main.js
```

## API Client Example

### JavaScript/TypeScript

```typescript
// Fetch events
const response = await fetch('http://localhost:3790/api/events/list?limit=50');
const data = await response.json();

// Stream events via SSE
const eventSource = new EventSource('http://localhost:3790/api/events/stream');
eventSource.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log('Notification:', notification);
};

// Post hook event
await fetch('http://localhost:3790/api/claude/hooks/pre-tool-use', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: 'abc123',
    tool_name: 'Edit',
    tool_input: { /* ... */ }
  })
});
```

### cURL Examples

```bash
# Health check
curl http://localhost:3790/health

# Get events
curl http://localhost:3790/api/events/list?limit=10

# Get statistics
curl http://localhost:3790/api/events/stats

# Stream events (SSE)
curl -N http://localhost:3790/api/events/stream

# Post hook event
curl -X POST http://localhost:3790/api/claude/hooks/pre-tool-use \
  -H "Content-Type: application/json" \
  -d '{"session_id":"abc","tool_name":"Edit","tool_input":{}}'
```

## Troubleshooting

### Server Won't Start

- Check port availability: `lsof -i :3790`
- Verify Node.js version: `node --version` (requires 18+)
- Check for errors in logs

### SSE Connection Fails

- Verify server is running: `curl http://localhost:3790/health`
- Check firewall settings
- Ensure client properly handles reconnection

### Events Not Being Logged

- Verify `.cage/events/` directory exists and is writable
- Check disk space
- Review error logs: `cage logs server`

### High Memory Usage

- Winston in-memory transport stores logs (configurable limit)
- Consider log rotation/cleanup for long-running servers

## Related Documentation

- [CLI Documentation](CLI.md) - Command-line interface
- [Interactive TUI](TUI.md) - Terminal user interface
- [Hooks System](HOOKS.md) - Claude Code hooks integration
- [Development Guide](DEVELOPMENT.md) - Contributing guidelines
