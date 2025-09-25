# Phase 2: Component Library

## Core Components

### Logo ✅ Complete

**Location**: `packages/cli/src/components/Logo.tsx`

ASCII art splash screen with gradient animation.

```typescript
interface LogoProps {
  onComplete: () => void;
  skipDelay?: boolean;
}
```

**Features**:

- Aqua gradient coloring (#7FDBFF → #01B4C6 → #007A8C)
- 1.5-second display duration
- Fade-in animation effect
- Version display from package.json
- Auto-transition to main menu

### MainMenu ✅ Complete

**Location**: `packages/cli/src/components/MainMenu.tsx`

Central navigation hub for all features.

```typescript
interface MenuItem {
  label: string;
  value: ViewType;
  description: string;
  icon: string;
}
```

**Features**:

- Arrow/j/k navigation
- Enter to select
- ESC/q to exit
- Server status display
- Themed with hover states

### VirtualList ✅ Complete

**Location**: `packages/cli/src/components/VirtualList.tsx`

High-performance scrollable list for large datasets.

```typescript
interface VirtualListProps<T> {
  items: T[];
  height: number;
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  onSelect?: (item: T, index: number) => void;
  onFocus?: (item: T, index: number) => void;
  keyExtractor?: (item: T, index: number) => string;
  emptyMessage?: string;
  showScrollbar?: boolean;
  enableWrapAround?: boolean;
}
```

**Features**:

- Virtual scrolling (only renders visible items)
- Scrollbar visualization
- Keyboard navigation (arrows, j/k, PgUp/PgDn, Home/End, g/G)
- Empty state handling
- Wrap-around support
- Custom hook: `useVirtualListState`

**Performance**:

- Handles 10,000+ items smoothly
- O(1) memory for visible items
- Automatic scroll following selection

### EventInspector ✅ Complete

**Location**: `packages/cli/src/components/EventInspector.tsx`

Browse and analyze captured events with filtering and sorting.

```typescript
interface EventInspectorProps {
  onSelectEvent: (event: Event) => void;
  onBack: () => void;
}
```

**Features**:

- Sortable columns (Time, Type, Tool, Description)
- Multi-field filtering (type, tool, session, date)
- Search capability (/ key)
- Real-time filtering
- Virtual scrolling via VirtualList

**Keyboard Shortcuts**:

- `t`: Sort by timestamp
- `y`: Sort by type
- `o`: Sort by tool
- `s`: Sort by session
- `r`: Reverse sort order
- `f`: Cycle filter fields
- `F`: Clear all filters
- `/`: Start search
- `Enter`: View details
- `ESC`: Go back

### EventDetail ⏳ In Progress

**Location**: `packages/cli/src/components/EventDetail.tsx`

Detailed view of selected event with tabs.

```typescript
interface EventDetailProps {
  event: Event;
  onBack: () => void;
}
```

**Planned Features**:

- Tabbed interface (Arguments/Result/Raw)
- Syntax highlighting for code
- Diff viewer for edits
- Copy to clipboard
- Export options

### StreamView ⏳ Planned

**Location**: `packages/cli/src/components/StreamView.tsx`

Real-time event monitoring with pause and inspection.

**Planned Features**:

- Live event streaming
- Auto-scroll toggle
- Pause/resume (Space)
- Buffer management
- Split-screen detail view
- Real-time filtering

### ServerManager ⏳ Planned

**Location**: `packages/cli/src/components/ServerManager.tsx`

Control and monitor the Cage server.

**Planned Features**:

- Start/Stop controls
- Status display
- Port configuration
- Memory usage
- Recent logs

### HooksConfig ⏳ Planned

**Location**: `packages/cli/src/components/HooksConfig.tsx`

Setup and verify Claude Code hooks.

**Planned Features**:

- Installation status
- Hook type list
- Configuration display
- Setup wizard
- Verification tools

### Statistics ⏳ Planned

**Location**: `packages/cli/src/components/Statistics.tsx`

Analytics and metrics dashboard.

**Planned Features**:

- Event counts
- Tool usage charts
- Timeline graphs
- Session analytics
- Peak activity

### Settings ⏳ Planned

**Location**: `packages/cli/src/components/Settings.tsx`

Configuration management interface.

**Planned Features**:

- Theme selection
- Server settings
- Display preferences
- Key bindings
- Import/Export

### DebugConsole ⏳ Planned

**Location**: `packages/cli/src/components/DebugConsole.tsx`

Debug output and diagnostics.

**Planned Features**:

- Raw event display
- Log level filtering
- Performance metrics
- Stack traces

### Help ⏳ Planned

**Location**: `packages/cli/src/components/Help.tsx`

Context-sensitive help overlay.

**Planned Features**:

- Keyboard shortcuts
- Navigation guide
- Feature documentation
- Tips and tricks

## Utility Components

### SyntaxHighlighter ⏳ Planned

Custom syntax highlighting for code display.

```typescript
interface SyntaxHighlighterProps {
  code: string;
  language?: string;
  theme?: 'dark' | 'light';
  showLineNumbers?: boolean;
}
```

### DiffViewer ⏳ Planned

Display file changes with additions/deletions.

```typescript
interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  unified?: boolean;
  context?: number;
}
```

### TaskList ⏳ Planned

Progress indicator for running tasks.

```typescript
interface TaskListProps {
  tasks: Task[];
  showProgress?: boolean;
  showTime?: boolean;
}
```

### FileViewer ⏳ Planned

Display file contents with scrolling.

```typescript
interface FileViewerProps {
  content: string;
  filePath: string;
  syntax?: boolean;
  lineNumbers?: boolean;
}
```

### TabView ⏳ Planned

Tabbed interface for multiple views.

```typescript
interface TabViewProps {
  tabs: Tab[];
  activeTab: number;
  onTabChange: (index: number) => void;
}
```

## Component Patterns

### State Management

All stateful components follow these patterns:

1. **Local State**: UI-only state (hover, focus)
2. **Store State**: Shared application state (Zustand)
3. **Props**: Configuration and callbacks

### Keyboard Handling

Components use Ink's `useInput` hook:

```typescript
useInput((input, key) => {
  // Handle navigation
  if (key.upArrow) {
    /* ... */
  }
  // Handle actions
  if (key.return) {
    /* ... */
  }
  // Handle escape
  if (key.escape) {
    onBack();
  }
});
```

### Theme Integration

All components use the theme hook:

```typescript
const theme = useTheme();
// Use theme colors
<Text color={theme.primary.main}>...</Text>
```

### Performance Optimization

- Use `React.memo` for pure components
- Implement `useMemo` for expensive computations
- Virtual scrolling for large lists
- Debounce user input

## Testing Guidelines

### Unit Tests

Each component should have tests for:

- Rendering with different props
- Keyboard navigation
- State changes
- Callbacks

### Example Test Structure

```typescript
describe('ComponentName', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {});
    it('should show empty state', () => {});
  });

  describe('Keyboard Navigation', () => {
    it('should handle arrow keys', () => {});
    it('should handle selection', () => {});
  });

  describe('Callbacks', () => {
    it('should call onSelect', () => {});
    it('should call onBack', () => {});
  });
});
```

## Component Status

| Component      | Status         | Tests | Documentation |
| -------------- | -------------- | ----- | ------------- |
| Logo           | ✅ Complete    | ⏳    | ✅            |
| MainMenu       | ✅ Complete    | ⏳    | ✅            |
| VirtualList    | ✅ Complete    | ✅    | ✅            |
| EventInspector | ✅ Complete    | ⏳    | ✅            |
| EventDetail    | ⏳ In Progress | ⏳    | ✅            |
| StreamView     | ⏳ Planned     | ⏳    | ✅            |
| ServerManager  | ⏳ Planned     | ⏳    | ✅            |
| HooksConfig    | ⏳ Planned     | ⏳    | ✅            |
| Statistics     | ⏳ Planned     | ⏳    | ✅            |
| Settings       | ⏳ Planned     | ⏳    | ✅            |
| DebugConsole   | ⏳ Planned     | ⏳    | ✅            |
| Help           | ⏳ Planned     | ⏳    | ✅            |
