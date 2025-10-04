import { useSettingsStore } from '../../shared/stores/settingsStore';
import { themeColors, type ThemeColors } from './colors';
import { detectTerminalTheme } from './index';

export const useTheme = (): ThemeColors => {
  const themeName = useSettingsStore(state => state.theme);

  if (themeName === 'auto') {
    const detected = detectTerminalTheme();
    return themeColors[detected];
  }

  return themeColors[themeName as keyof typeof themeColors] || themeColors.dark;
};
