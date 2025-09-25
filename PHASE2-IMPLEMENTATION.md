# Phase 2 Implementation Guide

## Overview

This guide provides comprehensive instructions for implementing Phase 2 of the Cage project - the Interactive Terminal User Interface (TUI). Phase 2 transforms the Cage CLI into a professional, colorful, full-screen interactive application while maintaining all existing command-line functionality.

## Document Structure

The Phase 2 implementation will be organized into focused, manageable documents:

### Core Documents (To Be Created)

1. **[docs/phase2/overview.md](docs/phase2/overview.md)** - TUI architecture and design principles
2. **[docs/phase2/components.md](docs/phase2/components.md)** - Ink component library
3. **[docs/phase2/navigation.md](docs/phase2/navigation.md)** - Navigation and state management
4. **[docs/phase2/event-viewer.md](docs/phase2/event-viewer.md)** - Event inspector implementation
5. **[docs/phase2/streaming.md](docs/phase2/streaming.md)** - Real-time event streaming
6. **[docs/phase2/styling.md](docs/phase2/styling.md)** - Color schemes and theming
7. **[docs/phase2/testing.md](docs/phase2/testing.md)** - Testing interactive components
8. **[docs/phase2/checklist.md](docs/phase2/checklist.md)** - Implementation checklist

## Quick Start

### Step 1: Review Requirements

Read [PHASE2.md](PHASE2.md) for complete acceptance criteria and user stories.

### Step 2: Setup Development Environment

Ensure Ink 3+ and related packages are installed with proper versions.

### Step 3: Implement Components

Build components incrementally, starting with the foundation:

1. **Logo & Splash Screen** - ASCII art with gradient colors
2. **Main Menu** - Navigation framework
3. **Event Inspector** - Browse and filter events
4. **Event Details** - Deep inspection with syntax highlighting
5. **Stream View** - Real-time monitoring with pause/scroll
6. **Server Management** - Start/stop/status controls
7. **Debug Console** - Enhanced diagnostic output

### Step 4: Integration Testing

Test keyboard navigation, state management, and data flow.

### Step 5: Verify Completion

Check all acceptance criteria against implementation.

## User Stories & Acceptance Criteria

### Story 1: Developer Launches Interactive Mode

**As a** developer using Cage
**I want to** launch an interactive full-screen interface by typing `cage`
**So that** I can navigate all Cage features visually without remembering command syntax

#### Acceptance Criteria:

- ✅ Launch with no arguments shows logo then main menu
- ✅ Logo uses gradient colors (cyan → blue → purple)
- ✅ Logo displays for 1.5 seconds with fade-in animation
- ✅ Main menu shows all available options
- ✅ Current server status visible in header
- ✅ Keyboard shortcuts displayed in footer

### Story 2: Developer Inspects Event Details

**As a** developer debugging Claude behavior
**I want to** view complete event data including file contents and command outputs
**So that** I can understand exactly what Claude did and why

#### Acceptance Criteria:

- ✅ Browse events in reverse chronological order
- ✅ Filter by type, tool, date, session
- ✅ Search within event content
- ✅ Press Enter to view full details
- ✅ View original file content for Edit events
- ✅ View diffs/patches with syntax highlighting
- ✅ View command output for Bash events
- ✅ Copy event data to clipboard or file

### Story 3: Developer Monitors Events in Real-Time

**As a** developer working with Claude Code
**I want to** see events streaming in real-time within the interactive interface
**So that** I can monitor Claude's actions as they happen

#### Acceptance Criteria:

- ✅ Events appear in scrollable list
- ✅ New events highlighted with animation
- ✅ Press Space to pause streaming
- ✅ Scroll through history while paused
- ✅ Press Enter to inspect any event
- ✅ Split-screen detail view
- ✅ Filter events in real-time
- ✅ Export selected events

### Story 4: Developer Navigates with Keyboard

**As a** developer preferring keyboard navigation
**I want to** use arrow keys, Enter, and Escape for all navigation
**So that** I can work efficiently without using the mouse

#### Acceptance Criteria:

- ✅ Arrow keys move selection up/down
- ✅ Enter selects/activates
- ✅ Escape goes back/cancels
- ✅ Tab switches between panels
- ✅ Home/End jump to first/last
- ✅ PgUp/PgDn for pagination
- ✅ / for search
- ✅ F for filter
- ✅ Q for quit with confirmation

### Story 5: Developer Uses Debug Mode

**As a** developer troubleshooting issues
**I want to** enable debug mode with enhanced output
**So that** I can see detailed internal operations and diagnose problems

#### Acceptance Criteria:

- ✅ Launch with `cage --debug`
- ✅ Debug console shows raw hook data
- ✅ Performance metrics visible
- ✅ Error stack traces displayed
- ✅ Filter debug output by level
- ✅ Debug logs saved to file

## Component Architecture

### Core Ink Components

```typescript
// Main App Structure
<App>
  <Logo />                  // Splash screen with ASCII art
  <Router>                   // Navigation controller
    <MainMenu />           // Main navigation menu
    <EventInspector />     // Event browsing and filtering
    <EventDetail />        // Detailed event view
    <StreamView />         // Real-time event stream
    <ServerManager />      // Server control panel
    <HooksConfig />        // Hooks configuration
    <Statistics />         // Event statistics dashboard
    <Settings />           // Configuration editor
    <DebugConsole />       // Debug output viewer
  </Router>
  <StatusBar />            // Global status and shortcuts
</App>
```

### Color Scheme & Styling

Based on color theory using an aqua-blue primary with complementary colors, designed for standard terminal black background:

