import React, { useState, useEffect, useCallback, useContext, createContext, useRef } from 'react';
import { useInput, useApp } from 'ink';
import type { ReactNode } from 'react';

// Types
export interface NavigationConfig {
  // Panel switching
  enableTabSwitching?: boolean;
  panels?: string[];
  currentPanel?: string;

  // Jump navigation
  enableJumpNavigation?: boolean;
  totalItems?: number;
  currentIndex?: number;
  supportDocumentNavigation?: boolean;

  // Page navigation
  enablePageNavigation?: boolean;
  pageSize?: number;

  // Search
  enableSearch?: boolean;
  onSearch?: (query: string) => void;

  // Filter
  enableFilter?: boolean;
  onFilter?: (query: string) => void;

  // Quit
  enableQuitConfirmation?: boolean;
  onQuit?: (options?: { force?: boolean }) => void;

  // Vi bindings
  enableViBindings?: boolean;
  multiKeyTimeout?: number;

  // Help
  enableHelp?: boolean;

  // Focus management
  trackFocus?: boolean;
  focusableElements?: string[];
  currentFocus?: string;

  // Accessibility
  enableAccessibility?: boolean;
  onAnnounce?: (message: string) => void;
}

export interface NavigationState {
  // Panel state
  currentPanel: string;
  panels: string[];

  // Navigation state
  currentIndex: number;
  totalItems: number;
  atDocumentStart: boolean;
  atDocumentEnd: boolean;

  // Search state
  searchMode: boolean;
  searchQuery: string;

  // Filter state
  filterMode: boolean;
  filterQuery: string;

  // Quit state
  showQuitConfirmation: boolean;

  // Multi-key state
  pendingKeys: string;

  // Help state
  showHelp: boolean;

  // Focus state
  focusedElement: string | null;

  // Methods
  setFocus: (element: string) => void;
  hasFocus: (element: string) => boolean;
}

// Default state
const DEFAULT_STATE: Omit<NavigationState, 'setFocus' | 'hasFocus'> = {
  currentPanel: '',
  panels: [],
  currentIndex: 0,
  totalItems: 0,
  atDocumentStart: false,
  atDocumentEnd: false,
  searchMode: false,
  searchQuery: '',
  filterMode: false,
  filterQuery: '',
  showQuitConfirmation: false,
  pendingKeys: '',
  showHelp: false,
  focusedElement: null
};

