import { Platform } from 'react-native';

export type AppTheme = {
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceRaised: string;
    primary: string;
    primaryStrong: string;
    secondary: string;
    accent: string;
    accentSoft: string;
    text: string;
    textMuted: string;
    border: string;
    danger: string;
    warning: string;
    warningSoft: string;
    low: string;
    moderate: string;
    high: string;
    scrim: string;
    tabBar: string;
  };
};

const lightColors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceRaised: '#F3F4F6',
  primary: '#087F5B',
  primaryStrong: '#066447',
  secondary: '#087F5B',
  accent: '#087F5B',
  accentSoft: '#E7F5EF',
  text: '#17202A',
  textMuted: '#5B6570',
  border: '#D8DDE3',
  danger: '#B91C1C',
  warning: '#A16207',
  warningSoft: '#FEF3C7',
  low: '#059669',
  moderate: '#D97706',
  high: '#DC2626',
  scrim: 'rgba(0, 0, 0, 0.45)',
  tabBar: '#FFFFFF',
};

const darkColors = {
  background: '#11161B',
  surface: '#1A2026',
  surfaceRaised: '#222A31',
  primary: '#69DBB2',
  primaryStrong: '#69DBB2',
  secondary: '#69DBB2',
  accent: '#34D399',
  accentSoft: '#183D32',
  text: '#F4F6F8',
  textMuted: '#B9C0C7',
  border: '#394149',
  danger: '#FCA5A5',
  warning: '#FCD34D',
  warningSoft: '#4D3A12',
  low: '#34D399',
  moderate: '#FBBF24',
  high: '#F87171',
  scrim: 'rgba(0, 0, 0, 0.62)',
  tabBar: '#1A2026',
};

export const getTheme = (isDark: boolean): AppTheme => ({
  isDark,
  colors: isDark ? darkColors : lightColors,
});

export const typography = {
  regular: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'system-ui' }),
  medium: Platform.select({ ios: 'Avenir Next Medium', android: 'sans-serif-medium', default: 'system-ui' }),
  bold: Platform.select({ ios: 'Avenir Next Demi Bold', android: 'sans-serif-medium', default: 'system-ui' }),
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 10,
  pill: 999,
};
