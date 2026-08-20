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
  background: '#F7F7F4',
  surface: '#FFFFFF',
  surfaceRaised: '#EFEFEB',
  primary: '#171815',
  primaryStrong: '#171815',
  secondary: '#555A54',
  accent: '#286247',
  accentSoft: '#E5EEE8',
  text: '#171815',
  textMuted: '#626660',
  border: '#DEDFDA',
  danger: '#A13D35',
  warning: '#76551E',
  warningSoft: '#F3ECDD',
  low: '#286247',
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
  display: Platform.select({ ios: 'Avenir Next Demi Bold', android: 'sans-serif-medium', default: 'system-ui' }),
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
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
};