// Context
interface NavigationContextValue extends NavigationState {
  config: NavigationConfig;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

/**
 * Provider for keyboard navigation
 */
export function KeyboardNavigationProvider({
  children,
  initialState = {},
  config = {}
}: {
  children: ReactNode;
  initialState?: Partial<NavigationState>;
  config?: NavigationConfig;
}) {
  const [state, setState] = useState<Omit<NavigationState, 'setFocus' | 'hasFocus'>>({
    ...DEFAULT_STATE,
    ...initialState
  });

  const setFocus = useCallback((element: string) => {
    setState(prev => ({ ...prev, focusedElement: element }));
  }, []);

  const hasFocus = useCallback((element: string) => {
    return state.focusedElement === element;
  }, [state.focusedElement]);

  const value: NavigationContextValue = {
    ...state,
    setFocus,
    hasFocus,
    config
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

/**
 * Main keyboard navigation hook
 */
export function useKeyboardNavigation(config?: NavigationConfig): NavigationState {
  const context = useContext(NavigationContext);
  const { exit } = useApp();

  // Use context if available, otherwise create local state
  const isInContext = context !== null;
  const mergedConfig = { ...(context?.config || {}), ...config };

  // Local state (when not in context)
  const [localState, setLocalState] = useState<Omit<NavigationState, 'setFocus' | 'hasFocus'>>(() => ({
    ...DEFAULT_STATE,
    currentPanel: mergedConfig.currentPanel || DEFAULT_STATE.currentPanel,
    panels: mergedConfig.panels || DEFAULT_STATE.panels,
    currentIndex: mergedConfig.currentIndex ?? DEFAULT_STATE.currentIndex,
    totalItems: mergedConfig.totalItems ?? DEFAULT_STATE.totalItems,
    focusedElement: mergedConfig.currentFocus || null
  }));

  // Multi-key timeout
  const multiKeyTimeoutRef = useRef<NodeJS.Timeout>();

  // Get current state (from context or local)
  const state = isInContext ? context : localState;

  // Update state helper
  const updateState = useCallback((updates: Partial<typeof localState>) => {
    if (isInContext) {
      // Can't update context from here - would need to expose update methods
      console.warn('Cannot update navigation state from within context');
    } else {
      setLocalState(prev => ({ ...prev, ...updates }));
    }
  }, [isInContext]);

  // Announce for accessibility
  const announce = useCallback((message: string) => {
    if (mergedConfig.enableAccessibility && mergedConfig.onAnnounce) {
      mergedConfig.onAnnounce(message);
    }
  }, [mergedConfig]);

  // Handle multi-key sequences
  const handleMultiKey = useCallback((key: string) => {
    if (!mergedConfig.enableViBindings) return false;

    const pending = state.pendingKeys + key;

    // Check for multi-key commands
    if (pending === 'gg') {
      updateState({ currentIndex: 0, pendingKeys: '' });
      announce('Jumped to top');
      return true;
    }

    // Single 'g' starts a sequence
    if (key === 'g' && !state.pendingKeys) {
      updateState({ pendingKeys: 'g' });

      // Clear after timeout
      if (multiKeyTimeoutRef.current) {
        clearTimeout(multiKeyTimeoutRef.current);
      }
      multiKeyTimeoutRef.current = setTimeout(() => {
        updateState({ pendingKeys: '' });
      }, mergedConfig.multiKeyTimeout || 1000);

      return true;
    }

    return false;
  }, [state.pendingKeys, mergedConfig, updateState, announce]);

  // Input handler
  useInput((input, key) => {
    // Quit confirmation handling
    if (state.showQuitConfirmation) {
      if (input === 'y' || input === 'Y') {
        updateState({ showQuitConfirmation: false });
        mergedConfig.onQuit?.();
      } else if (input === 'n' || input === 'N' || key.escape) {
        updateState({ showQuitConfirmation: false });
      }
      return;
    }

    // Help mode
    if (state.showHelp) {
      if (input === '?' || key.escape) {
        updateState({ showHelp: false });
      }
      return;
    }

    // Search mode
    if (state.searchMode) {
      if (key.escape) {
        updateState({ searchMode: false, searchQuery: '' });
        announce('Search cancelled');
      } else if (key.return) {
        mergedConfig.onSearch?.(state.searchQuery);
        updateState({ searchMode: false });
        announce(`Searching for: ${state.searchQuery}`);
      } else if (key.backspace) {
        updateState({ searchQuery: state.searchQuery.slice(0, -1) });
      } else if (input && !key.ctrl && !key.meta) {
        updateState({ searchQuery: state.searchQuery + input });
      }
      return;
    }

    // Filter mode
    if (state.filterMode) {
      if (key.escape) {
        updateState({ filterMode: false, filterQuery: '' });
        mergedConfig.onFilter?.('');
        announce('Filter cleared');
      } else if (key.return) {
        mergedConfig.onFilter?.(state.filterQuery);
        announce(`Filter applied: ${state.filterQuery}`);
      } else if (key.backspace) {
        updateState({ filterQuery: state.filterQuery.slice(0, -1) });
      } else if (input && !key.ctrl && !key.meta && !key.shift) {
        updateState({ filterQuery: state.filterQuery + input });
      }
      return;
    }

    // Tab switching
    if (key.tab && mergedConfig.enableTabSwitching && state.panels.length > 0) {
      const currentIdx = state.panels.indexOf(state.currentPanel);
      let nextIdx: number;

      if (key.shift) {
        // Reverse tab
        nextIdx = currentIdx === 0 ? state.panels.length - 1 : currentIdx - 1;
      } else {
        // Forward tab
        nextIdx = (currentIdx + 1) % state.panels.length;
      }

      updateState({ currentPanel: state.panels[nextIdx] });
      announce(`Switched to ${state.panels[nextIdx]} panel`);
      return;
    }

    // Focus cycling (if tracking focus)
    if (key.tab && mergedConfig.trackFocus && mergedConfig.focusableElements) {
      const elements = mergedConfig.focusableElements;
      const currentIdx = elements.indexOf(state.focusedElement || '');
      let nextIdx: number;

      if (key.shift) {
        nextIdx = currentIdx <= 0 ? elements.length - 1 : currentIdx - 1;
      } else {
        nextIdx = (currentIdx + 1) % elements.length;
      }

      updateState({ focusedElement: elements[nextIdx] });
      announce(`Focus on ${elements[nextIdx]}`);
      return;
    }

    // Jump navigation
    if (mergedConfig.enableJumpNavigation) {
      if (key.home) {
        const newIndex = 0;
        updateState({
          currentIndex: newIndex,
          atDocumentStart: key.ctrl || newIndex === 0,
          atDocumentEnd: false
        });
        announce(`Item 1 of ${state.totalItems}`);
        return;
      }

      if (key.end) {
        const newIndex = state.totalItems - 1;
        updateState({
          currentIndex: newIndex,
          atDocumentStart: false,
          atDocumentEnd: key.ctrl || newIndex === state.totalItems - 1
        });
        announce(`Item ${state.totalItems} of ${state.totalItems}`);
        return;
      }
    }

    // Page navigation
    if (mergedConfig.enablePageNavigation) {
      const pageSize = mergedConfig.pageSize || 10;

      if (key.pageUp) {
        const newIndex = Math.max(0, state.currentIndex - pageSize);
        updateState({ currentIndex: newIndex });
        announce(`Item ${newIndex + 1} of ${state.totalItems}`);
        return;
      }

      if (key.pageDown) {
        const newIndex = Math.min(state.totalItems - 1, state.currentIndex + pageSize);
        updateState({ currentIndex: newIndex });
        announce(`Item ${newIndex + 1} of ${state.totalItems}`);
        return;
      }
    }

    // Arrow navigation
    if (key.downArrow && state.currentIndex < state.totalItems - 1) {
      const newIndex = state.currentIndex + 1;
      updateState({ currentIndex: newIndex });
      announce(`Item ${newIndex + 1} of ${state.totalItems}`);
      return;
    }

    // Search activation
    if (input === '/' && mergedConfig.enableSearch) {
      updateState({ searchMode: true, searchQuery: '' });
      announce('Search mode activated');
      return;
    }

    // Filter activation
    if (input === 'f' && mergedConfig.enableFilter && !key.shift) {
      updateState({ filterMode: true, filterQuery: '' });
      announce('Filter mode activated');
      return;
    }

    // Filter toggle (Shift+F)
    if (input === 'F' && mergedConfig.enableFilter && key.shift) {
      const newMode = !state.filterMode;
      updateState({ filterMode: newMode });
      announce(newMode ? 'Filter mode activated' : 'Filter mode deactivated');
      return;
    }

    // Quit with confirmation
    if (input === 'q' && mergedConfig.enableQuitConfirmation) {
      updateState({ showQuitConfirmation: true });
      announce('Quit? Press Y to confirm, N to cancel');
      return;
    }

    // Force quit (Ctrl+C)
    if (key.ctrl && input === 'c') {
      mergedConfig.onQuit?.({ force: true });
      return;
    }

    // Help toggle
    if (input === '?' && mergedConfig.enableHelp) {
      updateState({ showHelp: !state.showHelp });
      announce(state.showHelp ? 'Help closed' : 'Help opened');
      return;
    }

    // Vi bindings
    if (mergedConfig.enableViBindings) {
      // G (Shift+g) - go to bottom
      if (input === 'G' && key.shift) {
        const newIndex = state.totalItems - 1;
        updateState({ currentIndex: newIndex });
        announce(`Item ${state.totalItems} of ${state.totalItems}`);
        return;
      }

      // Handle multi-key sequences
      if (handleMultiKey(input)) {
        return;
      }
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      if (multiKeyTimeoutRef.current) {
        clearTimeout(multiKeyTimeoutRef.current);
      }
    };
  }, []);

  // Local setFocus and hasFocus methods
  const setFocus = useCallback((element: string) => {
    updateState({ focusedElement: element });
  }, [updateState]);

  const hasFocus = useCallback((element: string) => {
    return state.focusedElement === element;
  }, [state.focusedElement]);

  return {
    ...state,
    setFocus: context?.setFocus || setFocus,
    hasFocus: context?.hasFocus || hasFocus
  };
}