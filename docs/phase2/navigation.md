# Phase 2: Navigation & State Management

## Navigation Architecture

### View-Based Routing
The TUI uses a simple view-based routing system managed by Zustand.

```typescript
export type ViewType =
  | 'menu'        // Main menu
  | 'events'      // Event inspector
  | 'eventDetail' // Event detail view
  | 'stream'      // Real-time monitor
  | 'server'      // Server management
  | 'hooks'       // Hooks configuration
  | 'statistics'  // Statistics dashboard
  | 'settings'    // Settings menu
  | 'debug'       // Debug console
  | 'help';       // Help overlay
```

### Navigation Stack
The app maintains a navigation stack for proper back navigation:

```typescript
interface NavigationState {
  currentView: ViewType;
  previousView: ViewType | null;
  navigationStack: ViewType[];
}
```

## State Management with Zustand

### Store Architecture

#### AppStore (Main Application State)
**Location**: `packages/cli/src/stores/appStore.ts`

```typescript
interface AppState {
  // Navigation
  currentView: ViewType;
  previousView: ViewType | null;
  navigationStack: ViewType[];

  // Events
  events: Event[];
  filteredEvents: Event[];
  selectedEvent: Event | null;
  eventFilters: FilterOptions;

  // Stream
  isStreaming: boolean;
  isPaused: boolean;
  streamBuffer: Event[];
  newEventCount: number;

  // Server
  serverStatus: 'running' | 'stopped' | 'connecting' | 'error';
  serverInfo: ServerInfo | null;

  // UI
  isLoading: boolean;
  loadingMessage: string;
  errors: Error[];
  showHelp: boolean;
  debugMode: boolean;

  // Actions
  navigate: (view: ViewType) => void;
  goBack: () => void;
  // ... more actions
}
```

#### SettingsStore (User Preferences)
**Location**: `packages/cli/src/stores/settingsStore.ts`

```typescript
interface SettingsState {
  // Display
  theme: 'dark' | 'light' | 'highContrast' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  showLineNumbers: boolean;
  showScrollbars: boolean;

  // Server
  serverPort: number;
  serverHost: string;
  autoStartServer: boolean;

  // Behavior
  confirmExit: boolean;
  autoSave: boolean;
  maxEventBuffer: number;

  // Key bindings
  keyBindings: KeyBindings;

  // Actions
  setTheme: (theme: string) => void;
  updateServerConfig: (config: ServerConfig) => void;
  // ... more actions
}
```

### State Usage in Components

#### Accessing State
```typescript
// In a component
import { useAppStore } from '../stores/appStore';

const EventInspector = () => {
  const events = useAppStore(state => state.events);
  const navigate = useAppStore(state => state.navigate);

  // Use state and actions
};
```

#### Selective Subscriptions
```typescript
// Only re-render when specific state changes
const serverStatus = useAppStore(
  state => state.serverStatus,
  shallow // Use shallow equality
);
```

## Navigation Patterns

### Forward Navigation
```typescript
// From MainMenu to EventInspector
const navigate = useAppStore(state => state.navigate);
navigate('events');
```

### Back Navigation
```typescript
// Return to previous view
const goBack = useAppStore(state => state.goBack);
goBack(); // or handle ESC key
```

### Deep Linking
```typescript
// Navigate with context
const selectAndViewEvent = (event: Event) => {
  useAppStore.getState().selectEvent(event);
  useAppStore.getState().navigate('eventDetail');
};
```

## Keyboard Navigation

### Global Keys
Available in all views:

| Key | Action | Implementation |
|-----|--------|----------------|
| `ESC` | Go back | `goBack()` |
| `?` | Show help | `toggleHelp()` |
| `Ctrl+C` | Exit app | Process exit |
| `Ctrl+D` | Debug mode | `toggleDebugMode()` |

### Navigation Keys
Standard across all lists:

| Key | Action | Notes |
|-----|--------|-------|
| `↑` / `k` | Move up | Vim binding |
| `↓` / `j` | Move down | Vim binding |
| `←` / `h` | Previous tab/panel | Context-aware |
| `→` / `l` | Next tab/panel | Context-aware |
| `Enter` | Select/Confirm | Primary action |
| `Space` | Toggle/Pause | Secondary action |
| `Tab` | Next field/section | Form navigation |
| `Shift+Tab` | Previous field | Reverse navigation |

