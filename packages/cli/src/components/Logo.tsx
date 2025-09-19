import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import gradient from 'gradient-string';

interface LogoProps {
  onComplete: () => void;
  skipDelay?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ onComplete, skipDelay }) => {
  const [opacity, setOpacity] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Fade in animation
    const fadeInSteps = 10;
    let currentStep = 0;

    const fadeIn = setInterval(() => {
      currentStep++;
      setOpacity(currentStep / fadeInSteps);

      if (currentStep >= fadeInSteps) {
        clearInterval(fadeIn);
      }
    }, 50);

    // Auto-transition after 1.5s
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 100);
    }, skipDelay ? 0 : 1500);

    return () => {
      clearInterval(fadeIn);
      clearTimeout(timer);
    };
  }, [onComplete, skipDelay]);

  if (!visible) return null;

  // Aqua gradient colors: light aqua → aqua-blue → deep aqua
  const aquaGradient = gradient(['#7FDBFF', '#01B4C6', '#007A8C']);

  const logoArt = `
 ██████╗ █████╗  ██████╗ ███████╗
██╔════╝██╔══██╗██╔════╝ ██╔════╝
██║     ███████║██║  ███╗█████╗
██║     ██╔══██║██║   ██║██╔══╝
╚██████╗██║  ██║╚██████╔╝███████╗
 ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝`;

  // Get package version
  const version = process.env.npm_package_version || '0.0.1';

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      marginTop={2}
      dimColor={opacity < 1}
    >
      <Text>
        {aquaGradient.multiline(logoArt)}
      </Text>

      <Box marginTop={1}>
        <Text color="#4ECDC4">
          Control • Analyze • Guide • Execute
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color="#94A3B8" dimColor>
          A controlled environment for AI development
        </Text>
      </Box>

      <Text color="#94A3B8" dimColor>
        Version {version}
      </Text>
    </Box>
  );
};