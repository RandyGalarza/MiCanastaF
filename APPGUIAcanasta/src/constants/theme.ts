/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const BrandColors = {
  primary: '#14532d',
  primarySoft: '#e8f1e5',
  background: '#fff9ef',
  surface: '#ffffff',
  text: '#2f352d',
  muted: '#686f62',
  border: '#e9e2d4',
  orange: '#d96f24',
  orangeSoft: '#fff0df',
  yellow: '#f0bd4d',
  yellowSoft: '#fff6d8',
  red: '#a94438',
  redSoft: '#fce9e5',
} as const;

export const Colors = {
  light: {
    text: BrandColors.text,
    background: BrandColors.background,
    backgroundElement: '#fff2dd',
    backgroundSelected: BrandColors.primarySoft,
    textSecondary: BrandColors.muted,
  },
  dark: {
    text: '#f2f6f1',
    background: '#111713',
    backgroundElement: '#1d251f',
    backgroundSelected: '#26372a',
    textSecondary: '#aab8ad',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
