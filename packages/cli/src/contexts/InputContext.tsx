import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type InputMode = 'normal' | 'search' | 'text' | 'modal' | 'disabled';

interface InputModeState {
  mode: InputMode;
  focusOwner: string | null;
}

interface InputModeContextValue extends InputModeState {
  claimFocus: (componentId: string, mode: InputMode) => () => void;
  hasFocus: (componentId: string) => boolean;
}

const InputModeContext = createContext<InputModeContextValue | null>(null);

interface InputModeProviderProps {
  children: ReactNode;
}

export const InputModeProvider: React.FC<InputModeProviderProps> = ({ children }) => {
  const [state, setState] = useState<InputModeState>({
    mode: 'normal',
    focusOwner: null,
  });

  const claimFocus = useCallback((componentId: string, mode: InputMode): (() => void) => {
    setState({
      mode,
      focusOwner: componentId,
    });

    // Return cleanup function
    return () => {
      setState(prevState => {
        // Only release if this component still owns focus
        if (prevState.focusOwner === componentId) {
          return {
            mode: 'normal',
            focusOwner: null,
          };
        }
        return prevState;
      });
    };
  }, []);

  const hasFocus = useCallback((componentId: string): boolean => {
    return state.focusOwner === componentId;
  }, [state.focusOwner]);

  const value: InputModeContextValue = {
    mode: state.mode,
    focusOwner: state.focusOwner,
    claimFocus,
    hasFocus,
  };

  return (
    <InputModeContext.Provider value={value}>
      {children}
    </InputModeContext.Provider>
  );
};

export const useInputMode = (): InputModeContextValue => {
  const context = useContext(InputModeContext);
  if (!context) {
    throw new Error('useInputMode must be used within an InputModeProvider');
  }
  return context;
};

export const useExclusiveInput = (componentId: string) => {
  const { claimFocus, hasFocus, mode } = useInputMode();

  const enterExclusiveMode = useCallback((inputMode: InputMode): (() => void) => {
    return claimFocus(componentId, inputMode);
  }, [claimFocus, componentId]);

  // Legacy function for backward compatibility
  const exitExclusiveMode = useCallback(() => {
    // This is now handled by the cleanup function returned from enterExclusiveMode
    // Keeping this for backward compatibility but it's a no-op
  }, []);

  return {
    enterExclusiveMode,
    exitExclusiveMode,
    hasExclusiveFocus: hasFocus(componentId),
    currentMode: mode,
  };
};