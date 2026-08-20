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
  background: '#F2F1EC',
  surface: '#FCFCF9',
  surfaceRaised: '#E8E7E1',
  primary: '#1A1B19',
  primaryStrong: '#1A1B19',
  secondary: '#566159',
  accent: '#2F6B50',
  accentSoft: '#DFE9E2',
  text: '#1A1B19',
  textMuted: '#62635D',
  border: '#DCDCD4',
  danger: '#A33A32',
  warning: '#80581D',
  warningSoft: '#F1E8D5',
  low: '#2F6B50',
  moderate: '#9A641D',
  high: '#A33A32',
  scrim: 'rgba(0, 0, 0, 0.45)',
  tabBar: '#FCFCF9',
};

const darkColors = {
  background: '#121310',
  surface: '#1C1D19',
  surfaceRaised: '#292A25',
  primary: '#F1F0E9',
  primaryStrong: '#F1F0E9',
  secondary: '#B8C4BA',
  accent: '#8BC6A2',
  accentSoft: '#263C30',
  text: '#F1F0E9',
  textMuted: '#B6B6AE',
  border: '#3B3C36',
  danger: '#F2A39B',
  warning: '#E9C37E',
  warningSoft: '#493A22',
  low: '#8BC6A2',
  moderate: '#E9C37E',
  high: '#F2A39B',
  scrim: 'rgba(0, 0, 0, 0.62)',
  tabBar: '#1C1D19',
};

export const getTheme = (isDark: boolean): AppTheme => ({
  isDark,
  colors: isDark ? darkColors : lightColors,
});

export const typography = {
  regular: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'system-ui' }),
  medium: Platform.select({ ios: 'Avenir Next Medium', android: 'sans-serif-medium', default: 'system-ui' }),
  bold: Platform.select({ ios: 'Avenir Next Demi Bold', android: 'sans-serif-medium', default: 'system-ui' }),
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
};
