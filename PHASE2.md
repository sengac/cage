# Phase 2: Interactive CLI & Event Inspector - Acceptance Criteria

## Overview

Phase 2 enhances the Cage CLI with a full-screen interactive Terminal User Interface (TUI) that provides comprehensive event inspection, real-time monitoring, and system management capabilities. The interactive mode launches when running `cage` without arguments, while preserving all existing command-line functionality.

## User Stories

### Story 1: Developer Launches Interactive Mode

**As a** developer using Cage
**I want to** launch an interactive full-screen interface by typing `cage`
**So that** I can navigate all Cage features visually without remembering command syntax

### Story 2: Developer Inspects Event Details

**As a** developer debugging Claude's behavior
**I want to** view complete event data including file contents and command outputs
**So that** I can understand exactly what Claude did and why

### Story 3: Developer Monitors Events in Real-Time

**As a** developer working with Claude Code
**I want to** see events streaming in real-time within the interactive interface
**So that** I can monitor Claude's actions as they happen

### Story 4: Developer Navigates with Keyboard

**As a** developer preferring keyboard navigation
**I want to** use arrow keys, Enter, and Escape for all navigation
**So that** I can work efficiently without using the mouse

### Story 5: Developer Uses Debug Mode

**As a** developer troubleshooting issues
**I want to** enable debug mode with enhanced output
**So that** I can see detailed internal operations and diagnose problems

## Interactive TUI Architecture

### Core Design Principles

**CRITICAL: Global Ordering Standard**

ALL lists across the entire application MUST display items in **newest-first** order:
- Events in all views (Inspector, Real-time Monitor, filtered lists)
- Debug logs in Debug Console
- Any time-series data with timestamps
- **Rationale**: Standard for monitoring/logging tools, users expect newest information at the top

**CRITICAL: Centralized Logging via Winston**

ALL components (frontend CLI and backend) MUST log to the backend Winston logger:
- **NEVER use `silent: true`** on Logger instances
- **NEVER use `console.log/error/warn/info/debug`** directly
- **ALL logs must go through Logger class** which sends to Winston transport
- **Frontend logs appear in backend debug logs** for unified debugging
- **Rationale**: Centralized logging enables debugging across distributed components, all logs viewable via Debug Console or `/api/debug/logs` endpoint

### Shared Component Architecture

The interactive TUI must use a consistent shared component architecture where:

- A centralized `FullScreenLayout` component wraps all views
- A shared `Header` component displays title, subtitle, and status information
- A shared `Footer` component shows contextual keyboard shortcuts
- A view controller manages the current view state and navigation
- Individual views focus only on their content, not layout or navigation

#### Component Hierarchy

```
App
├── ViewManager (manages current view state)
│   └── FullScreenLayout (shared wrapper)
│       ├── Header (shared, dynamic content)
│       ├── Content (view-specific component)
│       └── Footer (shared, contextual shortcuts)
```

### Main Menu Structure

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

### Events Inspector View

```
┌─────────────────────────────────────────────────┐
│           EVENTS INSPECTOR                       │
├─────────────────────────────────────────────────┤
│ Filters: [All Types ▼] [Today ▼] [Session: All ▼]│
├─────────────────────────────────────────────────┤
│ Time     Type         Tool      Session          │
├─────────────────────────────────────────────────┤
│ 10:45:23 PreToolUse   Edit     ...a10e [>]      │
│ 10:45:24 PostToolUse  Edit     ...a10e [>]      │
│ 10:45:30 PreToolUse   Bash     ...a10e [>]      │
│ 10:45:31 PostToolUse  Bash     ...a10e [>]      │
│ 10:46:00 PreToolUse   Write    ...a10e [>]      │
├─────────────────────────────────────────────────┤
│ Page 1/10  Total: 247 events  Filtered: 247     │
├─────────────────────────────────────────────────┤
│ ↵ View Details  F Filter  / Search  R Refresh   │
└─────────────────────────────────────────────────┘
```

### Event Detail View

```
┌─────────────────────────────────────────────────┐
│          EVENT DETAILS                           │
├─────────────────────────────────────────────────┤
│ Type: PostToolUse                                │
│ Tool: Edit                                       │
│ Time: 2025-09-18T10:45:24.825Z                  │
│ Session: 3e57ff46-852b-469b-9dc9-f5e7de34a10e   │
├─────────────────────────────────────────────────┤
│ [Arguments] [Result] [Raw Data]                  │
├─────────────────────────────────────────────────┤
│ Result:                                          │
│ ┌───────────────────────────────────────────┐   │
│ │ filePath: /Users/cage/src/index.ts       │   │
│ │ oldString: "console.log('test')"          │   │
│ │ newString: "logger.info('test')"          │   │
│ │ originalFile: [View Full Content >]       │   │
│ │ structuredPatch: [View Diff >]            │   │
│ │ userModified: false                       │   │
│ │ replaceAll: false                         │   │
│ └───────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│ ↵ Expand  TAB Switch Tabs  C Copy  ESC Back     │
└─────────────────────────────────────────────────┘
```

### File Content Viewer (Sub-window)

