import type { ViewStyle } from 'react-native';
import { type CSSStyle, Easing, cubicBezier } from 'react-native-reanimated';
import type { HabitColor } from '../features/habits/types';

/** Apple system colors, light and dark variants. */
export const habitColors: Record<HabitColor, { light: string; dark: string }> = {
  blue: { light: '#007AFF', dark: '#0A84FF' },
  purple: { light: '#AF52DE', dark: '#BF5AF2' },
  indigo: { light: '#5856D6', dark: '#5E5CE6' },
  teal: { light: '#30B0C7', dark: '#40C8E0' },
  green: { light: '#34C759', dark: '#30D158' },
  orange: { light: '#FF9500', dark: '#FF9F0A' },
  pink: { light: '#FF2D55', dark: '#FF375F' },
  red: { light: '#FF3B30', dark: '#FF453A' },
  yellow: { light: '#FFB800', dark: '#FFD60A' },
  mint: { light: '#00C7BE', dark: '#63E6E2' },
};

export const HABIT_COLOR_KEYS = Object.keys(habitColors) as HabitColor[];

const light = {
  scheme: 'light' as const,
  bg: '#F2F2F7',
  bgElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardPressed: '#F7F7FA',
  fill: 'rgba(120,120,128,0.12)',
  fillStrong: 'rgba(120,120,128,0.2)',
  separator: 'rgba(60,60,67,0.12)',
  text: '#000000',
  textSecondary: 'rgba(60,60,67,0.6)',
  textTertiary: 'rgba(60,60,67,0.3)',
  accent: '#6E56F8',
  accentSoft: 'rgba(110,86,248,0.12)',
  accentGradient: ['#7B61FF', '#B35CFF'] as [string, string],
  success: '#34C759',
  danger: '#FF3B30',
  flame: '#FF9500',
  flameGradient: ['#FFB340', '#FF6A00'] as [string, string],
  ice: '#5AC8FA',
  heatEmpty: 'rgba(120,120,128,0.12)',
  shadow: 'rgba(17, 12, 46, 0.08)',
  tabBar: 'rgba(255,255,255,0.78)',
  overlay: 'rgba(0,0,0,0.35)',
};

export type Theme = Omit<typeof light, 'scheme'> & { scheme: 'light' | 'dark' };

const dark: Theme = {
  scheme: 'dark',
  bg: '#000000',
  bgElevated: '#1C1C1E',
  card: '#1C1C1E',
  cardPressed: '#242427',
  fill: 'rgba(120,120,128,0.24)',
  fillStrong: 'rgba(120,120,128,0.36)',
  separator: 'rgba(84,84,88,0.6)',
  text: '#FFFFFF',
  textSecondary: 'rgba(235,235,245,0.6)',
  textTertiary: 'rgba(235,235,245,0.3)',
  accent: '#8E7BFF',
  accentSoft: 'rgba(142,123,255,0.18)',
  accentGradient: ['#7B61FF', '#B35CFF'],
  success: '#30D158',
  danger: '#FF453A',
  flame: '#FF9F0A',
  flameGradient: ['#FFB340', '#FF6A00'],
  ice: '#64D2FF',
  heatEmpty: 'rgba(120,120,128,0.2)',
  shadow: 'rgba(0,0,0,0.5)',
  tabBar: 'rgba(28,28,30,0.78)',
  overlay: 'rgba(0,0,0,0.6)',
};

export const themes = { light, dark };

export function habitColor(theme: Theme, color: HabitColor): string {
  return habitColors[color][theme.scheme];
}

/** Append an alpha channel to a #RRGGBB color. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 } as const;

/** Type ramp modelled on the iOS Dynamic Type "Large" defaults. */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '800', letterSpacing: 0.37 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.32 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0 },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '600', letterSpacing: 0.07 },
} as const;

/** Motion — curves from Emil Kowalski's animate-expo skill. Never ease-in on UI. */
export const motion = {
  easeOut: Easing.bezier(0.23, 1, 0.32, 1),
  easeInOut: Easing.bezier(0.77, 0, 0.175, 1),
  press: 120,
  small: 180,
  medium: 260,
} as const;

/** Reanimated CSS transitions (UI thread, no shared values) for two-state changes. */
export function transition(properties: string[], duration: number): CSSStyle<ViewStyle> {
  return {
    transitionProperty: properties as CSSStyle<ViewStyle>['transitionProperty'],
    transitionDuration: duration,
    transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
  };
}
