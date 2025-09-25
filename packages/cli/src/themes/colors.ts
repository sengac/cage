// Color values for themes - these are the raw hex values that can be used with Ink
export interface ThemeColors {
  name: string;
  primary: {
    light: string;
    main: string;
    dark: string;
  };
  accent: {
    light: string;
    main: string;
    dark: string;
  };
  secondary: {
    blue: string;
    teal: string;
    green: string;
  };
  tertiary: string;
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  ui: {
    background: null;
    border: string;
    borderLight: string;
    borderSubtle: string;
    text: string;
    textBright: string;
    textMuted: string;
    textDim: string;
    selected: string;
    hover: string;
    focus: string;
  };
  syntax: {
    keyword: string;
    string: string;
    comment: string;
    function: string;
    number: string;
    type: string;
    operator: string;
    variable: string;
    bracket: string;
  };
}

// Dark theme colors
export const darkColors: ThemeColors = {
  name: 'Dark Aqua',
  primary: {
    light: '#7FDBFF', // Light aqua
    main: '#01B4C6', // Aqua-blue
    dark: '#007A8C', // Deep aqua
  },
  accent: {
    light: '#FFB3BA', // Light coral
    main: '#FF6B6B', // Coral
    dark: '#EE5A6F', // Deep coral
  },
  secondary: {
    blue: '#4ECDC4', // Turquoise
    teal: '#00A8B5', // Teal
    green: '#52D1A4', // Sea green
  },
  tertiary: '#9B59B6', // Soft purple
  status: {
    success: '#52D1A4', // Sea green
    warning: '#F4D03F', // Golden yellow
    error: '#FF6B6B', // Coral red
    info: '#4ECDC4', // Turquoise
  },
  ui: {
    background: null,
    border: '#2C5282',
    borderLight: '#4A90A4',
    borderSubtle: '#1A3A52',
    text: '#E8F4F8',
    textBright: '#FFFFFF',
    textMuted: '#6B8CAE',
    textDim: '#4A6A8A',
    selected: '#003D4A',
    hover: '#7FDBFF',
    focus: '#01B4C6',
  },
  syntax: {
    keyword: '#FF6B6B',
    string: '#52D1A4',
    comment: '#6B8CAE',
    function: '#4ECDC4',
    number: '#F4D03F',
    type: '#9B59B6',
    operator: '#FFB3BA',
    variable: '#7FDBFF',
    bracket: '#4A90A4',
  },
};

// Light theme colors
export const lightColors: ThemeColors = {
  name: 'Light Ocean',
  primary: {
    light: '#B8E6E8',
    main: '#0891B2',
    dark: '#065666',
  },
  accent: {
    light: '#FED7AA',
    main: '#EA580C',
    dark: '#9A3412',
  },
  secondary: {
    blue: '#0EA5E9',
    teal: '#14B8A6',
    green: '#10B981',
  },
  tertiary: '#8B5CF6',
  status: {
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#0284C7',
  },
  ui: {
    background: null,
    border: '#CBD5E1',
    borderLight: '#94A3B8',
    borderSubtle: '#E2E8F0',
    text: '#1E293B',
    textBright: '#000000',
    textMuted: '#64748B',
    textDim: '#94A3B8',
    selected: '#E0F2FE',
    hover: '#0891B2',
    focus: '#065666',
  },
  syntax: {
    keyword: '#DC2626',
    string: '#059669',
    comment: '#94A3B8',
    function: '#0284C7',
    number: '#D97706',
    type: '#7C3AED',
    operator: '#EA580C',
    variable: '#0891B2',
    bracket: '#64748B',
  },
};

// High contrast theme colors
export const highContrastColors: ThemeColors = {
  name: 'High Contrast',
  primary: {
    light: '#FFFFFF',
    main: '#00FFFF',
    dark: '#00FFFF',
  },
  accent: {
    light: '#FFFF00',
    main: '#FFFF00',
    dark: '#FF0000',
  },
  secondary: {
    blue: '#0000FF',
    teal: '#00FFFF',
    green: '#00FF00',
  },
  tertiary: '#FF00FF',
  status: {
    success: '#00FF00',
    warning: '#FFFF00',
    error: '#FF0000',
    info: '#0000FF',
  },
  ui: {
    background: null,
    border: '#FFFFFF',
    borderLight: '#FFFFFF',
    borderSubtle: '#808080',
    text: '#FFFFFF',
    textBright: '#FFFFFF',
    textMuted: '#808080',
    textDim: '#808080',
    selected: '#0000FF',
    hover: '#FFFF00',
    focus: '#00FFFF',
  },
  syntax: {
    keyword: '#FF0000',
    string: '#00FF00',
    comment: '#808080',
    function: '#00FFFF',
    number: '#FFFF00',
    type: '#FF00FF',
    operator: '#FFFFFF',
    variable: '#0000FF',
    bracket: '#FFFFFF',
  },
};

export const themeColors = {
  dark: darkColors,
  light: lightColors,
  highContrast: highContrastColors,
};
