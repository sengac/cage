import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import gradient from 'gradient-string';

interface LogoProps {
  onComplete: () => void;
  skipDelay?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ onComplete, skipDelay }) => {
  const [displayedChars, setDisplayedChars] = useState(0);
  const [showTagline, setShowTagline] = useState(false);
  const [slideOut, setSlideOut] = useState(false);
  const [slidPositions, setSlidPositions] = useState<number[]>(new Array(8).fill(0));
  const [scrambledText, setScrambledText] = useState('Code Alignment Guard Engine');
  const [isScrambling, setIsScrambling] = useState(false);
  const [hideAll, setHideAll] = useState(false);
  const [shimmerPosition, setShimmerPosition] = useState(-1);

  // The ASCII art for each letter
  const letterC = [
    ' ██████╗',
    '██╔════╝',
    '██║     ',
    '██║     ',
    '╚██████╗',
    ' ╚═════╝'
  ];

  const letterA = [
    ' █████╗ ',
    '██╔══██╗',
    '███████║',
    '██╔══██║',
    '██║  ██║',
    '╚═╝  ╚═╝'
  ];

  const letterG = [
    ' ██████╗ ',
    '██╔════╝ ',
    '██║  ███╗',
    '██║   ██║',
    '╚██████╔╝',
    ' ╚═════╝ '
  ];

  const letterE = [
    '███████╗',
    '██╔════╝',
    '█████╗  ',
    '██╔══╝  ',
    '███████╗',
    '╚══════╝'
  ];

  const letters = [letterC, letterA, letterG, letterE];

  const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  const scrambleText = (original: string) => {
    return original.split('').map(char => {
      if (char === ' ' || char === '•') return char;
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
  };

  useEffect(() => {
    if (skipDelay) {
      setDisplayedChars(4);
      setShowTagline(true);
      setTimeout(() => {
        onComplete();
      }, 100);
      return;
    }

    // Animate letters appearing one by one
    const animateLetters = async () => {
      for (let i = 0; i <= 4; i++) {
        await new Promise(resolve => setTimeout(resolve, i === 0 ? 0 : 150));
        setDisplayedChars(i);
      }

      // Show tagline after all letters
      await new Promise(resolve => setTimeout(resolve, 150));
      setShowTagline(true);

      // Add shimmer animation after letters are displayed
      await new Promise(resolve => setTimeout(resolve, 500)); // Small pause before shimmer

      // Animate shimmer from left to right
      const shimmerDuration = 600; // Total shimmer animation duration
      const shimmerSteps = 50; // Number of animation steps (extended to go fully off screen)
      const stepDuration = shimmerDuration / shimmerSteps;

      for (let i = 0; i <= shimmerSteps; i++) {
        setShimmerPosition(i / shimmerSteps * 1.3); // Extend to 1.3 to ensure it goes fully off screen
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }

      // Start slide out animation immediately after shimmer passes off screen
      // Don't reset shimmer - keep it off screen
      setSlideOut(true);

      // Animate lines sliding out sequentially
      // Top lines slide right (0, 1, 2) and bottom lines slide left (5, 4, 3) simultaneously
      // Tagline (line 7) stays in place and only scrambles
      const animateSlide = async () => {
        for (let step = 0; step < 3; step++) {
          const topIndex = step;        // 0, 1, 2
          const bottomIndex = 5 - step;  // 5, 4, 3

          // Start sliding both lines simultaneously
          const slideInterval = setInterval(() => {
            setSlidPositions(prev => {
              const newPositions = [...prev];

              // Slide top line right (doubled speed)
              if (newPositions[topIndex] < 100) {
                newPositions[topIndex] += 10;
              }

              // Slide bottom line left (doubled speed)
              if (newPositions[bottomIndex] > -100) {
                newPositions[bottomIndex] -= 10;
              }

              return newPositions;
            });
          }, 20);

          // Wait for this pair to slide out (halved time)
          await new Promise(resolve => setTimeout(resolve, 200));
          clearInterval(slideInterval);
        }
      };

      // Start scrambling the tagline before it slides out completely
      setIsScrambling(true);
      const scrambleInterval = setInterval(() => {
        setScrambledText(scrambleText('Code Alignment Guard Engine'));
      }, 50);

      // Run slide animation and scrambling simultaneously
      await Promise.all([
        animateSlide(),
        new Promise(resolve => setTimeout(resolve, 500)) // Scramble for 500ms during slide
      ]);

      clearInterval(scrambleInterval);

      // Hide everything
      setHideAll(true);

      // Complete after a short delay
      setTimeout(onComplete, 200);
    };

    animateLetters();
  }, [onComplete, skipDelay]);

  if (hideAll) return null;

  // Aqua gradient colors
  const aquaGradient = gradient(['#7FDBFF', '#01B4C6', '#007A8C']);

  // Shimmer gradient for the animation
  const shimmerGradient = gradient(['#FFFFFF', '#E0F7FF', '#FFFFFF']);

  // Build the complete ASCII art based on displayed characters
  const buildAsciiLines = () => {
    const lines: string[] = ['', '', '', '', '', ''];

    for (let lineIndex = 0; lineIndex < 6; lineIndex++) {
      let line = '';
      for (let i = 0; i < displayedChars && i < 4; i++) {
        line += letters[i][lineIndex];
      }
      lines[lineIndex] = line;
    }

    return lines;
  };

  const asciiLines = buildAsciiLines();

  // Apply shimmer effect to a line
  const applyShimmer = (line: string, lineIndex: number): string => {
    if (shimmerPosition < 0 || shimmerPosition > 1) {
      return aquaGradient(line);
    }

    // Calculate the shimmer window (affects ~30% of the total width)
    const lineLength = line.length;
    const shimmerWidth = Math.floor(lineLength * 0.3);
    const shimmerCenter = Math.floor(shimmerPosition * (lineLength + shimmerWidth)) - Math.floor(shimmerWidth / 2);

    // Split the line into characters and apply shimmer gradient to the appropriate section
    const chars = line.split('');
    let result = '';

    for (let i = 0; i < chars.length; i++) {
      const distance = Math.abs(i - shimmerCenter);
      const intensity = Math.max(0, 1 - (distance / (shimmerWidth / 2)));

      if (intensity > 0 && chars[i] !== ' ') {
        // Apply shimmer effect based on intensity
        if (intensity > 0.7) {
          result += shimmerGradient(chars[i]);
        } else {
          // Blend between normal and shimmer color
          result += aquaGradient(chars[i]);
        }
      } else {
        result += aquaGradient(chars[i]);
      }
    }

    return result;
  };

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
    >
      {asciiLines.map((line, index) => {
        if (!line) return null;

        const slidePosition = slidPositions[index];
        const shouldHide = Math.abs(slidePosition) >= 80;

        if (shouldHide) return <Box key={`line-${index}`} height={1} />;

        return (
          <Box key={`line-${index}`} width="100%" justifyContent="center">
            <Text>
              {slidePosition > 0 ? ' '.repeat(slidePosition) : ''}
              {applyShimmer(line, index)}
              {slidePosition < 0 ? ' '.repeat(Math.abs(slidePosition)) : ''}
            </Text>
          </Box>
        );
      })}

      {showTagline && (
        <Box key="spacer" width="100%" height={1} />
      )}

      {showTagline && (
        <Box key="tagline" width="100%" justifyContent="center">
          <Text color={isScrambling ? "#FF0000" : "#4ECDC4"}>
            {isScrambling ? scrambledText : 'Code Alignment Guard Engine'}
          </Text>
        </Box>
      )}
    </Box>
  );
};