```typescript
const theme = {
  // Primary Palette - Aqua/Teal family (180-200° hue)
  primary: {
    light: chalk.hex('#7FDBFF'), // Light aqua
    main: chalk.hex('#01B4C6'), // Aqua-blue
    dark: chalk.hex('#007A8C'), // Deep aqua
  },

  // Complementary - Coral/Salmon (opposite on color wheel, ~20° hue)
  accent: {
    light: chalk.hex('#FFB3BA'), // Light coral
    main: chalk.hex('#FF6B6B'), // Coral
    dark: chalk.hex('#EE5A6F'), // Deep coral
  },

  // Analogous - Blue-Green spectrum (150-210° hue)
  secondary: {
    blue: chalk.hex('#4ECDC4'), // Turquoise
    teal: chalk.hex('#00A8B5'), // Teal
    green: chalk.hex('#52D1A4'), // Sea green
  },

  // Triadic - Purple accent (300° hue)
  tertiary: chalk.hex('#9B59B6'), // Soft purple

  // Status Colors (maintaining readability on black)
  status: {
    success: chalk.hex('#52D1A4'), // Sea green
    warning: chalk.hex('#F4D03F'), // Golden yellow
    error: chalk.hex('#FF6B6B'), // Coral red
    info: chalk.hex('#4ECDC4'), // Turquoise
  },

  // UI Elements - Optimized for terminal black background
  ui: {
    // No background colors - use terminal's native black
    background: null, // Terminal default (black)

    // Borders and dividers - subtle on black
    border: chalk.hex('#2C5282'), // Muted blue border
    borderLight: chalk.hex('#4A90A4'), // Light border for emphasis
    borderSubtle: chalk.hex('#1A3A52'), // Very subtle border

    // Text hierarchy - high contrast on black
    text: chalk.hex('#E8F4F8'), // Off-white primary text
    textBright: chalk.white, // Pure white for emphasis
    textMuted: chalk.hex('#6B8CAE'), // Muted blue-gray
    textDim: chalk.hex('#4A6A8A'), // Dimmer for less important

    // Selection states - using background colors only when needed
    selected: chalk.bgHex('#003D4A').hex('#7FDBFF'), // Dark teal bg, light aqua text
    hover: chalk.hex('#7FDBFF'), // Just brighten text on hover
    focus: chalk.bold.hex('#01B4C6'), // Bold aqua for focus

    // Surface overlays - only for critical UI elements
    surfaceOverlay: chalk.bgHex('#0A1929'), // Dark blue-gray for panels
    dialogBg: chalk.bgHex('#122436'), // Slightly lighter for dialogs
  },

  // Gradients for Logo (aqua spectrum)
  gradients: {
    logo: gradient(['#7FDBFF', '#01B4C6', '#007A8C']), // Aqua gradient
    header: gradient(['#4ECDC4', '#01B4C6', '#00A8B5']), // Turquoise-aqua
    accent: gradient(['#FF6B6B', '#FF8E72', '#FFB3BA']), // Coral gradient
  },

  // Syntax Highlighting (optimized for black background)
  syntax: {
    keyword: chalk.hex('#FF6B6B'), // Coral (complementary)
    string: chalk.hex('#52D1A4'), // Sea green
    comment: chalk.hex('#6B8CAE'), // Muted blue-gray
    function: chalk.hex('#4ECDC4'), // Turquoise
    number: chalk.hex('#F4D03F'), // Golden yellow
    type: chalk.hex('#9B59B6'), // Purple (triadic)
    operator: chalk.hex('#FFB3BA'), // Light coral
    variable: chalk.hex('#7FDBFF'), // Light aqua
    bracket: chalk.hex('#4A90A4'), // Muted aqua for brackets
  },
};
```

#### Design Principles for Terminal Black Background

1. **No Background Colors by Default**
   - Terminal's native black is the canvas
   - Only use backgrounds for critical UI states (selection, focus)
   - Avoid covering information with overlays

2. **High Contrast Text Hierarchy**
   - Primary text: Off-white (#E8F4F8) for comfortable reading
   - Bright text: Pure white for important elements
   - Muted text: Blue-grays (#6B8CAE, #4A6A8A) for secondary info

3. **Subtle Borders & Dividers**
   - Use muted blue borders (#2C5282) that don't dominate
   - Even subtler borders (#1A3A52) for section separation
   - Box-drawing characters with dim colors

4. **Selection Without Overlays**
   - Selected items use subtle background (#003D4A) with bright text
   - Hover states just brighten text color, no background
   - Focus uses bold + color, not background

5. **Information Density First**
   - No popup dialogs blocking content
   - Side panels slide in from edges when needed
   - Split views instead of overlays
   - Inline expansions for details

## State Management with Zustand

### Core Store Architecture

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Main application store
interface AppState {
  // Navigation
  currentView: 'menu' | 'events' | 'stream' | 'server' | 'settings';
  previousView: string | null;
  navigationStack: string[];

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
  theme: 'aqua' | 'dark' | 'light';

  // Actions
  navigate: (view: string) => void;
  goBack: () => void;
  setEvents: (events: Event[]) => void;
  addEvent: (event: Event) => void;
  selectEvent: (event: Event | null) => void;
  applyFilter: (filters: FilterOptions) => void;
  toggleStream: () => void;
  pauseStream: () => void;
  clearErrors: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        currentView: 'menu',
        previousView: null,
        navigationStack: [],
        events: [],
        filteredEvents: [],
        selectedEvent: null,
        eventFilters: {},
        isStreaming: false,
        isPaused: false,
        streamBuffer: [],
        newEventCount: 0,
        serverStatus: 'stopped',
        serverInfo: null,
        isLoading: false,
        loadingMessage: '',
        errors: [],
        theme: 'aqua',

        // Navigation actions
        navigate: view =>
          set(state => {
            state.navigationStack.push(state.currentView);
            state.previousView = state.currentView;
            state.currentView = view;
          }),

        goBack: () =>
          set(state => {
            const previous = state.navigationStack.pop();
            if (previous) {
              state.currentView = previous;
              state.previousView =
                state.navigationStack[state.navigationStack.length - 1] || null;
            }
          }),

        // Event actions
        setEvents: events =>
          set(state => {
            state.events = events;
            state.filteredEvents = applyFilters(events, state.eventFilters);
          }),

        addEvent: event =>
          set(state => {
            if (state.isStreaming && !state.isPaused) {
              state.events.push(event);
              state.streamBuffer.push(event);
              if (state.streamBuffer.length > 1000) {
                state.streamBuffer.shift();
              }
            } else {
              state.newEventCount++;
            }
          }),

        selectEvent: event =>
          set(state => {
            state.selectedEvent = event;
          }),

        applyFilter: filters =>
          set(state => {
            state.eventFilters = filters;
            state.filteredEvents = applyFilters(state.events, filters);
          }),

        // Stream actions
        toggleStream: () =>
          set(state => {
            state.isStreaming = !state.isStreaming;
            if (state.isStreaming) {
              state.isPaused = false;
              state.newEventCount = 0;
            }
          }),

        pauseStream: () =>
          set(state => {
            state.isPaused = !state.isPaused;
          }),

        clearErrors: () =>
          set(state => {
            state.errors = [];
          }),
      })),
      {
        name: 'cage-app-storage',
        partialize: state => ({
          theme: state.theme,
          eventFilters: state.eventFilters,
        }),
      }
    )
  )
);

// Separate stores for different concerns
export const useStreamStore = create<StreamState>()(set => ({
  // Stream-specific state
  connectionStatus: 'disconnected',
  reconnectAttempts: 0,
  eventRate: 0,
  lastEventTime: null,

  connect: async () => {
    // SSE connection logic
  },

  disconnect: () => {
    // Cleanup logic
  },
}));

export const useSettingsStore = create<SettingsState>()(
  persist(
    set => ({
      // User preferences
      animationsEnabled: true,
      soundEnabled: false,
      compactMode: false,
      fontSize: 'medium',
      keyBindings: defaultKeyBindings,

      updateSetting: (key, value) =>
        set(state => ({
          ...state,
          [key]: value,
        })),
    }),
    {
      name: 'cage-settings',
    }
  )
);
```

### Using Stores in Components

```typescript
import { useAppStore, useStreamStore } from '../stores';

