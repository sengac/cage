import { useInput } from 'ink';
import type { Handler } from 'ink';
import { useInputMode, type InputMode } from '../contexts/InputContext';

interface UseSafeInputOptions {
  isActive?: boolean;
  componentId?: string;
  respectFocus?: boolean;
  /**
   * Which input modes this handler should be active in.
   * If not specified, handler is active in all modes.
   * Use this to create layered input handlers:
   * - activeModes: ['normal'] - Only active in normal mode (view layer)
   * - activeModes: ['search', 'text'] - Only active in search/text mode (search layer)
   */
  activeModes?: InputMode[];
}

/**
 * Safe wrapper around useInput that checks for TTY support and InputContext
 * This prevents errors when running in non-interactive environments
 * like CI pipelines, pipes, or certain terminal emulators
 * Also respects the InputContext focus ownership model and mode-based layering
 */
export const useSafeInput = (
  handler: Handler,
  options?: UseSafeInputOptions
): void => {
  // Check if stdin is a TTY (terminal) and can support raw mode
  const isInteractive = process.stdin.isTTY;

  // Get input mode context
  const { mode, focusOwner } = useInputMode();

  // Determine if this handler should be active
  let isActive = options?.isActive !== false && isInteractive;

  // Mode-based filtering: only active if current mode is in activeModes
  if (options?.activeModes && options.activeModes.length > 0) {
    if (!options.activeModes.includes(mode)) {
      isActive = false;
    }
  }

  // If respectFocus is enabled (default true), only allow input for focus owner or when no one has focus
  if (options?.respectFocus !== false) {
    const componentId = options?.componentId;
    if (focusOwner && componentId !== focusOwner) {
      isActive = false;
    }
  }

  useInput(handler, { isActive });
};
