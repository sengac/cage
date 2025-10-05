# CAGE Hooks System Documentation

## Overview

CAGE integrates with Claude Code through its official Hooks API, allowing observation and interaction with Claude's actions in real-time. The hooks system captures tool usage events, provides contextual guidance, and enables quality enforcement without modifying Claude Code itself.

## What are Claude Code Hooks?

Claude Code hooks are **official extension points** provided by Anthropic that allow external scripts to:

- **Observe** Claude's actions (tool calls, user prompts, notifications)
- **Provide context** that gets injected into Claude's conversation
- **Validate actions** before or after execution
- **Log events** for debugging and analysis

**Key Principle:** Hooks are external scripts that receive JSON input via stdin and can optionally output to stdout (which gets added to Claude's context).

## Hook Types

CAGE implements all 9 available Claude Code hook types:

### 1. PreToolUse

**Triggers:** Before Claude executes a tool (Edit, Bash, Write, etc.)

**Use Cases:**
- Validate tool parameters
- Inject context or guidelines before action
- Block execution if conditions aren't met (future feature)

**Payload Example:**
```json
{
  "session_id": "abc123...",
  "transcript_path": "/path/to/transcript.md",
  "cwd": "/path/to/project",
  "hook_event_name": "PreToolUse",
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/path/to/file.ts",
    "old_string": "console.log('test')",
    "new_string": "logger.info('test')"
  }
}
```

### 2. PostToolUse

**Triggers:** After Claude executes a tool successfully

**Use Cases:**
- Analyze tool results
- Detect quality issues (file too large, anti-patterns)
- Suggest corrections or improvements

**Payload Example:**
```json
{
  "session_id": "abc123...",
  "hook_event_name": "PostToolUse",
  "tool_name": "Edit",
  "tool_input": { /* same as PreToolUse */ },
  "tool_response": {
    "filePath": "/path/to/file.ts",
    "oldString": "console.log('test')",
    "newString": "logger.info('test')",
    "originalFile": "import...\n\nconsole.log('test');\n...",
    "structuredPatch": [ /* diff data */ ],
    "userModified": false,
    "replaceAll": false
  }
}
```

### 3. UserPromptSubmit

**Triggers:** When user submits a prompt to Claude

**Use Cases:**
- Inject project-specific context
- Add coding standards reminders
- Provide architectural guidelines

**Payload Example:**
```json
{
  "session_id": "abc123...",
  "hook_event_name": "UserPromptSubmit",
  "prompt": "Add a login form to the app",
  "cwd": "/path/to/project"
}
```

**Context Injection:** Any output to stdout gets appended to the user's prompt.

### 4. Stop

**Triggers:** When Claude finishes responding (stops generating)

**Use Cases:**
- Final quality checks
- Session summary logging
- Cleanup actions

### 5. SubagentStop

**Triggers:** When a Claude subagent completes its task

**Use Cases:**
- Capture subagent results
- Log subagent execution summary
- Verify subagent output quality

### 6. SessionStart

**Triggers:** At the beginning of a new Claude Code session

**Use Cases:**
- Inject initial context (project overview, standards)
- Load relevant specifications
- Set session-level guidelines

**Context Injection:** Output to stdout provides initial context for the entire session.

### 7. SessionEnd

**Triggers:** When Claude Code session ends

**Use Cases:**
- Session summary logging
- Cleanup temporary data
- Generate session reports

### 8. Notification

**Triggers:** When Claude sends a notification to the user

**Use Cases:**
- Log notification content
- Track user-facing messages
- Monitor warning/error notifications

### 9. PreCompact

**Triggers:** Before Claude compacts the conversation history

**Use Cases:**
- Log compaction events
- Preserve important context before compaction
- Track conversation length

## Hook Installation

### Automatic Installation

```bash
# Navigate to your project
cd /path/to/your/project

# Run setup (creates/updates .claude/settings.json)
cage hooks setup
```

**What it does:**
1. Detects or creates `.claude/` directory in current working directory
2. Backs up existing `.claude/settings.json` (if present)
3. Copies `cage-hook-handler.js` to `.claude/hooks/`
4. Creates individual `.mjs` wrapper scripts for each hook type
5. Updates `.claude/settings.json` with hook configurations
6. Preserves existing hooks (e.g., quality-check.js)

### Manual Installation

If you prefer manual setup:

1. **Create hooks directory:**
```bash
mkdir -p .claude/hooks
```

2. **Copy hook handler:**
```bash
cp node_modules/@cage/hooks/dist/cage-hook-handler.js .claude/hooks/
```

3. **Create wrapper scripts:**

`.claude/hooks/pre-tool-use.mjs`:
```javascript
#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const handler = spawn('node', [join(__dirname, 'cage-hook-handler.js'), 'PreToolUse']);
process.stdin.pipe(handler.stdin);
handler.stdout.pipe(process.stdout);
handler.stderr.pipe(process.stderr);
```

4. **Make executable:**
```bash
chmod +x .claude/hooks/*.mjs
```

5. **Update `.claude/settings.json`:**
```json
{
  "hooks": {
    "PreToolUse": ".claude/hooks/pre-tool-use.mjs",
    "PostToolUse": ".claude/hooks/post-tool-use.mjs",
    "UserPromptSubmit": ".claude/hooks/user-prompt-submit.mjs",
    "Stop": ".claude/hooks/stop.mjs",
    "SubagentStop": ".claude/hooks/subagent-stop.mjs",
    "SessionStart": ".claude/hooks/session-start.mjs",
    "SessionEnd": ".claude/hooks/session-end.mjs",
    "Notification": ".claude/hooks/notification.mjs",
    "PreCompact": ".claude/hooks/pre-compact.mjs"
  }
}
```

## Hook Handler Implementation

### Architecture

```
Claude Code
    | (JSON via stdin)
    v
.claude/hooks/pre-tool-use.mjs (wrapper)
    |
    v
cage-hook-handler.js (main handler)
    |
    v
Transform payload (Claude format -> CAGE format)
    |
    v
HTTP POST -> CAGE Backend (http://localhost:3790)
    |
    v
Backend logs event -> .cage/events/
    |
    v
SSE notification -> Connected clients
```

### cage-hook-handler.js

The main hook handler performs:

1. **Read JSON from stdin** - Receives hook payload from Claude Code
2. **Transform payload** - Maps Claude Code fields to CAGE schema
3. **Add metadata** - Generates event ID, ensures timestamp
4. **Validate** - Checks against Zod schemas
5. **Forward to backend** - HTTP POST to appropriate endpoint
6. **Handle offline** - Logs to `.cage/hooks-offline.log` if server unreachable
7. **Exit cleanly** - Always exits with code 0 (never blocks Claude)

**Key Features:**
- **5-second timeout** for backend requests
- **Graceful offline handling** - Logs locally if server down
- **Non-blocking** - Always returns quickly to not interrupt Claude
- **Error resilient** - Handles malformed input gracefully

### Payload Transformation

Claude Code uses specific field names that must be transformed:

**Claude Code Format:**
```json
{
  "tool_name": "Edit",      // Note: tool_name not tool
  "tool_input": { ... },    // Note: tool_input not arguments
  "tool_response": { ... }  // Note: tool_response (in PostToolUse)
}
```

**CAGE Internal Format:**
```json
{
  "toolName": "Edit",       // Transformed to camelCase
  "toolInput": { ... },
  "toolResponse": { ... },
  "timestamp": "2025-01-24T10:45:23.123Z",  // Added
  "id": "evt_abc123"        // Added (nanoid)
}
```

## Configuration

### Hook Handler Configuration

The handler reads configuration from:

1. **Environment variable** `CAGE_CONFIG_PATH`
2. `./cage.config.json` (current directory)
3. `./.cage/cage.config.json`
4. **Default values**

**Example cage.config.json:**
```json
{
  "port": 3790,
  "host": "localhost",
  "enableOfflineMode": true,
  "offlineLogPath": ".cage/hooks-offline.log"
}
```

### Hook Matchers

Hooks support pattern matching to control when they fire:

```json
{
  "hooks": {
    "PreToolUse": {
      "script": ".claude/hooks/pre-tool-use.mjs",
      "matcher": "*"  // All tools
    },
    "PostToolUse": [
      {
        "script": ".claude/hooks/quality-check.js",
        "matcher": "Edit|MultiEdit|Write"  // Only on file writes
      },
      {
        "script": ".claude/hooks/post-tool-use.mjs",
        "matcher": "*"  // CAGE hook on all tools
      }
    ]
  }
}
```

**Matcher Patterns:**
- `"*"` - Matches all tools
- `"Edit"` - Exact match
- `"Edit|Write"` - Multiple tools (regex)
- `"Edit.*"` - Pattern matching

## Offline Mode

### When Server is Down

If the CAGE backend server is not running:

1. Hook handler attempts connection with 5-second timeout
2. On failure, logs to `.cage/hooks-offline.log`
3. Exits with code 0 (success) to not block Claude

**Offline Log Format:**
```
2025-01-24T10:45:23.123Z [PreToolUse] Failed to connect to Cage backend: ECONNREFUSED
2025-01-24T10:45:27.456Z [PostToolUse] Failed to connect to Cage backend: Timeout
```

### Recovering Offline Logs

```bash
# View offline logs
cage logs offline

# Process offline logs (future feature)
cage events import .cage/hooks-offline.log
```

## Integration with Quality-Check Hooks

CAGE preserves and works alongside existing hooks:

### Hook Execution Order

When multiple hooks exist for the same type:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "script": ".claude/hooks/quality-check.js",
        "matcher": "Edit|MultiEdit|Write"
      },
      {
        "script": ".claude/hooks/post-tool-use.mjs",
        "matcher": "*"
      }
    ]
  }
}
```

**Execution order:**
1. quality-check.js runs first (can block Claude if issues found)
2. CAGE hook runs second (observes and logs)

### Compatibility

CAGE hooks are designed to:
- **Not interfere** with existing hooks
- **Preserve** quality-check blocking behavior
- **Add observability** without changing workflow

## Debugging Hooks

### Enable Debug Output

```bash
# Set debug environment variable
export CAGE_DEBUG=true