export const EventInspector: React.FC = () => {
  // Select specific state slices
  const events = useAppStore((state) => state.filteredEvents);
  const selectedEvent = useAppStore((state) => state.selectedEvent);
  const selectEvent = useAppStore((state) => state.selectEvent);
  const applyFilter = useAppStore((state) => state.applyFilter);

  // Stream store
  const eventRate = useStreamStore((state) => state.eventRate);

  return (
    <Box>
      {/* Component UI */}
    </Box>
  );
};
```

### Performance Optimizations

```typescript
// Use shallow equality for arrays/objects
import { shallow } from 'zustand/shallow';

const Component = () => {
  // This will only re-render if filters actually change
  const [filters, events] = useAppStore(
    state => [state.eventFilters, state.filteredEvents],
    shallow
  );
};

// Computed values with selectors
const useFilteredEventsCount = () =>
  useAppStore(state => state.filteredEvents.length);

// Async actions
const useEventActions = () => {
  const store = useAppStore();

  const loadEvents = async () => {
    store.setLoading(true);
    try {
      const events = await fetchEvents();
      store.setEvents(events);
    } catch (error) {
      store.addError(error);
    } finally {
      store.setLoading(false);
    }
  };

  return { loadEvents };
};
```

## Implementation Components

### 1. Logo Component

```typescript
interface LogoProps {
  onComplete: () => void;
}

- Display ASCII art with gradient colors
- Fade in animation over 500ms
- Auto-transition after 1.5s
- Skip on any key press
```

### 2. Main Menu Component

```typescript
interface MainMenuProps {
  serverStatus: ServerStatus;
  onSelect: (option: MenuOption) => void;
}

- Vertical list of options
- Arrow key navigation
- Highlighted selection
- Icon + label + description
- Server status in header
```

### 3. Event Inspector Component

```typescript
interface EventInspectorProps {
  events: Event[];
  onSelect: (event: Event) => void;
  onFilter: (filters: FilterOptions) => void;
}

- Table view with columns
- Sortable by any column
- Filter bar at top
- Search functionality
- Pagination controls
```

### 4. Event Detail Component

```typescript
interface EventDetailProps {
  event: Event;
  onClose: () => void;
  onAction: (action: DetailAction) => void;
}

- Tabbed interface (Arguments/Result/Raw)
- Syntax highlighted code
- Expandable sections
- Action buttons (Copy/Export/View)
```

### 5. Stream View Component with Virtual Scrolling

```typescript
interface StreamViewProps {
  onEventSelect: (event: Event) => void;
  onPause: () => void;
  onFilter: (filter: string) => void;
}

