import { useInput } from 'ink';
import type { Handler } from 'ink';
import { useInputMode } from '../contexts/InputContext';

/**
 * Safe wrapper around useInput that checks for TTY support and InputContext
 * This prevents errors when running in non-interactive environments
 * like CI pipelines, pipes, or certain terminal emulators
 * Also respects the InputContext focus ownership model
 */
export const useSafeInput = (
  handler: Handler,
  options?: { isActive?: boolean; componentId?: string; respectFocus?: boolean }
): void => {
  // Check if stdin is a TTY (terminal) and can support raw mode
  const isInteractive = process.stdin.isTTY;

  // Get input mode context
  const { mode, focusOwner } = useInputMode();

  // Determine if this handler should be active
  let isActive = options?.isActive !== false && isInteractive;

  // If respectFocus is enabled (default true), only allow input for focus owner or when no one has focus
  if (options?.respectFocus !== false) {
    const componentId = options?.componentId;
    if (focusOwner && componentId !== focusOwner) {
      isActive = false;
    }
  }

  useInput(handler, { isActive });
};
