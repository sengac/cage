import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logo } from './Logo';

describe('Logo', () => {
  let onComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onComplete = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Given the Logo component is rendered', () => {
    it('Then should call onComplete after animation', async () => {
      render(<Logo onComplete={onComplete} />);

      // Run all timers to complete the animation
      // New timing: ~1500ms letters + 3000ms display + 600ms slide (with concurrent 500ms scramble) + 200ms = ~5800ms
      await vi.runAllTimersAsync();

      expect(onComplete).toHaveBeenCalled();
    });

    it('Then should call onComplete quickly when skipDelay is true', () => {
      render(<Logo onComplete={onComplete} skipDelay={true} />);

      vi.advanceTimersByTime(200);

      expect(onComplete).toHaveBeenCalled();
    });
  });
});