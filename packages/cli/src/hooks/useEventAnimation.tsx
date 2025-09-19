import { useState, useEffect, useRef } from 'react';

export type AnimationType = 'fadeIn' | 'slideIn' | 'pulse';

export interface EventAnimationConfig {
  eventId: string;
  isNewEvent: boolean;
  animationType?: AnimationType | AnimationType[];
  duration?: number;
  customClass?: string;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  pulseRepeat?: number;
  pulseDuration?: number;
  disabled?: boolean;
  onAnimationStart?: (eventId: string) => void;
  onAnimationComplete?: (eventId: string) => void;
}

export interface EventAnimationState {
  isNew: boolean;
  highlightClass: string;
  opacity: number;
  offsetX: number;
  offsetY: number;
  isPulsing: boolean;
  pulseCount: number;
  isAnimating: boolean;
}

export function useEventAnimation(config: EventAnimationConfig): EventAnimationState {
  const {
    eventId,
    isNewEvent,
    animationType = 'fadeIn',
    duration = 1000,
    customClass = 'highlight-new',
    direction = 'left',
    pulseRepeat = 1,
    pulseDuration = 500,
    disabled = false,
    onAnimationStart,
    onAnimationComplete
  } = config;

  const [isNew, setIsNew] = useState(isNewEvent && !disabled);
  const [opacity, setOpacity] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const animationFrameRef = useRef<number>();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pulseIntervalRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();

  const types = Array.isArray(animationType) ? animationType : [animationType];

  // Initialize animation values based on type
  useEffect(() => {
    if (disabled || !isNewEvent) {
      setIsAnimating(false);
      setOpacity(1);
      setOffsetX(0);
      setOffsetY(0);
      return;
    }

    setIsAnimating(true);

    // Trigger start callback
    if (onAnimationStart) {
      onAnimationStart(eventId);
    }

    // Initialize values based on animation type
    if (types.includes('fadeIn')) {
      setOpacity(0);
    } else {
      setOpacity(1);
    }

    if (types.includes('slideIn')) {
      switch (direction) {
        case 'left':
          setOffsetX(-100);
          break;
        case 'right':
          setOffsetX(100);
          break;
        case 'top':
          setOffsetY(-100);
          break;
        case 'bottom':
          setOffsetY(100);
          break;
      }
    }

    if (types.includes('pulse')) {
      setIsPulsing(true);
      setPulseCount(0);
    }

    // Start the animation
    startTimeRef.current = Date.now();

    // Main animation timer
    if (!types.includes('pulse') || types.length > 1) {
      timeoutRef.current = setTimeout(() => {
        setIsNew(false);
        setOpacity(1);
        setOffsetX(0);
        setOffsetY(0);
        setIsAnimating(false);

        if (onAnimationComplete) {
          onAnimationComplete(eventId);
        }
      }, duration);
    }

    // Pulse animation
    if (types.includes('pulse')) {
      let currentPulse = 0;

      const pulseInterval = setInterval(() => {
        setIsPulsing(prev => !prev);

        if (!isPulsing) {
          currentPulse++;
          setPulseCount(currentPulse);
        }

        if (currentPulse >= pulseRepeat) {
          clearInterval(pulseInterval);
          setIsPulsing(false);
          setIsNew(false);
          setIsAnimating(false);

          if (onAnimationComplete) {
            onAnimationComplete(eventId);
          }
        }
      }, pulseDuration);

      pulseIntervalRef.current = pulseInterval;
    }

    // Fade in animation frame
    if (types.includes('fadeIn')) {
      const animate = () => {
        const elapsed = Date.now() - (startTimeRef.current || 0);
        const progress = Math.min(elapsed / duration, 1);

        setOpacity(progress);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    // Slide in animation frame
    if (types.includes('slideIn')) {
      const animate = () => {
        const elapsed = Date.now() - (startTimeRef.current || 0);
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic

        if (direction === 'left') {
          setOffsetX(-100 * (1 - eased));
        } else if (direction === 'right') {
          setOffsetX(100 * (1 - eased));
        } else if (direction === 'top') {
          setOffsetY(-100 * (1 - eased));
        } else if (direction === 'bottom') {
          setOffsetY(100 * (1 - eased));
        }

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    eventId,
    isNewEvent,
    disabled,
    duration,
    direction,
    pulseDuration,
    pulseRepeat,
    onAnimationStart,
    onAnimationComplete
  ]);

  const highlightClass = isNew ? customClass : '';

  return {
    isNew,
    highlightClass,
    opacity,
    offsetX,
    offsetY,
    isPulsing,
    pulseCount,
    isAnimating
  };
}