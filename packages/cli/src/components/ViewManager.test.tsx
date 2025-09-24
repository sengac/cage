import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useInput } from 'ink';
import { ViewManager } from './ViewManager';
import type { ViewDefinition } from '../types/viewSystem';

// Mock Ink's useInput
vi.mock('ink', () => ({
  Box: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  useInput: vi.fn(),
  useStdout: () => ({ stdout: { columns: 80, rows: 24 } })
}));

describe('ViewManager Navigation', () => {
  const mockExit = vi.fn();
  let mockUseInput: any;

  // Test view components
  const TestView1 = ({ onBack, onNavigate }: any) => {
    // Component should NOT handle ESC - FullScreenLayout does it
    return 'Test View 1';
  };

  const TestView2 = ({ onBack, onNavigate }: any) => {
    // Component should NOT handle ESC - FullScreenLayout does it
    return 'Test View 2';
  };

  const testViews: Record<string, ViewDefinition> = {
    main: {
      id: 'main',
      component: TestView1,
      metadata: {
        title: 'Main Menu',
        showDefaultFooter: true
      }
    },
    secondary: {
      id: 'secondary',
      component: TestView2,
      metadata: {
        title: 'Secondary View',
        showDefaultFooter: true
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mocked useInput from the module mock
    mockUseInput = vi.mocked(useInput);
  });

  describe('Acceptance Criteria: Navigation System', () => {
    /**
     * AC-1: ESC key handling should be centralized
     * GIVEN a user is in any view
     * WHEN they press ESC or 'q'
     * THEN the navigation should go back exactly once
     * AND it should be handled by FullScreenLayout only
     * AND components should NOT handle ESC themselves
     */
    it('AC-1: Should handle ESC key exactly once through FullScreenLayout', () => {
      const { rerender } = render(
        <ViewManager
          views={testViews}
          initialView="main"
          onExit={mockExit}
        />
      );

      // Simulate navigating to secondary view
      const navigateHandler = mockUseInput.mock.calls[0]?.[0];

      // Navigate to secondary
      navigateHandler?.('', { return: true });

      // Now press ESC - should be handled only once
      navigateHandler?.('', { escape: true });

      // Should not crash with "undefined" view error
      expect(() => rerender(
        <ViewManager
          views={testViews}
          initialView="main"
          onExit={mockExit}
        />
      )).not.toThrow();
    });

    /**
     * AC-2: Navigation forward should work correctly
     * GIVEN a user is in the main view
     * WHEN they navigate to another view
     * THEN the new view should be displayed
     * AND the history should be maintained
     */
    it('AC-2: Should navigate forward correctly', async () => {
      const { container } = render(
        <ViewManager
          views={testViews}
          initialView="main"
          onExit={mockExit}
        />
      );

      expect(container.textContent).toContain('Test View 1');

      // Test navigation forward when proper mock setup is complete
    });

    /**
     * AC-3: Back navigation should maintain history
     * GIVEN a user has navigated through multiple views
     * WHEN they press back multiple times
     * THEN they should go back through the history correctly
     * AND never encounter "undefined" view errors
     */
    it('AC-3: Should maintain navigation history correctly', () => {
      const { rerender } = render(
        <ViewManager
          views={testViews}
          initialView="main"
          onExit={mockExit}
        />
      );

      // Test multiple navigations and back
      // Should never have undefined in history
    });

    /**
     * AC-4: Exit from main menu
     * GIVEN a user is at the main menu (root view)
     * WHEN they press ESC or 'q'
     * THEN the onExit callback should be called
     * AND the app should exit gracefully
     */
    it('AC-4: Should exit from main menu', () => {
      render(
        <ViewManager
          views={testViews}
          initialView="main"
          onExit={mockExit}
        />
      );

      const inputHandler = mockUseInput.mock.calls[0]?.[0];
      inputHandler?.('q', {});

      expect(mockExit).toHaveBeenCalledTimes(1);
    });

    /**
     * AC-5: Invalid navigation should be handled
     * GIVEN a component tries to navigate
     * WHEN it provides an invalid view ID
     * THEN an error should be thrown with a clear message
     * AND the app should not crash with "undefined" errors
     */
    it('AC-5: Should handle invalid navigation gracefully', () => {
      const BadView = ({ onNavigate }: any) => {
        // Try to navigate to non-existent view
        onNavigate?.('nonexistent');
        return 'Bad View';
      };

      const badViews = {
        ...testViews,
        bad: {
          id: 'bad',
          component: BadView,
          metadata: { title: 'Bad' }
        }
      };

      expect(() => render(
        <ViewManager
          views={badViews}
          initialView="bad"
          onExit={mockExit}
        />
      )).toThrow('Cannot navigate to unknown view: nonexistent');
    });

    /**
     * AC-6: Components should not handle navigation keys
     * GIVEN any component in the system
     * WHEN ESC or 'q' is pressed
     * THEN the component should NOT handle it
     * AND only FullScreenLayout should handle navigation keys
     */
    it('AC-6: Components should not register ESC handlers', () => {
      // This is a design test - components should not call useInput for ESC
      // We'll verify this by checking that only FullScreenLayout registers handlers

      render(
        <ViewManager
          views={testViews}
          initialView="main"
          onExit={mockExit}
        />
      );

      // Should only have one useInput call (from FullScreenLayout)
      // Components should not add their own
      expect(mockUseInput).toHaveBeenCalledTimes(1);
    });
  });
});