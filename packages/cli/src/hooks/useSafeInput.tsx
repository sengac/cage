import { useInput } from 'ink';
import type { Handler } from 'ink';

/**
 * Safe wrapper around useInput that checks for TTY support
 * This prevents errors when running in non-interactive environments
 * like CI pipelines, pipes, or certain terminal emulators
 */
export const useSafeInput = (
  handler: Handler,
  options?: { isActive?: boolean }
): void => {
  // Check if stdin is a TTY (terminal) and can support raw mode
  const isInteractive = process.stdin.isTTY;

  // Only enable the input handler if we're in an interactive terminal
  const isActive = options?.isActive !== false && isInteractive;

  useInput(handler, { isActive });
};