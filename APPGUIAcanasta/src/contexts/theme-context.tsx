import { BrandColors, DarkBrandColors } from '@/constants/theme';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { StatusBar } from 'react-native';

export type AppPalette = {
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  muted: string;
  border: string;
  orange: string;
  orangeSoft: string;
  yellow: string;
  yellowSoft: string;
  red: string;
  redSoft: string;
};

type ThemeContextValue = {
  isDark: boolean;
  colors: AppPalette;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark((current) => !current);
  };

  const value = useMemo(() => ({
    isDark,
    colors: isDark ? DarkBrandColors : BrandColors,
    toggleTheme,
  }), [isDark]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme debe usarse dentro de ThemeProvider');
  return context;
}