// Virtual scrolling implementation - since Ink doesn't have built-in support
// See: https://github.com/vadimdemedes/ink/issues/222 (Scrolling discussion)
// See: https://github.com/vadimdemedes/ink/issues/432 (Box overflow and scrolling)
// As confirmed by Vadim Demedes: "custom scrolling implementation is the way to go"
export const VirtualList: React.FC<{
  items: any[];
  height: number;  // Terminal rows available
  renderItem: (item: any, index: number) => React.ReactNode;
}> = ({ items, height, renderItem }) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const { stdout } = useStdout();

  // Calculate visible window
  const itemsPerPage = height - 2; // Account for borders
  const startIndex = scrollOffset;
  const endIndex = Math.min(startIndex + itemsPerPage, items.length);
  const visibleItems = items.slice(startIndex, endIndex);

  useInput((input, key) => {
    if (key.upArrow) {
      setScrollOffset(Math.max(0, scrollOffset - 1));
    }
    if (key.downArrow) {
      setScrollOffset(Math.min(items.length - itemsPerPage, scrollOffset + 1));
    }
    if (key.pageUp) {
      setScrollOffset(Math.max(0, scrollOffset - itemsPerPage));
    }
    if (key.pageDown) {
      setScrollOffset(Math.min(items.length - itemsPerPage, scrollOffset + itemsPerPage));
    }
  });

  return (
    <Box flexDirection="column" height={height}>
      {/* Scroll indicator */}
      <Box>
        <Text>
          {startIndex + 1}-{endIndex} of {items.length} events
        </Text>
      </Box>

      {/* Visible items only - true virtual scrolling */}
      {visibleItems.map((item, i) => (
        <Box key={startIndex + i}>
          {renderItem(item, startIndex + i)}
        </Box>
      ))}

      {/* Scrollbar visualization */}
      <Box flexDirection="column" position="absolute" right={0}>
        {Array.from({ length: height }).map((_, i) => {
          const scrollProgress = scrollOffset / (items.length - itemsPerPage);
          const scrollbarPosition = Math.floor(scrollProgress * height);
          return (
            <Text key={i}>
              {i === scrollbarPosition ? '█' : '│'}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
};

- Virtual scrolling (only renders visible items)
- Pause/resume controls
- Buffer management (keeps all events in memory, only renders visible)
- Split-screen detail view
- Real-time filtering
- Custom scrollbar indicator
```

### 6. Configuration Menu Component

```typescript
interface ConfigMenuProps {
  onClose: () => void;
  onApply: (config: ConfigSettings) => void;
}

- Theme selector with live preview
- Server configuration form (address, port, auth)
- Display preferences (animations, compact mode)
- Event buffer size setting
- Keybinding customization
- Import/Export configuration
- Apply/Cancel/Reset buttons
```

## Test-Driven Development with ink-testing-library

### CRITICAL: TDD/ATDD Approach

**ALL CODE MUST BE TEST-DRIVEN - NO EXCEPTIONS**

Every component and feature MUST follow this strict TDD/ATDD workflow:

1. **Write the test FIRST** - Test must fail initially
2. **Run the test** - Verify it fails for the right reason
3. **Write minimal code** - Just enough to make test pass
4. **Refactor** - Clean up while keeping tests green
5. **Repeat** - Continue until acceptance criteria met

### Testing Framework Setup

```typescript
// vitest.config.ts for CLI package
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: './test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/*.test.tsx', '**/*.spec.tsx', 'test/**'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
```

```typescript
// test/setup.ts - Global test setup
import { cleanup } from 'ink-testing-library';
import { afterEach, vi } from 'vitest';

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock terminal dimensions
vi.mock('ink-use-stdout-dimensions', () => ({
  default: () => ({ columns: 80, rows: 24 }),
}));
```

### Acceptance Test Examples (Given-When-Then)

Each acceptance criteria from PHASE2.md must have corresponding tests:

```typescript
// packages/cli/src/components/__tests__/Logo.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, cleanup } from 'ink-testing-library';
import { Logo } from '../Logo';

describe('Story 1: Developer Launches Interactive Mode', () => {
  describe('Acceptance: Logo displays with gradient colors', () => {
    it('Given the developer launches cage without arguments, ' +
       'When the application starts, ' +
       'Then the logo should display with aqua gradient colors', () => {
      // Arrange
      const onComplete = vi.fn();

      // Act
      const { lastFrame } = render(
        <Logo onComplete={onComplete} skipDelay={true} />
      );

      // Assert
      expect(lastFrame()).toContain('██████╗ █████╗  ██████╗ ███████╗');
      expect(lastFrame()).toContain('Code Alignment Guard Engine');
      // Note: ink-testing-library strips colors, test color application separately
    });
  });

  describe('Acceptance: Logo shows for 1.5 seconds with fade-in', () => {
    it('Given the logo is displayed, ' +
       'When 1.5 seconds pass, ' +
       'Then onComplete callback should be called', async () => {
      // Arrange
      vi.useFakeTimers();
      const onComplete = vi.fn();

      // Act
      render(<Logo onComplete={onComplete} />);

      // Assert - Initially not called
      expect(onComplete).not.toHaveBeenCalled();

      // Fast-forward time
      vi.advanceTimersByTime(1500);

      // Assert - Now called
      expect(onComplete).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });
});
```

### Component Testing Patterns

#### Testing User Input and Navigation

```typescript
// packages/cli/src/components/__tests__/MainMenu.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { MainMenu } from '../MainMenu';

describe('Story 4: Developer Navigates with Keyboard', () => {
  describe('Acceptance: Arrow keys move selection up/down', () => {
    it('Given the main menu is displayed with multiple options, ' +
       'When the user presses arrow down, ' +
       'Then the next menu item should be selected', () => {
      // Arrange
      const onSelect = vi.fn();
      const { stdin, lastFrame } = render(
        <MainMenu onSelect={onSelect} />
      );

      // Act - Initial state
      expect(lastFrame()).toContain('▶  📊 Events Inspector');

      // Act - Press arrow down
      stdin.write('\u001B[B'); // Down arrow escape sequence

      // Assert - Selection moved
      expect(lastFrame()).toContain('▶  📡 Real-time Monitor');
    });
  });

  describe('Acceptance: Enter selects/activates', () => {
    it('Given a menu item is selected, ' +
       'When the user presses Enter, ' +
       'Then the onSelect callback should be called with that item', () => {
      // Arrange
      const onSelect = vi.fn();
      const { stdin } = render(<MainMenu onSelect={onSelect} />);

      // Act
      stdin.write('\r'); // Enter key

      // Assert
      expect(onSelect).toHaveBeenCalledWith('events');
    });
  });

  describe('Acceptance: Escape goes back/cancels', () => {
    it('Given the main menu is displayed, ' +
       'When the user presses Escape, ' +
       'Then the application should exit', () => {
      // Arrange
      const onExit = vi.fn();
      const { stdin } = render(<MainMenu onExit={onExit} />);

      // Act
      stdin.write('\u001B'); // Escape key

      // Assert
      expect(onExit).toHaveBeenCalled();
    });
  });
});
```

#### Testing State Management with Zustand

```typescript
// packages/cli/src/stores/__tests__/appStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from 'ink-testing-library';
import { useAppStore } from '../appStore';

describe('App Store State Management', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAppStore.setState({
      currentView: 'menu',
      events: [],
      selectedEvent: null,
    });
  });

  describe('Navigation Stack Management', () => {
    it(
      'Given the user is on the main menu, ' +
        'When they navigate to events view, ' +
        'Then the navigation stack should track the history',
      () => {
        // Arrange
        const { result } = renderHook(() => useAppStore());

        // Act
        act(() => {
          result.current.navigate('events');
        });

        // Assert
        expect(result.current.currentView).toBe('events');
        expect(result.current.navigationStack).toEqual(['menu']);

        // Act - Go back
        act(() => {
          result.current.goBack();
        });

        // Assert
        expect(result.current.currentView).toBe('menu');
        expect(result.current.navigationStack).toEqual([]);
      }
    );
  });

  describe('Event Filtering', () => {
    it(
      'Given a list of events with different types, ' +
        'When a filter is applied for PreToolUse events, ' +
        'Then only PreToolUse events should be in filteredEvents',
      () => {
        // Arrange
        const { result } = renderHook(() => useAppStore());
        const events = [
          { id: '1', type: 'PreToolUse', tool: 'Edit' },
          { id: '2', type: 'PostToolUse', tool: 'Bash' },
          { id: '3', type: 'PreToolUse', tool: 'Read' },
        ];

        // Act
        act(() => {
          result.current.setEvents(events);
          result.current.applyFilter({ type: 'PreToolUse' });
        });

        // Assert
        expect(result.current.filteredEvents).toHaveLength(2);
        expect(result.current.filteredEvents[0].type).toBe('PreToolUse');
        expect(result.current.filteredEvents[1].type).toBe('PreToolUse');
      }
    );
  });
});
```

#### Testing Event Streaming

```typescript
// packages/cli/src/components/__tests__/StreamView.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, cleanup } from 'ink-testing-library';
import { StreamView } from '../StreamView';
import { useStreamStore } from '../../stores/streamStore';

describe('Story 3: Developer Monitors Events in Real-Time', () => {
  describe('Acceptance: Events appear in scrollable list', () => {
    it('Given the stream view is active, ' +
       'When new events arrive, ' +
       'Then they should appear in the list', async () => {
      // Arrange
      const { lastFrame, rerender } = render(<StreamView />);

      // Act - Simulate event arrival
      act(() => {
        useStreamStore.getState().addEvent({
          id: '1',
          type: 'PreToolUse',
          tool: 'Edit',
          timestamp: new Date().toISOString()
        });
      });

      rerender(<StreamView />);

      // Assert
      expect(lastFrame()).toContain('PreToolUse');
      expect(lastFrame()).toContain('Edit');
    });
  });

  describe('Acceptance: Press Space to pause streaming', () => {
    it('Given events are streaming, ' +
       'When the user presses Space, ' +
       'Then streaming should pause', () => {
      // Arrange
      const { stdin, lastFrame } = render(<StreamView />);

      // Initial state - streaming
      expect(lastFrame()).toContain('Streaming');

      // Act - Press space
      stdin.write(' ');

      // Assert - Paused
      expect(lastFrame()).toContain('Paused');
    });
  });

  describe('Acceptance: Scroll through history while paused', () => {
    it('Given streaming is paused with multiple events, ' +
       'When the user presses arrow keys, ' +
       'Then they should be able to scroll through events', () => {
      // Arrange - Add multiple events
      const events = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        type: 'PreToolUse',
        tool: `Tool${i}`,
        timestamp: new Date().toISOString()
      }));

      const { stdin, lastFrame } = render(
        <StreamView initialEvents={events} isPaused={true} />
      );

      // Act - Scroll down
      stdin.write('\u001B[B'); // Down arrow

      // Assert - Selection moved
      const frame = lastFrame();
      expect(frame).toContain('Tool1'); // Second item selected
    });
  });
});
```

#### Testing Animations and Visual Effects

```typescript
// packages/cli/src/components/__tests__/AnimatedLogo.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { AnimatedLogo } from '../AnimatedLogo';

