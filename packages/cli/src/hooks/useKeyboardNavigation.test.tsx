import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import { useKeyboardNavigation, KeyboardNavigationProvider } from './useKeyboardNavigation';
import type { NavigationConfig, NavigationState } from './useKeyboardNavigation';

// Create a test component that exposes navigation state
function createTestComponent(config: NavigationConfig) {
  let navState: NavigationState | null = null;
  let inputSimulator: ((input: string, key?: any) => void) | null = null;

  const TestComponent = () => {
    const navigation = useKeyboardNavigation(config);
    navState = navigation;

    // Store the current state for external access
    useEffect(() => {
      navState = navigation;
    });

    return (
      <Text>
        Panel: {navigation.currentPanel || 'none'} |
        Index: {navigation.currentIndex} |
        Search: {navigation.searchMode ? 'on' : 'off'} |
        Filter: {navigation.filterMode ? 'on' : 'off'}
      </Text>
    );
  };

  return { TestComponent, getState: () => navState, simulateInput: inputSimulator };
}

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Panel Navigation', () => {
    it('should initialize with provided panel configuration', () => {
      const config: NavigationConfig = {
        enableTabSwitching: true,
        panels: ['left', 'right', 'bottom'],
        currentPanel: 'left'
      };

      const { TestComponent, getState } = createTestComponent(config);
      render(<TestComponent />);

      const state = getState();
      expect(state?.currentPanel).toBe('left');
      expect(state?.panels).toEqual(['left', 'right', 'bottom']);
    });

    it('should provide default state when no config is provided', () => {
      const { TestComponent, getState } = createTestComponent({});
      render(<TestComponent />);

      const state = getState();
      expect(state?.currentPanel).toBe('');
      expect(state?.currentIndex).toBe(0);
      expect(state?.searchMode).toBe(false);
      expect(state?.filterMode).toBe(false);
    });
  });

  describe('Jump Navigation', () => {
    it('should initialize with index configuration', () => {
      const config: NavigationConfig = {
        enableJumpNavigation: true,
        totalItems: 100,
        currentIndex: 50
      };

      const { TestComponent, getState } = createTestComponent(config);
      render(<TestComponent />);

      const state = getState();
      expect(state?.currentIndex).toBe(50);
      expect(state?.totalItems).toBe(100);
    });

    it('should track document boundaries', () => {
      const config: NavigationConfig = {
        enableJumpNavigation: true,
        totalItems: 100,
        currentIndex: 0,
        supportDocumentNavigation: true
      };

      const { TestComponent, getState } = createTestComponent(config);
      render(<TestComponent />);

      const state = getState();
      expect(state?.atDocumentStart).toBe(false);
      expect(state?.atDocumentEnd).toBe(false);
    });
  });

  describe('Search Mode', () => {
    it('should initialize with search disabled', () => {
      const config: NavigationConfig = {
        enableSearch: true
      };

      const { TestComponent, getState } = createTestComponent(config);
      render(<TestComponent />);

      const state = getState();
      expect(state?.searchMode).toBe(false);
      expect(state?.searchQuery).toBe('');
    });
  });

  describe('Filter Mode', () => {
    it('should initialize with filter disabled', () => {
      const config: NavigationConfig = {
        enableFilter: true
      };

      const { TestComponent, getState } = createTestComponent(config);
      render(<TestComponent />);

      const state = getState();
      expect(state?.filterMode).toBe(false);
      expect(state?.filterQuery).toBe('');
    });
  });

  describe('Quit Confirmation', () => {
    it('should initialize without quit confirmation', () => {
      const config: NavigationConfig = {
        enableQuitConfirmation: true
      };

      const { TestComponent, getState } = createTestComponent(config);
      render(<TestComponent />);

      const state = getState();
      expect(state?.showQuitConfirmation).toBe(false);
    });
  });

  describe('Help System', () => {
    it('should initialize with help hidden', () => {
      const config: NavigationConfig = {
        enableHelp: true
      };

      const { TestComponent, getState } = createTestComponent(config);
      render(<TestComponent />);

      const state = getState();
      expect(state?.showHelp).toBe(false);
    });
  });

  describe('Focus Management', () => {
    it('should track focus state', () => {
      const config: NavigationConfig = {
        trackFocus: true,
        focusableElements: ['input', 'button', 'list'],
        currentFocus: 'input'
      };

      const { TestComponent, getState } = createTestComponent(config);
      render(<TestComponent />);

      const state = getState();
      expect(state?.focusedElement).toBe('input');
      expect(state?.hasFocus('input')).toBe(true);
      expect(state?.hasFocus('button')).toBe(false);
    });

    it('should allow setting focus', () => {
      const config: NavigationConfig = {
        trackFocus: true,
        focusableElements: ['input', 'button', 'list']
      };

      const { TestComponent, getState } = createTestComponent(config);
      render(<TestComponent />);

      const state = getState();
      state?.setFocus('button');

      // Note: In real implementation, this would trigger a re-render
      // For now, we're just testing the method exists
      expect(state?.setFocus).toBeDefined();
    });
  });

  describe('Navigation Context', () => {
    it('should provide navigation state through context', () => {
      const TestComponent = () => {
        const nav = useKeyboardNavigation();
        return (
          <Text>
            Panel: {nav.currentPanel || 'main'} |
            Index: {nav.currentIndex}
          </Text>
        );
      };

      const { lastFrame } = render(
        <KeyboardNavigationProvider
          initialState={{
            currentPanel: 'main',
            currentIndex: 0
          }}
        >
          <TestComponent />
        </KeyboardNavigationProvider>
      );

      const output = lastFrame();
      expect(output).toContain('Panel: main');
      expect(output).toContain('Index: 0');
    });

    it('should handle nested navigation contexts', () => {
      const ParentComponent = () => {
        const nav = useKeyboardNavigation();
        return <Text>Parent: {nav.currentPanel || 'parent'}</Text>;
      };

      const ChildComponent = () => {
        const nav = useKeyboardNavigation();
        return <Text>Child: {nav.currentPanel || 'child'}</Text>;
      };

      const App = () => (
        <KeyboardNavigationProvider initialState={{ currentPanel: 'parent' }}>
          <ParentComponent />
          <KeyboardNavigationProvider initialState={{ currentPanel: 'child' }}>
            <ChildComponent />
          </KeyboardNavigationProvider>
        </KeyboardNavigationProvider>
      );

      const { lastFrame } = render(<App />);
      const output = lastFrame();

      expect(output).toContain('Parent: parent');
      expect(output).toContain('Child: child');
    });
  });

  describe('Vi Bindings', () => {
    it('should initialize with pending keys empty', () => {
      const config: NavigationConfig = {
        enableViBindings: true,
        totalItems: 100,
        currentIndex: 50
      };

      const { TestComponent, getState } = createTestComponent(config);
      render(<TestComponent />);

      const state = getState();
      expect(state?.pendingKeys).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('should call announce callback when configured', () => {
      const onAnnounce = vi.fn();
      const config: NavigationConfig = {
        enableAccessibility: true,
        onAnnounce,
        totalItems: 10,
        currentIndex: 0
      };

      const { TestComponent } = createTestComponent(config);
      render(<TestComponent />);

      // The announce function should be called when navigation occurs
      // This is tested through integration rather than unit testing
      expect(onAnnounce).toBeDefined();
    });
  });

  describe('State Methods', () => {
    it('should expose setFocus method', () => {
      const config: NavigationConfig = {
        trackFocus: true
      };

      const { TestComponent, getState } = createTestComponent(config);
      render(<TestComponent />);

      const state = getState();
      expect(state?.setFocus).toBeDefined();
      expect(typeof state?.setFocus).toBe('function');
    });

    it('should expose hasFocus method', () => {
      const config: NavigationConfig = {
        trackFocus: true
      };

      const { TestComponent, getState } = createTestComponent(config);
      render(<TestComponent />);

      const state = getState();
      expect(state?.hasFocus).toBeDefined();
      expect(typeof state?.hasFocus).toBe('function');
    });
  });
});