```
┌─────────────────────────────────────────────────┐
│      ORIGINAL FILE CONTENT                       │
├─────────────────────────────────────────────────┤
│ /Users/cage/src/index.ts                         │
├─────────────────────────────────────────────────┤
│   1 │ import { Logger } from './logger';        │
│   2 │                                            │
│   3 │ export function main() {                   │
│   4 │   console.log('test');  // <- changed     │
│   5 │   return 0;                               │
│   6 │ }                                          │
│     │                                            │
│     │ [Lines 1-6 of 6]                          │
├─────────────────────────────────────────────────┤
│ ↑↓ Scroll  PgUp/PgDn Page  Home/End  ESC Close  │
└─────────────────────────────────────────────────┘
```

## Acceptance Criteria

### Feature: Shared Component System

#### Scenario: Shared header displays consistent information

**Given** I am in any view of the interactive TUI
**When** the view is rendered
**Then** a shared Header component should display at the top
**And** show "CAGE | [Current View Name]" as the title
**And** optionally show a subtitle or status on the right
**And** maintain consistent height (minHeight: 3) across all views
**And** use consistent styling (borderStyle: round, theme colors)

#### Scenario: StatusBar displays real-time system status from Zustand

**Given** I am in any view of the interactive TUI
**When** the StatusBar component renders
**Then** it MUST read ALL state from Zustand store ONLY
**And** it MUST NOT use any polling (setInterval/setTimeout)
**And** it MUST NOT make any direct API calls
**And** it MUST display server status (running/stopped/unknown)
**And** it MUST display hooks status (X/Y active)
**And** it MUST display total events count
**And** it MUST display today's events count
**And** all status updates MUST come from singleton background services
**And** status MUST update in real-time when Zustand state changes

#### Scenario: StreamService singleton updates server status in Zustand

**Given** the CAGE CLI application starts
**When** StreamService.getInstance().connect() is called
**Then** it MUST establish ONE SSE connection to /api/events/stream
**And** when SSE connection succeeds it MUST call store.setStreamingStatus(true)
**And** setStreamingStatus(true) MUST set serverStatus = 'running' in Zustand
**And** when SSE connection fails it MUST call store.setStreamingStatus(false)
**And** when SSE receives event_added notification it MUST call store.setLastEventTimestamp()
**And** setLastEventTimestamp() MUST trigger store.fetchLatestEvents()
**And** StreamService MUST be a singleton (only ONE instance app-wide)
**And** StreamService MUST NOT be created per-component

#### Scenario: HooksStatusService singleton updates hooks status in Zustand

**Given** the CAGE CLI application starts
**When** HooksStatusService.getInstance().start() is called
**Then** it MUST poll /api/hooks/status every 30 seconds
**And** it MUST call store.refreshHooksStatus() on each poll
**And** refreshHooksStatus() MUST fetch from API and update hooksStatus in Zustand
**And** HooksStatusService MUST be a singleton (only ONE instance app-wide)
**And** HooksStatusService MUST NOT be created per-component
**And** polling MUST only happen in this service, NOT in components

#### Scenario: Server status determined by SSE connection, not health endpoint

**Given** the StreamService is managing the SSE connection
**When** the SSE connection is established successfully
**Then** serverStatus MUST be set to 'running' (NO separate health check needed)
**And** the SSE connection itself IS the health indicator
**And** NO component should poll /health endpoint for status
**And** NO component should use setInterval to check server status
**And** serverStatus changes ONLY when SSE connection state changes

#### Scenario: Shared footer shows contextual shortcuts

**Given** I am in any view of the interactive TUI
**When** the view is rendered
**Then** a shared Footer component should display at the bottom
**And** show keyboard shortcuts relevant to the current view
**And** update dynamically based on the current view context
**And** maintain consistent styling (borderStyle: single)

#### Scenario: View manager controls navigation

**Given** I am using the interactive TUI
**When** I navigate between different views
**Then** a ViewManager should track the current view state
**And** provide the current view's metadata to shared components
**And** handle navigation transitions smoothly
**And** maintain a navigation stack for back functionality

#### Scenario: Individual views focus on content only

**Given** a developer is implementing a new view
**When** they create the view component
**Then** they should only implement the content area
**And** not duplicate header/footer code
**And** receive navigation callbacks from the ViewManager
**And** provide metadata (title, shortcuts) to the shared components

### Feature: Server API Data Access

#### Scenario: All data must come from server API

**Given** I am using any view that displays event or debug data
**When** the view needs to access event data, debug logs, or any server-managed information
**Then** it MUST fetch data from the server API endpoints
**And** NEVER read directly from the filesystem (e.g., .cage/events directory)
**And** NEVER use mock or test data in production
**And** NEVER fallback to filesystem access if the server is unavailable

#### Scenario: Server not running shows warning

**Given** the CAGE server is not running
**When** I navigate to any view that requires server data (Events Inspector, Debug Console, Stream View, etc.)
**Then** the view should display "Server is not running"
**And** show a message "Start the server to view [data type]"
**And** NOT display any cached, mock, or filesystem data
**And** NOT attempt to read from .cage directory directly

#### Scenario: Test data isolation

**Given** test data generation scripts exist
**When** they generate mock event data
**Then** they MUST write to a temporary directory (e.g., /tmp/cage-test-*)
**And** NEVER write to the project's .cage directory
**And** NEVER pollute the production environment
**And** clean up all test data after tests complete

