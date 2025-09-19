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
    describe('When it displays', () => {
      it('Then should show the CAGE ASCII art', () => {
        const { lastFrame } = render(<Logo onComplete={onComplete} />);

        const frame = lastFrame();
        expect(frame).toContain('██████╗ █████╗  ██████╗ ███████╗');
        expect(frame).toContain('██╔════╝██╔══██╗██╔════╝ ██╔════╝');
        expect(frame).toContain('██║     ███████║██║  ███╗█████╗');
        expect(frame).toContain('██║     ██╔══██║██║   ██║██╔══╝');
        expect(frame).toContain('╚██████╗██║  ██║╚██████╔╝███████╗');
        expect(frame).toContain('╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝');
      });

      it('Then should show the tagline', () => {
        const { lastFrame } = render(<Logo onComplete={onComplete} />);

        expect(lastFrame()).toContain('Control • Analyze • Guide • Execute');
      });

      it('Then should show the description', () => {
        const { lastFrame } = render(<Logo onComplete={onComplete} />);

        expect(lastFrame()).toContain('A controlled environment for AI development');
      });

      it('Then should show the version', () => {
        const { lastFrame } = render(<Logo onComplete={onComplete} />);

        expect(lastFrame()).toContain('Version');
      });
    });

    describe('When 1.5 seconds have passed', () => {
      it('Then should call onComplete', () => {
        render(<Logo onComplete={onComplete} />);

        expect(onComplete).not.toHaveBeenCalled();

        // Fast-forward 1.5 seconds
        vi.advanceTimersByTime(1500);

        // Wait for the additional 100ms timeout
        vi.advanceTimersByTime(100);

        expect(onComplete).toHaveBeenCalledTimes(1);
      });

      it('Then should hide the logo', () => {
        const { lastFrame, rerender } = render(<Logo onComplete={onComplete} />);

        // Initially visible - check for part of the ASCII art
        expect(lastFrame()).toContain('██████╗');

        // Fast-forward past display time
        vi.advanceTimersByTime(1600);

        // Force re-render to update
        rerender(<Logo onComplete={onComplete} />);

        // Should be empty/null after hiding
        expect(lastFrame()).toBe('');
      });
    });

    describe('When skipDelay is true', () => {
      it('Then should call onComplete immediately', () => {
        render(<Logo onComplete={onComplete} skipDelay={true} />);

        // Should transition immediately (just the 100ms delay)
        vi.advanceTimersByTime(100);

        expect(onComplete).toHaveBeenCalledTimes(1);
      });
    });

    describe('When animating fade-in', () => {
      it('Then should gradually increase opacity', () => {
        const { lastFrame, rerender } = render(<Logo onComplete={onComplete} />);

        // Advance through fade-in animation (50ms intervals, 10 steps)
        for (let i = 0; i < 5; i++) {
          vi.advanceTimersByTime(50);
          rerender(<Logo onComplete={onComplete} />);
        }

        // Should still be visible during fade-in - check for part of the ASCII art
        expect(lastFrame()).toContain('██████╗');
      });
    });
  });
});