describe('Logo Animation Specifications', () => {
  describe('Loading Phase Animation', () => {
    it('Given the logo is in loading phase, ' +
       'When rendered, ' +
       'Then it should show a spinner with "Initializing Cage..." text', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <AnimatedLogo phase="loading" />
      );

      // Assert
      expect(lastFrame()).toContain('Initializing Cage...');
      // Note: Spinner animation frames would be tested with snapshots
    });
  });

  describe('Reveal Phase Animation', () => {
    it('Given the logo transitions to reveal phase, ' +
       'When the animation completes, ' +
       'Then the full ASCII art should be visible', () => {
      // Arrange
      const { lastFrame, rerender } = render(
        <AnimatedLogo phase="loading" />
      );

      // Act - Transition to reveal
      rerender(<AnimatedLogo phase="revealing" />);

      // Assert
      const frame = lastFrame();
      expect(frame).toContain('██████╗ █████╗  ██████╗ ███████╗');
      expect(frame).toContain('Code Alignment Guard Engine');
    });
  });
});
```

#### Testing Event Details Inspection

```typescript
// packages/cli/src/components/__tests__/EventDetail.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { EventDetail } from '../EventDetail';

describe('Story 2: Developer Inspects Event Details', () => {
  describe('Acceptance: View original file content for Edit events', () => {
    it('Given an Edit event with file content, ' +
       'When the event detail is displayed, ' +
       'Then the original file content should be visible', () => {
      // Arrange
      const editEvent = {
        id: '1',
        type: 'PostToolUse',
        tool: 'Edit',
        arguments: {
          file_path: '/src/index.ts',
          old_string: 'const x = 1;',
          new_string: 'const x = 2;'
        },
        result: {
          fileContent: 'const x = 1;\nconsole.log(x);',
          success: true
        }
      };

      // Act
      const { lastFrame } = render(
        <EventDetail event={editEvent} />
      );

      // Assert
      expect(lastFrame()).toContain('/src/index.ts');
      expect(lastFrame()).toContain('const x = 1;');
      expect(lastFrame()).toContain('console.log(x);');
    });
  });

  describe('Acceptance: View command output for Bash events', () => {
    it('Given a Bash event with command output, ' +
       'When the event detail is displayed, ' +
       'Then the command and its output should be visible', () => {
      // Arrange
      const bashEvent = {
        id: '2',
        type: 'PostToolUse',
        tool: 'Bash',
        arguments: {
          command: 'npm test'
        },
        result: {
          output: 'Test Suites: 5 passed, 5 total',
          exitCode: 0
        }
      };

      // Act
      const { lastFrame } = render(
        <EventDetail event={bashEvent} />
      );

      // Assert
      expect(lastFrame()).toContain('npm test');
      expect(lastFrame()).toContain('Test Suites: 5 passed, 5 total');
      expect(lastFrame()).toContain('Exit Code: 0');
    });
  });
});
```

### Integration Testing

```typescript
// packages/cli/src/__tests__/integration/app.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../../App';

describe('Full Application Integration', () => {
  describe('Complete Navigation Flow', () => {
    it('Given the application starts, ' +
       'When the user navigates through multiple screens, ' +
       'Then the navigation should work correctly', async () => {
      // Arrange
      const { stdin, lastFrame } = render(<App />);

      // Assert - Logo shows first
      expect(lastFrame()).toContain('CAGE');

      // Wait for logo to complete
      await vi.advanceTimersByTimeAsync(1600);

      // Assert - Main menu appears
      expect(lastFrame()).toContain('Events Inspector');

      // Act - Navigate to events
      stdin.write('\r'); // Enter on first item

      // Assert - Events view
      expect(lastFrame()).toContain('Event History');

      // Act - Press ESC to go back
      stdin.write('\u001B');

      // Assert - Back at main menu
      expect(lastFrame()).toContain('Events Inspector');
    });
  });

  describe('Event Stream to Detail Flow', () => {
    it('Given the user is viewing the event stream, ' +
       'When they select an event and press Enter, ' +
       'Then the event details should appear in split view', () => {
      // Test the complete flow from stream to detail inspection
      // This ensures all components work together correctly
    });
  });
});
```

### Performance Testing

```typescript
// packages/cli/src/__tests__/performance/eventList.perf.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { EventList } from '../../components/EventList';

describe('Event List Performance', () => {
  it('Should handle 1000+ events smoothly', () => {
    // Generate large dataset
    const events = Array.from({ length: 1500 }, (_, i) => ({
      id: `event-${i}`,
      type: 'PreToolUse',
      tool: 'Edit',
      timestamp: new Date().toISOString()
    }));

    // Measure render time
    const startTime = performance.now();
    const { lastFrame } = render(
      <EventList events={events} />
    );
    const renderTime = performance.now() - startTime;

    // Assert - Should render within acceptable time
    expect(renderTime).toBeLessThan(100); // 100ms threshold

    // Assert - Virtual scrolling working (check frame output)
    const frame = lastFrame();
    const visibleEventCount = (frame.match(/event-/g) || []).length;
    expect(visibleEventCount).toBeLessThan(50); // Only visible items rendered
  });
});
```

### Mock and Stub Patterns

```typescript
// packages/cli/src/__tests__/mocks/eventService.ts
import { vi } from 'vitest';

export const mockEventService = {
  fetchEvents: vi.fn().mockResolvedValue([
    { id: '1', type: 'PreToolUse', tool: 'Edit' },
    { id: '2', type: 'PostToolUse', tool: 'Bash' },
  ]),

  streamEvents: vi.fn().mockImplementation(callback => {
    // Simulate SSE stream
    const interval = setInterval(() => {
      callback({
        id: Date.now().toString(),
        type: 'PreToolUse',
        tool: 'Read',
      });
    }, 1000);

    return () => clearInterval(interval);
  }),
};
```

### Test Coverage Requirements

All components must meet these coverage thresholds:

```json
{
  "coverage": {
    "branches": 80,
    "functions": 80,
    "lines": 80,
    "statements": 80,
    "perFile": true,
    "include": [
      "src/**/*.{ts,tsx}",
      "!src/**/*.test.{ts,tsx}",
      "!src/**/*.spec.{ts,tsx}"
    ]
  }
}
```

### Testing Checklist

Before marking any acceptance criteria as complete:

- [ ] **Test Written First** - Test exists and initially fails
- [ ] **Given-When-Then Format** - Test describes acceptance criteria
- [ ] **Minimal Implementation** - Only code to pass test
- [ ] **All Paths Covered** - Happy path, edge cases, errors
- [ ] **Keyboard Interactions** - All shortcuts tested
- [ ] **State Changes** - Zustand store updates verified
- [ ] **Visual Output** - Frame content matches expectations
- [ ] **Performance** - Renders within acceptable time
- [ ] **Cross-platform** - Tests pass on Windows/Mac/Linux
- [ ] **Coverage Met** - Minimum 80% coverage achieved

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode during development
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run performance tests
npm run test:perf

# Run specific test file
npm test -- Logo.test.tsx
```

