import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { useEventAnimation } from './useEventAnimation';

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(callback, 0) as any;
});
global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});

describe('useEventAnimation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('New Event Highlighting', () => {
    it('should mark new events with highlight state', () => {
      const TestComponent = () => {
        const { isNew, highlightClass } = useEventAnimation({
          eventId: 'event-1',
          isNewEvent: true
        });

        return (
          <Text>
            New: {isNew ? 'yes' : 'no'} | Class: {highlightClass}
          </Text>
        );
      };

      const { lastFrame } = render(<TestComponent />);
      expect(lastFrame()).toContain('New: yes');
      expect(lastFrame()).toContain('Class: highlight-new');
    });

    it('should remove highlight after duration', () => {
      const TestComponent = () => {
        const { isNew, highlightClass } = useEventAnimation({
          eventId: 'event-2',
          isNewEvent: true,
          duration: 1000
        });

        return <Text>New: {isNew ? 'yes' : 'no'}</Text>;
      };

      const { lastFrame, rerender } = render(<TestComponent />);

      expect(lastFrame()).toContain('New: yes');

      vi.advanceTimersByTime(1001);
      rerender(<TestComponent />);

      expect(lastFrame()).toContain('New: no');
    });

    it('should support custom animation classes', () => {
      const TestComponent = () => {
        const { highlightClass } = useEventAnimation({
          eventId: 'event-3',
          isNewEvent: true,
          customClass: 'pulse-green'
        });

        return <Text>Class: {highlightClass}</Text>;
      };

      const { lastFrame } = render(<TestComponent />);
      expect(lastFrame()).toContain('Class: pulse-green');
    });
  });

  describe('Fade In Animation', () => {
    it('should provide fade in opacity values', () => {
      const TestComponent = () => {
        const { opacity } = useEventAnimation({
          eventId: 'event-4',
          isNewEvent: true,
          animationType: 'fadeIn'
        });

        return <Text>Opacity: {opacity}</Text>;
      };

      const { lastFrame } = render(<TestComponent />);
      expect(lastFrame()).toContain('Opacity: 0');

      vi.advanceTimersByTime(50);
      // Opacity should gradually increase
    });

    it('should complete fade in animation', () => {
      const TestComponent = () => {
        const { opacity } = useEventAnimation({
          eventId: 'event-5',
          isNewEvent: true,
          animationType: 'fadeIn',
          duration: 500
        });

        return <Text>Opacity: {opacity}</Text>;
      };

      const { lastFrame, rerender } = render(<TestComponent />);

      vi.advanceTimersByTime(500);
      rerender(<TestComponent />);

      expect(lastFrame()).toContain('Opacity: 1');
    });
  });

  describe('Slide In Animation', () => {
    it('should provide slide offset values', () => {
      const AnimationFixture = () => {
        const [ready, setReady] = useState(false);
        const { offsetX } = useEventAnimation({
          eventId: 'event-6',
          isNewEvent: true,
          animationType: 'slideIn',
          direction: 'left'
        });

        useEffect(() => {
          // Let the animation hook's effect run first
          const timer = setTimeout(() => setReady(true), 0);
          return () => clearTimeout(timer);
        }, []);

        if (!ready) {
          return <Text>Loading...</Text>;
        }

        return <Text>Offset: {offsetX}</Text>;
      };

      const { lastFrame, rerender } = render(<AnimationFixture />);

      // Advance timers to let effects run
      vi.advanceTimersByTime(1);
      rerender(<AnimationFixture />);

      expect(lastFrame()).toContain('Offset: -100');
    });

    it('should animate to final position', () => {
      const TestComponent = () => {
        const { offsetX } = useEventAnimation({
          eventId: 'event-7',
          isNewEvent: true,
          animationType: 'slideIn',
          direction: 'left',
          duration: 300
        });

        return <Text>Offset: {offsetX}</Text>;
      };

      const { lastFrame, rerender } = render(<TestComponent />);

      vi.advanceTimersByTime(300);
      rerender(<TestComponent />);

      expect(lastFrame()).toContain('Offset: 0');
    });
  });

  describe('Pulse Animation', () => {
    it('should toggle pulse state', () => {
      const AnimationFixture = () => {
        const [ready, setReady] = useState(false);
        const { isPulsing } = useEventAnimation({
          eventId: 'event-8',
          isNewEvent: true,
          animationType: 'pulse'
        });

        useEffect(() => {
          // Let the animation hook's effect run first
          const timer = setTimeout(() => setReady(true), 0);
          return () => clearTimeout(timer);
        }, []);

        if (!ready) {
          return <Text>Loading...</Text>;
        }

        return <Text>Pulsing: {isPulsing ? 'yes' : 'no'}</Text>;
      };

      const { lastFrame, rerender } = render(<AnimationFixture />);

      // Advance timers to let effects run
      vi.advanceTimersByTime(1);
      rerender(<AnimationFixture />);

      expect(lastFrame()).toContain('Pulsing: yes');

      vi.advanceTimersByTime(500);
      rerender(<AnimationFixture />);

      expect(lastFrame()).toContain('Pulsing: no');
    });

    it('should repeat pulse animation', () => {
      const TestComponent = () => {
        const { pulseCount } = useEventAnimation({
          eventId: 'event-9',
          isNewEvent: true,
          animationType: 'pulse',
          pulseRepeat: 3,
          pulseDuration: 200
        });

        return <Text>Pulses: {pulseCount}</Text>;
      };

      const { lastFrame, rerender } = render(<TestComponent />);

      expect(lastFrame()).toContain('Pulses: 0');

      vi.advanceTimersByTime(200);
      rerender(<TestComponent />);
      expect(lastFrame()).toContain('Pulses: 1');

      vi.advanceTimersByTime(200);
      rerender(<TestComponent />);
      expect(lastFrame()).toContain('Pulses: 2');
    });
  });

  describe('Combined Animations', () => {
    it('should support multiple animation types', () => {
      const AnimationFixture = () => {
        const [ready, setReady] = useState(false);
        const animation = useEventAnimation({
          eventId: 'event-10',
          isNewEvent: true,
          animationType: ['fadeIn', 'slideIn'],
          duration: 400,
          direction: 'left'
        });

        useEffect(() => {
          // Let the animation hook's effect run first
          const timer = setTimeout(() => setReady(true), 0);
          return () => clearTimeout(timer);
        }, []);

        if (!ready) {
          return <Text>Loading...</Text>;
        }

        return (
          <Text>
            Opacity: {animation.opacity} | Offset: {animation.offsetX}
          </Text>
        );
      };

      const { lastFrame, rerender } = render(<AnimationFixture />);

      // Advance timers to let effects run
      vi.advanceTimersByTime(1);
      rerender(<AnimationFixture />);

      expect(lastFrame()).toContain('Opacity: 0');
      expect(lastFrame()).toContain('Offset: -100');
    });
  });

  describe('Animation Callbacks', () => {
    it('should trigger onAnimationStart', () => {
      const onStart = vi.fn();

      const TestComponent = () => {
        useEventAnimation({
          eventId: 'event-11',
          isNewEvent: true,
          onAnimationStart: onStart
        });

        return <Text>Animating</Text>;
      };

      render(<TestComponent />);
      expect(onStart).toHaveBeenCalledWith('event-11');
    });

    it('should trigger onAnimationComplete', () => {
      const onComplete = vi.fn();

      const TestComponent = () => {
        useEventAnimation({
          eventId: 'event-12',
          isNewEvent: true,
          duration: 500,
          onAnimationComplete: onComplete
        });

        return <Text>Animating</Text>;
      };

      const { rerender } = render(<TestComponent />);

      vi.advanceTimersByTime(500);
      rerender(<TestComponent />);

      expect(onComplete).toHaveBeenCalledWith('event-12');
    });
  });

  describe('Performance', () => {
    it('should skip animation when disabled', () => {
      const TestComponent = () => {
        const { isAnimating } = useEventAnimation({
          eventId: 'event-13',
          isNewEvent: true,
          disabled: true
        });

        return <Text>Animating: {isAnimating ? 'yes' : 'no'}</Text>;
      };

      const { lastFrame } = render(<TestComponent />);
      expect(lastFrame()).toContain('Animating: no');
    });

    it('should clean up timers on unmount', () => {
      const TestComponent = () => {
        useEventAnimation({
          eventId: 'event-14',
          isNewEvent: true,
          duration: 1000
        });

        return <Text>Test</Text>;
      };

      const { unmount } = render(<TestComponent />);

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});