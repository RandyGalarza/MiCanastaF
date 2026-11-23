/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const BrandColors = {
  primary: '#168344',
  primaryStrong: '#14532d',
  primarySoft: '#eaf6eb',
  background: '#f7f8f6',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  text: '#1f2937',
  muted: '#64748b',
  border: '#dde4df',
  orange: '#d97706',
  orangeSoft: '#fff3dc',
  yellow: '#d99a19',
  yellowSoft: '#fff6d8',
  red: '#b91c1c',
  redSoft: '#fee2e2',
} as const;

export const DarkBrandColors = {
  primary: '#57c8d8',
  primaryStrong: '#2eb7ca',
  primarySoft: '#17384a',
  background: '#091827',
  surface: '#10243a',
  surfaceElevated: '#15304a',
  text: '#f4f7fb',
  muted: '#9eb1c1',
  border: '#234157',
  orange: '#f2b84b',
  orangeSoft: '#332d20',
  yellow: '#f2b84b',
  yellowSoft: '#332d20',
  red: '#ef7b72',
  redSoft: '#42242a',
} as const;

export const Colors = {
  light: {
    text: BrandColors.text,
    background: BrandColors.background,
    backgroundElement: BrandColors.surface,
    backgroundSelected: BrandColors.primarySoft,
    textSecondary: BrandColors.muted,
  },
  dark: {
    text: DarkBrandColors.text,
    background: DarkBrandColors.background,
    backgroundElement: DarkBrandColors.surface,
    backgroundSelected: DarkBrandColors.primarySoft,
    textSecondary: DarkBrandColors.muted,
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