### Test-First Development Flow

For each new feature:

1. **Create test file** before implementation file
2. **Write failing test** for first acceptance criteria
3. **Run test** - verify it fails correctly
4. **Write minimal code** to make test pass
5. **Run test** - verify it passes
6. **Refactor** if needed, keeping test green
7. **Repeat** for next acceptance criteria

Example workflow:

```bash
# 1. Create test first
touch packages/cli/src/components/__tests__/NewFeature.test.tsx

# 2. Write failing test (in editor)

# 3. Run test - should fail
npm test -- NewFeature.test.tsx

# 4. Create implementation file
touch packages/cli/src/components/NewFeature.tsx

# 5. Write minimal implementation

# 6. Run test - should pass
npm test -- NewFeature.test.tsx

# 7. Refactor and enhance with more tests
```

### Test Categories

## Development Methodology

### Phase 2 ACDD Process

1. **Review acceptance criteria** from PHASE2.md
2. **Create Ink component skeleton** with props interface
3. **Write component tests** using ink-testing-library
4. **Implement component logic** to pass tests
5. **Add styling and colors** per design spec
6. **Test keyboard interaction** thoroughly
7. **Integrate with state management**
8. **Document component API**

### Critical Rules

- **Professional appearance** - Consistent colors and spacing
- **Smooth animations** - No jarring transitions
- **Keyboard-first** - Everything accessible without mouse
- **Performance** - Handle 1000+ events smoothly
- **Error handling** - Graceful degradation
- **Cross-platform** - Works on Windows/Mac/Linux

## Animation Specifications

### Core Animation Libraries

```typescript
// Essential animation packages
import Spinner from 'ink-spinner';
import ProgressBar from 'ink-progress-bar';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import { Text } from 'ink-text-animation';
import MultiSelect from 'ink-multi-select';
import Link from 'ink-link';
import Divider from 'ink-divider';
import TaskList from 'ink-task-list';
import figures from 'figures';

// Animation types from cli-spinners
type SpinnerType =
  | 'dots'
  | 'dots2'
  | 'dots3'
  | 'dots4'
  | 'dots5'
  | 'line'
  | 'pipe'
  | 'star'
  | 'star2'
  | 'arc'
  | 'bouncingBall'
  | 'bouncingBar'
  | 'pulse'
  | 'aesthetic';
```

### Logo Animation Sequence

```typescript
export const AnimatedLogo: React.FC = () => {
  const [phase, setPhase] = useState<'loading' | 'revealing' | 'complete'>('loading');

  return (
    <>
      {phase === 'loading' && (
        <Box justifyContent="center" alignItems="center" height={10}>
          <Spinner type="aesthetic" />
          <Text color="#4ECDC4"> Initializing Cage...</Text>
        </Box>
      )}

      {phase === 'revealing' && (
        <Box flexDirection="column" alignItems="center">
          <Text>
            <TextAnimation animation="pulse" speed={100}>
              {gradient(['#7FDBFF', '#01B4C6', '#007A8C']).multiline(logoArt)}
            </TextAnimation>
          </Text>
        </Box>
      )}
    </>
  );
};
```

### Custom Task List Component (Built from Scratch)

```typescript
// Since Ink is React, we build our own TaskList component!
import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from '@inkjs/ui';
import figures from 'figures';

interface Task {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  message?: string;
}

export const TaskList: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const getStatusIcon = (status: Task['status']) => {
    const theme = getTheme();
    switch (status) {
      case 'pending':
        return <Text color={theme.ui.textDim}>{figures.circle}</Text>;
      case 'running':
        return <Spinner type="dots" />;
      case 'success':
        return <Text color={theme.status.success}>{figures.tick}</Text>;
      case 'error':
        return <Text color={theme.status.error}>{figures.cross}</Text>;
      case 'skipped':
        return <Text color={theme.ui.textMuted}>{figures.arrowRight}</Text>;
    }
  };

  return (
    <Box flexDirection="column">
      {tasks.map(task => (
        <Box key={task.id} gap={1}>
          {getStatusIcon(task.status)}
          <Text
            color={
              task.status === 'running' ? theme.primary.main :
              task.status === 'error' ? theme.status.error :
              task.status === 'success' ? theme.status.success :
              theme.ui.text
            }
            strikethrough={task.status === 'skipped'}
          >
            {task.label}
          </Text>
          {task.message && (
            <Text color={theme.ui.textDim}>
              ({task.message})
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
};
```

### Loading States with Spinners

```typescript
// Different spinner types for different operations
const spinnerStyles = {
  loading: { type: 'dots', color: '#01B4C6' },
  processing: { type: 'arc', color: '#4ECDC4' },
  saving: { type: 'star2', color: '#52D1A4' },
  connecting: { type: 'bouncingBar', color: '#7FDBFF' },
  streaming: { type: 'line', color: '#00A8B5' },
  error: { type: 'pulse', color: '#FF6B6B' }
};

export const LoadingState: React.FC<{operation: string}> = ({ operation }) => (
  <Box>
    <Spinner {...spinnerStyles[operation]} />
    <Text color="#94A3B8"> {operation}...</Text>
  </Box>
);
```

### Progress Indicators

```typescript
// Multi-stage progress with animations
export const MultiStageProgress: React.FC = () => {
  const stages = [
    { label: 'Connecting to server', progress: 1.0, status: 'complete' },
    { label: 'Loading events', progress: 0.6, status: 'active' },
    { label: 'Processing data', progress: 0, status: 'pending' }
  ];

  return (
    <Box flexDirection="column" gap={1}>
      <TaskList tasks={stages.map(stage => ({
        label: stage.label,
        state: stage.status === 'complete' ? 'success' :
               stage.status === 'active' ? 'loading' : 'pending',
        spinner: stage.status === 'active' ? 'dots' : undefined
      }))} />

      {stages.map(stage => stage.status === 'active' && (
        <ProgressBar
          key={stage.label}
          percent={stage.progress}
          columns={40}
          character="█"
          color="#01B4C6"
        />
      ))}
    </Box>
  );
};
```

### Transition Animations

```typescript
// Smooth transitions between views
export const ViewTransition: React.FC = ({ children, isEntering }) => {
  const [opacity, setOpacity] = useState(isEntering ? 0 : 1);

  useEffect(() => {
    const steps = 10;
    let current = 0;

    const interval = setInterval(() => {
      current++;
      setOpacity(isEntering ? current / steps : (steps - current) / steps);

      if (current >= steps) {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isEntering]);

  return (
    <Box opacity={opacity}>
      {children}
    </Box>
  );
};
```

