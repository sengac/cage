import { useSettingsStore } from '../stores/settingsStore';
import { themeColors, type ThemeColors } from '../themes/colors';
import { detectTerminalTheme } from '../themes/index';

export const useTheme = (): ThemeColors => {
  const themeName = useSettingsStore(state => state.theme);

  if (themeName === 'auto') {
    const detected = detectTerminalTheme();
    return themeColors[detected];
  }

  return themeColors[themeName as keyof typeof themeColors] || themeColors.dark;
};
