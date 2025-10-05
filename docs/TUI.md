# CAGE Interactive TUI Documentation

## Overview

CAGE provides a full-screen interactive Terminal User Interface (TUI) built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs). The TUI offers comprehensive event inspection, real-time monitoring, and system management capabilities through an intuitive keyboard-driven interface.

## Launch Interactive Mode

```bash
# Launch interactive TUI (no arguments)
cage

# Launch with debug mode enabled
cage --debug
```

When launched, you'll see:
1. **ASCII Logo** - Colorful CAGE logo with gradient animation (1.5 seconds)
2. **Main Menu** - Full-screen interactive interface with keyboard navigation

## Main Menu

```
┌──────────────────────────────────────────────────────────────────┐
│ CAGE | Code Alignment Guard Engine   AI Dev Assistant   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  > Events Inspector      Browse & analyze events                │
│    Server Management     Start/stop/status                      │
│    Hooks Configuration   Setup & verify hooks                   │
│    Real-time Monitor     Stream live events                     │
│    Statistics Dashboard  View metrics & charts                  │
│    Settings              Configure Cage                         │
│    Debug Console         View debug output                      │
│    Exit                  Return to terminal                     │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ ↑↓ Navigate  ↵ Select  ESC Back  Q Quit  ? Help                │
└──────────────────────────────────────────────────────────────────┘
```

## Navigation Controls

### Universal Keyboard Shortcuts

- **↑/↓ Arrow Keys** - Navigate menu items and lists
- **↵ Enter** - Select highlighted item or action
- **ESC** - Go back to previous view / Exit to terminal (from main menu)
- **Q** - Quick exit (shows confirmation prompt)
- **?** or **H** - Context-sensitive help
- **Tab** - Switch focus between panels (in split views)
- **F** - Open filter menu (in list views)
- **/** - Search within current view
- **R** - Refresh current view

## Features

### 1. Events Inspector

Browse and analyze all captured hook events with advanced filtering and search.

**Features:**
- Paginated event list in reverse chronological order (newest first)
- Filter by event type, date, or session ID
- Full-text search within event content
- Detailed event inspection with tabs (Arguments, Result, Raw Data)

**Special Views:**
- **Edit Tool Results**: View file contents, diffs, and patches
- **Write Tool Results**: See created/updated files with full content
- **Bash Tool Results**: View stdout/stderr with syntax highlighting
- **File Content Viewer**: Syntax-highlighted file display with line numbers
- **Diff Viewer**: Side-by-side or unified diff view

**Keyboard Shortcuts:**
- **F** - Filter events
- **/** - Search events
- **Enter** - View event details
- **C** - Copy event data (JSON, specific fields)
- **PgUp/PgDn** - Navigate pages

### 2. Real-time Monitor

Dedicated full-screen streaming view for monitoring events as they occur.

**Features:**
- Live event stream with newest-first ordering
- Auto-scroll with pause capability
- 1000-event scrollable history buffer
- Event inspection in split-screen view
- Real-time filter and search