### Feature: Interactive Mode Launch

#### Scenario: Launch interactive mode with no arguments

**Given** I have Cage installed and configured
**When** I run `cage` without any arguments
**Then** a colorful ASCII art "CAGE" logo should appear briefly (1-2 seconds)
**And** the logo should use gradient colors (cyan to blue or orange to red)
**And** then transition to the interactive TUI in full-screen mode
**And** display the main menu with all available options
**And** show the current server status in the header
**And** display keyboard shortcuts in the footer

#### ASCII Logo Display (Primary Design)

```
     ██████╗ █████╗  ██████╗ ███████╗
    ██╔════╝██╔══██╗██╔════╝ ██╔════╝
    ██║     ███████║██║  ███╗█████╗
    ██║     ██╔══██║██║   ██║██╔══╝
    ╚██████╗██║  ██║╚██████╔╝███████╗
     ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝

    Code Alignment Guard Engine

    A controlled environment for AI development
                 Version 0.0.1
```

The logo should:

- Use gradient colors (light aqua → aqua-blue → deep aqua: #7FDBFF → #01B4C6 → #007A8C) for the block letters
- Make "Code Alignment Guard Engine" in turquoise (#4ECDC4)
- Display version dynamically from package.json
- Fade in with a smooth animation over 500ms
- Display for 1.5 seconds before transitioning to main menu

#### Scenario: Display logo in normal CLI mode

**Given** I run any cage command with arguments
**When** the command executes (except for quiet/json output modes)
**Then** a compact version of the CAGE logo should appear at the top
**And** the logo should be colorful but non-intrusive
**And** take up no more than 3-4 lines
**And** followed by the command output

Example for `cage status` (using the same ASCII art logo):

```
 ██████╗ █████╗  ██████╗ ███████╗
██╔════╝██╔══██╗██╔════╝ ██╔════╝
██║     ███████║██║  ███╗█████╗
██║     ██╔══██║██║   ██║██╔══╝
╚██████╗██║  ██║╚██████╔╝███████╗
 ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝

Code Alignment Guard Engine

🟢 Server Status: Running
  Port: 3790
  PID: 12345
  Uptime: 2h 15m
```

#### Scenario: Preserve existing CLI commands

**Given** the interactive mode is available
**When** I run `cage init` or any other existing command
**Then** the command should execute normally without entering interactive mode
**And** show the compact logo header (unless --no-logo flag is used)
**And** all Phase 1 functionality should remain intact

#### Scenario: Launch with debug mode

**Given** I want enhanced debug output
**When** I run `cage --debug`
**Then** the interactive mode should launch with debug panel visible
**And** show detailed internal operations in real-time
**And** log all debug output to .cage/debug.log

### Feature: Navigation System

#### Scenario: Navigate with arrow keys

**Given** I am in any menu or list view
**When** I press the up/down arrow keys
**Then** the selection should move accordingly
**And** the view should scroll when reaching boundaries
**And** wrap around at the top/bottom of lists

#### Scenario: Select with Enter key

**Given** I have highlighted a menu option or list item
**When** I press Enter
**Then** the selected action should execute
**And** navigate to the appropriate view or perform the action

#### Scenario: Go back with Escape

**Given** I am in a sub-view or detail screen
**When** I press Escape
**Then** I should return to the previous view
**And** maintain my previous selection position
**And** pressing Escape at main menu should prompt for exit confirmation

#### Scenario: Quick exit

**Given** I am anywhere in the interactive interface
**When** I press Q (uppercase)
**Then** I should see a confirmation prompt "Exit Cage? (y/n)"
**And** pressing 'y' should exit to terminal
**And** pressing 'n' or Escape should cancel

### Feature: Events Inspector

#### Scenario: Browse event list

**Given** I select "Events Inspector" from the main menu
**When** the events list loads
**Then** I should see all events in reverse chronological order
**And** each event should show timestamp, type, tool, and session ID
**And** pagination controls should appear for large lists

#### Scenario: Filter events by type

**Given** I am viewing the events list
**When** I press F for filter
**Then** a filter menu should appear
**And** I can select specific event types (PreToolUse, PostToolUse, etc.)
**And** the list should update to show only matching events

#### Scenario: Filter events by date

**Given** I am in the events list
**When** I select the date filter
**Then** I should see options for Today, Yesterday, Last 7 days, Custom range
**And** selecting a range should filter events accordingly

#### Scenario: Search events

**Given** I am viewing events
**When** I press / (forward slash)
**Then** a search prompt should appear
**And** I can type to search in event content
**And** results should highlight matching text
**And** pressing Enter should jump to next match

### Feature: Event Detail Inspection

#### Scenario: View event details

**Given** I have selected an event from the list
**When** I press Enter
**Then** the detail view should open
**And** show all event metadata (type, time, session, tool)
**And** display tabs for Arguments, Result, and Raw Data

#### Scenario: Inspect Edit tool result

**Given** I am viewing a PostToolUse event for Edit tool
**When** I navigate to the Result tab
**Then** I should see:

- filePath with the edited file location
- oldString showing what was replaced
- newString showing the replacement
- Link to view originalFile content
- Link to view structuredPatch diff
- Boolean flags (userModified, replaceAll)

#### Scenario: View original file content

**Given** an Edit event with originalFile data
**When** I select "View Full Content"
**Then** a sub-window should open with syntax-highlighted file content
**And** line numbers should be displayed
**And** I can scroll through the entire file
**And** press Escape to close and return to event details

#### Scenario: View diff/patch

**Given** an Edit event with structuredPatch data
**When** I select "View Diff"
**Then** a diff viewer should open
**And** show removed lines in red with minus prefix
**And** show added lines in green with plus prefix
**And** show context lines in white
**And** display line numbers for both old and new

#### Scenario: Inspect Write tool result

**Given** I am viewing a PostToolUse event for Write tool
**When** I view the Result tab
**Then** I should see:

- type (create or update)
- filePath
- content (with option to view full)
- structuredPatch if applicable

#### Scenario: Inspect Bash tool result

**Given** I am viewing a PostToolUse event for Bash tool
**When** I view the Result tab
**Then** I should see:

- stdout output (with syntax highlighting if applicable)
- stderr output (highlighted in red if present)
- interrupted flag
- isImage flag
  **And** long outputs should be scrollable

#### Scenario: Copy event data

**Given** I am viewing event details
**When** I press C
**Then** a menu should appear with copy options:

- Copy event ID
- Copy full JSON
- Copy specific field
- Copy to clipboard or file

### Feature: Real-time Event Stream View (Dedicated Streaming Mode)

This is a dedicated full-screen streaming view within the interactive TUI, optimized for monitoring events in real-time with the ability to pause, scroll through history, and inspect event details.

#### Stream View Layout

```
┌─────────────────────────────────────────────────────────────┐
│          REAL-TIME EVENT STREAM              [LIVE]          │
├─────────────────────────────────────────────────────────────┤
│ Filter: [All] | Session: [...a10e] | Rate: 12 events/min    │
├─────────────────────────────────────────────────────────────┤
│ 10:45:21.123  PreToolUse    Edit     main.ts:45             │
│ 10:45:21.456  PostToolUse   Edit     ✓ Changed 3 lines     │
│ 10:45:22.001  PreToolUse    Bash     npm test              │
│ 10:45:24.234  PostToolUse   Bash     ✓ 15 tests passed    │
│ 10:45:25.567  PreToolUse    Write    README.md             │
│ 10:45:25.890  PostToolUse   Write    ✓ Created 125 lines  │
│ 10:45:26.123  PreToolUse    Read     package.json         │
│ 10:45:26.456  PostToolUse   Read     ✓ 2.3KB read         │
│>10:45:27.789  PreToolUse    Edit     config.ts:12         │◄
│ 10:45:28.012  PostToolUse   Edit     ✓ Updated config     │
│ ─────────────────────────[Auto-scrolling]──────────────────│
│ [New event arrives, view scrolls...]                        │
├─────────────────────────────────────────────────────────────┤
│ Events: 523 | Viewing: Latest | Buffer: 1000 | New: 0       │
├─────────────────────────────────────────────────────────────┤
│ SPACE Pause | ↵ Inspect | F Filter | / Search | Q Back      │
└─────────────────────────────────────────────────────────────┘
```

#### Stream View - Paused with Selection

```
┌─────────────────────────────────────────────────────────────┐
│          REAL-TIME EVENT STREAM              [LIVE]          │
├─────────────────────────────────────────────────────────────┤
│ Filter: [Edit] | Session: [...a10e] | Streaming: 12 evt/min │
├─────────────────────────────────────────────────────────────┤
│ 10:43:15.234  PostToolUse   Edit     ✓ Updated index.ts    │
│ 10:43:45.567  PreToolUse    Edit     components/App.tsx    │
│ 10:43:45.890  PostToolUse   Edit     ✓ Changed 5 lines     │
│►10:44:12.123  PreToolUse    Edit     utils/helpers.ts     ◄│ <- Selected
│ 10:44:12.456  PostToolUse   Edit     ✓ Refactored function │
│ 10:44:23.789  PreToolUse    Edit     types/index.d.ts      │
│ 10:44:24.012  PostToolUse   Edit     ✓ Added interfaces    │
│ 10:44:35.345  PreToolUse    Edit     tests/app.test.ts     │
│ 10:44:35.678  PostToolUse   Edit     ✓ Fixed test case     │
│ 10:45:01.901  PreToolUse    Edit     README.md             │
├─────────────────────────────────────────────────────────────┤
│ Events: 546 | Viewing: 234 of 546 | Filtered: 89 | New: 23  │
├─────────────────────────────────────────────────────────────┤
│ SPACE Resume | ↵ Inspect | ↑↓ Scroll | Home/End Jump | Q Back│
└─────────────────────────────────────────────────────────────┘
```

#### Scenario: Start real-time streaming

**Given** I select "Real-time Monitor" from main menu
**When** the monitor view opens
**Then** I should see a dedicated full-screen streaming interface
**And** events appear in real-time as they occur automatically
**And** new events should appear at the top (newest first) with highlight animation
**And** show "LIVE (X events/min)" status in header when streaming
**And** show "CONNECTING..." status while establishing connection
**And** maintain a scrollable history buffer of last 1000 events

#### Scenario: Navigate through streaming events

**Given** I am in real-time monitor mode
**When** events are streaming
**Then** the event list is fully navigable with arrow keys
**And** new events continue appearing at the top (newest first)
**And** I can scroll down to view older history while streaming continues

#### Scenario: Scroll through event history

**Given** I'm viewing the streaming events
**When** I use arrow keys or PgUp/PgDn
**Then** I can scroll through all buffered events
**And** current position shows: "Event 145 of 523"
**And** timestamps remain visible for context
**And** highlight bar follows my selection

#### Scenario: Inspect event from stream

**Given** I have paused the stream or am scrolling
**When** I press Enter on an event
**Then** a detail panel opens in split-screen view
**And** the stream list shrinks to top half, detail appears in bottom half
**And** shows complete event data including:

- Full arguments
- Complete result/response data
- File contents for Edit/Write operations
- Command output for Bash operations
- Full stack traces for errors
  **And** pressing Tab switches focus between stream list and detail panel
  **And** pressing Escape closes detail and returns to full stream view

#### Split View with Event Detail

```
┌─────────────────────────────────────────────────────────────┐
│          REAL-TIME EVENT STREAM              [PAUSED]        │
├─────────────────────────────────────────────────────────────┤
│ 10:44:11.890  PostToolUse   Edit     ✓ Changed 5 lines     │
│►10:44:12.123  PreToolUse    Edit     utils/helpers.ts     ◄│
│ 10:44:12.456  PostToolUse   Edit     ✓ Refactored function │
├─────────────────────────────────────────────────────────────┤
│                    EVENT DETAILS                             │
├─────────────────────────────────────────────────────────────┤
│ Type: PreToolUse                                            │
│ Tool: Edit                                                  │
│ Time: 2025-09-18T10:44:12.123Z                             │
│ File: /Users/cage/project/utils/helpers.ts                  │
├─────────────────────────────────────────────────────────────┤
│ Arguments:                                                   │
│   old_string: "export function helper() { return null; }"   │
│   new_string: "export function helper() { return {}; }"     │
│                                                              │
│ [View Full File] [View Diff] [Copy JSON] [Export]           │
├─────────────────────────────────────────────────────────────┤
│ TAB Switch Focus | ↑↓ Scroll | ESC Close Detail | Q Back    │
└─────────────────────────────────────────────────────────────┘
```

#### Scenario: Auto-scroll with new events

**Given** streaming is active
**When** new events arrive
**Then** the view should auto-scroll to show latest
**And** briefly highlight new events (fade animation)
**And** maintain smooth scrolling (no jumps)
**Unless** I am actively scrolling up to view history
**Then** show "Auto-scroll paused - viewing history" indicator

#### Scenario: Quick jump navigation

**Given** I am in the stream view
**When** I press:

- Home: Jump to oldest event in buffer
- End: Jump to newest event
- G: Go to event by number/ID
- T: Jump to specific timestamp
- N/P: Next/Previous event of same type
  **Then** the view should jump accordingly
  **And** maintain selection highlight

#### Scenario: Filter stream in real-time

**Given** I am viewing the stream
**When** I press F for filter
**Then** a filter bar appears at top
**And** I can type to filter by:

- Event type (PreToolUse, PostToolUse)
- Tool name (Edit, Write, Bash)
- Session ID
- Content search
  **And** stream updates to show only matching events
  **And** show "Filtered: showing 45 of 523 events"

#### Scenario: Mark and compare events

**Given** I want to compare multiple events
**When** I press M on an event
**Then** it gets marked with a symbol [*]
**And** I can mark multiple events
**And** press C to open comparison view
**And** see events side-by-side

#### Scenario: Export from stream

**Given** I have selected events in stream
**When** I press E for export
**Then** show export options:

- Current event as JSON
- Selected/marked events
- Entire buffer
- Filtered results only
  **And** choose format: JSON, CSV, or readable text
  **And** save to file or copy to clipboard

### Feature: Server Management

#### Scenario: View server status

**Given** I select "Server Management"
**When** the view loads
**Then** I should see:

- Current status (Running/Stopped)
- Port number
- Process ID if running
- Uptime
- Memory usage
- Recent logs

#### Scenario: Start server from TUI

**Given** the server is not running
**When** I select "Start Server"
**Then** the server should start
**And** show starting progress
**And** display "Server started successfully"
**And** update status to Running

#### Scenario: Stop server from TUI

**Given** the server is running
**When** I select "Stop Server"
**Then** show confirmation prompt
**And** stop the server on confirmation
**And** update status to Stopped

### Feature: Hooks Configuration

#### Scenario: View hooks status

**Given** I select "Hooks Configuration"
**When** the view loads
**Then** I should see:

- Installation status for each hook type
- Configuration file location
- Last modified date
- Number of events captured per hook

#### Scenario: Setup hooks from TUI

**Given** hooks are not configured
**When** I select "Setup Hooks"
**Then** run the hooks setup process
**And** show progress for each step
**And** display success/failure status
**And** update the hooks status display

### Feature: Statistics Dashboard

#### Scenario: View event statistics

**Given** I select "Statistics Dashboard"
**When** the dashboard loads
**Then** I should see:

- Total events count
- Events by type (bar chart)
- Events over time (line graph)
- Most used tools
- Average events per session
- Peak activity periods

#### Scenario: Interactive charts

**Given** I am viewing statistics
**When** I navigate to a chart
**Then** I can select different time ranges
**And** hover details should show exact values
**And** press Enter to see detailed breakdown

### Feature: Settings Management

#### Scenario: View current settings

**Given** I select "Settings"
**When** the settings view loads
**Then** I should see all cage.config.json values
**And** current values should be displayed
**And** show which values are defaults vs customized

#### Scenario: Edit settings

**Given** I am in settings view
**When** I select a setting to edit
**Then** an edit dialog should appear
**And** validate input based on setting type
**And** show preview of change impact
**And** save on confirmation

### Feature: Debug Console

The Debug Console provides real-time visibility into all system logging via Winston logger, accessible through the `/api/debug/logs` endpoint.

#### Scenario: Logger event capture via Winston

**Given** the CAGE system is running (backend, CLI, or hooks)
**When** any component uses the Logger class (from @cage/shared)
**Then** all logger events MUST be captured by Winston
**And** Winston MUST persist events to an in-memory transport
**And** logger events include: debug, info, warn, error levels
**And** each event captures: timestamp, level, component, message, context data, stack traces (for errors)

#### Scenario: Backend exposes debug logs endpoint

**Given** Winston is capturing all logger events
**When** a client requests GET `/api/debug/logs`
**Then** the backend MUST return all captured log events
**And** support query parameters: `?level=ERROR&component=hooks&limit=500`
**And** return events in JSON format with schema:
```typescript
{
  id: string;
  timestamp: string; // ISO 8601
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  component: string;
  message: string;
  context?: Record<string, unknown>;
  stackTrace?: string;
}
```

#### Scenario: View debug output in interactive CLI

**Given** the server is running and capturing logs
**When** I open the debug console in the interactive CLI
**Then** I should see all logger events from:
- Backend operations (event processing, API calls)
- Hook handler execution (pre/post tool use)
- CLI operations (user interactions, API requests)
- File system operations
- Performance metrics
- Error stack traces
**And** new events appear instantly via SSE notifications (no polling)
**And** display "Server is not running" if backend is unavailable

#### Scenario: Filter debug output

**Given** I am viewing debug console
**When** I press F for filter
**Then** I can cycle through log levels: all → DEBUG → INFO → WARN → ERROR → all
**And** press C to cycle through components
**And** press / to search within log messages
**And** press R to reset all filters
**And** see filtered event count vs total count

### Feature: Real-Time Event Notification Architecture (SSE)

CAGE uses a **notification bus pattern** for real-time updates where Server-Sent Events (SSE) provide lightweight notifications, and REST APIs provide data on-demand. This architecture eliminates polling, reduces bandwidth, and provides instant updates across all views.

#### Architecture Principle

**SSE = Notification Bus (Lightweight)**
- Backend emits tiny notifications when data changes (~200 bytes per notification)
- Notifications include: type, timestamp, and minimal metadata
- Single SSE connection handles ALL notification types (events, debug logs, etc.)

**REST APIs = Data Source (On-Demand)**
- Frontend fetches only NEW data when notified
- APIs support `?since=timestamp` parameter for incremental fetching
- No duplicate data transmission via SSE stream

#### Notification Message Types

All SSE messages follow this format:
```typescript
// System messages
{ type: 'connected' }  // Initial connection established
{ type: 'heartbeat' }  // Keep-alive every 30 seconds

// Data change notifications
{
  type: 'event_added',
  eventType: 'PreToolUse',
  sessionId: 'session-123...',
  timestamp: '2025-01-24T10:45:23.123Z'
}

{
  type: 'debug_log_added',
  level: 'ERROR',
  component: 'HooksController',
  timestamp: '2025-01-24T10:45:23.456Z'
}
```

#### Scenario: Backend emits SSE notification when hook event logged

**Given** the backend EventLoggerService receives a hook event
**When** `logEvent()` completes successfully
**Then** the backend MUST emit an internal event: `'hook.event.added'`
**And** the event payload MUST include: `{ eventType, sessionId, timestamp }`
**And** the EventsController MUST listen for this internal event via `@OnEvent('hook.event.added')`
**And** broadcast an SSE notification to ALL connected clients
**And** the SSE notification MUST have format:
```typescript
{
  type: 'event_added',
  eventType: string,
  sessionId: string,
  timestamp: string  // ISO 8601
}
```
**And** the notification payload MUST be under 200 bytes
**And** NOT include full event data (file contents, command outputs, etc.)

#### Scenario: Backend emits SSE notification when debug log captured

**Given** Winston captures a log event via WinstonLoggerService
**When** `addLog()` is called
**Then** the backend MUST emit an internal event: `'debug.log.added'`
**And** the event payload MUST include: `{ level, component, timestamp }`
**And** the EventsController MUST listen for this internal event via `@OnEvent('debug.log.added')`
**And** broadcast an SSE notification to ALL connected clients
**And** the SSE notification MUST have format:
```typescript
{
  type: 'debug_log_added',
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
  component: string,
  timestamp: string  // ISO 8601
}
```
**And** the notification payload MUST be under 200 bytes

#### Scenario: Frontend establishes single SSE connection

**Given** the CAGE CLI application starts
**When** the StreamService initializes
**Then** it MUST establish exactly ONE SSE connection to `/api/events/stream`
**And** the connection MUST remain open for the entire application lifetime
**And** the connection MUST handle ALL notification types (event_added, debug_log_added, heartbeat)
**And** NO component should establish its own SSE connection
**And** NO component should use polling (setInterval) to fetch data

#### Scenario: Frontend receives event notification and fetches new data

**Given** the SSE connection is established
**When** a notification with `type: 'event_added'` is received
**Then** the frontend MUST parse the notification payload
**And** extract the `timestamp` field
**And** update `appStore.lastEventTimestamp` with this timestamp
**And** the store setter MUST trigger `appStore.fetchLatestEvents()`
**And** `fetchLatestEvents()` MUST call `GET /api/events/list?since={lastEventTimestamp}`
**And** the API MUST return ONLY events newer than the timestamp
**And** the frontend MUST append new events to existing `appStore.events` array
**And** NOT replace the entire array (preserve existing events)

#### Scenario: Frontend receives debug log notification and fetches new logs

**Given** the SSE connection is established
**When** a notification with `type: 'debug_log_added'` is received
**Then** the frontend MUST parse the notification payload
**And** extract the `timestamp` field
**And** update `appStore.lastDebugLogTimestamp` with this timestamp
**And** the store setter MUST trigger `appStore.fetchLatestDebugLogs()`
**And** `fetchLatestDebugLogs()` MUST call `GET /api/debug/logs?since={lastDebugLogTimestamp}`
**And** the API MUST return ONLY logs newer than the timestamp
**And** components watching this store state MUST automatically update

#### Scenario: Components react to store changes without polling

**Given** a component needs real-time data (DebugConsole, StreamView, EventInspector)
**When** the component mounts
**Then** it MUST load initial data once via REST API
**And** it MUST watch relevant store state (lastEventTimestamp or lastDebugLogTimestamp)
**And** use React `useEffect` hook with the timestamp as a dependency
**When** the timestamp changes in the store
**Then** the component's effect MUST trigger automatically
**And** fetch only NEW data using the `?since` parameter
**And** update its local state with the new data
**And** NOT use `setInterval` for polling
**And** NOT make redundant API calls

#### Scenario: Backend API supports incremental data fetching

**Given** the backend has captured events and logs over time
**When** a client requests `GET /api/events/list?since=2025-01-24T10:45:00.000Z`
**Then** the backend MUST return only events with `timestamp > since`
**And** sort events by timestamp ascending (oldest first)
**And** NOT return events older than or equal to the `since` timestamp
**When** a client requests `GET /api/debug/logs?since=2025-01-24T10:45:00.000Z`
**Then** the backend MUST return only logs with `timestamp > since`
**And** NOT return logs older than or equal to the `since` timestamp

#### Scenario: SSE connection handles heartbeat keep-alive

**Given** an SSE connection is established
**When** no data changes occur for 30 seconds
**Then** the backend MUST send a heartbeat notification: `{ type: 'heartbeat' }`
**And** the frontend MUST ignore heartbeat messages (no action needed)
**And** the heartbeat MUST prevent connection timeout
**And** heartbeat interval MUST be 30 seconds (not 10 seconds)

#### Scenario: SSE connection recovery on disconnect

**Given** an SSE connection is established
**When** the connection drops (network issue, server restart, etc.)
**Then** the EventSource MUST automatically attempt to reconnect
**And** the frontend MUST track the last known timestamp before disconnect
**When** the connection re-establishes
**Then** the frontend MUST fetch all events since last known timestamp
**And** the frontend MUST call `GET /api/events/list?since={lastEventTimestamp}`
**And** the frontend MUST call `GET /api/debug/logs?since={lastDebugLogTimestamp}`
**And** catch up on any missed events/logs during disconnection

#### Scenario: Backend manages SSE client list

**Given** the backend EventsController handles SSE streaming
**When** a client connects to `/api/events/stream`
**Then** the controller MUST add the client Response object to `sseClients` array
**And** send initial `{ type: 'connected' }` message
**When** an internal event is emitted (`hook.event.added` or `debug.log.added`)
**Then** the controller MUST broadcast the notification to ALL clients in the list
**When** a client disconnects
**Then** the controller MUST remove the client from `sseClients` array
**And** clear any associated intervals (heartbeat, etc.)

#### Scenario: Real-time updates via SSE notifications only

**Given** the CAGE system is running with active components displaying real-time data
**When** new events or debug logs are added to the system
**Then** components MUST receive updates via SSE notifications
**And** components MUST NOT use `setInterval` or timers to repeatedly fetch data
**And** all data fetching MUST be triggered by SSE notifications or explicit user actions
**And** the system MUST maintain exactly one SSE connection for all real-time updates
**And** no component should make redundant or repeated API requests on a schedule

#### Architecture Benefits

This notification bus pattern provides:

1. **Single Source of Truth**: One SSE connection for all real-time updates
2. **Reduced Bandwidth**: Notifications are ~200 bytes vs full event data (KB-MB)
3. **No Polling**: Zero `setInterval` usage, backend controls update frequency
4. **Better UX**: Instant updates with no flickering or loading states on refresh
5. **Scalable**: Easy to add new notification types without changing SSE infrastructure
6. **Testable**: Clear separation between notification layer and data layer
7. **Simple Components**: Components react to store changes, no complex polling logic

### Feature: Context-Sensitive Help

#### Scenario: View help

**Given** I am in any view
**When** I press ? or H
**Then** a help overlay should appear
**And** show relevant keyboard shortcuts for current view
**And** provide brief descriptions
**And** press Escape to close

#### Scenario: Inline help hints

**Given** I am navigating the interface
**When** I hover or pause on an option
**Then** a brief tooltip should appear after 2 seconds
**And** explain what the option does

### Feature: Responsive Layout

#### Scenario: Handle terminal resize

**Given** the interactive TUI is running
**When** I resize the terminal window
**Then** the interface should adapt responsively
**And** maintain current view and selection
**And** show scrollbars when content exceeds viewport

#### Scenario: Minimum size requirement

**Given** the terminal is too small
**When** width < 80 or height < 24
**Then** show message "Terminal too small. Minimum: 80x24"
**And** prompt to resize or exit

## Technical Implementation

### Technology Stack

- **Ink 3+**: React for CLIs with hooks support
- **ink-big-text**: ASCII art headers (for alternative logo rendering)
- **ink-gradient**: Gradient colors for the logo
- **figlet**: Generate ASCII text art
- **chalk**: Terminal colors and styles
- **ink-table**: Table components for lists
- **ink-text-input**: Text input fields
- **ink-select-input**: Selection menus
- **ink-syntax-highlight**: Code highlighting
- **blessed**: Advanced TUI features if needed

### State Management

- Use React hooks (useState, useEffect, useContext)
- Global state with Context API for:
  - Current view/navigation stack
  - Event data cache
  - Filter/search state
  - Server connection status
  - Debug mode flag

### Performance Considerations

- Virtual scrolling for large event lists
- Lazy load event details only when selected
- Cache frequently accessed data
- Debounce search and filter operations
- Stream events efficiently without memory buildup

### Data Structures

#### Event List Item

```typescript
interface EventListItem {
  id: string;
  timestamp: string;
  eventType: string;
  toolName: string;
  sessionId: string;
  preview: string; // First 50 chars of significant content
}
```

#### Event Detail

```typescript
interface EventDetail {
  id: string;
  timestamp: string;
  eventType: string;
  toolName: string;
  sessionId: string;
  arguments: any;
  result?: ToolResult;
  error?: string;
  executionTime?: number;
  rawData?: any; // Full original payload
}

interface ToolResult {
  // Edit tool
  filePath?: string;
  oldString?: string;
  newString?: string;
  originalFile?: string;
  structuredPatch?: DiffPatch[];

  // Write tool
  type?: 'create' | 'update';
  content?: string;

  // Bash tool
  stdout?: string;
  stderr?: string;
  interrupted?: boolean;
  isImage?: boolean;

  // Generic fields
  success?: boolean;
  [key: string]: any;
}
```

## Non-Functional Requirements

### Performance

- TUI should launch within 1 second
- Navigation should feel instant (<50ms response)
- Event list should handle 10,000+ events smoothly
- Search should return results within 500ms

### Usability

- All features accessible via keyboard only
- Consistent navigation patterns throughout
- Clear visual feedback for all actions
- Helpful error messages with suggested actions

### Accessibility

- Support for terminal screen readers where possible
- High contrast mode option
- Configurable color schemes
- Clear focus indicators

## Definition of Done

Phase 2 is complete when:

1. Interactive TUI launches with `cage` command
2. All existing CLI commands remain functional
3. Event inspector shows full result data for all tool types
4. Navigation works consistently with arrow keys, Enter, and Escape
5. Real-time monitoring updates without performance issues
6. Debug mode provides useful diagnostic information
7. All views are responsive to terminal resize
8. Help is available context-sensitively
9. Tests cover all interactive scenarios
10. Documentation updated for interactive mode

## Testing Approach

### Unit Tests

- Test individual components (menus, lists, viewers)
- Mock Ink rendering for component testing
- Test keyboard input handlers
- Validate state management logic

### Integration Tests

- Test navigation flows
- Verify data loading and display
- Test filter and search functionality
- Validate event detail rendering

### Manual Testing Checklist

- [ ] Launch interactive mode
- [ ] Navigate all menus with keyboard
- [ ] View events with different result types
- [ ] Inspect file contents and diffs
- [ ] Monitor real-time events
- [ ] Resize terminal at various sizes
- [ ] Test debug mode output
- [ ] Verify help system

## Future Enhancements (Post-Phase 2)

- Export events to various formats (JSON, CSV, HTML)
- Event replay/playback functionality
- Bookmarks for frequently viewed events
- Custom event annotations and tags
- Integration with rules engine (Phase 3)
- Themes and customization options
- Multi-window/split view support
- Event correlation and timeline view
