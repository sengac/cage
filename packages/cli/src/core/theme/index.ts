import chalk from 'chalk';
import gradient from 'gradient-string';

export interface Theme {
  name: string;
  primary: {
    light: typeof chalk;
    main: typeof chalk;
    dark: typeof chalk;
  };
  accent: {
    light: typeof chalk;
    main: typeof chalk;
    dark: typeof chalk;
  };
  secondary: {
    blue: typeof chalk;
    teal: typeof chalk;
    green: typeof chalk;
  };
  tertiary: typeof chalk;
  status: {
    success: typeof chalk;
    warning: typeof chalk;
    error: typeof chalk;
    info: typeof chalk;
  };
  ui: {
    background: null;
    border: typeof chalk;
    borderLight: typeof chalk;
    borderSubtle: typeof chalk;
    text: typeof chalk;
    textBright: typeof chalk;
    textMuted: typeof chalk;
    textDim: typeof chalk;
    selected: typeof chalk;
    hover: typeof chalk;
    focus: typeof chalk;
  };
  syntax: {
    keyword: typeof chalk;
    string: typeof chalk;
    comment: typeof chalk;
    function: typeof chalk;
    number: typeof chalk;
    type: typeof chalk;
    operator: typeof chalk;
    variable: typeof chalk;
    bracket: typeof chalk;
  };
}

// Dark theme (default) - for dark terminals
export const darkTheme: Theme = {
  name: 'Dark Aqua',
  primary: {
    light: chalk.hex('#7FDBFF'), // Light aqua
    main: chalk.hex('#01B4C6'), // Aqua-blue
    dark: chalk.hex('#007A8C'), // Deep aqua
  },
  accent: {
    light: chalk.hex('#FFB3BA'), // Light coral
    main: chalk.hex('#FF6B6B'), // Coral
    dark: chalk.hex('#EE5A6F'), // Deep coral
  },
  secondary: {
    blue: chalk.hex('#4ECDC4'), // Turquoise
    teal: chalk.hex('#00A8B5'), // Teal
    green: chalk.hex('#52D1A4'), // Sea green
  },
  tertiary: chalk.hex('#9B59B6'), // Soft purple
  status: {
    success: chalk.hex('#52D1A4'), // Sea green
    warning: chalk.hex('#F4D03F'), // Golden yellow
    error: chalk.hex('#FF6B6B'), // Coral red
    info: chalk.hex('#4ECDC4'), // Turquoise
  },
  ui: {
    background: null, // Terminal default
    border: chalk.hex('#2C5282'), // Muted blue border
    borderLight: chalk.hex('#4A90A4'), // Light border for emphasis
    borderSubtle: chalk.hex('#1A3A52'), // Very subtle border
    text: chalk.hex('#E8F4F8'), // Off-white primary text
    textBright: chalk.white, // Pure white for emphasis
    textMuted: chalk.hex('#6B8CAE'), // Muted blue-gray
    textDim: chalk.hex('#4A6A8A'), // Dimmer for less important
    selected: chalk.inverse, // Use inverse for selection
    hover: chalk.hex('#7FDBFF'), // Brighten text on hover
    focus: chalk.bold.hex('#01B4C6'), // Bold aqua for focus
  },
  syntax: {
    keyword: chalk.hex('#FF6B6B'),
    string: chalk.hex('#52D1A4'),
    comment: chalk.hex('#6B8CAE'),
    function: chalk.hex('#4ECDC4'),
    number: chalk.hex('#F4D03F'),
    type: chalk.hex('#9B59B6'),
    operator: chalk.hex('#FFB3BA'),
    variable: chalk.hex('#7FDBFF'),
    bracket: chalk.hex('#4A90A4'),
  },
};

// Light theme - for light terminals
export const lightTheme: Theme = {
  name: 'Light Ocean',
  primary: {
    light: chalk.hex('#B8E6E8'), // Very light cyan
    main: chalk.hex('#0891B2'), // Deep cyan
    dark: chalk.hex('#065666'), // Very deep cyan
  },
  accent: {
    light: chalk.hex('#FED7AA'), // Light orange
    main: chalk.hex('#EA580C'), // Orange
    dark: chalk.hex('#9A3412'), // Deep orange
  },
  secondary: {
    blue: chalk.hex('#0EA5E9'), // Sky blue
    teal: chalk.hex('#14B8A6'), // Teal
    green: chalk.hex('#10B981'), // Emerald
  },
  tertiary: chalk.hex('#8B5CF6'), // Violet
  status: {
    success: chalk.hex('#059669'), // Green
    warning: chalk.hex('#D97706'), // Amber
    error: chalk.hex('#DC2626'), // Red
    info: chalk.hex('#0284C7'), // Blue
  },
  ui: {
    background: null, // Terminal default
    border: chalk.hex('#CBD5E1'), // Gray border
    borderLight: chalk.hex('#94A3B8'), // Darker border for emphasis
    borderSubtle: chalk.hex('#E2E8F0'), // Very subtle border
    text: chalk.hex('#1E293B'), // Near-black text
    textBright: chalk.black, // Pure black for emphasis
    textMuted: chalk.hex('#64748B'), // Gray text
    textDim: chalk.hex('#94A3B8'), // Lighter gray
    selected: chalk.inverse, // Use inverse for selection
    hover: chalk.hex('#0891B2'), // Cyan on hover
    focus: chalk.bold.hex('#065666'), // Bold dark cyan for focus
  },
  syntax: {
    keyword: chalk.hex('#DC2626'),
    string: chalk.hex('#059669'),
    comment: chalk.hex('#94A3B8'),
    function: chalk.hex('#0284C7'),
    number: chalk.hex('#D97706'),
    type: chalk.hex('#7C3AED'),
    operator: chalk.hex('#EA580C'),
    variable: chalk.hex('#0891B2'),
    bracket: chalk.hex('#64748B'),
  },
};

// High contrast theme - for accessibility
export const highContrastTheme: Theme = {
  name: 'High Contrast',
  primary: {
    light: chalk.white,
    main: chalk.cyan,
    dark: chalk.cyanBright,
  },
  accent: {
    light: chalk.yellowBright,
    main: chalk.yellow,
    dark: chalk.red,
  },
  secondary: {
    blue: chalk.blueBright,
    teal: chalk.cyanBright,
    green: chalk.greenBright,
  },
  tertiary: chalk.magentaBright,
  status: {
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    info: chalk.blue,
  },
  ui: {
    background: null,
    border: chalk.white,
    borderLight: chalk.white,
    borderSubtle: chalk.gray,
    text: chalk.white,
    textBright: chalk.white,
    textMuted: chalk.gray,
    textDim: chalk.gray,
    selected: chalk.inverse,
    hover: chalk.yellowBright,
    focus: chalk.bold.cyan,
  },
  syntax: {
    keyword: chalk.red,
    string: chalk.green,
    comment: chalk.gray,
    function: chalk.cyan,
    number: chalk.yellow,
    type: chalk.magenta,
    operator: chalk.white,
    variable: chalk.blue,
    bracket: chalk.white,
  },
};

// Theme detection
export const detectTerminalTheme = (): 'dark' | 'light' => {
  // Check for common environment variables
  if (process.env.COLORFGBG) {
    const [fg, bg] = process.env.COLORFGBG.split(';');
    return bg === '15' || bg === '7' ? 'light' : 'dark';
  }
  // Default to dark
  return 'dark';
};

export const themes = {
  dark: darkTheme,
  light: lightTheme,
  highContrast: highContrastTheme,
};

export type ThemeName = keyof typeof themes;