### Quick Actions
One-key shortcuts for common tasks:

| Key | Context | Action |
|-----|---------|--------|
| `/` | Lists | Start search |
| `f` | Event Inspector | Filter menu |
| `s` | Event Inspector | Sort menu |
| `r` | Lists | Refresh/Reload |
| `e` | Any | Export current view |
| `c` | Detail views | Copy to clipboard |

## Navigation Flow Examples

### Example 1: Viewing Event Details
```
MainMenu
  ↓ (Enter on "Events Inspector")
EventInspector
  ↓ (Enter on specific event)
EventDetail
  ↓ (ESC to go back)
EventInspector
  ↓ (ESC to go back)
MainMenu
```

### Example 2: Real-time Monitoring
```
MainMenu
  ↓ (Enter on "Real-time Monitor")
StreamView
  ↓ (Space to pause)
  ↓ (Enter on event)
EventDetail (split view)
  ↓ (Tab to switch panels)
  ↓ (ESC to close detail)
StreamView
  ↓ (ESC to go back)
MainMenu
```

## State Synchronization

### Server Connection
State automatically syncs with server status:

```typescript
// SSE connection updates
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  useAppStore.getState().addEvent(data);
};

// Server status monitoring
setInterval(() => {
  checkServerHealth().then(info => {
    useAppStore.getState().setServerInfo(info);
  });
}, 5000);
```

### Settings Persistence
Settings are persisted using Zustand persist middleware:

```typescript
const useSettingsStore = create(
  persist(
    (set) => ({
      // ... state and actions
    }),
    {
      name: 'cage-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

## Navigation Guards

### Confirmation Dialogs
Certain actions require confirmation:

```typescript
const handleExit = () => {
  if (settings.confirmExit && hasUnsavedChanges) {
    showConfirmDialog({
      message: 'You have unsaved changes. Exit anyway?',
      onConfirm: () => process.exit(0),
      onCancel: () => {}
    });
  } else {
    process.exit(0);
  }
};
```

### View Requirements
Some views require preconditions:

```typescript
const navigate = (view: ViewType) => {
  // Check if server is running for stream view
  if (view === 'stream' && serverStatus !== 'running') {
    showError('Server must be running to view stream');
    return;
  }

  // Proceed with navigation
  actuallyNavigate(view);
};
```

## Performance Considerations

### State Updates
- Use Immer for immutable updates
- Batch related state changes
- Avoid unnecessary re-renders

### Navigation Transitions
- Lazy load heavy components
- Preload next likely view
- Clean up resources on unmount

### Memory Management
```typescript
// Clean up when leaving view
useEffect(() => {
  return () => {
    // Clear large data sets
    if (currentView !== 'events') {
      clearEventCache();
    }
  };
}, [currentView]);
```

## Testing Navigation

### Unit Tests
```typescript
describe('Navigation', () => {
  it('should navigate forward', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.navigate('events');
    });

    expect(result.current.currentView).toBe('events');
    expect(result.current.navigationStack).toContain('menu');
  });

  it('should navigate back', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.navigate('events');
      result.current.goBack();
    });

    expect(result.current.currentView).toBe('menu');
  });
});
```

### Integration Tests
```typescript
describe('Navigation Flow', () => {
  it('should complete event inspection flow', () => {
    const { stdin, lastFrame } = render(<App />);

    // Navigate to events
    stdin.write('\r'); // Enter on first menu item
    expect(lastFrame()).toContain('EVENT INSPECTOR');

    // Select an event
    stdin.write('\r');
    expect(lastFrame()).toContain('Event Details');

    // Go back
    stdin.write('\x1b'); // ESC
    expect(lastFrame()).toContain('EVENT INSPECTOR');
  });
});
```

## Navigation Best Practices

1. **Always provide back navigation** - ESC key should work everywhere
2. **Show current location** - Display breadcrumbs or titles
3. **Preserve state** - Don't lose user input when navigating
4. **Confirm destructive actions** - Warn before data loss
5. **Provide shortcuts** - Power users need quick navigation
6. **Handle errors gracefully** - Don't break navigation flow
7. **Test all paths** - Ensure no dead ends