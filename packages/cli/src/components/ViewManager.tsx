import React, { useState, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { FullScreenLayout } from './FullScreenLayout';
import type {
  ViewMetadata,
  ViewProps,
  ViewDefinition,
  ViewContextValue
} from '../types/viewSystem';

/**
 * Context for view management
 */
const ViewContext = createContext<ViewContextValue | null>(null);

/**
 * Hook to access the view context
 */
export const useViewContext = () => {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useViewContext must be used within ViewManager');
  }
  return context;
};

interface ViewManagerProps {
  /** Map of view definitions */
  views: Record<string, ViewDefinition>;

  /** Initial view to display */
  initialView: string;

  /** Callback when user exits the application */
  onExit?: () => void;

  /** Children (not used, views are managed internally) */
  children?: never;
}

/**
 * ViewManager handles navigation between different views in the TUI
 * It maintains the navigation stack and provides shared layout components
 */
export const ViewManager: React.FC<ViewManagerProps> = ({
  views,
  initialView,
  onExit
}) => {
  const [history, setHistory] = useState<string[]>([initialView]);
  const [metadataOverrides, setMetadataOverrides] = useState<Partial<ViewMetadata>>({});

  const currentView = history[history.length - 1];
  const viewDef = views[currentView];

  if (!viewDef) {
    throw new Error(`View "${currentView}" not found in views`);
  }

  const navigate = useCallback((viewId: string) => {
    if (!views[viewId]) {
      throw new Error(`Cannot navigate to unknown view: ${viewId}`);
    }
    setHistory(prev => [...prev, viewId]);
    setMetadataOverrides({}); // Clear overrides when navigating
  }, [views]);

  const goBack = useCallback(() => {
    if (history.length > 1) {
      setHistory(prev => prev.slice(0, -1));
      setMetadataOverrides({}); // Clear overrides when going back
    } else {
      // At the main menu, trigger exit
      onExit?.();
    }
  }, [history.length, onExit]);

  const updateMetadata = useCallback((updates: Partial<ViewMetadata>) => {
    setMetadataOverrides(prev => ({ ...prev, ...updates }));
  }, []);

  // Merge static metadata with dynamic overrides
  const currentMetadata: ViewMetadata = {
    ...viewDef.metadata,
    ...metadataOverrides
  };

  const contextValue: ViewContextValue = {
    currentView,
    metadata: currentMetadata,
    navigate,
    goBack,
    updateMetadata,
    history
  };

  const ViewComponent = viewDef.component;

  const viewProps: ViewProps = {
    onNavigate: navigate,
    onBack: goBack,
    updateMetadata
  };

  // Handle back navigation if the view doesn't have a custom handler
  const handleBack = currentMetadata.customBackHandler ? undefined : goBack;

  return (
    <ViewContext.Provider value={contextValue}>
      <FullScreenLayout
        title={currentMetadata.title}
        subtitle={currentMetadata.subtitle}
        footer={currentMetadata.footer}
        showDefaultFooter={currentMetadata.showDefaultFooter}
        isMainMenu={history.length === 1}
        showServerStatus={currentMetadata.showServerStatus}
        onBack={handleBack}
      >
        <ViewComponent {...viewProps} />
      </FullScreenLayout>
    </ViewContext.Provider>
  );
};