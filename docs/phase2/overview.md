# Phase 2: TUI Architecture Overview

## Vision

The Cage Terminal User Interface (TUI) transforms the CLI experience from command-based interaction to a full-screen, interactive control center for AI development monitoring and analysis. Built with React for CLIs (Ink), it provides a modern, responsive interface while maintaining terminal compatibility.

## Architecture Principles

### 1. Component-Based Design

- **React Components**: Leverage Ink's React-based architecture for modular, reusable UI components
- **Virtual DOM**: Efficient terminal rendering through React's reconciliation
- **Composition**: Complex views built from simple, focused components

### 2. State Management

- **Zustand Stores**: Centralized state management with multiple specialized stores
- **Reactive Updates**: UI automatically responds to state changes
- **Persist Middleware**: Settings and preferences saved between sessions

### 3. Performance First

- **Virtual Scrolling**: Only render visible items (VirtualList component)
- **Lazy Loading**: Components loaded on-demand when navigating
- **Optimized Re-renders**: Careful use of React hooks and memoization

## Technology Stack

### Core Technologies

- **Ink v6**: React for CLIs with latest features
- **React 19**: Cutting-edge React with improved performance
- **TypeScript**: Full type safety with ES modules
- **Zustand**: Lightweight state management

### UI Components

- **@inkjs/ui**: Pre-built UI components (when available)
- **gradient-string**: ASCII art with gradient colors
- **figures**: Unicode symbols for better visuals
- **chalk v5**: Terminal color support

## Component Hierarchy

```
App
├── Logo (1.5s splash screen)
└── Router (view-based routing)
    ├── MainMenu
    ├── EventInspector
    │   └── VirtualList
    ├── EventDetail
    │   ├── TabView
    │   ├── SyntaxHighlighter
    │   └── DiffViewer
    ├── StreamView
    │   ├── VirtualList
    │   └── EventDetail (split)
    ├── ServerManager
    ├── HooksConfig
    ├── Statistics
    ├── Settings
    ├── DebugConsole
    └── Help (overlay)
```

## Navigation Flow

### Entry Points

1. **Logo Display**: 1.5-second animated splash (skippable)
2. **Main Menu**: Central hub for all features
3. **Direct Navigation**: Arrow keys + Enter for selection

### Navigation Stack

- **Forward**: Enter key selects and navigates
- **Back**: Escape key returns to previous view
- **Home**: Multiple Escape presses return to menu
- **Context Help**: '?' key shows help overlay

## Data Flow

### Event Processing Pipeline

1. **Source**: SSE connection or file-based events
2. **Store**: Zustand appStore manages event state
3. **Filtering**: Real-time filtering and sorting
4. **Virtual Rendering**: Only visible items rendered
5. **Selection**: Detailed view of selected events

### State Synchronization

- **Server Status**: Real-time connection monitoring
- **Event Stream**: Live updates via SSE
- **Settings**: Persisted to disk for consistency

## Key Features Implementation

### Virtual Scrolling (Complete)

- Custom VirtualList component handles thousands of items
- Scrollbar visualization shows position
- Keyboard navigation with vim bindings

### Event Inspector (Complete)

- Sortable columns (timestamp, type, tool, session)
- Multi-field filtering system
- Search within event content
- One-key shortcuts for common actions

### Theme System (Complete)

- Dark Aqua (default)
- Light Ocean
- High Contrast
- Auto-detection of terminal theme

## Performance Optimizations

### Rendering Strategy

- **Minimal Updates**: Only changed components re-render
- **Batch Operations**: State updates grouped together
- **Debouncing**: Search and filter inputs debounced

### Memory Management

- **Stream Buffer**: Limited to 1000 events
- **Virtual Lists**: Only render viewport
- **Cleanup**: Proper unmounting and listener removal

## Terminal Compatibility

### Cross-Platform Support

- **Windows**: Windows Terminal, ConEmu
- **macOS**: Terminal.app, iTerm2
- **Linux**: GNOME Terminal, Konsole

### Terminal Features

- **Colors**: 256-color and true color support
- **Unicode**: Full UTF-8 for icons and borders
- **Resize**: Responsive to terminal size changes

## Development Workflow

### Component Development

1. Create component with TypeScript
2. Add to component library documentation
3. Write tests with ink-testing-library
4. Integrate into navigation flow

### Testing Strategy

- **Unit Tests**: Individual component behavior
- **Integration Tests**: Navigation and state flow
- **Manual Testing**: Cross-terminal verification

## Current Status

### Completed Components (35%)

- ✅ Logo with gradient animation
- ✅ Main Menu with navigation
- ✅ Theme system with color management
- ✅ VirtualList for efficient scrolling
- ✅ EventInspector with full features
- ✅ Zustand state management

### In Progress

- 🚧 EventDetail viewer
- 🚧 StreamView for real-time
- 🚧 Additional components

## Future Enhancements

### Planned Features

- Split-screen layouts
- Multi-tab support
- Export functionality
- Advanced filtering
- Custom keybindings

### Performance Goals

- Handle 10,000+ events smoothly
- Sub-100ms navigation
- Minimal CPU usage when idle

## References

- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [React 19 Features](https://react.dev)
- [Zustand Guide](https://github.com/pmndrs/zustand)
- [Terminal Colors](https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797)
