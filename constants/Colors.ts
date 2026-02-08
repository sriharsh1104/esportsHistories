// Premium palette: black, violet, amber/yellow
const violet = {
  primary: '#8B5CF6',
  dark: '#6D28D9',
  light: '#A78BFA',
};
const amber = {
  primary: '#F59E0B',
  dark: '#D97706',
  light: '#FBBF24',
};
const black = '#0A0A0B';
const surfaceDark = '#12101A';
const surfaceLight = '#1E1B24';

export default {
  light: {
    text: '#1C1917',
    background: '#FAFAF9',
    tint: violet.dark,
    accent: amber.dark,
    tabIconDefault: '#78716C',
    tabIconSelected: violet.dark,
    cardBg: '#FFFFFF',
    inputBg: '#F5F5F4',
    border: '#E7E5E4',
  },
  dark: {
    text: '#FAFAF9',
    background: black,
    tint: violet.primary,
    accent: amber.primary,
    tabIconDefault: '#57534E',
    tabIconSelected: violet.primary,
    cardBg: surfaceDark,
    inputBg: surfaceLight,
    border: '#2D2A36',
  },
};
