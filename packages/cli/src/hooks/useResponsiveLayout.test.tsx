import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { Text } from 'ink';
import {
  useResponsiveLayout,
  ResponsiveLayoutProvider,
  ResponsiveBox,
  ResponsiveText,
  useTerminalSize,
  useBreakpoint
} from './useResponsiveLayout';
import type { TerminalDimensions, BreakpointSize, ResponsiveLayoutData } from './useResponsiveLayout';

// Create mock stdout
const mockStdout = {
  columns: 80,
  rows: 24,
  on: vi.fn(),
  off: vi.fn()
};

// Mock ink's useStdout
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useStdout: () => ({ stdout: mockStdout })
  };
});

describe('useResponsiveLayout', () => {
  beforeEach(() => {
    // Reset mock values for each test
    mockStdout.columns = 80;
    mockStdout.rows = 24;
    mockStdout.on = vi.fn();
    mockStdout.off = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('useTerminalSize', () => {
    it('should return current terminal dimensions', () => {
      let dimensions: TerminalDimensions | null = null;

      const TestComponent = () => {
        dimensions = useTerminalSize();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      expect(dimensions).toEqual({
        width: 80,
        height: 24,
        isMinimumSize: true,
        isSmall: true,
        isMedium: false,
        isLarge: false
      });
    });

    it('should detect when terminal is below minimum size', () => {
      mockStdout.columns = 60;
      mockStdout.rows = 20;

      let dimensions: TerminalDimensions | null = null;

      const TestComponent = () => {
        dimensions = useTerminalSize();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      expect(dimensions?.isMinimumSize).toBe(false);
    });

    it('should register resize listener', () => {
      const TestComponent = () => {
        useTerminalSize();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      expect(mockStdout.on).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should cleanup resize listener on unmount', () => {
      const TestComponent = () => {
        useTerminalSize();
        return <Text>Test</Text>;
      };

      const { unmount } = render(<TestComponent />);
      const resizeHandler = mockStdout.on.mock.calls[0]?.[1];

      unmount();

      expect(mockStdout.off).toHaveBeenCalledWith('resize', resizeHandler);
    });
  });

  describe('useBreakpoint', () => {
    it('should return correct breakpoint for small terminals', () => {
      mockStdout.columns = 80;

      let breakpoint: BreakpointSize | null = null;

      const TestComponent = () => {
        breakpoint = useBreakpoint();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      expect(breakpoint).toBe('small');
    });

    it('should return correct breakpoint for medium terminals', () => {
      mockStdout.columns = 120;

      let breakpoint: BreakpointSize | null = null;

      const TestComponent = () => {
        breakpoint = useBreakpoint();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      expect(breakpoint).toBe('medium');
    });

    it('should return correct breakpoint for large terminals', () => {
      mockStdout.columns = 200;

      let breakpoint: BreakpointSize | null = null;

      const TestComponent = () => {
        breakpoint = useBreakpoint();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      expect(breakpoint).toBe('large');
    });
  });

  describe('useResponsiveLayout', () => {
    it('should adapt layout based on terminal width', () => {
      let layout: ResponsiveLayoutData | null = null;

      const TestComponent = () => {
        layout = useResponsiveLayout();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      expect(layout?.orientation).toBe('vertical');
      expect(layout?.columns).toBe(1);
      expect(layout?.showSidebar).toBe(false);
    });

    it('should switch to horizontal layout on wider terminals', () => {
      mockStdout.columns = 150;

      let layout: ResponsiveLayoutData | null = null;

      const TestComponent = () => {
        layout = useResponsiveLayout();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      expect(layout?.orientation).toBe('horizontal');
      expect(layout?.columns).toBe(3); // 150 columns = large = 3 columns
      expect(layout?.showSidebar).toBe(true);
    });

    it('should calculate responsive padding', () => {
      let layout: ResponsiveLayoutData | null = null;

      const TestComponent = () => {
        layout = useResponsiveLayout();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      // Small screen
      expect(layout?.padding).toEqual({
        top: 0,
        right: 1,
        bottom: 0,
        left: 1
      });
    });

    it('should handle minimum size warnings', () => {
      mockStdout.columns = 50;
      mockStdout.rows = 15;

      let layout: ResponsiveLayoutData | null = null;

      const TestComponent = () => {
        layout = useResponsiveLayout();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      expect(layout?.showMinSizeWarning).toBe(true);
      expect(layout?.minSizeMessage).toContain('Terminal too small');
      expect(layout?.allowInteraction).toBe(false);
    });

    it('should calculate grid columns', () => {
      mockStdout.columns = 160;

      let layout: ResponsiveLayoutData | null = null;

      const TestComponent = () => {
        layout = useResponsiveLayout();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      expect(layout?.gridColumns).toBe(3);
      expect(layout?.itemWidth).toBeGreaterThan(40);
    });

    it('should provide layout hints', () => {
      let layout: ResponsiveLayoutData | null = null;

      const TestComponent = () => {
        layout = useResponsiveLayout();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      expect(layout?.hints).toEqual({
        showFullMenu: false,
        showCompactMenu: true,
        showStatusBar: true,
        showTitle: true
      });
    });

    it('should detect orientation', () => {
      let layout: ResponsiveLayoutData | null = null;

      const TestComponent = () => {
        layout = useResponsiveLayout();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      // Default 80x24 is portrait (aspect ratio < 2)
      const aspectRatio = 80 / 24; // ~3.33 which is > 2
      expect(layout?.isPortrait).toBe(false);
      expect(layout?.isLandscape).toBe(true);
    });
  });

  describe('ResponsiveLayoutProvider', () => {
    it('should provide layout context to children', () => {
      let layoutFromProvider: ResponsiveLayoutData | null = null;

      const TestComponent = () => {
        layoutFromProvider = useResponsiveLayout();
        return <Text>Test</Text>;
      };

      render(
        <ResponsiveLayoutProvider>
          <TestComponent />
        </ResponsiveLayoutProvider>
      );

      expect(layoutFromProvider).toBeDefined();
      expect(layoutFromProvider?.dimensions.width).toBe(80);
    });

    it('should share layout data across components', () => {
      let layout1: ResponsiveLayoutData | null = null;
      let layout2: ResponsiveLayoutData | null = null;

      const Component1 = () => {
        layout1 = useResponsiveLayout();
        return <Text>1</Text>;
      };

      const Component2 = () => {
        layout2 = useResponsiveLayout();
        return <Text>2</Text>;
      };

      render(
        <ResponsiveLayoutProvider>
          <Component1 />
          <Component2 />
        </ResponsiveLayoutProvider>
      );

      // Both should receive the same layout object
      expect(layout1).toBe(layout2);
    });
  });

  describe('ResponsiveBox', () => {
    it('should render children normally', () => {
      const { lastFrame } = render(
        <ResponsiveLayoutProvider>
          <ResponsiveBox>
            <Text>Content</Text>
          </ResponsiveBox>
        </ResponsiveLayoutProvider>
      );

      expect(lastFrame()).toContain('Content');
    });

    it('should hide on specified breakpoints', () => {
      const { lastFrame } = render(
        <ResponsiveLayoutProvider>
          <ResponsiveBox hideOn={['small']}>
            <Text>Hidden on small</Text>
          </ResponsiveBox>
        </ResponsiveLayoutProvider>
      );

      // Should be hidden on small (80 columns)
      expect(lastFrame()).toBe('');
    });

    it('should show only on specified breakpoints', () => {
      const { lastFrame } = render(
        <ResponsiveLayoutProvider>
          <ResponsiveBox showOn={['medium', 'large']}>
            <Text>Show on medium/large</Text>
          </ResponsiveBox>
        </ResponsiveLayoutProvider>
      );

      // Should be hidden on small (80 columns)
      expect(lastFrame()).toBe('');
    });
  });

  describe('ResponsiveText', () => {
    it('should truncate text on small screens', () => {
      const longText = 'This is a very long text that should be truncated on small screens to fit the terminal width properly';

      const { lastFrame } = render(
        <ResponsiveLayoutProvider>
          <ResponsiveText truncate>{longText}</ResponsiveText>
        </ResponsiveLayoutProvider>
      );

      const output = lastFrame();
      expect(output).toContain('...');
      expect(output?.length).toBeLessThan(longText.length);
    });

    it('should render text normally without truncation', () => {
      const text = 'Short text';

      const { lastFrame } = render(
        <ResponsiveLayoutProvider>
          <ResponsiveText>{text}</ResponsiveText>
        </ResponsiveLayoutProvider>
      );

      expect(lastFrame()).toBe(text);
    });

    it('should hide text on specified breakpoints', () => {
      const { lastFrame } = render(
        <ResponsiveLayoutProvider>
          <ResponsiveText hideOn={['small']}>
            Hidden on small screens
          </ResponsiveText>
        </ResponsiveLayoutProvider>
      );

      expect(lastFrame()).toBe('');
    });
  });

  describe('Layout Calculations', () => {
    it('should handle overflow with scrolling', () => {
      let layout: ResponsiveLayoutData | null = null;

      const TestComponent = () => {
        layout = useResponsiveLayout();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      expect(layout?.enableScroll).toBe(true);
      expect(layout?.maxVisibleItems).toBe(20); // 24 - 4 for header/footer
    });

    it('should calculate item width for grid layouts', () => {
      mockStdout.columns = 160;

      let layout: ResponsiveLayoutData | null = null;

      const TestComponent = () => {
        layout = useResponsiveLayout();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      // 160 width - 4 padding (2 left + 2 right) = 156 / 3 columns = 52
      expect(layout?.itemWidth).toBe(52);
    });
  });

  describe('Minimum Size Handling', () => {
    it('should show warning when below minimum size', () => {
      mockStdout.columns = 60;
      mockStdout.rows = 18;

      const MinSizeComponent = () => {
        const layout = useResponsiveLayout();

        if (layout.showMinSizeWarning) {
          return <Text color="red">{layout.minSizeMessage}</Text>;
        }

        return <Text>Normal content</Text>;
      };

      const { lastFrame } = render(
        <ResponsiveLayoutProvider>
          <MinSizeComponent />
        </ResponsiveLayoutProvider>
      );

      expect(lastFrame()).toContain('Terminal too small');
      expect(lastFrame()).toContain('Minimum: 80x24');
    });

    it('should provide resize prompt', () => {
      mockStdout.columns = 70;

      let layout: ResponsiveLayoutData | null = null;

      const TestComponent = () => {
        layout = useResponsiveLayout();
        return <Text>Test</Text>;
      };

      render(<TestComponent />);

      expect(layout?.resizePrompt).toContain('Please resize your terminal');
    });
  });
});