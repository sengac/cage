import type { ReactNode } from 'react';

/**
 * Metadata for a view that is provided to shared components
 */
export interface ViewMetadata {
  /** The title shown in the header (e.g., "Events Inspector", "Server Management") */
  title: string;

  /** Optional subtitle or status shown on the right side of the header */
  subtitle?: string | ReactNode;

  /** Footer content - can be keyboard shortcuts or custom content */
  footer?: string | ReactNode;

  /** Whether to show the default navigation shortcuts in the footer */
  showDefaultFooter?: boolean;

  /** Whether this view handles its own back navigation */
  customBackHandler?: boolean;

  /** Optional server status display in header */
  showServerStatus?: boolean;
}

/**
 * Props passed to each view component
 */
export interface ViewProps {
  /** Callback to navigate to a different view */
  onNavigate: (viewId: string) => void;

  /** Callback to go back to the previous view */
  onBack: () => void;

  /** Update the view's metadata (e.g., to change subtitle dynamically) */
  updateMetadata: (metadata: Partial<ViewMetadata>) => void;
}

/**
 * Definition of a view in the system
 */
export interface ViewDefinition {
  /** Unique identifier for the view */
  id: string;

  /** The React component for this view */
  component: React.ComponentType<ViewProps>;

  /** Static metadata for the view */
  metadata: ViewMetadata;
}

/**
 * Context provided to all components for view management
 */
export interface ViewContextValue {
  /** Current view ID */
  currentView: string;

  /** Current view metadata */
  metadata: ViewMetadata;

  /** Navigate to a different view */
  navigate: (viewId: string) => void;

  /** Go back to previous view */
  goBack: () => void;

  /** Update current view metadata */
  updateMetadata: (metadata: Partial<ViewMetadata>) => void;

  /** Navigation history stack */
  history: string[];
}