# Hooks will log to stderr (visible in Claude Code output)
```

### Test Hook Manually

```bash
# Create test payload
echo '{
  "session_id": "test123",
  "hook_event_name": "PreToolUse",
  "tool_name": "Edit",
  "tool_input": {"file_path": "test.ts"}
}' | node .claude/hooks/cage-hook-handler.js PreToolUse
```

### Check Hook Logs

```bash
# View captured events
cage events tail

# View offline logs
cage logs offline

# Check server logs
cage logs server
```

## Common Issues

### Hooks Not Firing

**Symptoms:** No events appearing in CAGE

**Solutions:**
1. Verify hooks installed: `cage hooks status`
2. Check `.claude/settings.json` exists and contains hooks
3. Ensure hook scripts are executable: `chmod +x .claude/hooks/*.mjs`
4. Verify Claude Code version supports hooks

### Backend Connection Failed

**Symptoms:** All events in `.cage/hooks-offline.log`

**Solutions:**
1. Start CAGE server: `cage start`
2. Verify server running: `cage status`
3. Check port not blocked: `lsof -i :3790`

### Hooks Blocking Claude

**Symptoms:** Claude hangs when using tools

**Solutions:**
1. Check hook scripts don't have infinite loops
2. Verify hooks exit promptly (< 5 seconds)
3. Ensure hooks exit with code 0
4. Review hook error logs

### Duplicate Hooks

**Symptoms:** Events logged twice

**Solutions:**
1. Check for duplicate entries in `.claude/settings.json`
2. Verify only one CAGE hook per type
3. Remove old/test hooks

## Security Considerations

### Local Execution Only

- Hooks run locally on developer machine
- No data sent to external services (except CAGE backend on localhost)
- All event data stays on local filesystem

### Sensitive Data

- Be cautious with hook payloads containing secrets
- Review event logs before sharing
- Consider `.cage/` in `.gitignore`

### Hook Script Safety

- Only install hooks from trusted sources
- Review hook scripts before installation
- CAGE hooks are open source and auditable

## Advanced Usage

### Custom Context Injection

Modify `UserPromptSubmit` hook to inject custom context:

```javascript
// .claude/hooks/user-prompt-submit.mjs
import { readFileSync } from 'fs';

// Read project guidelines
const guidelines = readFileSync('.cage/guidelines.md', 'utf8');

// Output to stdout (gets added to Claude's context)
console.log(`\n\n## Project Guidelines:\n${guidelines}`);

// Then forward to CAGE backend
// ... rest of handler logic
```

### Session-Specific Rules

Use `SessionStart` to inject session-level rules:

```javascript
// .claude/hooks/session-start.mjs
const rules = `
IMPORTANT: For this session:
- All file changes must be under 300 lines
- Use TypeScript strict mode
- No 'any' types allowed
`;

console.log(rules);
```

### Conditional Hook Logic

Implement conditional behavior based on tool or file:

```javascript
// Example: Only log Edit operations on .ts files
if (payload.tool_name === 'Edit' && payload.tool_input.file_path.endsWith('.ts')) {
  // Forward to backend
} else {
  // Skip logging
  process.exit(0);
}
```

## Future Enhancements

Planned hook capabilities:

1. **Blocking Hooks**: Prevent tool execution if validation fails
2. **LLM-Powered Analysis**: Use Claude API to analyze hook events
3. **Automated Corrections**: Suggest fixes based on detected issues
4. **Specification Enforcement**: Validate actions against living specs
5. **Context Enrichment**: Auto-inject relevant context based on task

## Related Documentation

- [CLI Documentation](CLI.md) - Command-line interface
- [Backend API](BACKEND.md) - REST API documentation
- [Interactive TUI](TUI.md) - Terminal user interface
- [Development Guide](DEVELOPMENT.md) - Contributing guidelines

## External Resources

- [Claude Code Hooks Documentation](https://docs.anthropic.com/claude/docs/hooks) (Official)
- [Claude Code SDK](https://github.com/instantlyeasy/claude-code-sdk-ts)
- [CAGE GitHub Repository](https://github.com/sengac/cage)