### Event Stream Animations

```typescript
// Animated event stream with live updates
export const AnimatedEventStream: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [newEventFlash, setNewEventFlash] = useState<string | null>(null);

  return (
    <Box flexDirection="column">
      {/* Stream status with animated indicator */}
      <Box>
        <Spinner type="dots" color="#00A8B5" />
        <Text color="#4ECDC4"> Streaming </Text>
        <Text color="#94A3B8">({events.length} events)</Text>
      </Box>

      {/* Animated divider */}
      <Box marginY={1}>
        <TextAnimation animation="rainbow" speed={50}>
          <Divider title="═══ Live Events ═══" />
        </TextAnimation>
      </Box>

      {/* Event list with flash animation for new items */}
      {events.map(event => (
        <Box key={event.id}>
          {newEventFlash === event.id ? (
            <TextAnimation animation="glitch" iterations={1}>
              <EventRow event={event} highlight />
            </TextAnimation>
          ) : (
            <EventRow event={event} />
          )}
        </Box>
      ))}
    </Box>
  );
};
```

### Interactive Selection with Animation

```typescript
// Animated multi-select for filters
export const AnimatedFilterSelect: React.FC = () => {
  const filterOptions = [
    { label: '📊 PreToolUse', value: 'pre-tool' },
    { label: '✅ PostToolUse', value: 'post-tool' },
    { label: '💬 UserPromptSubmit', value: 'prompt' },
    { label: '🔄 SessionStart', value: 'session-start' },
    { label: '🏁 SessionEnd', value: 'session-end' }
  ];

  return (
    <Box>
      <Text color="#4ECDC4" bold>
        <TextAnimation animation="pulse" speed={200}>
          Select Event Types to Filter:
        </TextAnimation>
      </Text>

      <MultiSelect
        items={filterOptions}
        onSubmit={(items) => console.log(items)}
        indicatorComponent={({ isSelected }) => (
          <Text color={isSelected ? '#52D1A4' : '#94A3B8'}>
            {isSelected ? figures.checkboxOn : figures.checkboxOff}
          </Text>
        )}
      />
    </Box>
  );
};
```

### Status Indicators with Animations

```typescript
// Animated status badges
export const StatusBadge: React.FC<{status: string}> = ({ status }) => {
  const statusConfig = {
    running: { icon: '●', color: '#52D1A4', animation: 'pulse' },
    stopped: { icon: '○', color: '#94A3B8', animation: null },
    error: { icon: '✗', color: '#FF6B6B', animation: 'flash' },
    connecting: { icon: '◐', color: '#F4D03F', animation: 'spin' }
  };

  const config = statusConfig[status];

  return (
    <Text color={config.color}>
      {config.animation ? (
        <TextAnimation animation={config.animation} speed={100}>
          {config.icon} {status.toUpperCase()}
        </TextAnimation>
      ) : (
        `${config.icon} ${status.toUpperCase()}`
      )}
    </Text>
  );
};
```

### Split View Implementation (No Overlays)

```typescript
// Split view for event details - no popups blocking content
export const EventSplitView: React.FC = ({ event, onClose }) => {
  return (
    <Box flexDirection="row" height="100%">
      {/* Left side - Event list (compressed) */}
      <Box width="40%" borderStyle="single" borderColor="#1A3A52">
        <EventList compressed={true} />
      </Box>

      {/* Right side - Event details */}
      <Box width="60%" paddingLeft={1}>
        <Box borderStyle="single" borderColor="#2C5282">
          <Text color="#4ECDC4" bold>Event Details</Text>
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Text color="#6B8CAE">Type: </Text>
          <Text color="#7FDBFF">{event.type}</Text>

          <Text color="#6B8CAE">Tool: </Text>
          <Text color="#01B4C6">{event.tool}</Text>

          {/* Expandable sections - inline, no overlays */}
          <Box marginTop={1}>
            <Text color="#6B8CAE">▼ Result Data</Text>
            <Box paddingLeft={2} borderLeft borderColor="#1A3A52">
              <Text color="#E8F4F8">{JSON.stringify(event.result, null, 2)}</Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
```

### Inline Expansion (No Popups)

```typescript
// Inline expansion for file content - doesn't cover other info
export const InlineFileViewer: React.FC = ({ filePath, content }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box flexDirection="column">
      <Box>
        <Text
          color="#7FDBFF"
          bold
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '▼' : '▶'} {filePath}
        </Text>
      </Box>

      {expanded && (
        <Box
          marginTop={1}
          paddingLeft={2}
          borderLeft
          borderColor="#1A3A52"
        >
          <SyntaxHighlight
            code={content}
            language="typescript"
            theme={{
              keyword: '#FF6B6B',
              string: '#52D1A4',
              comment: '#6B8CAE',
              function: '#4ECDC4',
            }}
          />
        </Box>
      )}
    </Box>
  );
};
```

### Loading Skeleton Animation

```typescript
// Skeleton loader for event details
export const SkeletonLoader: React.FC = () => {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => (p + 1) % 3);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const color = ['#1E3A5F', '#2C5282', '#4A90A4'][pulse];

  return (
    <Box flexDirection="column" gap={1}>
      {[1, 2, 3].map(i => (
        <Box key={i} width={60} height={1}>
          <Text backgroundColor={color}>
            {'█'.repeat(60 - i * 10)}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
```

## Success Metrics

Phase 2 is successful when:

- ✅ Interactive TUI launches with `cage` command
- ✅ Professional appearance with consistent theming
- ✅ All navigation via keyboard shortcuts
- ✅ Event inspection shows complete data
- ✅ Real-time streaming with pause/scroll
- ✅ Performance handles 1000+ events
- ✅ Debug mode provides useful diagnostics
- ✅ All existing CLI commands still work
- ✅ Cross-platform compatibility verified

## Keyboard Shortcuts Reference

### Global Shortcuts (Available Everywhere)

```
Q           - Quit application (with confirmation)
?/H         - Show context-sensitive help
ESC         - Go back / Cancel / Close
Tab         - Switch between panels/sections
Ctrl+C      - Force quit (emergency exit)
Ctrl+L      - Clear/refresh screen
```

### Navigation Shortcuts

```
↑/↓         - Move selection up/down
←/→         - Move between columns/tabs
Home        - Jump to first item
End         - Jump to last item
PgUp/PgDn   - Page up/down (10 items)
Enter       - Select/activate item
Space       - Toggle selection/pause
```

### Event Inspector Shortcuts

```
/           - Search in events
F           - Open filter menu
S           - Sort by column
R           - Refresh event list
E           - Export selected events
C           - Copy event to clipboard
D           - Show raw data (JSON)
```

### Stream View Shortcuts

```
Space/P     - Pause/resume streaming
↑/↓         - Scroll through paused events
Enter       - Inspect event in detail
F           - Filter events
M           - Mark event for comparison
C           - Compare marked events
T           - Jump to timestamp
N/P         - Next/Previous of same type
```