**Keyboard Shortcuts:**
- **Space** - Pause/Resume auto-scroll
- **Enter** - Inspect selected event (opens split view)
- **↑↓** - Scroll through event history
- **Home/End** - Jump to oldest/newest event
- **F** - Filter stream by type/tool/session
- **/** - Search within stream
- **M** - Mark event for comparison
- **C** - Compare marked events
- **E** - Export events (current/marked/all)

**Stream View Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│          REAL-TIME EVENT STREAM              [LIVE]          │
├─────────────────────────────────────────────────────────────┤
│ Filter: [All] | Session: [...a10e] | Rate: 12 events/min    │
├─────────────────────────────────────────────────────────────┤
│ 10:45:27.789  PreToolUse    Edit     config.ts:12           │
│ 10:45:28.012  PostToolUse   Edit     ✓ Updated config       │
│ [Events auto-scroll as they arrive]                         │
├─────────────────────────────────────────────────────────────┤
│ Events: 523 | Viewing: Latest | Buffer: 1000 | New: 0       │
├─────────────────────────────────────────────────────────────┤
│ SPACE Pause | ↵ Inspect | F Filter | / Search | Q Back      │
└─────────────────────────────────────────────────────────────┘
```

### 3. Server Management

View and control the CAGE backend server.

**Features:**
- Real-time server status (Running/Stopped)
- Port, PID, uptime, memory usage
- Start/Stop/Restart server
- View recent server logs
- Health check monitoring

**Keyboard Shortcuts:**
- **S** - Start server
- **X** - Stop server (with confirmation)
- **R** - Restart server
- **L** - View server logs

### 4. Hooks Configuration

Manage Claude Code hooks installation and status.

**Features:**
- View installed hooks (9 types)
- Installation status for each hook type
- Configuration file location
- Setup wizard for new installations
- Compatibility check with quality-check hooks

**Hook Types Displayed:**
- PreToolUse, PostToolUse, UserPromptSubmit
- SessionStart, SessionEnd
- Notification, PreCompact
- Stop, SubagentStop

**Keyboard Shortcuts:**
- **S** - Setup hooks (runs installation wizard)
- **V** - Verify hooks configuration
- **R** - Refresh status

### 5. Statistics Dashboard

View event analytics and system metrics.

**Features:**
- Total events count
- Events by type (bar chart)
- Events over time (line graph)
- Most used tools
- Average events per session
- Peak activity periods

**Interactive Charts:**
- Select different time ranges
- Hover for exact values
- Press Enter for detailed breakdown

### 6. Debug Console

Real-time view of all system logging via Winston logger.

**Features:**
- All logger events from CLI, backend, and hooks
- Logs include: debug, info, warn, error levels
- Timestamp, level, component, message, context data
- Stack traces for errors
- Newest-first ordering

**Keyboard Shortcuts:**
- **F** - Cycle log levels (all → DEBUG → INFO → WARN → ERROR → all)
- **C** - Cycle components filter
- **/** - Search within logs
- **R** - Reset all filters
- **E** - Export logs

**Display:**
```
┌─────────────────────────────────────────────────────────────┐
│          DEBUG CONSOLE                [Filter: All]          │
├─────────────────────────────────────────────────────────────┤
│ 10:45:27.123  INFO   HooksController  Hook event received   │
│ 10:45:27.456  DEBUG  EventLogger      Writing to disk       │
│ 10:45:27.789  ERROR  StreamService    Connection failed     │
│ [Logs auto-update via SSE notifications]                    │
├─────────────────────────────────────────────────────────────┤
│ F Filter | C Component | / Search | R Reset | E Export      │
└─────────────────────────────────────────────────────────────┘
```

### 7. Settings

Configure CAGE system settings.

**Features:**
- View/edit cage.config.json values
- Distinguish defaults vs customized settings
- Input validation based on setting type
- Preview of change impact
- Save with confirmation

**Configurable Settings:**
- Server port (default: 3790)
- Log level (debug/info/warn/error)
- Events directory path
- Max event size
- Offline mode settings

### 8. Help System

Context-sensitive help available throughout the TUI.

**Features:**
- **? or H** - Opens help overlay in any view
- Shows keyboard shortcuts relevant to current view
- Brief descriptions of available actions
- Inline tooltips (appear after 2-second pause)

## Architecture

### Shared Component System

All views use a consistent architecture:

```
App
└── ViewManager (manages current view state)
    └── FullScreenLayout (shared wrapper)
        ├── Header (shared, dynamic content)
        ├── Content (view-specific component)
        └── Footer (shared, contextual shortcuts)
```

### State Management

**Zustand Store Pattern:**
- **Singleton Services** update Zustand store
  - `StreamService`: Manages SSE connection, updates server status
  - `HooksStatusService`: Polls hooks status, updates store
- **Components** read ONLY from Zustand (pure reactive)
- **NO Polling in Components**: All real-time updates via SSE notifications

### Real-Time Updates

**SSE Notification Bus Architecture:**
1. Backend emits lightweight notifications (~200 bytes) when data changes
2. Single SSE connection at `/api/events/stream` handles all notification types
3. CLI fetches only NEW data using `?since=timestamp` parameter when notified
4. Zero polling - all updates driven by SSE events

**Notification Types:**
- `event_added` - New hook event logged
- `debug_log_added` - New debug log captured
- `heartbeat` - Keep-alive (every 30 seconds)

### StatusBar (Global)

Real-time system status displayed in header across all views:

```
Server: Running | Hooks: 9/9 active | Events: 247 | Today: 15
```

**Data Sources:**
- Server status from `StreamService` (SSE connection state)
- Hooks status from `HooksStatusService` (polled every 30s)
- Events count from Zustand store (updated via SSE notifications)

## Responsive Layout

### Terminal Requirements

- **Minimum Size**: 80x24 characters
- **Recommended**: 120x40 for optimal experience
- **Unicode Support**: Full Unicode and color support required

### Resize Handling

The TUI automatically adapts to terminal size changes:
- Maintains current view and selection
- Shows scrollbars when content exceeds viewport
- Displays warning if terminal is too small

## Global Ordering Standard

**ALL lists display newest-first:**
- Events in all views (Inspector, Real-time Monitor, filtered lists)
- Debug logs in Debug Console
- Any time-series data with timestamps

**Rationale**: Standard for monitoring/logging tools - users expect newest information at the top.

## Color Themes

**Default Theme:**
- Primary: Cyan/Aqua gradient (#7FDBFF → #01B4C6)
- Success: Green (#00C851)
- Warning: Orange (#FFB300)
- Error: Red (#FF4444)
- Info: Blue (#33B5E5)

**Syntax Highlighting:**
- Code: Monokai theme
- Diffs: Red (removed) / Green (added) / White (context)

## Error Handling

### Server Not Running

When backend server is unavailable:
```
┌─────────────────────────────────────────────────────────────┐
│          EVENTS INSPECTOR                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ⚠️  Server is not running                                  │
│                                                              │
│  Start the server to view events:                           │
│  $ cage start                                                │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Q Back to Menu                                               │
└─────────────────────────────────────────────────────────────┘
```

### Connection Lost

The TUI automatically handles connection recovery:
1. Detects SSE connection drop
2. Attempts automatic reconnection
3. Fetches missed events using `?since` parameter
4. Resumes normal operation

## Testing

The interactive TUI is tested using:

- **ink-testing-library**: Component-level testing
- **Vitest**: Unit tests for state management and services
- **Integration tests**: Full user flow testing

**Test Coverage:**
- Navigation flows
- Data loading and display
- Filter and search functionality
- Event detail rendering
- Real-time update handling
- Error scenarios

## Development

### Running TUI in Development

```bash
# Development mode with hot reload
npm run dev --workspace @cage/cli

# Run specific TUI view directly
npm run dev:inspector
npm run dev:stream
```

### Creating New Views

1. Create view component in `packages/cli/src/features/{feature}/components/`
2. Add view to ViewManager navigation
3. Define keyboard shortcuts in Footer
4. Connect to Zustand store for data
5. Write tests using ink-testing-library

### Debugging TUI

```bash
# Launch with debug mode
cage --debug

# Debug logs available at:
# - Debug Console (in TUI)
# - /api/debug/logs endpoint
# - .cage/debug.log file (if configured)
```

## Best Practices

1. **Use Keyboard Navigation**: The TUI is optimized for keyboard-only use
2. **Monitor with Real-time View**: Use split-screen inspection for debugging
3. **Filter Aggressively**: Large event lists benefit from type/session filters
4. **Export for Analysis**: Use export feature for detailed offline analysis
5. **Check Debug Console**: First place to look when troubleshooting issues

## Troubleshooting

### TUI Won't Launch

- Check Node.js version: `node --version` (requires 18+)
- Ensure cage is installed: `npm run install:local`
- Try with debug flag: `cage --debug`

### Terminal Display Issues

- Verify Unicode support in terminal settings
- Check minimum size (80x24): `tput cols && tput lines`
- Try different terminal emulator if garbled

### Real-time Updates Not Working

- Verify server is running: `cage status`
- Check SSE connection in Debug Console
- Restart both server and TUI

### Events Not Displaying

- Confirm events are being captured: `ls .cage/events/`
- Check server logs: `cage logs server`
- Verify hook installation: `cage hooks status`

## Related Documentation

- [CLI Commands](CLI.md) - Command-line reference
- [Backend API](BACKEND.md) - REST API documentation
- [Hooks System](HOOKS.md) - Claude Code hooks integration
- [Development Guide](DEVELOPMENT.md) - Contributing guidelines
