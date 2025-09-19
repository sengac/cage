# Phase 2: Color Schemes & Theming

## Design Philosophy

The Cage TUI uses an **Aqua-Blue** color palette inspired by ocean depths and digital interfaces. The design emphasizes clarity, readability, and professional aesthetics while maintaining terminal compatibility.

## Color System

### Primary Palette (Aqua Theme)

#### Core Colors
```typescript
const aquaTheme = {
  primary: {
    light: '#7FDBFF',  // Light aqua - highlights, hover
    main:  '#01B4C6',  // Aqua-blue - primary actions
    dark:  '#007A8C',  // Deep aqua - pressed states
  },
  accent: {
    light: '#FFB3BA',  // Light coral - secondary highlights
    main:  '#FF6B6B',  // Coral - alerts, important
    dark:  '#EE5A6F',  // Deep coral - error states
  }
};
```

#### Supporting Colors
```typescript
const secondary = {
  blue:  '#4ECDC4',  // Turquoise - info, links
  teal:  '#00A8B5',  // Teal - success variations
  green: '#52D1A4',  // Sea green - success, positive
};

const tertiary = '#9B59B6';  // Soft purple - special states
```

### Status Colors
Semantic colors for different states:

```typescript
const status = {
  success: '#52D1A4',  // Sea green
  warning: '#F4D03F',  // Golden yellow
  error:   '#FF6B6B',  // Coral red
  info:    '#4ECDC4',  // Turquoise
};
```

### UI Colors
Interface element colors:

```typescript
const ui = {
  background: null,        // Terminal default
  border:     '#2C5282',  // Steel blue
  borderLight:'#4A90A4',  // Light steel
  borderSubtle:'#1A3A52', // Subtle borders
  text:       '#E8F4F8',  // Off-white
  textBright: '#FFFFFF',  // Pure white
  textMuted:  '#6B8CAE',  // Muted blue-gray
  textDim:    '#4A6A8A',  // Dim blue-gray
  selected:   '#003D4A',  // Dark selection bg
  hover:      '#7FDBFF',  // Light aqua
  focus:      '#01B4C6',  // Main aqua
};
```

## Theme Implementations

### Dark Theme (Default)
**Dark Aqua** - Optimized for dark terminals

```typescript
export const darkColors: ThemeColors = {
  name: 'Dark Aqua',
  primary: {
    light: '#7FDBFF',
    main: '#01B4C6',
    dark: '#007A8C',
  },
  // ... full theme
};
```

**Use Cases**:
- Default theme
- Dark terminal backgrounds
- Extended coding sessions
- Low-light environments

### Light Theme
**Light Ocean** - For light terminal backgrounds

```typescript
export const lightColors: ThemeColors = {
  name: 'Light Ocean',
  primary: {
    light: '#B8E6E8',
    main: '#0891B2',
    dark: '#065666',
  },
  // ... full theme
};
```

**Use Cases**:
- Light terminal themes
- Bright environments
- Presentation mode
- Accessibility needs

### High Contrast Theme
**High Contrast** - Maximum readability

```typescript
export const highContrastColors: ThemeColors = {
  name: 'High Contrast',
  primary: {
    light: '#FFFFFF',
    main: '#00FFFF',
    dark: '#00FFFF',
  },
  // ... full theme
};
```

**Use Cases**:
- Accessibility requirements
- Vision impairments
- Extreme lighting conditions
- Projector/screen sharing

## Component Styling

### Logo Component
Gradient animation using aqua spectrum:

```typescript
const aquaGradient = gradient(['#7FDBFF', '#01B4C6', '#007A8C']);
```

### Menu Items
State-based coloring:

```typescript
const menuItemStyle = {
  default: theme.ui.text,
  hover: theme.ui.hover,
  selected: theme.primary.main,
  disabled: theme.ui.textDim,
};
```

### Event Types
Color-coded by event type:

```typescript
const eventTypeColors = {
  ToolUse: theme.primary.main,
  UserMessage: theme.secondary.blue,
  AssistantMessage: theme.secondary.teal,
  SystemMessage: theme.ui.textMuted,
  Error: theme.status.error,
};
```

### Status Indicators
Visual feedback for different states:

```typescript
const statusColors = {
  running: theme.status.success,
  stopped: theme.ui.textMuted,
  error: theme.status.error,
  connecting: theme.status.warning,
};
```

## Syntax Highlighting

### Code Highlighting Colors
For displaying code in events:

```typescript
const syntax = {
  keyword:  '#FF6B6B',  // Coral - keywords
  string:   '#52D1A4',  // Green - strings
  comment:  '#6B8CAE',  // Gray - comments
  function: '#4ECDC4',  // Turquoise - functions
  number:   '#F4D03F',  // Yellow - numbers
  type:     '#9B59B6',  // Purple - types
  operator: '#FFB3BA',  // Light coral - operators
  variable: '#7FDBFF',  // Light aqua - variables
  bracket:  '#4A90A4',  // Steel - brackets
};
```

### Diff Highlighting
For file change visualization:

```typescript
const diffColors = {
  added:    theme.status.success,
  removed:  theme.status.error,
  modified: theme.status.warning,
  context:  theme.ui.textDim,
  lineNum:  theme.ui.textMuted,
};
```

## Using the Theme System

### Theme Hook
Access theme in components:

```typescript
import { useTheme } from '../hooks/useTheme';

const MyComponent = () => {
  const theme = useTheme();

  return (
    <Text color={theme.primary.main}>
      Themed text
    </Text>
  );
};
```

### Theme Detection
Auto-detect terminal theme:

```typescript
export const detectTerminalTheme = (): 'dark' | 'light' => {
  // Check environment variables
  if (process.env.COLORFGBG) {
    const [fg, bg] = process.env.COLORFGBG.split(';');
    const bgColor = parseInt(bg, 10);
    return bgColor < 8 ? 'dark' : 'light';
  }

  // Default to dark
  return 'dark';
};
```

### Theme Switching
Allow users to change themes:

```typescript
const cycleTheme = () => {
  const themes = ['dark', 'light', 'highContrast', 'auto'];
  const current = settingsStore.theme;
  const nextIndex = (themes.indexOf(current) + 1) % themes.length;
  settingsStore.setTheme(themes[nextIndex]);
};
```

## Animations & Effects

### Fade Effects
Smooth transitions:

```typescript
const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  duration: 300,
};
```

### Pulse Effects
Attention-grabbing animations:

```typescript
const pulse = {
  animate: {
    opacity: [1, 0.5, 1],
    color: [theme.primary.main, theme.primary.light, theme.primary.main],
  },
  duration: 1000,
  repeat: Infinity,
};
```

### Loading Indicators
Spinner colors:

```typescript
const spinnerColors = [
  theme.primary.light,
  theme.primary.main,
  theme.primary.dark,
];
```

## Accessibility Considerations

### Color Contrast
All text meets WCAG AA standards:

- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 4.5:1

### Color Blind Support
- Don't rely solely on color
- Use icons and patterns
- Provide text labels
- Support high contrast mode

### Terminal Compatibility
- Works with 16-color terminals
- Graceful degradation
- No hard-coded backgrounds
- Respects terminal themes

## Best Practices

### Color Usage Guidelines

1. **Primary Actions**: Use `primary.main`
2. **Hover States**: Use `ui.hover`
3. **Errors**: Always use `status.error`
4. **Success**: Use `status.success`
5. **Muted Text**: Use `ui.textMuted`
6. **Borders**: Use `ui.border` variants

### Consistency Rules

- Same color for same purpose
- Consistent hover/active states
- Predictable status colors
- Clear visual hierarchy

### Performance Tips

- Cache theme values
- Avoid inline color calculations
- Use CSS-in-JS sparingly
- Minimize re-renders on theme change

## Testing Colors

### Visual Testing
```typescript
describe('Theme Colors', () => {
  it('should have sufficient contrast', () => {
    const contrast = getContrastRatio(
      theme.ui.text,
      theme.ui.background || '#000000'
    );
    expect(contrast).toBeGreaterThan(4.5);
  });
});
```

### Cross-Terminal Testing
Test in multiple terminals:

- **Windows**: Windows Terminal, ConEmu
- **macOS**: Terminal.app, iTerm2, Hyper
- **Linux**: GNOME Terminal, Konsole, Alacritty

## Customization

### User Preferences
Allow color customization:

```typescript
interface UserColorPreferences {
  primaryColor?: string;
  accentColor?: string;
  fontSize?: 'small' | 'medium' | 'large';
  highContrast?: boolean;
  colorBlindMode?: 'protanopia' | 'deuteranopia' | 'tritanopia';
}
```

### Theme Extension
Create custom themes:

```typescript
const customTheme: ThemeColors = {
  ...darkColors,
  primary: {
    light: '#custom1',
    main: '#custom2',
    dark: '#custom3',
  },
};
```

## Current Implementation Status

### Completed ✅
- Color palette definition
- Three theme variants
- Theme hook implementation
- Theme auto-detection
- Component theming

### In Progress 🚧
- Syntax highlighting colors
- Diff viewer colors

### Planned ⏳
- Animation effects
- Custom theme editor
- Color blind modes
- Theme import/export