## Example Component Implementation

### Logo Component with Aqua Theme

```typescript
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import gradient from 'gradient-string';
import { theme } from '../theme';

interface LogoProps {
  onComplete: () => void;
  skipDelay?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ onComplete, skipDelay }) => {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Fade in animation
    const fadeIn = setInterval(() => {
      setOpacity(prev => Math.min(prev + 0.1, 1));
    }, 50);

    // Auto-transition after 1.5s
    const timer = setTimeout(() => {
      clearInterval(fadeIn);
      onComplete();
    }, skipDelay ? 0 : 1500);

    return () => {
      clearInterval(fadeIn);
      clearTimeout(timer);
    };
  }, [onComplete, skipDelay]);

  const aquaGradient = gradient(['#7FDBFF', '#01B4C6', '#007A8C']);

  const logoArt = `
 ██████╗ █████╗  ██████╗ ███████╗
██╔════╝██╔══██╗██╔════╝ ██╔════╝
██║     ███████║██║  ███╗█████╗
██║     ██╔══██║██║   ██║██╔══╝
╚██████╗██║  ██║╚██████╔╝███████╗
 ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝`;

  return (
    <Box flexDirection="column" alignItems="center" marginTop={2}>
      <Text dimColor={opacity < 1}>
        {aquaGradient.multiline(logoArt)}
      </Text>
      <Box marginTop={1}>
        <Text color="#4ECDC4">
          Code Alignment Guard Engine
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="#94A3B8" dimColor>
          A controlled environment for AI development
        </Text>
      </Box>
      <Text color="#94A3B8" dimColor>
        Version {process.env.npm_package_version || '0.0.1'}
      </Text>
    </Box>
  );
};
```

### Main Menu with Professional Styling

```typescript
import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { theme } from '../theme';

interface MenuItem {
  label: string;
  value: string;
  description: string;
  icon: string;
}

const menuItems: MenuItem[] = [
  {
    label: 'Events Inspector',
    value: 'events',
    description: 'Browse & analyze events',
    icon: '📊'
  },
  {
    label: 'Real-time Monitor',
    value: 'stream',
    description: 'Stream live events',
    icon: '📡'
  },
  {
    label: 'Server Management',
    value: 'server',
    description: 'Start/stop/status',
    icon: '🖥️'
  },
  // ... more items
];

export const MainMenu: React.FC = () => {
  const handleSelect = (item: any) => {
    // Navigate to selected screen
  };

  const renderItem = (item: MenuItem, isSelected: boolean) => (
    <Box>
      <Text color={isSelected ? '#7FDBFF' : '#E8F4F8'} bold={isSelected}>
        {isSelected ? '▶ ' : '  '}
        {item.icon} {item.label}
      </Text>
      <Text color="#6B8CAE" dimColor>
        {'    '}{item.description}
      </Text>
    </Box>
  );

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header with subtle border */}
      <Box marginBottom={1} borderStyle="round" borderColor="#1A3A52" justifyContent="space-between">
        <Text color="#4ECDC4" bold>
          CAGE | Code Alignment Guard Engine
        </Text>
        <Box>
          <Text dimColor>Server: </Text>
          <Text color="#28A745">● running</Text>
        </Box>
      </Box>

      {/* Menu items - no background, just text colors */}
      <SelectInput
        items={menuItems}
        onSelect={handleSelect}
        itemComponent={renderItem}
        indicatorComponent={() => null}
      />

      {/* Footer shortcuts - subtle border */}
      <Box marginTop={1} borderStyle="single" borderColor="#1A3A52">
        <Text color="#6B8CAE">
          ↑↓ Navigate  ↵ Select  ESC Exit  ? Help
        </Text>
      </Box>
    </Box>
  );
};
```

## Package Dependencies

```json
{
  "dependencies": {
    // State Management
    "zustand": "latest", // v5+ for React 18 support

    // Core Ink & React
    "ink": "latest", // v6.3.0+
    "react": "latest", // Required for Ink
    "ink-testing-library": "latest",

    // Essential UI Components
    "ink-box": "latest",
    "ink-text-input": "latest", // v6.0.0+
    "ink-select-input": "latest",
    "ink-multi-select": "latest",
    "ink-table": "latest", // v3.1.0+
    "ink-link": "latest",
    "ink-divider": "latest",
    "ink-form": "latest",
    "@inkjs/ui": "latest", // New unified UI library

    // Animation & Visual Effects
    "ink-spinner": "latest", // v5.0.0+
    "ink-progress-bar": "latest",
    "ink-gradient": "latest", // v3.0.0+
    "ink-big-text": "latest",
    "ink-ascii": "latest",
    "ink-text-animation": "latest",
    "ink-task-list": "latest",

    // Syntax & Code Display
    "ink-syntax-highlight": "latest",
    "ink-markdown": "latest",
    "ink-code-highlight": "latest",
    "ink-highlight-command": "latest",

    // Color & Styling
    "chalk": "latest", // v5+ for ESM support
    "gradient-string": "latest",
    "cli-spinners": "latest", // Spinner definitions for ink-spinner
    "figures": "latest", // Unicode symbols
    "cli-boxes": "latest", // Box-drawing characters

    // Ink-specific utilities
    "ink-use-stdout-dimensions": "latest", // Hook for terminal dimensions
    "ink-overflow-list": "latest", // Scrollable lists
    "ink-confirm-input": "latest", // Yes/No confirmation
    "ink-password-input": "latest", // Password input field
    "ink-quicksearch-input": "latest", // Search with suggestions

    // Additional Utilities
    "nanoid": "latest", // For unique IDs
    "date-fns": "latest", // Date formatting
    "immer": "latest", // For Zustand immer middleware

    // TypeScript Types (if using TypeScript)
    "@types/react": "latest",
    "@types/node": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "vite": "latest",
    "vite-node": "latest",
    "@types/gradient-string": "latest",
    "@types/figlet": "latest"
  }
}
```

### Animation Packages Breakdown

1. **Visual Components**:
   - `ink-spinner`: 14 different spinner types (dots, arc, star, etc.)
   - `ink-progress-bar`: Customizable progress bars
   - `ink-gradient`: Gradient text effects
   - `ink-big-text`: Large ASCII art text
   - `ink-ascii`: Additional ASCII art fonts via Figlet
   - `ink-text-animation`: Text animations (pulse, flash, rainbow, glitch)

2. **Interactive Components**:
   - `ink-multi-select`: Animated checkbox selection
   - `ink-task-list`: Task lists with status indicators
   - `ink-form`: Animated form inputs

3. **Supporting Libraries**:
   - `cli-spinners`: 70+ spinner animations
   - `cli-boxes`: Box drawing styles for borders
   - `figures`: Unicode symbols and icons

## Remember

> **User Experience First → Functionality Second → Performance Third**

Every feature must be intuitive and visually appealing before optimization.
